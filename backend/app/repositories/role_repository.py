from uuid import UUID

from app.db import fetch_all, fetch_one


async def find_by_tenant(tenant_id: UUID) -> list[dict]:
    return await fetch_all(
        """SELECT r.id, r.tenant_id, r.code, r.name,
                  (SELECT count(*) FROM employee_role er WHERE er.role_id = r.id) AS holder_count
             FROM role r WHERE r.tenant_id = %s ORDER BY r.name""",
        (tenant_id,),
    )


async def find_by_id(role_id: UUID) -> dict | None:
    return await fetch_one(
        "SELECT id, tenant_id, code, name FROM role WHERE id = %s", (role_id,)
    )


async def holders(role_id: UUID) -> list[dict]:
    return await fetch_all(
        """SELECT er.id, er.employee_id, er.region_id, e.name AS employee_name,
                  rg.country_name AS region_name
             FROM employee_role er
             JOIN employee e ON e.id = er.employee_id
             LEFT JOIN region rg ON rg.id = er.region_id
            WHERE er.role_id = %s
            ORDER BY rg.country_name NULLS FIRST, e.name""",
        (role_id,),
    )


async def resolve_holder(role_id: UUID, region_id: UUID) -> dict | None:
    """Who holds this role for a given region.

    A region-specific holder wins over a tenant-wide one, so a global HR lead
    can cover everywhere while a local HR takes precedence in their own region.
    """
    return await fetch_one(
        """SELECT e.id, e.name
             FROM employee_role er
             JOIN employee e ON e.id = er.employee_id
            WHERE er.role_id = %s
              AND (er.region_id = %s OR er.region_id IS NULL)
            ORDER BY (er.region_id IS NULL)     -- region-specific first
            LIMIT 1""",
        (role_id, region_id),
    )


async def find_assignment(
    employee_id: UUID, role_id: UUID, region_id: UUID | None
) -> dict | None:
    """An existing assignment for exactly this scope.

    IS NOT DISTINCT FROM rather than = so a tenant-wide row (region_id NULL)
    matches itself; plain equality never matches NULL.
    """
    return await fetch_one(
        """SELECT id FROM employee_role
            WHERE employee_id = %s AND role_id = %s
              AND region_id IS NOT DISTINCT FROM %s""",
        (employee_id, role_id, region_id),
    )


async def assign(employee_id: UUID, role_id: UUID, region_id: UUID | None) -> dict | None:
    """Returns None when the assignment already exists, so the caller can 409.

    The check is explicit rather than relying on ON CONFLICT: the uniqueness is
    enforced by two partial indexes (see migration 006), and a bare ON CONFLICT
    against a NULL column silently allows duplicates.
    """
    if await find_assignment(employee_id, role_id, region_id):
        return None
    return await fetch_one(
        """INSERT INTO employee_role (employee_id, role_id, region_id)
           VALUES (%s, %s, %s)
           RETURNING id, employee_id, role_id, region_id""",
        (employee_id, role_id, region_id),
    )


async def unassign(assignment_id: UUID) -> None:
    await fetch_one(
        "DELETE FROM employee_role WHERE id = %s RETURNING id", (assignment_id,)
    )
