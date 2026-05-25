from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user
from app.database.db import db

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

