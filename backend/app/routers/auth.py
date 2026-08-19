from fastapi import APIRouter, Depends, HTTPException, status
from psycopg import AsyncConnection
from datetime import date

from app.auth import create_access_token, verify_password, get_password_hash
from app.db import get_db
from app.schemas import LoginRequest, LoginResponse, SignupRequest, SignupResponse

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=LoginResponse)
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
    return LoginResponse(access_token=access_token, role=role)

@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: SignupRequest, db: AsyncConnection = Depends(get_db)):
    hashed = get_password_hash(request.password)
    async with db.transaction():
        async with db.cursor() as cur:
            await cur.execute("INSERT INTO tenant (org_name) VALUES (%s) RETURNING id", (request.org_name,))
            tenant_id = (await cur.fetchone())["id"]
            await cur.execute("INSERT INTO region (tenant_id, code, country_name) VALUES (%s, %s, %s) RETURNING id", (tenant_id, "HQ", request.region_name))
            region_id = (await cur.fetchone())["id"]
            await cur.execute("INSERT INTO employee (tenant_id, region_id, name, email, join_date, password_hash, role) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id", (tenant_id, region_id, request.admin_name, request.email, date.today(), hashed, "ADMIN"))
            employee_id = (await cur.fetchone())["id"]
    access_token = create_access_token(data={"sub": str(employee_id), "tenant_id": str(tenant_id), "role": "ADMIN"})
    return SignupResponse(tenant_id=tenant_id, employee_id=employee_id, access_token=access_token)

