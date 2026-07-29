from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.database.db import db

router = APIRouter()

ALLOWED_HOMEBASE_TYPES = {"RUMAH_SAKIT", "KLINIK", "LAINNYA"}

class HomebaseCreateRequest(BaseModel):
    type: str = "RUMAH_SAKIT"
    name: str
    address: str

def normalize_homebase_type(value: str) -> str:
    normalized = (value or "").strip().upper()
    if normalized not in ALLOWED_HOMEBASE_TYPES:
        raise HTTPException(status_code=400, detail="type homebase tidak valid")
    return normalized

@router.get("/homebases")
async def get_homebases(
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
            {"address": {"contains": term, "mode": "insensitive"}},
        ]

    try:
        total = await db.homebase.count(where=where)
        items = await db.homebase.find_many(
            where=where,
            order={"createdAt":"desc"},
            skip=skip,
            take=take,
        )

        return {
            "success": True,
            "message": "OK",
            "data": {
                "total": total,
                "items": items,
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/homebases")
async def create_homebase(
    payload: HomebaseCreateRequest,
    current_user=Depends(get_current_user),
):
    homebase_type = normalize_homebase_type(payload.type)
    name = payload.name.strip()
    address = payload.address.strip()

    if not name or not address:
        raise HTTPException(status_code=400, detail="Nama dan alamat homebase wajib diisi")

    try:
        existing = await db.homebase.find_first(
            where={
                "doctorId": current_user.id,
                "type": homebase_type,
                "name": name,
                "address": address,
            }
        )

        if existing:
            return {"success": True, "message": "OK", "data": existing}

        item = await db.homebase.create(
            data={
                "doctorId": current_user.id,
                "type": homebase_type,
                "name": name,
                "address": address,
            }
        )

        return {"success": True, "message": "Homebase berhasil dibuat", "data": item}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
