from fastapi import APIRouter, Depends, HTTPException, status
from psycopg import AsyncConnection

from app.auth import create_access_token, verify_password
from app.db import get_db
from app.schemas import LoginRequest, Token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=Token)
async def login(request: LoginRequest, db: AsyncConnection = Depends(get_db)):
    # First find the user
    # In a real app we'd also check the organization/tenant if provided,
    # but for now email is unique in our schema.
    async with db.cursor() as cur:
        await cur.execute(
            """
            SELECT id, tenant_id, password_hash, role
            FROM employee
            WHERE email = %s
            """,
            (request.email,)
        )
        row = await cur.fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    employee_id = row["id"]
    tenant_id = row["tenant_id"]
    password_hash = row["password_hash"]
    role = row["role"]

    if not verify_password(request.password, password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": str(employee_id), "tenant_id": str(tenant_id), "role": role}
    )
    return Token(access_token=access_token, role=role)
