from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.api.v1.auth import ALLOWED_POSITIONS, serialize_user
from app.database.db import db

router = APIRouter()

class UpdateProfileRequest(BaseModel):
    fullname: str
    phone: Optional[str] = None
    position: str

@router.get("/profile")
async def get_profile(current_user=Depends(get_current_user)):
    return {
        "success": True,
        "message": "OK",
        "data": serialize_user(current_user),
    }

@router.put("/profile")
async def update_profile(
    payload: UpdateProfileRequest,
    current_user=Depends(get_current_user),
):
    fullname = payload.fullname.strip()
    phone = payload.phone.strip() if payload.phone else None
    position = payload.position.strip()

    if not fullname:
        raise HTTPException(
            status_code=400, 
            detail="Nama dokter wajib diisi"
        )

    if position not in ALLOWED_POSITIONS:
        raise HTTPException(
            status_code=400,
            detail="Posisi tidak valid"
        )

    try:
        user = await db.user.update(
            where={"id": current_user.id},
            data={
                "fullname": fullname,
                "phone": phone,
                "position": position,
            },
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Gagal memperbarui profile"
        )

    return {
        "success": True,
        "message": "Profile berhasil diperbarui",
        "data": serialize_user(user),
    }