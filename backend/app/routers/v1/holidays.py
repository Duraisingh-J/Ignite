from uuid import UUID

from fastapi import APIRouter, Query, status

from app.errors import ApiError
from app.schemas import DataResponse, HolidayCreate, HolidayOut
from app.services import holiday_service

router = APIRouter(prefix="/holidays", tags=["holidays"])


@router.get("", response_model=DataResponse[list[HolidayOut]])
async def list_holidays(
    region_id: UUID | None = Query(None, alias="regionId"),
    tenant_id: UUID | None = Query(None, alias="tenantId"),
    year: int | None = Query(None, ge=1970, le=2200),
):
    """List holidays. Pass ?year= to project ANNUAL rules onto that year."""
    if region_id is None and tenant_id is None:
        raise ApiError.bad_request('Provide either "regionId" or "tenantId"')
    rows = (
        await holiday_service.get_by_region(region_id, year)
        if region_id is not None
        else await holiday_service.get_by_tenant(tenant_id, year)
    )
    return {"data": [HolidayOut.model_validate(r, from_attributes=True) for r in rows]}


@router.post("", status_code=status.HTTP_201_CREATED, response_model=DataResponse[HolidayOut])
async def create_holiday(payload: HolidayCreate):
    created = await holiday_service.create(
        tenant_id=payload.tenant_id,
        region_id=payload.region_id,
        day=payload.date,
        name=payload.name.strip(),
        recurrence=payload.recurrence.value,
    )
    return {"data": HolidayOut.model_validate(created, from_attributes=True)}
