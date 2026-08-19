import logging
import os
import tempfile
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import anyio
from inference_sdk import InferenceConfiguration, InferenceHTTPClient
from PIL import Image

from app.core.config import settings
from app.core.telemetry import dbg_emit

logger = logging.getLogger(__name__)

ROBOFLOW_CLIENT = InferenceHTTPClient(
    api_url=settings.ROBOFLOW_API_URL,
    api_key=settings.ROBOFLOW_API_KEY,
).configure(
    InferenceConfiguration(
        confidence_threshold=settings.ROBOFLOW_CONFIDENCE_THRESHOLD,
        iou_threshold=settings.ROBOFLOW_OVERLAP_THRESHOLD,
        response_mask_format=settings.ROBOFLOW_RESPONSE_MASK_FORMAT,
        client_downsizing_disabled=True,
    )
)


def _safe_float(value: Any) -> Optional[float]:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return None
    return None


def _pick_top_prediction(predictions: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    items = predictions.get("predictions")
    if not isinstance(items, list) or not items:
        return None
    top_item: Optional[Dict[str, Any]] = None
    top_conf = -1.0
    for item in items:
        if not isinstance(item, dict):
            continue
        conf = _safe_float(item.get("confidence"))
        if conf is None:
            continue
        if conf > top_conf:
            top_conf = conf
            top_item = item
    return top_item


def normalize_predictions(predictions_for_db: Dict[str, Any]) -> List[Dict[str, Any]]:
    predictions = predictions_for_db.get("predictions", [])
    if not isinstance(predictions, list):
        return []
    
    normalized_predictions: List[Dict[str, Any]] = []
    for item in predictions:
        if not isinstance(item, dict):
            continue

        points = item.get("points", [])
        if not isinstance(points, list):
            points = []

        normalized_points = []
        for point in points:
            if not isinstance(point, dict):
                continue
            normalized_points.append({
                "x": point.get("x"),
                "y": point.get("y"),
            })
        
        normalized_predictions.append({
            "class": item.get("class") or item.get("predicted_class") or item.get("label"),
            "confidence": item.get("confidence"),
            "x": item.get("x"),
            "y": item.get("y"),
            "width": item.get("width"),
            "height": item.get("height"),
            "points": normalized_points,
            "classId": item.get("class_id"),
            "detectionId": item.get("detection_id"),
        })
    
    return normalized_predictions


def get_prediction_image_size(predictions_for_db: Dict[str, Any]) -> Dict[str, Optional[float]]:
    image_meta = predictions_for_db.get("image")

    if isinstance(image_meta, dict):
        width = _safe_float(image_meta.get("width"))
        height = _safe_float(image_meta.get("height"))
        if width and height:
            return {"width": width, "height": height}

    return {"width": None, "height": None}


def get_source_image_size(image_bytes: bytes) -> Dict[str, int]:
    with Image.open(BytesIO(image_bytes)) as image:
        width, height = image.size

    if width <= 0 or height <= 0:
        raise ValueError("Invalid image dimensions")

    return {"width": width, "height": height}


def _infer_sync(image_bytes: bytes, filename: str) -> Any:
    tmp_path: Optional[str] = None
    try:
        suffix = Path(filename or "").suffix or ".jpg"
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        try:
            tmp.write(image_bytes)
            tmp.flush()
            tmp_path = tmp.name
        finally:
            tmp.close()
        return ROBOFLOW_CLIENT.infer(tmp_path, model_id=settings.ROBOFLOW_MODEL_ID)
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


async def process_inference(
    image_bytes: bytes, filename: str, trace_id: str
) -> Tuple[str, Dict[str, Any], Optional[str], Optional[float], Optional[str]]:
    predictions_for_db: Dict[str, Any] = {"predictions": []}
    result_label: Optional[str] = None
    result_confidence: Optional[float] = None
    error_message: Optional[str] = None

    try:
        dbg_emit(
            hypothesis_id="E",
            location="dental_service.py",
            msg="roboflow.infer.begin",
            data={"model_id": settings.ROBOFLOW_MODEL_ID},
            trace_id=trace_id,
        )

        result = None
        last_error: Optional[Exception] = None
        inference_succeeded = False
        for attempt in range(1, settings.ROBOFLOW_RETRY_ATTEMPTS + 1):
            try:
                with anyio.fail_after(settings.ROBOFLOW_TIMEOUT_SECONDS):
                    result = await anyio.to_thread.run_sync(
                        _infer_sync,
                        image_bytes,
                        filename,
                        abandon_on_cancel=True,
                    )
                inference_succeeded = True
                break
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "roboflow.infer_attempt_failed trace_id=%s attempt=%s/%s error_type=%s",
                    trace_id,
                    attempt,
                    settings.ROBOFLOW_RETRY_ATTEMPTS,
                    type(exc).__name__,
                )
                if attempt < settings.ROBOFLOW_RETRY_ATTEMPTS:
                    await anyio.sleep(
                        settings.ROBOFLOW_RETRY_BACKOFF_SECONDS * (2 ** (attempt - 1))
                    )

        if not inference_succeeded:
            raise last_error or RuntimeError("Roboflow inference gagal")

        predictions_for_db = dict(result) if isinstance(result, dict) else {"result": result}

        image_size = get_prediction_image_size(predictions_for_db)
        if image_size["width"] is None or image_size["height"] is None:
            predictions_for_db["image"] = get_source_image_size(image_bytes)

        top = _pick_top_prediction(predictions_for_db)
        if top is not None:
            inferred_label = top.get("class") or top.get("predicted_class") or top.get("label")
            if inferred_label is not None:
                result_label = str(inferred_label)
            result_confidence = _safe_float(top.get("confidence"))

        dbg_emit(
            hypothesis_id="E",
            location="dental_service.py",
            msg="roboflow.infer.end",
            data={
                "has_predictions_key": "predictions" in predictions_for_db,
                "predictions_count": len(predictions_for_db.get("predictions", []))
                if isinstance(predictions_for_db.get("predictions"), list)
                else None,
            },
            trace_id=trace_id,
        )

        prediction_items = predictions_for_db.get("predictions")
        prediction_count = len(prediction_items) if isinstance(prediction_items, list) else 0
        logger.info(
            "roboflow.infer_succeeded trace_id=%s model_id=%s predictions_count=%s result_label=%s",
            trace_id,
            settings.ROBOFLOW_MODEL_ID,
            prediction_count,
            result_label or "none",
        )

        return "DONE", predictions_for_db, result_label, result_confidence, None
    except Exception as e:
        error_message = "Layanan AI tidak dapat memproses gambar. Silakan coba lagi."
        dbg_emit(
            hypothesis_id="E",
            location="dental_service.py",
            msg="roboflow.infer.failed",
            data={"error": str(e), "type": type(e).__name__},
            trace_id=trace_id,
        )
        return "FAILED", predictions_for_db, result_label, result_confidence, error_message
