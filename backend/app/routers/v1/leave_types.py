from uuid import UUID

from fastapi import APIRouter, Query, status

from app.schemas import DataResponse, LeaveTypeCreate, LeaveTypeOut, LeaveTypeUpdate
from app.services import leave_type_service

router = APIRouter(prefix="/leave-types", tags=["leave-types"])


@router.get("", response_model=DataResponse[list[LeaveTypeOut]])
async def list_leave_types(
    region_id: UUID | None = Query(None, alias="regionId"),
    tenant_id: UUID | None = Query(None, alias="tenantId"),
    include_inactive: bool = Query(False, alias="includeInactive"),
):
    """LeaveType.getDropdownOptions(regionId), or every type in a tenant."""
    from app.errors import ApiError

    if region_id is None and tenant_id is None:
        raise ApiError.bad_request('Provide either "regionId" or "tenantId"')

    if region_id is not None:
        rows = await leave_type_service.list_for_region(region_id, include_inactive)
    else:
        rows = await leave_type_service.list_for_tenant(tenant_id)
    return {"data": [LeaveTypeOut.model_validate(r, from_attributes=True) for r in rows]}


@router.post("", status_code=status.HTTP_201_CREATED, response_model=DataResponse[LeaveTypeOut])
async def create_leave_type(payload: LeaveTypeCreate):
    created = await leave_type_service.create(
        region_id=payload.region_id,
        name=payload.name.strip(),
        is_paid=payload.is_paid,
        is_active=payload.is_active,
        requires_approval=payload.requires_approval,
        approval_levels=payload.approval_levels,
        escalate_above_days=payload.escalate_above_days,
    )
    return {"data": LeaveTypeOut.model_validate(created, from_attributes=True)}


@router.patch("/{leave_type_id}", response_model=DataResponse[LeaveTypeOut])
async def update_leave_type(leave_type_id: UUID, payload: LeaveTypeUpdate):
    """Change a type's approval depth.

    Only affects requests submitted afterwards: existing chains are frozen, so
    raising the tier count never retroactively reopens a decided request.
    """
    updated = await leave_type_service.update(
        leave_type_id,
        approval_levels=payload.approval_levels,
        escalate_above_days=payload.escalate_above_days,
        clear_escalation=payload.clear_escalation,
        is_active=payload.is_active,
    )
    return {"data": LeaveTypeOut.model_validate(updated, from_attributes=True)}
