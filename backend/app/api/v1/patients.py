import logging
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user
from app.database.db import db

router = APIRouter()
logger = logging.getLogger(__name__)


def serialize_patient(patient):
    return {
        "id": patient.id,
        "medicalId": patient.medicalId,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "createdAt": patient.createdAt,
        "updatedAt": patient.updatedAt,
    }


@router.get("/patients")
async def get_patients(
    skip: int = Query(0, ge=0),
    take: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
):
    where: Dict[str, Any] = {"doctorId": current_user.id}
    if q and q.strip():
        term = q.strip()
        where["OR"] = [
            {"name": {"contains": term, "mode": "insensitive"}},
            {"medicalId": {"contains": term, "mode": "insensitive"}},
        ]

    try:
        total = await db.patient.count(where=where)
        items = await db.patient.find_many(
            where=where,
            order={"createdAt": "desc"},
            skip=skip,
            take=take,
        )
        return {
            "success": True,
            "message": "OK",
            "data": {
                "total": total,
                "items": [serialize_patient(item) for item in items],
            },
        }
    except Exception:
        logger.exception("patients.list_failed doctor_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail="Gagal mengambil data pasien")
