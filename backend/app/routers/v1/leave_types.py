from uuid import UUID

from fastapi import APIRouter, Query

from app.schemas import LeaveTypeOut
from app.services import leave_type_service

router = APIRouter(prefix="/leave-types", tags=["leave-types"])


@router.get("")
async def list_leave_types(region_id: UUID = Query(..., alias="regionId")) -> dict:
    """LeaveType.getDropdownOptions(regionId)"""
    rows = await leave_type_service.get_dropdown_options(region_id)
    return {"data": [LeaveTypeOut.model_validate(r, from_attributes=True) for r in rows]}
