from uuid import UUID

from app.repositories import leave_type_repository


async def get_dropdown_options(region_id: UUID) -> list[dict]:
    """Region-scoped active leave types for the Apply Leave form."""
    return await leave_type_repository.find_active_by_region(region_id)
