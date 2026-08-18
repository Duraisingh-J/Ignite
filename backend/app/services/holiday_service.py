from uuid import UUID

from app.repositories import holiday_repository


async def get_by_region(region_id: UUID) -> list[dict]:
    return await holiday_repository.find_by_region(region_id)
