from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.database.db import db
from app.schemas.auth import RegisterRequest, RegisterResponse, Token

router = APIRouter()

ALLOWED_POSITIONS = {"Dokter Gigi", "Dokter Spesialis", "Medical Student"}


def create_auth_token(user_id: str) -> str:
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return create_access_token(data={"sub": user_id}, expires_delta=access_token_expires)


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
    if position not in ALLOWED_POSITIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Posisi tidak valid",
        )

    existing_user = await db.user.find_unique(where={"email": email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email sudah terdaftar",
        )

    user = await db.user.create(
        data={
            "email": email,
            "password": get_password_hash(password),
            "fullname": fullname,
            "phone": phone,
            "position": position,
        }
    )
    access_token = create_auth_token(user.id)

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "fullname": user.fullname,
            "phone": user.phone,
            "position": user.position,
            "role": user.role,
        },
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db.user.find_unique(where={"email": form_data.username.strip().lower()})
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password salah",
        )

    access_token = create_auth_token(user.id)
    return {"access_token": access_token, "token_type": "bearer"}
