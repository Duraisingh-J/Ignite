from datetime import date
from uuid import UUID

from fastapi import APIRouter, Query, status, Depends
from app.auth import get_current_user, CurrentUser

from app.schemas import (
    DataResponse,
    EmployeeCreate,
    EmployeeOut,
    EmployeeSummaryOut,
    EmployeeUpdate,
    HolidayOut,
    PagedResponse,
    PageMeta,
    TeamMemberOut,
)
from app.services import employee_service, holiday_service

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("", response_model=PagedResponse[EmployeeSummaryOut])
async def list_employees(
    current_user: CurrentUser = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """All employees in a tenant (admin view), paginated."""
    rows, total = await employee_service.list_by_tenant(current_user.tenant_id, limit, offset)
    return {
        "data": [EmployeeSummaryOut.model_validate(r, from_attributes=True) for r in rows],
        "meta": PageMeta(total=total, limit=limit, offset=offset),
    }


@router.post("", status_code=status.HTTP_201_CREATED, response_model=DataResponse[EmployeeOut])
async def create_employee(
    payload: EmployeeCreate,
    current_user: CurrentUser = Depends(get_current_user)
):
    created = await employee_service.create(
        tenant_id=current_user.tenant_id,
        region_id=payload.region_id,
        manager_id=payload.manager_id,
        name=payload.name.strip(),
        email=str(payload.email).lower(),
        join_date=payload.join_date,
    )
    return {"data": EmployeeOut.model_validate(created, from_attributes=True)}


@router.patch("/{employee_id}", response_model=DataResponse[EmployeeOut])
async def update_employee(
    employee_id: UUID, 
    payload: EmployeeUpdate,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Reassign an employee's manager, region or name."""
    # TODO: Auth check (tenant_id matches, role check)
    updated = await employee_service.update(
        employee_id,
        manager_id=payload.manager_id,
        clear_manager=payload.clear_manager,
        region_id=payload.region_id,
        name=payload.name.strip() if payload.name else None,
    )
    return {"data": EmployeeOut.model_validate(updated, from_attributes=True)}


@router.get("/{employee_id}", response_model=DataResponse[EmployeeOut])
async def get_employee(employee_id: UUID):
    """Bootstraps the UI: who am I, and which region/tenant am I in."""
    row = await employee_service.get_by_id(employee_id)
    return {"data": EmployeeOut.model_validate(row, from_attributes=True)}


@router.get("/{employee_id}/holidays", response_model=DataResponse[list[HolidayOut]])
async def list_holidays(
    employee_id: UUID,
    year: int | None = Query(None, ge=1970, le=2200),
):
    """Holiday calendar for this employee's region.

    Defaults to the current year so ANNUAL rules resolve to real dates.
    """
    employee = await employee_service.get_by_id(employee_id)
    rows = await holiday_service.get_by_region(employee["region_id"], year or date.today().year)
    return {"data": [HolidayOut.model_validate(r, from_attributes=True) for r in rows]}


@router.get("/{manager_id}/team", response_model=DataResponse[list[TeamMemberOut]])
async def get_team(
    manager_id: UUID,
    on_date: date | None = Query(None, alias="onDate"),
):
    """A manager's direct reports, flagged with who is on leave that day."""
    rows = await employee_service.get_team(manager_id, on_date or date.today())
    return {"data": [TeamMemberOut.model_validate(r, from_attributes=True) for r in rows]}


@router.delete("/{employee_id}", response_model=DataResponse[dict])
async def delete_employee(employee_id: UUID):
    """Delete an employee.

    Refused (409) while they have direct reports or own a pending approval —
    both would leave other people's requests unapprovable. Their own leave
    requests cascade; the response reports how many.
    """
    return {"data": await employee_service.delete(employee_id)}
