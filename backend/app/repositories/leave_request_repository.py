from datetime import date
from uuid import UUID

from app.db import fetch_all, fetch_one

_WITH_NAMES = """
    SELECT lr.id, lr.tenant_id, lr.employee_id, lr.leave_type_id,
           lt.name AS leave_type_name,
           e.name  AS employee_name,
           r.country_name AS region_country,
           lr.start_date, lr.end_date, lr.status, lr.reason, lr.submitted_at
      FROM leave_request lr
      JOIN leave_type lt ON lt.id = lr.leave_type_id
      JOIN employee   e  ON e.id  = lr.employee_id
      JOIN region     r  ON r.id  = e.region_id
"""


async def insert(
    *,
    tenant_id: UUID,
    employee_id: UUID,
    leave_type_id: UUID,
    start_date: date,
    end_date: date,
    reason: str | None,
) -> dict:
    row = await fetch_one(
        """
        INSERT INTO leave_request
            (tenant_id, employee_id, leave_type_id, start_date, end_date, status, reason)
        VALUES (%s, %s, %s, %s, %s, 'PENDING', %s)
        RETURNING id
        """,
        (tenant_id, employee_id, leave_type_id, start_date, end_date, reason),
    )
    assert row is not None
    created = await find_by_id(row["id"])
    assert created is not None
    return created


async def find_by_id(request_id: UUID) -> dict | None:
    return await fetch_one(_WITH_NAMES + " WHERE lr.id = %s", (request_id,))


async def find_by_employee(employee_id: UUID) -> list[dict]:
    """AdminDashboard.getRequestsByEmployee(employeeId)"""
    return await fetch_all(
        _WITH_NAMES + " WHERE lr.employee_id = %s ORDER BY lr.submitted_at DESC",
        (employee_id,),
    )


async def find_by_manager(manager_id: UUID, status: str | None) -> list[dict]:
    """Requests submitted by a manager's direct reports."""
    if status:
        return await fetch_all(
            _WITH_NAMES
            + " WHERE e.manager_id = %s AND lr.status = %s ORDER BY lr.submitted_at DESC",
            (manager_id, status),
        )
    return await fetch_all(
        _WITH_NAMES + " WHERE e.manager_id = %s ORDER BY lr.submitted_at DESC",
        (manager_id,),
    )


async def find_on_leave(manager_id: UUID, on_day: date) -> list[dict]:
    """Approved leave covering a given day, for a manager's team."""
    return await fetch_all(
        _WITH_NAMES
        + """ WHERE e.manager_id = %s
                AND lr.status = 'APPROVED'
                AND %s BETWEEN lr.start_date AND lr.end_date
              ORDER BY e.name""",
        (manager_id, on_day),
    )


async def find_overlapping(
    employee_id: UUID, start: date, end: date, exclude_id: UUID | None = None
) -> list[dict]:
    """Live requests (PENDING/APPROVED) whose range intersects [start, end]."""
    sql = """
        SELECT id, start_date, end_date, status
          FROM leave_request
         WHERE employee_id = %s
           AND status IN ('PENDING', 'APPROVED')
           AND start_date <= %s
           AND end_date >= %s
    """
    params: tuple = (employee_id, end, start)
    if exclude_id is not None:
        sql += " AND id <> %s"
        params = params + (exclude_id,)
    return await fetch_all(sql, params)


async def update_status(request_id: UUID, status: str) -> dict | None:
    await fetch_one(
        "UPDATE leave_request SET status = %s WHERE id = %s RETURNING id",
        (status, request_id),
    )
    return await find_by_id(request_id)


# ---------- counts for the admin dashboard ----------
async def count_by_status(tenant_id: UUID, status: str) -> int:
    row = await fetch_one(
        "SELECT count(*) AS n FROM leave_request WHERE tenant_id = %s AND status = %s",
        (tenant_id, status),
    )
    return row["n"] if row else 0


async def count_on_leave(tenant_id: UUID, on_day: date) -> int:
    row = await fetch_one(
        """
        SELECT count(DISTINCT employee_id) AS n
          FROM leave_request
         WHERE tenant_id = %s AND status = 'APPROVED'
           AND %s BETWEEN start_date AND end_date
        """,
        (tenant_id, on_day),
    )
    return row["n"] if row else 0
