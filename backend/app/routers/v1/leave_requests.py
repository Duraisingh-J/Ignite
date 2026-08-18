from datetime import date
from uuid import UUID

from fastapi import APIRouter, Query, status

from app.errors import ApiError
from app.schemas import (
    ApprovalDecision,
    ApprovalOut,
    ApprovalResultOut,
    ApprovalStepOut,
    DataResponse,
    LeaveRequestCreate,
    LeaveRequestDecision,
    LeaveRequestOut,
    LeaveStatus,
)
from app.services import approval_service, leave_request_service

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
    approver_id: UUID | None = Query(None, alias="approverId"),
    manager_id: UUID | None = Query(None, alias="managerId"),
    request_status: LeaveStatus | None = Query(None, alias="status"),
):
    """What is waiting on one person right now.

    `approverId` walks the approval chain, so it also surfaces tiers where the
    caller is not the employee's direct manager. `managerId` is the older
    direct-reports view, kept so existing callers keep working.
    """
    if approver_id is None and manager_id is None:
        raise ApiError.bad_request('Provide either "approverId" or "managerId"')

    if approver_id is not None:
        rows = await leave_request_service.get_pending_for_approver(approver_id)
    else:
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


@router.get("/{request_id}/approvals", response_model=DataResponse[list[ApprovalStepOut]])
async def get_approval_chain(request_id: UUID):
    """The frozen approval chain for one request — drives the Stepper timeline."""
    return {"data": [ApprovalStepOut.model_validate(s) for s in await approval_service.get_chain(request_id)]}


@router.patch(
    "/{request_id}/approvals/{step_id}", response_model=DataResponse[ApprovalResultOut]
)
async def decide_approval_step(request_id: UUID, step_id: UUID, payload: ApprovalDecision):
    """Approve or reject one tier.

    Rejected: 409 if the step is already decided, if the caller is not that
    step's approver, or if an earlier tier is still outstanding.
    """
    result = await approval_service.decide_step(
        step_id=step_id,
        approver_id=payload.approver_id,
        approve=payload.approve,
        comment=payload.comment.strip() if payload.comment else None,
    )
    return {"data": ApprovalResultOut.model_validate(result)}


@router.patch("/{request_id}", response_model=DataResponse[LeaveRequestOut])
async def decide_leave_request(request_id: UUID, payload: LeaveRequestDecision):
    """Cancel a request, or decide it without naming a tier.

    Kept so existing callers keep working. CANCELLED is applied directly;
    APPROVED/REJECTED are routed through the current approval step so the chain
    and leave_request.status can never disagree.
    """
    updated = await leave_request_service.decide(request_id, payload.status.value)
    return {"data": LeaveRequestOut.model_validate(updated)}
