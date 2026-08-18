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
    *,
    region_id: UUID,
    name: str,
    is_paid: bool,
    is_active: bool,
    requires_approval: bool,
    approval_levels: int = 1,
    escalate_above_days: int | None = None,
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
        approval_levels=approval_levels,
        escalate_above_days=escalate_above_days,
    )


async def update(
    leave_type_id: UUID,
    *,
    approval_levels: int | None = None,
    escalate_above_days: int | None = None,
    clear_escalation: bool = False,
    is_active: bool | None = None,
) -> dict:
    if await leave_type_repository.find_by_id(leave_type_id) is None:
        raise ApiError.not_found("Leave type not found")
    updated = await leave_type_repository.update(
        leave_type_id,
        approval_levels=approval_levels,
        escalate_above_days=escalate_above_days,
        clear_escalation=clear_escalation,
        is_active=is_active,
    )
    assert updated is not None
    return updated
