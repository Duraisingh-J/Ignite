from uuid import UUID

from fastapi import APIRouter, Query

from app.schemas import DataResponse, RegionOut
from app.services import region_service

router = APIRouter(prefix="/regions", tags=["regions"])


@router.get("", response_model=DataResponse[list[RegionOut]])
async def list_regions(tenant_id: UUID = Query(..., alias="tenantId")):
    rows = await region_service.list_by_tenant(tenant_id)
    return {"data": [RegionOut.model_validate(r, from_attributes=True) for r in rows]}
