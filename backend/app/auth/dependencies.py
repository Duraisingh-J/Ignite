"""The guard.

`require_admin` is what every protected route depends on. There is no bypass and
no switch that disables it.

An earlier version had one — `AUTH_ENABLED=false` admitted an anonymous
principal on every route. It existed to solve a real bootstrapping problem: the
first time authentication is added, the admin screens become unreachable and
there is no signed-in way to create the first account. That problem is now
solved properly, by `scripts/create_admin.py`, which provisions accounts
directly against the database and needs no running session.

With the reason gone, the switch was only a liability. A security control with
an off switch is one environment variable, one copied `.env`, one hurried deploy
away from being no control at all — and it fails open and silently, which is the
worst combination. So it is deleted rather than defaulted to safe: a flag that
does not exist cannot be set by accident.

What remains is the opposite protection. If the signing secret is still the
shipped default the application refuses to start, because a service that
believes it is protected and is not is worse than one that will not run.
"""

import logging

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.errors import ApiError

from .service import Principal, principal_from_token

log = logging.getLogger(__name__)

# auto_error=False so a missing header reaches our own code, which raises a 401
# with our error envelope. The library's own failure is a bare 403 in a
# different shape, which the UI would have to special-case.
_bearer = HTTPBearer(auto_error=False, description="Tenant administrator token")


async def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> Principal:
    """Resolve the caller, or refuse. No token, no access."""
    if credentials is None or not credentials.credentials:
        raise ApiError.unauthorized("Sign in to continue")
    return await principal_from_token(credentials.credentials)


def assert_startup_safe() -> None:
    """Refuse to run in a knowingly broken configuration.

    Called from the application lifespan. Raising here stops the process, which
    is the point.
    """
    if settings.jwt_secret_is_default:
        raise RuntimeError(
            "JWT_SECRET is still the shipped default.\n"
            "  Anyone who has read the source could mint an administrator token.\n"
            "  Set a real secret in backend/.env:\n"
            "      JWT_SECRET=<64 random hex characters>\n"
            "  Generate one with:\n"
            '      python -c "import secrets; print(secrets.token_hex(32))"'
        )
