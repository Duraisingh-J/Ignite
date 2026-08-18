from datetime import date
from uuid import UUID

from app.errors import ApiError
from app.repositories import (
    employee_repository,
    holiday_repository,
    leave_request_repository,
    leave_type_repository,
)
from app.services.working_days import DayBreakdown, calc_working_days

# Only these transitions are legal. PENDING is the only decidable state, and
# terminal states never change again.
_ALLOWED_TRANSITIONS = {
    "PENDING": {"APPROVED", "REJECTED", "CANCELLED"},
    "APPROVED": {"CANCELLED"},
    "REJECTED": set(),
    "CANCELLED": set(),
}


def _breakdown_for(row: dict, holiday_dates: set[date]) -> DayBreakdown:
    return calc_working_days(row["start_date"], row["end_date"], holiday_dates)


def _to_dto(row: dict, breakdown: DayBreakdown) -> dict:
    return {
        "id": row["id"],
        "employeeId": row["employee_id"],
        "leaveTypeId": row["leave_type_id"],
        "leaveTypeName": row["leave_type_name"],
        "startDate": row["start_date"],
        "endDate": row["end_date"],
        "status": row["status"],
        "reason": row["reason"],
        "submittedAt": row["submitted_at"],
        "workingDays": breakdown.chargeable_days,
        "breakdown": breakdown.to_camel(),
    }


def _to_approval_dto(row: dict, breakdown: DayBreakdown) -> dict:
    return {
        "id": row["id"],
        "employeeId": row["employee_id"],
        "employeeName": row["employee_name"],
        "regionCountry": row["region_country"],
        "leaveTypeName": row["leave_type_name"],
        "startDate": row["start_date"],
        "endDate": row["end_date"],
        "status": row["status"],
        "reason": row["reason"],
        "submittedAt": row["submitted_at"],
        "workingDays": breakdown.chargeable_days,
        "breakdown": breakdown.to_camel(),
    }


async def _holidays_for_region(region_id: UUID) -> set[date]:
    rows = await holiday_repository.find_by_region(region_id)
    return {r["date"] for r in rows}


# ============================ submit ============================
async def submit(
    *,
    employee_id: UUID,
    leave_type_id: UUID,
    start_date: date,
    end_date: date,
    reason: str | None,
) -> dict:
    """LeaveRequest.submit()"""
    employee = await employee_repository.find_by_id(employee_id)
    if employee is None:
        raise ApiError.not_found("Employee not found")

    leave_type = await leave_type_repository.find_by_id(leave_type_id)
    if leave_type is None or not leave_type["is_active"]:
        raise ApiError.bad_request("Selected leave type is not available")

    # Enforce the model's region scoping (populates_region_scoped_dropdown).
    if leave_type["region_id"] != employee["region_id"]:
        raise ApiError.bad_request("Selected leave type is not available in your region")

    # excludes_dates_via_region: drop weekends + this region's holidays.
    holidays = await holiday_repository.find_dates_in_range(
        employee["region_id"], start_date, end_date
    )
    breakdown = calc_working_days(start_date, end_date, holidays)
    if breakdown.chargeable_days <= 0:
        raise ApiError.bad_request(
            "This range has no working days to charge — it's all weekends/holidays"
        )

    overlaps = await leave_request_repository.find_overlapping(employee_id, start_date, end_date)
    if overlaps:
        raise ApiError.conflict(
            "You already have a request covering these dates",
            {"conflictingIds": [str(o["id"]) for o in overlaps]},
        )

    created = await leave_request_repository.insert(
        tenant_id=employee["tenant_id"],
        employee_id=employee_id,
        leave_type_id=leave_type_id,
        start_date=start_date,
        end_date=end_date,
        reason=reason,
    )
    return _to_dto(created, breakdown)


# ============================ reads ============================
async def get_by_employee(employee_id: UUID) -> list[dict]:
    """AdminDashboard.getRequestsByEmployee(employeeId)"""
    employee = await employee_repository.find_by_id(employee_id)
    if employee is None:
        raise ApiError.not_found("Employee not found")

    rows = await leave_request_repository.find_by_employee(employee_id)
    if not rows:
        return []
    holidays = await _holidays_for_region(employee["region_id"])
    return [_to_dto(r, _breakdown_for(r, holidays)) for r in rows]


async def get_for_manager(manager_id: UUID, status: str | None) -> list[dict]:
    """Requests raised by a manager's direct reports (the approvals queue)."""
    manager = await employee_repository.find_by_id(manager_id)
    if manager is None:
        raise ApiError.not_found("Manager not found")

    rows = await leave_request_repository.find_by_manager(manager_id, status)
    if not rows:
        return []
    # Reports share the manager's tenant but could differ by region, so cache
    # holiday sets per region rather than assuming one.
    cache: dict[UUID, set[date]] = {}
    out = []
    for r in rows:
        emp = await employee_repository.find_by_id(r["employee_id"])
        region_id = emp["region_id"] if emp else manager["region_id"]
        if region_id not in cache:
            cache[region_id] = await _holidays_for_region(region_id)
        out.append(_to_approval_dto(r, _breakdown_for(r, cache[region_id])))
    return out


async def get_team_on_leave(manager_id: UUID, on_day: date) -> list[dict]:
    manager = await employee_repository.find_by_id(manager_id)
    if manager is None:
        raise ApiError.not_found("Manager not found")

    rows = await leave_request_repository.find_on_leave(manager_id, on_day)
    if not rows:
        return []
    holidays = await _holidays_for_region(manager["region_id"])
    return [_to_approval_dto(r, _breakdown_for(r, holidays)) for r in rows]


# ============================ decide ============================
async def decide(request_id: UUID, new_status: str) -> dict:
    """Approve / reject / cancel a request, enforcing legal transitions."""
    row = await leave_request_repository.find_by_id(request_id)
    if row is None:
        raise ApiError.not_found("Leave request not found")

    current = row["status"]
    if new_status == current:
        raise ApiError.conflict(f"Request is already {current}")
    if new_status not in _ALLOWED_TRANSITIONS[current]:
        raise ApiError.conflict(
            f"Cannot change status from {current} to {new_status}",
            {"allowed": sorted(_ALLOWED_TRANSITIONS[current])},
        )

    updated = await leave_request_repository.update_status(request_id, new_status)
    assert updated is not None

    employee = await employee_repository.find_by_id(updated["employee_id"])
    holidays = await _holidays_for_region(employee["region_id"]) if employee else set()
    return _to_dto(updated, _breakdown_for(updated, holidays))
