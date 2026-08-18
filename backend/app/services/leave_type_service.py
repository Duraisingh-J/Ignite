from uuid import UUID

from app.errors import ApiError
from app.repositories import leave_type_repository, region_repository


async def get_dropdown_options(region_id: UUID) -> list[dict]:
    """Active types only — this is what the Apply Leave dropdown uses."""
    return await leave_type_repository.find_active_by_region(region_id)


async def list_for_region(region_id: UUID, include_inactive: bool) -> list[dict]:
    if include_inactive:
        return await leave_type_repository.find_by_region(region_id)
    return await leave_type_repository.find_active_by_region(region_id)


async def list_for_tenant(tenant_id: UUID) -> list[dict]:
    return await leave_type_repository.find_by_tenant(tenant_id)


async def create(
    *, region_id: UUID, name: str, is_paid: bool, is_active: bool, requires_approval: bool
) -> dict:
    if await region_repository.find_by_id(region_id) is None:
        raise ApiError.bad_request("Unknown regionId")
    existing = await leave_type_repository.find_by_region(region_id)
    if any(t["name"].lower() == name.lower() for t in existing):
        raise ApiError.conflict(f'A leave type named "{name}" already exists in this region')
    return await leave_type_repository.insert(
        region_id=region_id,
        name=name,
        is_paid=is_paid,
        is_active=is_active,
        requires_approval=requires_approval,
    )
