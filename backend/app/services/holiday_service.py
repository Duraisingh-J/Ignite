from datetime import date
from uuid import UUID

from app.errors import ApiError
from app.repositories import holiday_repository, region_repository
from app.services.holiday_expansion import occurrences_for_year


async def get_by_region(region_id: UUID, year: int | None = None) -> list[dict]:
    rows = await holiday_repository.find_by_region(region_id)
    # Projecting onto a year turns "Independence Day (anchored 2026)" into the
    # actual date employees care about this year.
    return occurrences_for_year(rows, year) if year else rows


async def get_by_tenant(tenant_id: UUID, year: int | None = None) -> list[dict]:
    rows = await holiday_repository.find_by_tenant(tenant_id)
    return occurrences_for_year(rows, year) if year else rows


async def create(
    *, tenant_id: UUID, region_id: UUID, day: date, name: str, recurrence: str
) -> dict:
    region = await region_repository.find_by_id(region_id)
    if region is None:
        raise ApiError.bad_request("Unknown regionId")
    if region["tenant_id"] != tenant_id:
        raise ApiError.bad_request("regionId does not belong to that tenant")

    existing = await holiday_repository.find_by_region(region_id)

    # Exact-date clash (also enforced by UNIQUE (region_id, date)).
    if any(h["date"] == day for h in existing):
        raise ApiError.conflict(f"A holiday is already recorded for {day} in this region")

    # A recurring rule collides with any other rule on the same month/day,
    # regardless of anchor year — otherwise two rules would both fire annually.
    if recurrence == "ANNUAL":
        clash = next(
            (
                h
                for h in existing
                if h.get("recurrence") == "ANNUAL"
                and (h["date"].month, h["date"].day) == (day.month, day.day)
            ),
            None,
        )
        if clash:
            raise ApiError.conflict(
                f"An annual holiday already repeats on {day:%d %b} in this region",
                {"existing": clash["name"]},
            )

    return await holiday_repository.insert(
        tenant_id=tenant_id, region_id=region_id, day=day, name=name, recurrence=recurrence
    )
