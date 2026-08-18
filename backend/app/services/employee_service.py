from datetime import date
from uuid import UUID

from app.errors import ApiError
from app.repositories import employee_repository, region_repository


async def get_by_id(employee_id: UUID) -> dict:
    row = await employee_repository.find_by_id(employee_id)
    if row is None:
        raise ApiError.not_found("Employee not found")
    return row


async def list_by_tenant(tenant_id: UUID, limit: int, offset: int) -> tuple[list[dict], int]:
    rows = await employee_repository.find_by_tenant(tenant_id, limit, offset)
    total = await employee_repository.count_by_tenant(tenant_id)
    return rows, total


async def get_team(manager_id: UUID, on_day: date) -> list[dict]:
    manager = await employee_repository.find_by_id(manager_id)
    if manager is None:
        raise ApiError.not_found("Manager not found")
    return await employee_repository.find_by_manager(manager_id, on_day)


async def create(
    *,
    tenant_id: UUID,
    region_id: UUID,
    manager_id: UUID | None,
    name: str,
    email: str,
    join_date: date,
) -> dict:
    # Region must exist and belong to the tenant — otherwise an employee could
    # be filed under another org's region.
    region = await region_repository.find_by_id(region_id)
    if region is None:
        raise ApiError.bad_request("Unknown regionId")
    if region["tenant_id"] != tenant_id:
        raise ApiError.bad_request("regionId does not belong to that tenant")

    if manager_id is not None:
        manager = await employee_repository.find_by_id(manager_id)
        if manager is None:
            raise ApiError.bad_request("Unknown managerId")
        if manager["tenant_id"] != tenant_id:
            raise ApiError.bad_request("managerId belongs to a different tenant")

    if await employee_repository.find_by_email(email):
        raise ApiError.conflict("An employee with that email already exists")

    return await employee_repository.insert(
        tenant_id=tenant_id,
        region_id=region_id,
        manager_id=manager_id,
        name=name,
        email=email,
        join_date=join_date,
    )
