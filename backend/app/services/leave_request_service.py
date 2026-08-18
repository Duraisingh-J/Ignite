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

    if end_date < start_date:
        raise ApiError.bad_request("End date can't be before the start date")

    # excludes_dates_via_region: drop weekends + this region's holidays.
    holidays = await holiday_repository.find_dates_in_range(
        employee["region_id"], start_date, end_date
    )
    breakdown = calc_working_days(start_date, end_date, holidays)
    if breakdown.chargeable_days <= 0:
        raise ApiError.bad_request(
            "This range has no working days to charge — it's all weekends/holidays"
        )

    overlaps = await leave_request_repository.find_overlapping(
        employee_id, start_date, end_date
    )
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
    created["leave_type_name"] = leave_type["name"]
    return _to_dto(created, breakdown)


async def get_by_employee(employee_id: UUID) -> list[dict]:
    """AdminDashboard.getRequestsByEmployee(employeeId)"""
    employee = await employee_repository.find_by_id(employee_id)
    if employee is None:
        raise ApiError.not_found("Employee not found")

    rows = await leave_request_repository.find_by_employee(employee_id)
    if not rows:
        return []

    holidays = await holiday_repository.find_by_region(employee["region_id"])
    holiday_dates = {h["date"] for h in holidays}
    return [
        _to_dto(row, calc_working_days(row["start_date"], row["end_date"], holiday_dates))
        for row in rows
    ]
