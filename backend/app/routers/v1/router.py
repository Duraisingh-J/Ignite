from fastapi import APIRouter, Depends

from app.auth import require_admin
from app.routers.v1 import (
    accrual_policies,
    balances,
    employees,
    holidays,
    leave_requests,
    leave_types,
    regions,
    roles,
    stats,
)

router = APIRouter(prefix="/api/v1")

# Everything below this line requires a valid administrator token — reads
# included. Two routes are deliberately outside it:
#
#   /auth/login   the one call that cannot require a token, or nobody could
#                 ever obtain one
#   /health       liveness. Kept open so a load balancer or container probe
#                 does not need credentials. It exposes no tenant data — only
#                 that the process is alive and which notification channels
#                 are configured.
_GUARD = [Depends(require_admin)]


@router.get("/health", tags=["health"])
async def health() -> dict:
    """Liveness, plus which notification channels are switched on.

    Reported here because "the email never arrived" is almost always a
    configuration question, and this answers it without reading the logs.
    """
    from app import notifications

    return {"status": "ok", "version": "v1", "notifications": notifications.channels_describe()}


router.include_router(leave_types.router, dependencies=_GUARD)
router.include_router(leave_requests.router, dependencies=_GUARD)
router.include_router(employees.router, dependencies=_GUARD)
router.include_router(balances.router, dependencies=_GUARD)
router.include_router(accrual_policies.router, dependencies=_GUARD)
router.include_router(holidays.router, dependencies=_GUARD)
router.include_router(regions.router, dependencies=_GUARD)
router.include_router(roles.router, dependencies=_GUARD)
router.include_router(stats.router, dependencies=_GUARD)
