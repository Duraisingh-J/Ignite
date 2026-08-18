from uuid import UUID

from fastapi import APIRouter, Query, status

from app.schemas import LeaveRequestCreate, LeaveRequestOut
from app.services import leave_request_service

router = APIRouter(prefix="/leave-requests", tags=["leave-requests"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_leave_request(payload: LeaveRequestCreate) -> dict:
    """LeaveRequest.submit()"""
    reason = payload.reason.strip() if payload.reason else None
    created = await leave_request_service.submit(
        employee_id=payload.employee_id,
        leave_type_id=payload.leave_type_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=reason or None,
    )
    return {"data": LeaveRequestOut.model_validate(created)}


@router.get("")
async def list_leave_requests(
    employee_id: UUID = Query(..., alias="employeeId"),
) -> dict:
    """AdminDashboard.getRequestsByEmployee(employeeId)"""
    rows = await leave_request_service.get_by_employee(employee_id)
    return {"data": [LeaveRequestOut.model_validate(r) for r in rows]}
