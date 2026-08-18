from datetime import date
from uuid import UUID

from app.db import fetch_all, fetch_one

_COLS = "id, region_id, date, name, recurrence"


async def find_by_region(region_id: UUID) -> list[dict]:
    return await fetch_all(
        f"SELECT {_COLS} FROM holiday_calendar WHERE region_id = %s ORDER BY date", (region_id,)
    )


async def find_by_tenant(tenant_id: UUID) -> list[dict]:
    return await fetch_all(
        f"SELECT {_COLS} FROM holiday_calendar WHERE tenant_id = %s ORDER BY date", (tenant_id,)
    )


async def find_dates_in_range(region_id: UUID, start: date, end: date) -> set[date]:
    """Concrete holiday dates in [start, end], with ANNUAL rules expanded.

    ANNUAL rows cannot be filtered by a BETWEEN on the stored date (their
    anchor year is arbitrary), so they are fetched whole and expanded in
    Python; one-off rows are still narrowed in SQL.
    """
    rows = await fetch_all(
        f"""SELECT {_COLS} FROM holiday_calendar
             WHERE region_id = %s
               AND (recurrence = 'ANNUAL' OR date BETWEEN %s AND %s)""",
        (region_id, start, end),
    )
    from app.services.holiday_expansion import expand

    return expand(rows, start, end)


async def insert(
    *, tenant_id: UUID, region_id: UUID, day: date, name: str, recurrence: str
) -> dict:
    row = await fetch_one(
        f"""INSERT INTO holiday_calendar (tenant_id, region_id, date, name, recurrence)
            VALUES (%s, %s, %s, %s, %s) RETURNING {_COLS}""",
        (tenant_id, region_id, day, name, recurrence),
    )
    assert row is not None
    return row


async def count_by_tenant(tenant_id: UUID) -> int:
    row = await fetch_one(
        "SELECT count(*) AS n FROM holiday_calendar WHERE tenant_id = %s", (tenant_id,)
    )
    return row["n"] if row else 0
