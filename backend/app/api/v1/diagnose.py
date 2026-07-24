import hashlib
import logging
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
from prisma import Json

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.telemetry import dbg_emit
from app.database.db import db
from app.services.dental_service import process_inference, normalize_predictions, get_prediction_image_size
from app.services.storage_service import upload_scan_image

router = APIRouter()
logger = logging.getLogger(__name__)


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
):
    trace_id = str(uuid.uuid4())
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

        content_type = (file.content_type or "").lower()
        if content_type not in settings.ALLOWED_IMAGE_MIME:
            raise HTTPException(status_code=400, detail="Tipe file tidak didukung")

        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="File gambar kosong")
        if len(image_bytes) > settings.MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Ukuran file terlalu besar")

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

        image_url = await upload_scan_image(
            image_bytes=image_bytes,
            filename=safe_filename,
            content_type=file.content_type,
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
            "mimeType": file.content_type,
            "fileSize": len(image_bytes),
            "imageSha256": image_sha256,
            "imageUrl": image_url,
            "status": "UPLOADED",
            "predictions": Json({"predictions": []}),
        }

        saved_scan = await db.scanhistory.create(data=create_data)
        saved_scan = await db.scanhistory.update(
            where={"id": saved_scan.id},
            data={"status": "PROCESSING"},
        )
        logger.info(
            "diagnose.image_uploaded trace_id=%s scan_id=%s bytes=%s image_url_present=%s",
            trace_id,
            saved_scan.id,
            len(image_bytes),
            bool(image_url),
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
            },
        )

        image_size = get_prediction_image_size(predictions_for_db)

        response_data: Dict[str, Any] = {
            "id": saved_scan.id,
            "status": saved_scan.status,
            "resultLabel": saved_scan.resultLabel,
            "resultConfidence": saved_scan.resultConfidence,
            "imageWidth": image_size["width"],
            "imageHeight": image_size["height"],
            "imageUrl": saved_scan.imageUrl,
            "predictions": normalize_predictions(predictions_for_db),
        }
        if status != "DONE":
            response_data["errorMessage"] = saved_scan.errorMessage

        return {
            "success": status == "DONE",
            "message": "Diagnosis berhasil" if status == "DONE" else "Diagnosis gagal",
            "data": response_data,
        }
    except Exception as e:
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