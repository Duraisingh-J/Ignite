from datetime import date
from uuid import UUID

from app.db import fetch_all, fetch_one


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
        RETURNING id, tenant_id, employee_id, leave_type_id,
                  start_date, end_date, status, reason, submitted_at
        """,
        (tenant_id, employee_id, leave_type_id, start_date, end_date, reason),
    )
    assert row is not None  # INSERT ... RETURNING always yields a row
    return row


async def find_by_employee(employee_id: UUID) -> list[dict]:
    """AdminDashboard.getRequestsByEmployee(employeeId)"""
    return await fetch_all(
        """
        SELECT lr.id, lr.employee_id, lr.leave_type_id,
               lt.name AS leave_type_name,
               lr.start_date, lr.end_date, lr.status, lr.reason, lr.submitted_at
          FROM leave_request lr
          JOIN leave_type lt ON lt.id = lr.leave_type_id
         WHERE lr.employee_id = %s
         ORDER BY lr.submitted_at DESC
        """,
        (employee_id,),
    )


async def find_overlapping(employee_id: UUID, start: date, end: date) -> list[dict]:
    """Live requests (PENDING/APPROVED) whose range intersects [start, end]."""
    return await fetch_all(
        """
        SELECT id, start_date, end_date, status
          FROM leave_request
         WHERE employee_id = %s
           AND status IN ('PENDING', 'APPROVED')
           AND start_date <= %s
           AND end_date >= %s
        """,
        (employee_id, end, start),
    )
