from dataclasses import dataclass
from datetime import date
from uuid import UUID

from app.errors import ApiError
from app.repositories import (
    approval_repository,
    employee_repository,
    holiday_repository,
    leave_request_repository,
    leave_type_repository,
    region_repository,
)
from app.services.holiday_expansion import expand
from app.services.working_days import DayBreakdown, calc_working_days

# Only these transitions are legal. PENDING is the only decidable state, and
# terminal states never change again.
_ALLOWED_TRANSITIONS = {
    "PENDING": {"APPROVED", "REJECTED", "CANCELLED"},
    "APPROVED": {"CANCELLED"},
    "REJECTED": set(),
    "CANCELLED": set(),
}


def _breakdown_for(row: dict, ctx: "RegionContext") -> DayBreakdown:
    """Recompute a stored request's day count using its region's rules.

    Recurring rules must be expanded against *this request's* range, not the
    current year — otherwise a 2029 request never sees a holiday anchored in
    2026, and the read disagrees with what submit() calculated.
    """
    holidays = expand(ctx.holiday_rows, row["start_date"], row["end_date"])
    return calc_working_days(row["start_date"], row["end_date"], holidays, ctx.work_days)


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


@dataclass(frozen=True)
class RegionContext:
    """Everything the day calculation needs about one region.

    Fetched once per region and reused across that region's requests, so
    listing N requests stays 2 queries rather than 2N.
    """

    holiday_rows: list[dict]
    work_days: list[int]


async def _region_context(region_id: UUID) -> RegionContext:
    region = await region_repository.find_by_id(region_id)
    return RegionContext(
        holiday_rows=await holiday_repository.find_by_region(region_id),
        work_days=(region or {}).get("work_days") or [0, 1, 2, 3, 4],
    )


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
    region = await region_repository.find_by_id(employee["region_id"])
    work_days = (region or {}).get("work_days") or [0, 1, 2, 3, 4]
    breakdown = calc_working_days(start_date, end_date, holidays, work_days)
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

    # Resolve and freeze the approval chain. Imported here rather than at module
    # scope because approval_service also reaches into this module's repository.
    from app.services import approval_service

    await approval_service.build_chain(
        leave_request_id=created["id"],
        employee_id=employee_id,
        leave_type=leave_type,
        chargeable_days=breakdown.chargeable_days,
    )

    # A chain that resolved to no reachable approver is already settled, so the
    # request must not sit at PENDING waiting on a queue nobody owns.
    derived = await approval_service.derive_request_status(created["id"])
    if derived != created["status"]:
        updated = await leave_request_repository.update_status(created["id"], derived)
        if updated is not None:
            created = updated

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
    ctx = await _region_context(employee["region_id"])
    return [_to_dto(r, _breakdown_for(r, ctx)) for r in rows]


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
    cache: dict[UUID, RegionContext] = {}
    out = []
    for r in rows:
        emp = await employee_repository.find_by_id(r["employee_id"])
        region_id = emp["region_id"] if emp else manager["region_id"]
        if region_id not in cache:
            cache[region_id] = await _region_context(region_id)
        out.append(_to_approval_dto(r, _breakdown_for(r, cache[region_id])))
    return out


async def get_pending_for_approver(approver_id: UUID) -> list[dict]:
    """Requests waiting on this person right now.

    Driven by the approval chain, not by manager_id: a tier-2 approver is not
    the direct manager of the requests they have to sign off, so a manager_id
    lookup would never show them.
    """
    approver = await employee_repository.find_by_id(approver_id)
    if approver is None:
        raise ApiError.not_found("Approver not found")

    steps = await approval_repository.pending_for_approver(approver_id)
    if not steps:
        return []

    cache: dict[UUID, RegionContext] = {}
    out: list[dict] = []
    for step in steps:
        row = await leave_request_repository.find_by_id(step["leave_request_id"])
        if row is None:
            continue
        emp = await employee_repository.find_by_id(row["employee_id"])
        region_id = emp["region_id"] if emp else approver["region_id"]
        if region_id not in cache:
            cache[region_id] = await _region_context(region_id)

        dto = _to_approval_dto(row, _breakdown_for(row, cache[region_id]))
        # The step is what the UI acts on, so it has to travel with the request.
        chain = await approval_repository.find_by_request(row["id"])
        dto["stepId"] = step["id"]
        dto["stepOrder"] = step["step_order"]
        dto["totalSteps"] = len(chain)
        out.append(dto)
    return out


async def get_team_on_leave(manager_id: UUID, on_day: date) -> list[dict]:
    manager = await employee_repository.find_by_id(manager_id)
    if manager is None:
        raise ApiError.not_found("Manager not found")

    rows = await leave_request_repository.find_on_leave(manager_id, on_day)
    if not rows:
        return []
    ctx = await _region_context(manager["region_id"])
    return [_to_approval_dto(r, _breakdown_for(r, ctx)) for r in rows]


# ============================ decide ============================
async def decide(request_id: UUID, new_status: str) -> dict:
    """Cancel a request, or decide it without naming a specific tier.

    APPROVED/REJECTED are routed through the current approval step rather than
    written straight to leave_request.status. Setting the status directly would
    let a request read APPROVED while a step still reads PENDING, and the two
    would stay contradictory forever.
    """
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

    from app.services import approval_service

    if new_status in ("APPROVED", "REJECTED"):
        step = await approval_repository.current_step(request_id)
        if step is None:
            raise ApiError.conflict(
                "This request has no outstanding approval step",
                {"hint": "It may already be fully decided."},
            )
        if step["approver_id"] is None:
            raise ApiError.conflict("The current approval step has no assigned approver")
        # Act as that step's approver; the step machine re-derives the status.
        await approval_service.decide_step(
            step_id=step["id"],
            approver_id=step["approver_id"],
            approve=(new_status == "APPROVED"),
            comment=None,
        )
        updated = await leave_request_repository.find_by_id(request_id)
    else:
        # CANCELLED is the employee withdrawing; it bypasses the chain, and any
        # steps still pending become moot.
        updated = await leave_request_repository.update_status(request_id, new_status)
        await approval_repository.skip_remaining(request_id, 0)
    assert updated is not None

    employee = await employee_repository.find_by_id(updated["employee_id"])
    ctx = await _region_context(employee["region_id"])
    return _to_dto(updated, _breakdown_for(updated, ctx))
