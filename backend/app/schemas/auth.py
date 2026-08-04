from typing import Optional

from pydantic import BaseModel, Field

class TokenData(BaseModel):
    id: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    fullname: str
    phone: Optional[str] = None
    position: str = "Dokter Gigi"

class UserResponse(BaseModel):
    id: str
    email: str
    fullname: str
    phone: Optional[str] = None
    position: Optional[str] = None
    role: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int
    user: Optional[UserResponse] = None


class RegisterResponse(Token):
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=32, max_length=512)


class LogoutResponse(BaseModel):
    success: bool
    message: str
