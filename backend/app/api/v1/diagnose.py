import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone
from io import BytesIO
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
from PIL import Image, UnidentifiedImageError
from prisma import Json
from prisma.errors import UniqueViolationError

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.telemetry import dbg_emit
from app.database.db import db
from app.services.dental_service import process_inference, normalize_predictions, get_prediction_image_size
from app.services.storage_service import (
    create_signed_image_url,
    delete_scan_image,
    upload_scan_image,
)

router = APIRouter()
logger = logging.getLogger(__name__)

IMAGE_FORMAT_MIME = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
}


def normalize_diagnosis_awal(diagnosis_awal: List[str]) -> List[str]:
    if len(diagnosis_awal) == 1:
        raw_value = diagnosis_awal[0].strip()
        if raw_value.startswith("["):
            try:
                parsed_value = json.loads(raw_value)
                if isinstance(parsed_value, list):
                    return [str(item).strip() for item in parsed_value if str(item).strip()]
            except json.JSONDecodeError:
                pass

    return [diagnosis.strip() for diagnosis in diagnosis_awal if diagnosis and diagnosis.strip()]


def create_result_number(scan_id: str, created_at: datetime) -> str:
    date_part = created_at.strftime("%Y%m%d")
    suffix = "".join(char for char in scan_id if char.isalnum())[-6:].upper() or "000000"
    return f"CG-{date_part}-{suffix}"


def validate_image_content(image_bytes: bytes, declared_content_type: str) -> str:
    try:
        with Image.open(BytesIO(image_bytes)) as image:
            detected_content_type = IMAGE_FORMAT_MIME.get((image.format or "").upper())
            if image.width * image.height > settings.MAX_IMAGE_PIXELS:
                raise HTTPException(
                    status_code=400,
                    detail="Resolusi gambar terlalu besar",
                )
            image.verify()
    except (Image.DecompressionBombError, UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(status_code=400, detail="Isi file bukan gambar JPEG atau PNG yang valid")

    if detected_content_type not in settings.ALLOWED_IMAGE_MIME:
        raise HTTPException(status_code=400, detail="Format gambar tidak didukung")

    if detected_content_type != declared_content_type:
        raise HTTPException(status_code=400, detail="Tipe file tidak sesuai dengan isi gambar")

    return detected_content_type


async def build_diagnosis_response(saved_scan):
    predictions_for_db = (
        saved_scan.predictions
        if isinstance(saved_scan.predictions, dict)
        else {"predictions": []}
    )
    image_size = get_prediction_image_size(predictions_for_db)
    signed_image_url = None

    try:
        signed_image_url = await create_signed_image_url(saved_scan.imageObjectPath)
    except Exception:
        logger.exception("diagnose.signed_url_failed scan_id=%s", saved_scan.id)

    response_data: Dict[str, Any] = {
        "id": saved_scan.id,
        "resultNumber": saved_scan.resultNumber,
        "status": saved_scan.status,
        "resultLabel": saved_scan.resultLabel,
        "resultConfidence": saved_scan.resultConfidence,
        "imageWidth": image_size["width"],
        "imageHeight": image_size["height"],
        "imageUrl": signed_image_url,
        "predictions": normalize_predictions(predictions_for_db),
    }
    if saved_scan.status != "DONE":
        response_data["errorMessage"] = saved_scan.errorMessage

    if saved_scan.status == "DONE":
        message = "Diagnosis berhasil"
    elif saved_scan.status in {"UPLOADED", "PROCESSING"}:
        message = "Diagnosis sedang diproses"
    else:
        message = "Diagnosis gagal"

    return {
        "success": saved_scan.status == "DONE",
        "message": message,
        "data": response_data,
    }


@router.post("/diagnose")
async def process_dental_diagnosis(
    file: UploadFile = File(...),
    homebaseType: str = Form("RUMAH_SAKIT"),
    homebaseName: str = Form(...),
    homebaseAddress: str = Form(...),
    diagnosisAwal: List[str] = Form(...),
    catatanDokter: Optional[str] = Form(None),
    current_user=Depends(get_current_user),
    patientMedicalId: str = Form(...),
    patientName: str = Form(...),
    patientAge: Optional[int] = Form(None),
    patientGender: Optional[str] = Form(None),
    idempotencyKey: Optional[str] = Form(None),
):
    trace_id = str(uuid.uuid4())
    image_object_path: Optional[str] = None
    scan_persisted = False

    try:
        logger.info(
            "diagnose.request_started trace_id=%s doctor_id=%s filename=%s content_type=%s",
            trace_id,
            current_user.id,
            file.filename,
            file.content_type,
        )
        dbg_emit(
            hypothesis_id="D",
            location="diagnose.py",
            msg="request.received",
            data={"file_name": file.filename, "content_type": file.content_type},
            trace_id=trace_id,
        )

        if not settings.ROBOFLOW_API_KEY:
            raise HTTPException(status_code=500, detail="ROBOFLOW_API_KEY belum dikonfigurasi")

        normalized_homebase_type = (homebaseType or "").strip().upper()
        if normalized_homebase_type not in {"RUMAH_SAKIT", "KLINIK", "LAINNYA"}:
            raise HTTPException(status_code=400, detail="homebaseType tidak valid")

        normalized_diagnosis = normalize_diagnosis_awal(diagnosisAwal or [])
        if not normalized_diagnosis:
            raise HTTPException(status_code=400, detail="diagnosisAwal minimal 1 item")

        normalized_idempotency_key = (idempotencyKey or "").strip() or None
        if normalized_idempotency_key and len(normalized_idempotency_key) > 128:
            raise HTTPException(status_code=400, detail="idempotencyKey terlalu panjang")

        if normalized_idempotency_key:
            existing_scan = await db.scanhistory.find_first(
                where={
                    "doctorId": current_user.id,
                    "idempotencyKey": normalized_idempotency_key,
                }
            )
            if existing_scan:
                return await build_diagnosis_response(existing_scan)

        content_type = (file.content_type or "").split(";", 1)[0].strip().lower()
        if content_type not in settings.ALLOWED_IMAGE_MIME:
            raise HTTPException(status_code=400, detail="Tipe file tidak didukung")

        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="File gambar kosong")
        if len(image_bytes) > settings.MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Ukuran file terlalu besar")

        content_type = validate_image_content(image_bytes, content_type)

        safe_filename = file.filename or "upload.jpg"
        image_sha256 = hashlib.sha256(image_bytes).hexdigest()

        patient = await get_or_create_patient(
            doctor_id=current_user.id,
            medical_id=patientMedicalId,
            name=patientName,
            age=patientAge,
            gender=patientGender,
        )

        homebase = await get_or_create_homebase(
            doctor_id=current_user.id,
            homebase_type=normalized_homebase_type,
            name=homebaseName,
            address=homebaseAddress,
        )

        image_object_path = await upload_scan_image(
            image_bytes=image_bytes,
            filename=safe_filename,
            content_type=content_type,
            doctor_id=current_user.id,
        )

        create_data: Dict[str, Any] = {
            "homebaseType": normalized_homebase_type,
            "homebaseName": homebase.name,
            "homebaseAddress": homebase.address,
            "homebaseId": homebase.id,
            "patientId": patient.id,
            "doctorId": current_user.id,
            "diagnosisAwal": normalized_diagnosis,
            "catatanDokter": catatanDokter,
            "filename": safe_filename,
            "mimeType": content_type,
            "fileSize": len(image_bytes),
            "imageSha256": image_sha256,
            "imageObjectPath": image_object_path,
            "imageUrl": None,
            "idempotencyKey": normalized_idempotency_key,
            "status": "UPLOADED",
            "predictions": Json({"predictions": []}),
        }

        try:
            saved_scan = await db.scanhistory.create(data=create_data)
        except UniqueViolationError:
            if not normalized_idempotency_key:
                raise

            await delete_scan_image(image_object_path)
            image_object_path = None
            existing_scan = await db.scanhistory.find_first(
                where={
                    "doctorId": current_user.id,
                    "idempotencyKey": normalized_idempotency_key,
                }
            )
            if existing_scan is None:
                raise
            return await build_diagnosis_response(existing_scan)

        scan_persisted = True
        result_number = create_result_number(saved_scan.id, saved_scan.createdAt)
        saved_scan = await db.scanhistory.update(
            where={"id": saved_scan.id},
            data={"resultNumber": result_number},
        )
        logger.info(
            "diagnose.image_uploaded trace_id=%s scan_id=%s bytes=%s image_path_present=%s",
            trace_id,
            saved_scan.id,
            len(image_bytes),
            bool(image_object_path),
        )

        if settings.DIAGNOSIS_ASYNC_ENABLED:
            logger.info(
                "diagnose.queued trace_id=%s scan_id=%s",
                trace_id,
                saved_scan.id,
            )
            return await build_diagnosis_response(saved_scan)

        saved_scan = await db.scanhistory.update(
            where={"id": saved_scan.id},
            data={"status": "PROCESSING"},
        )
        status, predictions_for_db, result_label, result_confidence, error_message = await process_inference(
            image_bytes, safe_filename, trace_id
        )
        logger.info(
            "diagnose.inference_finished trace_id=%s scan_id=%s status=%s result_label=%s confidence=%s",
            trace_id,
            saved_scan.id,
            status,
            result_label,
            result_confidence,
        )

        saved_scan = await db.scanhistory.update(
            where={"id": saved_scan.id},
            data={
                "status": status,
                "predictions": Json(predictions_for_db),
                "resultLabel": result_label,
                "resultConfidence": result_confidence,
                "errorMessage": error_message,
                "processedAt": datetime.now(timezone.utc),
                "aiModelId": settings.ROBOFLOW_MODEL_ID,
                "aiConfidenceThreshold": settings.ROBOFLOW_CONFIDENCE_THRESHOLD,
                "aiOverlapThreshold": settings.ROBOFLOW_OVERLAP_THRESHOLD,
                "aiResponseMaskFormat": settings.ROBOFLOW_RESPONSE_MASK_FORMAT,
                "inferenceTraceId": trace_id,
            },
        )

        return await build_diagnosis_response(saved_scan)
    except Exception as e:
        if image_object_path and not scan_persisted:
            try:
                await delete_scan_image(image_object_path)
            except Exception:
                logger.exception(
                    "diagnose.orphan_cleanup_failed trace_id=%s object_path=%s",
                    trace_id,
                    image_object_path,
                )

        if isinstance(e, HTTPException):
            raise e
        logger.exception("diagnose.unhandled_exception trace_id=%s", trace_id)
        dbg_emit(
            hypothesis_id="C",
            location="diagnose.py",
            msg="unhandled_exception",
            data={"error": str(e), "type": type(e).__name__},
            trace_id=trace_id,
        )
        raise HTTPException(status_code=500, detail=str(e) if settings.DEBUG else "Internal server error")


async def get_or_create_patient(
    doctor_id: str,
    medical_id: str,
    name: str,
    age: Optional[int],
    gender: Optional[str],
):
    normalized_medical_id = medical_id.strip()
    normalized_name = name.strip()
    normalized_gender = (gender or "").strip() or None

    if not normalized_medical_id or not normalized_name:
        raise HTTPException(status_code=400, detail="Data pasien wajib diisi")

    patient = await db.patient.find_first(
        where={"doctorId": doctor_id, "medicalId": normalized_medical_id}
    )

    if patient:
        return await db.patient.update(
            where={"id": patient.id},
            data={
                "name": normalized_name,
                "age": age,
                "gender": normalized_gender,
            },
        )

    return await db.patient.create(
        data={
            "doctorId": doctor_id,
            "medicalId": normalized_medical_id,
            "name": normalized_name,
            "age": age,
            "gender": normalized_gender,
        }
    )

async def get_or_create_homebase(
    doctor_id: str,
    homebase_type: str,
    name: str, 
    address: str,
):
    
    normalized_name = name.strip()
    normalized_address = address.strip()

    if not normalized_name or not normalized_address:
        raise HTTPException(status_code=400, detail="Data homebase wajib diisi")
    
    homebase = await db.homebase.find_first(
        where={
            "doctorId": doctor_id,
            "type": homebase_type,
            "name": normalized_name,
            "address": normalized_address,
        }
    )

    if homebase:
        return homebase

    return await db.homebase.create(
        data={
            "doctorId": doctor_id,
            "type": homebase_type,
            "name": normalized_name,
            "address": normalized_address,
        }
    )
