from uuid import UUID

from app.errors import ApiError
from app.repositories import region_repository


async def list_by_tenant(tenant_id: UUID) -> list[dict]:
    return await region_repository.find_by_tenant(tenant_id)


async def get_by_id(region_id: UUID) -> dict:
    row = await region_repository.find_by_id(region_id)
    if row is None:
        raise ApiError.not_found("Region not found")
    return row


async def create(
    *, tenant_id: UUID, code: str, country_name: str, work_days: list[int], timezone: str
) -> dict:
    if await region_repository.find_by_code(tenant_id, code):
        raise ApiError.conflict(f'A region with code "{code}" already exists in this tenant')
    # An empty working week would make every request zero chargeable days.
    if not work_days:
        raise ApiError.bad_request("workDays must contain at least one weekday")
    return await region_repository.insert(
        tenant_id=tenant_id,
        code=code.upper(),
        country_name=country_name,
        work_days=sorted(set(work_days)),
        timezone=timezone,
    )
