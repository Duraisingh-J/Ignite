from datetime import date
from uuid import UUID

from app.repositories import (
    employee_repository,
    holiday_repository,
    leave_request_repository,
    leave_type_repository,
    region_repository,
)


async def tenant_stats(tenant_id: UUID, today: date) -> dict:
    """Counts for the admin dashboard — all derived, nothing hardcoded."""
    return {
        "totalEmployees": await employee_repository.count_by_tenant(tenant_id),
        "pendingRequests": await leave_request_repository.count_by_status(tenant_id, "PENDING"),
        "employeesOnLeaveToday": await leave_request_repository.count_on_leave(tenant_id, today),
        "leaveTypes": await leave_type_repository.count_by_tenant(tenant_id),
        "regions": await region_repository.count_by_tenant(tenant_id),
        "holidays": await holiday_repository.count_by_tenant(tenant_id),
    }
