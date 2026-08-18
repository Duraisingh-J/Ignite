from uuid import UUID

from app.db import fetch_one
from app.errors import ApiError
from app.repositories import employee_repository, region_repository, role_repository


async def list_for_tenant(tenant_id: UUID) -> list[dict]:
    """Roles with their holders attached, so the admin page renders in one call."""
    roles = await role_repository.find_by_tenant(tenant_id)
    return [{**r, "holders": await role_repository.holders(r["id"])} for r in roles]


async def create(*, tenant_id: UUID, code: str, name: str) -> dict:
    code = code.strip().upper()
    existing = await role_repository.find_by_tenant(tenant_id)
    if any(r["code"] == code for r in existing):
        raise ApiError.conflict(f'A role with code "{code}" already exists')
    row = await fetch_one(
        """INSERT INTO role (tenant_id, code, name) VALUES (%s, %s, %s)
           RETURNING id, tenant_id, code, name""",
        (tenant_id, code, name.strip()),
    )
    assert row is not None
    return {**row, "holder_count": 0, "holders": []}


async def delete(role_id: UUID) -> dict:
    """Remove a role.

    Refused while a leave type still routes to it. The foreign key would quietly
    set that reference to NULL, so those requests would stop requiring the
    approval with nothing on screen to show the rule had changed.
    """
    role = await role_repository.find_by_id(role_id)
    if role is None:
        raise ApiError.not_found("Role not found")

    used = await fetch_one(
        "SELECT count(*) AS n FROM leave_type WHERE final_approver_role_id = %s", (role_id,)
    )
    if used and used["n"] > 0:
        raise ApiError.conflict(
            f"{used['n']} leave type(s) route their final approval to this role. "
            "Clear it on those types first.",
            {"leaveTypes": used["n"]},
        )

    await fetch_one("DELETE FROM role WHERE id = %s RETURNING id", (role_id,))
    return {"deleted": role["name"]}


async def assign_holder(*, role_id: UUID, employee_id: UUID, region_id: UUID | None) -> dict:
    role = await role_repository.find_by_id(role_id)
    if role is None:
        raise ApiError.not_found("Role not found")

    employee = await employee_repository.find_by_id(employee_id)
    if employee is None:
        raise ApiError.bad_request("Unknown employeeId")
    if employee["tenant_id"] != role["tenant_id"]:
        raise ApiError.bad_request("That employee belongs to a different tenant")

    if region_id is not None:
        region = await region_repository.find_by_id(region_id)
        if region is None:
            raise ApiError.bad_request("Unknown regionId")
        if region["tenant_id"] != role["tenant_id"]:
            raise ApiError.bad_request("That region belongs to a different tenant")

    created = await role_repository.assign(employee_id, role_id, region_id)
    if created is None:
        raise ApiError.conflict(f"{employee['name']} already holds this role for that scope")
    return {"assigned": employee["name"], "roleCode": role["code"]}


async def remove_holder(assignment_id: UUID) -> dict:
    await role_repository.unassign(assignment_id)
    return {"removed": str(assignment_id)}
