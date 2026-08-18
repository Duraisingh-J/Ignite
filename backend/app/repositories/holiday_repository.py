from datetime import date
from uuid import UUID

from app.db import fetch_all, fetch_one

_COLS = "id, region_id, date, name"


async def find_by_region(region_id: UUID) -> list[dict]:
    return await fetch_all(
        f"SELECT {_COLS} FROM holiday_calendar WHERE region_id = %s ORDER BY date", (region_id,)
    )


async def find_by_tenant(tenant_id: UUID) -> list[dict]:
    return await fetch_all(
        f"SELECT {_COLS} FROM holiday_calendar WHERE tenant_id = %s ORDER BY date", (tenant_id,)
    )


async def find_dates_in_range(region_id: UUID, start: date, end: date) -> set[date]:
    rows = await fetch_all(
        "SELECT date FROM holiday_calendar WHERE region_id = %s AND date BETWEEN %s AND %s",
        (region_id, start, end),
    )
    return {r["date"] for r in rows}


async def insert(*, tenant_id: UUID, region_id: UUID, day: date, name: str) -> dict:
    row = await fetch_one(
        f"""INSERT INTO holiday_calendar (tenant_id, region_id, date, name)
            VALUES (%s, %s, %s, %s) RETURNING {_COLS}""",
        (tenant_id, region_id, day, name),
    )
    assert row is not None
    return row


async def count_by_tenant(tenant_id: UUID) -> int:
    row = await fetch_one(
        "SELECT count(*) AS n FROM holiday_calendar WHERE tenant_id = %s", (tenant_id,)
    )
    return row["n"] if row else 0
