import logging
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user
from app.database.db import db
from app.services.dental_service import get_prediction_image_size, normalize_predictions
from app.services.storage_service import create_signed_image_url, create_signed_image_urls

router = APIRouter()

logger = logging.getLogger(__name__)


def serialize_doctor(user):
    if user is None:
        return None

    return {
        "id": user.id,
        "email": user.email,
        "fullname": user.fullname,
        "phone": user.phone,
        "position": user.position,
        "role": user.role,
    }


def serialize_patient(patient):
    if patient is None:
        return None

    return {
        "id": patient.id,
        "medicalId": patient.medicalId,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
    }


def serialize_history_item(item, image_url: Optional[str]):
    return {
        "id": item.id,
        "resultNumber": item.resultNumber,
        "status": item.status,
        "resultLabel": item.resultLabel,
        "resultConfidence": item.resultConfidence,
        "imageUrl": image_url,
        "filename": item.filename,
        "mimeType": item.mimeType,
        "fileSize": item.fileSize,
        "homebaseType": item.homebaseType,
        "homebaseName": item.homebaseName,
        "patient": serialize_patient(item.patient),
        "createdAt": item.createdAt,
        "processedAt": item.processedAt,
        "errorMessage": item.errorMessage,
    }


async def serialize_history_items(items):
    object_paths = [item.imageObjectPath for item in items if item.imageObjectPath]
    signed_urls: Dict[str, str] = {}

    if object_paths:
        try:
            signed_urls = await create_signed_image_urls(object_paths)
        except Exception:
            logger.exception("history.list_signed_urls_failed")

    return [
        serialize_history_item(
            item,
            signed_urls.get(item.imageObjectPath)
            if item.imageObjectPath
            else item.imageUrl,
        )
        for item in items
    ]


async def resolve_history_image_url(item) -> Optional[str]:
    if item.imageObjectPath:
        try:
            return await create_signed_image_url(item.imageObjectPath)
        except Exception:
            logger.exception("history.signed_url_failed scan_id=%s", item.id)
            return None

    return item.imageUrl


@router.get("/history")
async def get_history(
    skip: int = Query(0, ge=0),
    take: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    patientId: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
):
    where: Dict[str, Any] = {"doctorId": current_user.id}
    if status:
        where["status"] = status
    normalized_patient_id = (patientId or "").strip() or None
    if normalized_patient_id is not None and normalized_patient_id.lower() == "string":
        normalized_patient_id = None
    if normalized_patient_id is not None:
        where["patientId"] = normalized_patient_id

    try:
        total = await db.scanhistory.count(where=where)
        items = await db.scanhistory.find_many(
            where=where,
            order={"createdAt": "desc"},
            skip=skip,
            take=take,
            include={"patient": True, "homebase": True},
        )
        serialized_items = await serialize_history_items(items)

        return {
            "success": True,
            "message": "OK",
            "data": {
                "total": total,
                "items": serialized_items,
            },
        }
    except Exception:
        logger.exception("history.list_failed doctor_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail="Gagal mengambil riwayat diagnosis")


@router.get("/history/{scan_id}")
async def get_history_detail(
    scan_id: str,
    current_user=Depends(get_current_user),
):
    try:
        item = await db.scanhistory.find_first(
            where={"id": scan_id, "doctorId": current_user.id},
            include={"patient": True, "homebase": True, "doctor": True},
        )
        if item is None:
            raise HTTPException(status_code=404, detail="Riwayat diagnosis tidak ditemukan")

        signed_image_url = await resolve_history_image_url(item)

        predictions_for_db = item.predictions if isinstance(item.predictions, dict) else {"predictions": []}
        image_size = get_prediction_image_size(predictions_for_db)

        return {
            "success": True,
            "message": "OK",
            "data": {
                "id": item.id,
                "resultNumber": item.resultNumber,
                "status": item.status,
                "resultLabel": item.resultLabel,
                "resultConfidence": item.resultConfidence,
                "imageWidth": image_size["width"],
                "imageHeight": image_size["height"],
                "imageUrl": signed_image_url,
                "filename": item.filename,
                "mimeType": item.mimeType,
                "fileSize": item.fileSize,
                "homebaseType": item.homebaseType,
                "homebaseName": item.homebaseName,
                "homebaseAddress": item.homebaseAddress,
                "diagnosisAwal": item.diagnosisAwal,
                "catatanDokter": item.catatanDokter,
                "errorMessage": item.errorMessage,
                "createdAt": item.createdAt,
                "processedAt": item.processedAt,
                "predictions": normalize_predictions(predictions_for_db),
                "doctor": serialize_doctor(item.doctor),
                "patient": serialize_patient(item.patient),
            },
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            "history.detail_failed doctor_id=%s scan_id=%s",
            current_user.id,
            scan_id,
        )
        raise HTTPException(status_code=500, detail="Gagal mengambil detail riwayat diagnosis")
