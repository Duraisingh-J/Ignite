from datetime import date
from uuid import UUID

from app.errors import ApiError
from app.repositories import employee_repository, region_repository


async def get_by_id(employee_id: UUID) -> dict:
    row = await employee_repository.find_by_id(employee_id)
    if row is None:
        raise ApiError.not_found("Employee not found")
    return row


async def list_by_tenant(tenant_id: UUID, limit: int, offset: int) -> tuple[list[dict], int]:
    rows = await employee_repository.find_by_tenant(tenant_id, limit, offset)
    total = await employee_repository.count_by_tenant(tenant_id)
    return rows, total


async def get_team(manager_id: UUID, on_day: date) -> list[dict]:
    manager = await employee_repository.find_by_id(manager_id)
    if manager is None:
        raise ApiError.not_found("Manager not found")
    return await employee_repository.find_by_manager(manager_id, on_day)


async def create(
    *,
    tenant_id: UUID,
    region_id: UUID,
    manager_id: UUID | None,
    name: str,
    email: str,
    join_date: date,
) -> dict:
    # Region must exist and belong to the tenant — otherwise an employee could
    # be filed under another org's region.
    region = await region_repository.find_by_id(region_id)
    if region is None:
        raise ApiError.bad_request("Unknown regionId")
    if region["tenant_id"] != tenant_id:
        raise ApiError.bad_request("regionId does not belong to that tenant")

    if manager_id is not None:
        manager = await employee_repository.find_by_id(manager_id)
        if manager is None:
            raise ApiError.bad_request("Unknown managerId")
        if manager["tenant_id"] != tenant_id:
            raise ApiError.bad_request("managerId belongs to a different tenant")
        # A brand-new employee has no reports yet, so no cycle is possible here.

    if await employee_repository.find_by_email(email):
        raise ApiError.conflict("An employee with that email already exists")

    return await employee_repository.insert(
        tenant_id=tenant_id,
        region_id=region_id,
        manager_id=manager_id,
        name=name,
        email=email,
        join_date=join_date,
    )


async def _assert_manager_assignable(employee_id: UUID, manager_id: UUID, tenant_id: UUID) -> dict:
    """Guards every real HR system needs before writing a reporting line."""
    if manager_id == employee_id:
        raise ApiError.bad_request("An employee cannot be their own manager")

    manager = await employee_repository.find_by_id(manager_id)
    if manager is None:
        raise ApiError.bad_request("Unknown managerId")
    if manager["tenant_id"] != tenant_id:
        raise ApiError.bad_request("managerId belongs to a different tenant")

    # Cross-region reporting lines are allowed by design; leave is still
    # calculated with the *employee's* region calendar and work week.

    # Walking up from the proposed manager must never reach the employee,
    # or the two would report to each other and the chain would loop.
    chain = await employee_repository.management_chain(manager_id)
    if employee_id in chain:
        raise ApiError.conflict(
            "That would create a reporting cycle",
            {"reason": f"{manager['name']} already reports to this employee, directly or indirectly"},
        )
    return manager


async def update(
    employee_id: UUID,
    *,
    manager_id: UUID | None = None,
    clear_manager: bool = False,
    region_id: UUID | None = None,
    name: str | None = None,
    email: str | None = None,
) -> dict:
    employee = await employee_repository.find_by_id(employee_id)
    if employee is None:
        raise ApiError.not_found("Employee not found")

    if manager_id is not None and not clear_manager:
        await _assert_manager_assignable(employee_id, manager_id, employee["tenant_id"])

    if region_id is not None:
        region = await region_repository.find_by_id(region_id)
        if region is None:
            raise ApiError.bad_request("Unknown regionId")
        if region["tenant_id"] != employee["tenant_id"]:
            raise ApiError.bad_request("regionId does not belong to that tenant")

    if email is not None:
        email = email.strip().lower()
        # The column is UNIQUE, so a clash would surface as an integrity error
        # from the driver rather than something the client can act on.
        clash = await employee_repository.find_by_email(email)
        if clash and clash["id"] != employee_id:
            raise ApiError.conflict(f"{email} already belongs to {clash['name']}")

    updated = await employee_repository.update(
        employee_id,
        manager_id=manager_id,
        clear_manager=clear_manager,
        region_id=region_id,
        name=name,
        email=email,
    )
    assert updated is not None
    return updated


async def delete(employee_id: UUID) -> dict:
    """Remove an employee.

    Blocked in two cases, both of which would silently strand other people's
    leave rather than this employee's:

      * direct reports  - their manager_id is SET NULL, so their requests can
        no longer resolve an approver and never reach any queue
      * pending approvals - the step's approver_id is SET NULL, leaving those
        requests permanently undecidable

    Their own leave requests cascade by design; the count is returned so the
    caller can say what went with them.
    """
    employee = await employee_repository.find_by_id(employee_id)
    if employee is None:
        raise ApiError.not_found("Employee not found")

    deps = await employee_repository.dependents(employee_id)

    if deps["direct_reports"] > 0:
        raise ApiError.conflict(
            f"{deps['direct_reports']} employee(s) report to {employee['name']}. "
            "Reassign them to another manager first, or their leave will have "
            "nobody to approve it.",
            {"directReports": deps["direct_reports"]},
        )

    if deps["pending_approvals"] > 0:
        raise ApiError.conflict(
            f"{employee['name']} is the approver on {deps['pending_approvals']} "
            "pending request(s). Those would be left with no approver. Decide "
            "them first, or reassign the requesters to another manager.",
            {"pendingApprovals": deps["pending_approvals"]},
        )

    await employee_repository.delete(employee_id)
    return {"deleted": employee["name"], "requestsRemoved": deps["own_requests"]}
