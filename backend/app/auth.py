from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

import jwt
from bcrypt import checkpw, gensalt, hashpw
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    return hashpw(password.encode("utf-8"), gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expiration_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return encoded_jwt


class CurrentUser:
    def __init__(self, employee_id: UUID, tenant_id: UUID, role: str):
        self.employee_id = employee_id
        self.tenant_id = tenant_id
        self.role = role


def get_current_user(token: str = Depends(oauth2_scheme)) -> CurrentUser:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        employee_id_str = payload.get("sub")
        tenant_id_str = payload.get("tenant_id")
        role = payload.get("role")
        
        if employee_id_str is None or tenant_id_str is None or role is None:
            raise credentials_exception
            
        employee_id = UUID(employee_id_str)
        tenant_id = UUID(tenant_id_str)
    except Exception:
        raise credentials_exception
        
    return CurrentUser(employee_id=employee_id, tenant_id=tenant_id, role=role)
