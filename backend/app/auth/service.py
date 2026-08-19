"""Login, and resolving a token back to an administrator.

The whole surface is three calls: `login`, `principal_from_token`, and
`create_admin` for the provisioning script. There is deliberately no
registration endpoint — a public sign-up against a tenant-admin table would let
anyone mint themselves an administrator.
"""

import logging
from dataclasses import dataclass
from uuid import UUID

from app.errors import ApiError
from app.repositories import admin_repository

from .passwords import dummy_verify, hash_password, verify_password
from .tokens import TokenError, issue, verify

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class Principal:
    """Who is making the request."""

    admin_id: UUID
    tenant_id: UUID
    email: str
    org_name: str


# A single generic failure for every login problem: unknown org, unknown email,
# wrong password, deactivated account. Distinguishing them tells an attacker
# which organisations exist and which addresses are real.
def _rejected() -> ApiError:
    return ApiError.unauthorized("Those details do not match an account")


async def login(*, org_name: str, email: str, password: str) -> dict:
    """Verify credentials and issue a token."""
    tenant = await admin_repository.find_tenant_by_org_name(org_name)
    if tenant is None:
        # Still burn the time a real verification would take, so a wrong org
        # name is not detectably faster than a wrong password.
        dummy_verify()
        raise _rejected()

    admin = await admin_repository.find_admin(tenant["id"], email)
    if admin is None:
        dummy_verify()
        raise _rejected()

    if not verify_password(password, admin["password_hash"]):
        raise _rejected()

    if not admin["is_active"]:
        raise _rejected()

    await admin_repository.touch_last_login(admin["id"])
    log.info("auth: %s signed in to %s", admin["email"], tenant["org_name"])

    signed = issue(
        admin_id=admin["id"],
        tenant_id=admin["tenant_id"],
        email=admin["email"],
        org_name=tenant["org_name"],
    )
    return {
        "token": signed["token"],
        "expiresAt": signed["expiresAt"],
        "admin": {
            "id": admin["id"],
            "email": admin["email"],
            "name": admin["name"],
            "tenantId": admin["tenant_id"],
            "orgName": tenant["org_name"],
        },
    }


async def principal_from_token(token: str) -> Principal:
    """Resolve a bearer token to the administrator it names.

    The account is re-read rather than trusted from the token's claims. A token
    stays valid until it expires, so an account deactivated an hour ago would
    otherwise keep working for the rest of its twelve hours.
    """
    try:
        claims = verify(token)
    except TokenError:
        raise ApiError.unauthorized("Session expired or invalid") from None

    admin = await admin_repository.find_admin_by_id(UUID(claims["sub"]))
    if admin is None or not admin["is_active"]:
        raise ApiError.unauthorized("Session expired or invalid")

    return Principal(
        admin_id=admin["id"],
        tenant_id=admin["tenant_id"],
        email=admin["email"],
        org_name=admin["org_name"],
    )


async def create_admin(
    *, org_name: str, email: str, password: str, name: str | None = None
) -> dict:
    """Provision an account. Used by scripts/create_admin.py, not by any route."""
    tenant = await admin_repository.find_tenant_by_org_name(org_name)
    if tenant is None:
        raise ApiError.bad_request(f"No organisation named {org_name!r}")

    if await admin_repository.find_admin(tenant["id"], email):
        raise ApiError.conflict(f"{email} is already an administrator of {org_name}")

    if len(password) < 8:
        raise ApiError.bad_request("Password must be at least 8 characters")

    return await admin_repository.insert_admin(
        tenant_id=tenant["id"],
        email=email,
        password_hash=hash_password(password),
        name=name,
    )
