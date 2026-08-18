from datetime import date
from uuid import UUID

from app.db import fetch_all, fetch_one

_BASE_SELECT = """
    SELECT e.id, e.tenant_id, e.manager_id, e.region_id,
           e.name, e.email, e.join_date,
           r.code AS region_code, r.country_name AS region_country,
           m.name AS manager_name
      FROM employee e
      JOIN region r ON r.id = e.region_id
      LEFT JOIN employee m ON m.id = e.manager_id
"""


async def find_by_id(employee_id: UUID) -> dict | None:
    return await fetch_one(_BASE_SELECT + " WHERE e.id = %s", (employee_id,))


async def find_by_email(email: str) -> dict | None:
    return await fetch_one(_BASE_SELECT + " WHERE lower(e.email) = lower(%s)", (email,))


async def find_by_tenant(tenant_id: UUID, limit: int, offset: int) -> list[dict]:
    return await fetch_all(
        _BASE_SELECT + " WHERE e.tenant_id = %s ORDER BY e.name LIMIT %s OFFSET %s",
        (tenant_id, limit, offset),
    )


async def count_by_tenant(tenant_id: UUID) -> int:
    row = await fetch_one("SELECT count(*) AS n FROM employee WHERE tenant_id = %s", (tenant_id,))
    return row["n"] if row else 0


async def find_by_manager(manager_id: UUID, today: date) -> list[dict]:
    """A manager's direct reports, with today's approved-leave state joined in."""
    return await fetch_all(
        """
        SELECT e.id, e.name, e.email, e.join_date,
               (lr.id IS NOT NULL) AS on_leave,
               lr.end_date          AS leave_until
          FROM employee e
          LEFT JOIN LATERAL (
              SELECT id, end_date
                FROM leave_request
               WHERE employee_id = e.id
                 AND status = 'APPROVED'
                 AND %s BETWEEN start_date AND end_date
               LIMIT 1
          ) lr ON TRUE
         WHERE e.manager_id = %s
         ORDER BY e.name
        """,
        (today, manager_id),
    )


async def insert(
    *,
    tenant_id: UUID,
    region_id: UUID,
    manager_id: UUID | None,
    name: str,
    email: str,
    join_date: date,
) -> dict:
    row = await fetch_one(
        """
        INSERT INTO employee (tenant_id, region_id, manager_id, name, email, join_date)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (tenant_id, region_id, manager_id, name, email, join_date),
    )
    assert row is not None
    created = await find_by_id(row["id"])
    assert created is not None
    return created
