from datetime import date
from uuid import UUID

from app.errors import ApiError
from app.repositories import holiday_repository, region_repository


async def get_by_region(region_id: UUID) -> list[dict]:
    return await holiday_repository.find_by_region(region_id)


async def get_by_tenant(tenant_id: UUID) -> list[dict]:
    return await holiday_repository.find_by_tenant(tenant_id)


async def create(*, tenant_id: UUID, region_id: UUID, day: date, name: str) -> dict:
    region = await region_repository.find_by_id(region_id)
    if region is None:
        raise ApiError.bad_request("Unknown regionId")
    if region["tenant_id"] != tenant_id:
        raise ApiError.bad_request("regionId does not belong to that tenant")

    # UNIQUE (region_id, date) in the schema; check first for a clean 409.
    existing = await holiday_repository.find_by_region(region_id)
    if any(h["date"] == day for h in existing):
        raise ApiError.conflict(f"A holiday is already recorded for {day} in this region")

    return await holiday_repository.insert(
        tenant_id=tenant_id, region_id=region_id, day=day, name=name
    )
