import hashlib
import json
import uuid
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
from prisma import Json

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.telemetry import dbg_emit
from app.database.db import db
from app.services.dental_service import process_inference, normalize_predictions, get_prediction_image_size

router = APIRouter()


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
    patientId: Optional[str] = Form(None),
    current_user=Depends(get_current_user),
):
    trace_id = str(uuid.uuid4())
    try:
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

        image_sha256 = hashlib.sha256(image_bytes).hexdigest()

        normalized_patient_id: Optional[str] = (patientId or "").strip() or None
        if normalized_patient_id is not None and normalized_patient_id.lower() == "string":
            normalized_patient_id = None
        if normalized_patient_id is not None:
            patient = await db.patient.find_unique(where={"id": normalized_patient_id})
            if patient is None:
                raise HTTPException(status_code=400, detail="patientId tidak ditemukan")

        status, predictions_for_db, result_label, result_confidence, error_message = await process_inference(
            image_bytes, file.filename or "upload.jpg", trace_id
        )

        safe_filename = file.filename or "upload.jpg"
        create_data: Dict[str, Any] = {
            "homebaseType": normalized_homebase_type,
            "homebaseName": homebaseName,
            "homebaseAddress": homebaseAddress,
            "diagnosisAwal": normalized_diagnosis,
            "catatanDokter": catatanDokter,
            "filename": safe_filename,
            "mimeType": file.content_type,
            "fileSize": len(image_bytes),
            "imageSha256": image_sha256,
            "status": status,
            "predictions": Json(predictions_for_db),
            "resultLabel": result_label,
            "resultConfidence": result_confidence,
            "errorMessage": error_message,
            "doctorId": current_user.id,
        }
        if normalized_patient_id is not None:
            create_data["patientId"] = normalized_patient_id

        saved_scan = await db.scanhistory.create(data=create_data)

        image_size = get_prediction_image_size(predictions_for_db)

        response_data: Dict[str, Any] = {
            "id": saved_scan.id,
            "status": saved_scan.status,
            "resultLabel": saved_scan.resultLabel,
            "resultConfidence": saved_scan.resultConfidence,
            "imageWidth": image_size["width"],
            "imageHeight": image_size["height"],
            "predictions": normalize_predictions(predictions_for_db),
        }
        if status != "DONE" and settings.DEBUG:
            response_data["errorMessage"] = saved_scan.errorMessage

        return {
            "success": status == "DONE",
            "message": "Diagnosis berhasil" if status == "DONE" else "Diagnosis gagal",
            "data": response_data,
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        dbg_emit(
            hypothesis_id="C",
            location="diagnose.py",
            msg="unhandled_exception",
            data={"error": str(e), "type": type(e).__name__},
            trace_id=trace_id,
        )
        raise HTTPException(status_code=500, detail=str(e) if settings.DEBUG else "Internal server error")
