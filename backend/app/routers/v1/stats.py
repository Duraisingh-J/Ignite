from datetime import date
from uuid import UUID

from fastapi import APIRouter, Query

from app.schemas import DataResponse, StatsOut
from app.services import stats_service

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=DataResponse[StatsOut])
async def get_stats(
    tenant_id: UUID = Query(..., alias="tenantId"),
    on_date: date | None = Query(None, alias="onDate"),
):
    """Admin dashboard counters, all computed from the database."""
    data = await stats_service.tenant_stats(tenant_id, on_date or date.today())
    return {"data": StatsOut.model_validate(data)}
