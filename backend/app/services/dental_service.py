import os
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

import anyio
from inference_sdk import InferenceHTTPClient

from app.core.config import settings
from app.core.telemetry import dbg_emit

ROBOFLOW_CLIENT = InferenceHTTPClient(
    api_url=settings.ROBOFLOW_API_URL,
    api_key=settings.ROBOFLOW_API_KEY,
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

        result = await anyio.to_thread.run_sync(_infer_sync, image_bytes, filename)
        predictions = result if isinstance(result, dict) else {"result": result}
        if isinstance(predictions, dict):
            predictions_for_db = predictions
        else:
            predictions_for_db = {"result": predictions}

        if isinstance(predictions_for_db, dict):
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

        return "DONE", predictions_for_db, result_label, result_confidence, None
    except Exception as e:
        error_message = str(e)
        dbg_emit(
            hypothesis_id="E",
            location="dental_service.py",
            msg="roboflow.infer.failed",
            data={"error": error_message, "type": type(e).__name__},
            trace_id=trace_id,
        )
        return "FAILED", predictions_for_db, result_label, result_confidence, error_message
