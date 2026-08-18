from datetime import date
from uuid import UUID

from app.db import fetch_all, fetch_one

_BASE_SELECT = """
    SELECT e.id, e.tenant_id, e.manager_id, e.region_id,
           e.name, e.email, e.join_date,
           r.code AS region_code, r.country_name AS region_country,
           r.work_days AS region_work_days,
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


async def update(
    employee_id: UUID,
    *,
    manager_id: UUID | None = None,
    clear_manager: bool = False,
    region_id: UUID | None = None,
    name: str | None = None,
) -> dict | None:
    """Partial update. `clear_manager` distinguishes "set to NULL" from "leave alone",
    which a plain None argument cannot express."""
    sets, params = [], []
    if clear_manager:
        sets.append("manager_id = NULL")
    elif manager_id is not None:
        sets.append("manager_id = %s")
        params.append(manager_id)
    if region_id is not None:
        sets.append("region_id = %s")
        params.append(region_id)
    if name is not None:
        sets.append("name = %s")
        params.append(name)
    if not sets:
        return await find_by_id(employee_id)

    params.append(employee_id)
    await fetch_one(
        f"UPDATE employee SET {', '.join(sets)} WHERE id = %s RETURNING id", tuple(params)
    )
    return await find_by_id(employee_id)


async def management_chain(employee_id: UUID) -> list[UUID]:
    """Ids from this employee upward to the top of the reporting line.

    Ordered by depth: index 0 is the employee, 1 the direct manager, 2 the
    skip-level, and so on. Approval tiers are assigned from this order, so the
    ORDER BY is load-bearing — without it Postgres may return the rows in any
    order and tier 1 could end up being the skip-level.

    Uses a recursive CTE with a depth cap so a pre-existing cycle in the data
    cannot spin forever.
    """
    rows = await fetch_all(
        """
        WITH RECURSIVE chain(id, manager_id, depth) AS (
            SELECT id, manager_id, 0 FROM employee WHERE id = %s
            UNION ALL
            SELECT e.id, e.manager_id, c.depth + 1
              FROM employee e JOIN chain c ON e.id = c.manager_id
             WHERE c.depth < 50
        )
        SELECT id FROM chain ORDER BY depth
        """,
        (employee_id,),
    )
    return [r["id"] for r in rows]
