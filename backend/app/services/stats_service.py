from datetime import date
from uuid import UUID

from app.db import fetch_all
from app.repositories import (
    employee_repository,
    holiday_repository,
    leave_request_repository,
    leave_type_repository,
    region_repository,
)


async def _requests_by_status(tenant_id: UUID) -> list[dict]:
    rows = await fetch_all(
        """SELECT status AS label, count(*) AS value
             FROM leave_request WHERE tenant_id = %s
            GROUP BY status ORDER BY count(*) DESC""",
        (tenant_id,),
    )
    return [{"label": r["label"], "value": r["value"]} for r in rows]


async def _employees_by_region(tenant_id: UUID) -> list[dict]:
    # LEFT JOIN so a region with nobody in it still reports zero rather than
    # silently vanishing from the breakdown.
    rows = await fetch_all(
        """SELECT r.country_name AS label, count(e.id) AS value
             FROM region r
             LEFT JOIN employee e ON e.region_id = r.id
            WHERE r.tenant_id = %s
            GROUP BY r.country_name ORDER BY count(e.id) DESC, r.country_name""",
        (tenant_id,),
    )
    return [{"label": r["label"], "value": r["value"]} for r in rows]


async def _requests_by_leave_type(tenant_id: UUID) -> list[dict]:
    # Only types that have actually been used — an unused type is not a slice
    # of anything.
    rows = await fetch_all(
        """SELECT lt.name AS label, count(lr.id) AS value
             FROM leave_type lt
             JOIN leave_request lr ON lr.leave_type_id = lt.id
            WHERE lr.tenant_id = %s
            GROUP BY lt.name HAVING count(lr.id) > 0
            ORDER BY count(lr.id) DESC, lt.name""",
        (tenant_id,),
    )
    return [{"label": r["label"], "value": r["value"]} for r in rows]


async def tenant_stats(tenant_id: UUID, today: date) -> dict:
    """Counters and breakdowns for the admin dashboard.

    Everything is derived in SQL against the tenant — nothing is hardcoded, and
    a breakdown that has no rows comes back empty rather than invented.
    """
    return {
        "totalEmployees": await employee_repository.count_by_tenant(tenant_id),
        "pendingRequests": await leave_request_repository.count_by_status(tenant_id, "PENDING"),
        "employeesOnLeaveToday": await leave_request_repository.count_on_leave(tenant_id, today),
        "leaveTypes": await leave_type_repository.count_by_tenant(tenant_id),
        "regions": await region_repository.count_by_tenant(tenant_id),
        "holidays": await holiday_repository.count_by_tenant(tenant_id),
        "requestsByStatus": await _requests_by_status(tenant_id),
        "employeesByRegion": await _employees_by_region(tenant_id),
        "requestsByLeaveType": await _requests_by_leave_type(tenant_id),
    }
