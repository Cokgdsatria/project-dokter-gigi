from typing import Optional

from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    token_type: str

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

class RegisterResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str
