from datetime import date
from uuid import UUID

from app.db import fetch_all


async def find_by_region(region_id: UUID) -> list[dict]:
    return await fetch_all(
        """
        SELECT id, region_id, date, name
          FROM holiday_calendar
         WHERE region_id = %s
         ORDER BY date
        """,
        (region_id,),
    )


async def find_dates_in_range(region_id: UUID, start: date, end: date) -> set[date]:
    rows = await fetch_all(
        """
        SELECT date
          FROM holiday_calendar
         WHERE region_id = %s AND date BETWEEN %s AND %s
        """,
        (region_id, start, end),
    )
    return {r["date"] for r in rows}
