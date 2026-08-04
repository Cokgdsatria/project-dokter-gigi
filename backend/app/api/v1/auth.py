from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from prisma.errors import UniqueViolationError

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.database.db import db
from app.schemas.auth import (
    LogoutResponse,
    RefreshTokenRequest,
    RegisterRequest,
    RegisterResponse,
    Token,
)
from app.services.auth_service import (
    RefreshTokenError,
    issue_refresh_token,
    revoke_all_user_refresh_tokens,
    revoke_refresh_token,
    rotate_refresh_token,
)

router = APIRouter()

ALLOWED_POSITIONS = {"Dokter Gigi", "Dokter Spesialis", "Medical Student"}


def create_auth_token(user_id: str) -> str:
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return create_access_token(data={"sub": user_id}, expires_delta=access_token_expires)


async def create_auth_response(user, client=None, refresh_token: str = ""):
    token = refresh_token or await issue_refresh_token(user.id, client=client)
    return {
        "access_token": create_auth_token(user.id),
        "refresh_token": token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": serialize_user(user),
    }


def serialize_user(user):
    return {
        "id": user.id,
        "email": user.email,
        "fullname": user.fullname,
        "phone": user.phone,
        "position": user.position,
        "role": user.role,
    }


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register_user(payload: RegisterRequest):
    email = payload.email.strip().lower()
    fullname = payload.fullname.strip()
    password = payload.password
    phone = payload.phone.strip() if payload.phone else None
    position = payload.position.strip() or "Dokter Gigi"

    if not email or "@" not in email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email tidak valid",
        )
    if not fullname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nama wajib diisi",
        )
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password minimal 8 karakter",
        )
    if len(password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password maksimal 72 byte",
        )
    if position not in ALLOWED_POSITIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Posisi tidak valid",
        )

    try:
        async with db.tx(timeout=10000) as transaction:
            existing_user = await transaction.user.find_unique(where={"email": email})
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email sudah terdaftar",
                )

            user = await transaction.user.create(
                data={
                    "email": email,
                    "password": get_password_hash(password),
                    "fullname": fullname,
                    "phone": phone,
                    "position": position,
                }
            )
            refresh_token = await issue_refresh_token(user.id, client=transaction)
    except UniqueViolationError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email sudah terdaftar",
        )

    return await create_auth_response(user, refresh_token=refresh_token)


@router.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db.user.find_unique(where={"email": form_data.username.strip().lower()})
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password salah",
        )

    return await create_auth_response(user)


@router.post("/refresh", response_model=Token)
async def refresh_access_token(payload: RefreshTokenRequest):
    try:
        result = await rotate_refresh_token(payload.refresh_token)
    except RefreshTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        )

    return await create_auth_response(
        result.user,
        refresh_token=result.raw_token,
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout(payload: RefreshTokenRequest):
    await revoke_refresh_token(payload.refresh_token)
    return {"success": True, "message": "Logout berhasil"}


@router.post("/logout-all", response_model=LogoutResponse)
async def logout_all(current_user=Depends(get_current_user)):
    await revoke_all_user_refresh_tokens(current_user.id)
    return {"success": True, "message": "Semua sesi berhasil dicabut"}
