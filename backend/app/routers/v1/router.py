from fastapi import APIRouter

from app.routers.v1 import (
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


@router.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok", "version": "v1"}


router.include_router(leave_types.router)
router.include_router(leave_requests.router)
router.include_router(employees.router)
router.include_router(balances.router)
router.include_router(holidays.router)
router.include_router(regions.router)
router.include_router(roles.router)
router.include_router(stats.router)
