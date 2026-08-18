from uuid import UUID

from app.errors import ApiError
from app.repositories import employee_repository


async def get_by_id(employee_id: UUID) -> dict:
    row = await employee_repository.find_by_id(employee_id)
    if row is None:
        raise ApiError.not_found("Employee not found")
    return row
