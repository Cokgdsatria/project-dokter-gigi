from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer 
from jose import jwt, JWTError
from app.core.config import settings
from app.schemas.auth import TokenData
from app.database.db import db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token tidak valid atau sudah kedaluwarsa",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(id=user_id)
    except JWTError:
        raise credentials_exception
    
    user = await db.user.find_unique(where={"id": token_data.id})
    if not user:
        raise credentials_exception
    return user
