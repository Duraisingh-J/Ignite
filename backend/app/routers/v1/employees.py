from uuid import UUID

from fastapi import APIRouter

from app.schemas import EmployeeOut, HolidayOut
from app.services import employee_service, holiday_service

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("/{employee_id}")
async def get_employee(employee_id: UUID) -> dict:
    """Bootstraps the UI: who am I, and which region/tenant am I in."""
    row = await employee_service.get_by_id(employee_id)
    return {"data": EmployeeOut.model_validate(row, from_attributes=True)}


@router.get("/{employee_id}/holidays")
async def list_holidays(employee_id: UUID) -> dict:
    """Holiday calendar for this employee's region."""
    employee = await employee_service.get_by_id(employee_id)
    rows = await holiday_service.get_by_region(employee["region_id"])
    return {"data": [HolidayOut.model_validate(r, from_attributes=True) for r in rows]}
