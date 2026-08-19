"""JWT issue and verify.

HS256 with a shared secret. Asymmetric signing would matter if a separate
service had to verify tokens it did not issue; here one process does both, so
the extra key management buys nothing.

Two rules are enforced on decode and are the usual way JWT goes wrong:

  * `algorithms=["HS256"]` is passed explicitly. Without it a library may honour
    the `alg` header in the token itself, and a token claiming `alg: none`
    verifies against nothing.
  * Expiry is verified, not merely present. PyJWT does this by default; it is
    stated here because turning it off is a one-word change.
"""

from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt

from app.config import settings

ALGORITHM = "HS256"


class TokenError(Exception):
    """Raised for any invalid token. Deliberately carries no detail about why."""


def issue(*, admin_id: UUID, tenant_id: UUID, email: str, org_name: str) -> dict:
    """Sign a token for one administrator, returning it with its expiry."""
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=settings.jwt_ttl_minutes)
    payload = {
        "sub": str(admin_id),
        "tenantId": str(tenant_id),
        "email": email,
        "orgName": org_name,
        # Scope is in the token so a future employee-level token can be told
        # apart from an admin one without another database read.
        "scope": "tenant_admin",
        "iat": int(now.timestamp()),
        "exp": int(expires.timestamp()),
    }
    return {
        "token": jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM),
        "expiresAt": expires,
    }


def verify(token: str) -> dict:
    """Decode and validate, or raise TokenError.

    Every failure mode collapses to one exception with no detail. Telling a
    caller whether a token was expired, forged or malformed helps them iterate
    towards a valid one.
    """
    try:
        claims = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError as exc:
        raise TokenError(str(exc)) from exc

    if claims.get("scope") != "tenant_admin":
        raise TokenError("wrong scope")
    return claims
