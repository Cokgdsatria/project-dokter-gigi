from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user
from app.database.db import db

router = APIRouter()


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
                "items": items,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

