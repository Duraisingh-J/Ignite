from datetime import date
from uuid import UUID

from fastapi import APIRouter, Query, status

from app.errors import ApiError
from app.schemas import (
    ApprovalOut,
    DataResponse,
    LeaveRequestCreate,
    LeaveRequestDecision,
    LeaveRequestOut,
    LeaveStatus,
)
from app.services import leave_request_service

router = APIRouter(prefix="/leave-requests", tags=["leave-requests"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=DataResponse[LeaveRequestOut])
async def create_leave_request(payload: LeaveRequestCreate):
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


@router.get("", response_model=DataResponse[list[LeaveRequestOut]])
async def list_leave_requests(employee_id: UUID = Query(..., alias="employeeId")):
    """getRequestsByEmployee(employeeId)"""
    rows = await leave_request_service.get_by_employee(employee_id)
    return {"data": [LeaveRequestOut.model_validate(r) for r in rows]}


@router.get("/approvals", response_model=DataResponse[list[ApprovalOut]])
async def list_approvals(
    manager_id: UUID = Query(..., alias="managerId"),
    request_status: LeaveStatus | None = Query(None, alias="status"),
):
    """The manager's queue: requests raised by their direct reports."""
    rows = await leave_request_service.get_for_manager(
        manager_id, request_status.value if request_status else None
    )
    return {"data": [ApprovalOut.model_validate(r) for r in rows]}


@router.get("/on-leave", response_model=DataResponse[list[ApprovalOut]])
async def list_on_leave(
    manager_id: UUID = Query(..., alias="managerId"),
    on_date: date | None = Query(None, alias="onDate"),
):
    """Approved leave covering a given day, for the team calendar."""
    rows = await leave_request_service.get_team_on_leave(manager_id, on_date or date.today())
    return {"data": [ApprovalOut.model_validate(r) for r in rows]}


@router.patch("/{request_id}", response_model=DataResponse[LeaveRequestOut])
async def decide_leave_request(request_id: UUID, payload: LeaveRequestDecision):
    """Approve, reject or cancel a request. Illegal transitions return 409."""
    updated = await leave_request_service.decide(request_id, payload.status.value)
    return {"data": LeaveRequestOut.model_validate(updated)}
