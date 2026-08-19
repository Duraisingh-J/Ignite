from uuid import UUID

from fastapi import APIRouter, Query, status, Depends
from app.auth import get_current_user, CurrentUser

from app.schemas import DataResponse, RegionCreate, RegionOut
from app.services import region_service

router = APIRouter(prefix="/regions", tags=["regions"])


@router.get("", response_model=DataResponse[list[RegionOut]])
async def list_regions(current_user: CurrentUser = Depends(get_current_user)):
    rows = await region_service.list_by_tenant(current_user.tenant_id)
    return {"data": [RegionOut.model_validate(r, from_attributes=True) for r in rows]}


@router.post("", status_code=status.HTTP_201_CREATED, response_model=DataResponse[RegionOut])
async def create_region(payload: RegionCreate):
    created = await region_service.create(
        tenant_id=current_user.tenant_id,
        code=payload.code.strip(),
        country_name=payload.country_name.strip(),
        work_days=payload.work_days,
        timezone=payload.timezone.strip(),
    )
    return {"data": RegionOut.model_validate(created, from_attributes=True)}


@router.delete("/{region_id}", response_model=DataResponse[dict])
async def delete_region(region_id: UUID):
    """Delete a region. Refused (409) while employees are assigned to it.

    Its leave types and holidays cascade; the response reports how many.
    """
    return {"data": await region_service.delete(region_id)}
