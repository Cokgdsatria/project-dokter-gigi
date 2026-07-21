from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user
from app.database.db import db
from app.services.dental_service import get_prediction_image_size, normalize_predictions

router = APIRouter()


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
        return {
            "success": True,
            "message": "OK",
            "data": {
                "total": total,
                "items": items,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
                "imageUrl": item.imageUrl,
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
                "doctor": item.doctor,
                "patient": item.patient,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
