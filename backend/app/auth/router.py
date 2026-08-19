"""Authentication routes.

Two endpoints, and no third. There is no registration: a public sign-up against
a tenant-admin table would let anyone make themselves an administrator. Accounts
come from scripts/create_admin.py.
"""

from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import EmailStr, Field

from app.schemas import CamelIn, CamelModel, DataResponse

from .dependencies import require_admin
from .service import Principal, login

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginIn(CamelIn):
    """The three fields on the sign-in card."""

    org_name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class AdminOut(CamelModel):
    id: str
    email: str
    name: str | None
    tenant_id: str
    org_name: str


class SessionOut(CamelModel):
    token: str
    expires_at: datetime
    admin: AdminOut


@router.post("/login", response_model=DataResponse[SessionOut])
async def sign_in(payload: LoginIn):
    """Exchange organisation, email and password for a bearer token.

    Every failure is the same 401 with the same wording. Distinguishing an
    unknown organisation from a wrong password would let someone enumerate which
    organisations and addresses exist.
    """
    result = await login(
        org_name=payload.org_name,
        email=str(payload.email),
        password=payload.password,
    )
    result["admin"] = {k: str(v) if v is not None else None for k, v in result["admin"].items()}
    return {"data": result}


@router.get("/me", response_model=DataResponse[dict])
async def whoami(principal: Principal = Depends(require_admin)):
    """Who the current token belongs to.

    The UI calls this on load to decide whether a stored token is still good,
    rather than waiting for the first real request to fail.
    """
    return {
        "data": {
            "adminId": str(principal.admin_id),
            "tenantId": str(principal.tenant_id),
            "email": principal.email,
            "orgName": principal.org_name,
        }
    }
