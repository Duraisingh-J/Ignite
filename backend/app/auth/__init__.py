"""Tenant administrator authentication.

A self-contained module. To protect a route:

    from app.auth import require_admin, Principal

    @router.delete("/{id}")
    async def remove(id: UUID, admin: Principal = Depends(require_admin)):
        ...

To remove authentication entirely: drop `include_router(auth_router)` from
main.py, delete the Depends() arguments, and this package. Nothing else in the
application imports from it.

Every route requires a token. There is no bypass — see dependencies.py for why
the one that existed was removed rather than defaulted to safe.

The identity switcher still works, but now only inside an authenticated session:
one real credential gates the application, and the switcher moves between people
within it so multi-tier approval stays demonstrable.
"""

from .dependencies import assert_startup_safe, require_admin
from .router import router
from .service import Principal, create_admin, login, principal_from_token

__all__ = [
    "router",
    "require_admin",
    "assert_startup_safe",
    "Principal",
    "login",
    "create_admin",
    "principal_from_token",
]
