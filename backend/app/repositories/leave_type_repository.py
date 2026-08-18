from uuid import UUID

from app.db import fetch_all, fetch_one

_COLS = (
    "id, region_id, name, is_paid, is_active, requires_approval, "
    "approval_levels, escalate_above_days, final_approver_role_id"
)


async def find_active_by_region(region_id: UUID) -> list[dict]:
    """LeaveType.getDropdownOptions(regionId)"""
    return await fetch_all(
        f"SELECT {_COLS} FROM leave_type WHERE region_id = %s AND is_active = TRUE ORDER BY name",
        (region_id,),
    )


async def find_by_region(region_id: UUID) -> list[dict]:
    """All types for a region, including inactive ones (admin view)."""
    return await fetch_all(
        f"SELECT {_COLS} FROM leave_type WHERE region_id = %s ORDER BY name", (region_id,)
    )


async def find_by_tenant(tenant_id: UUID) -> list[dict]:
    return await fetch_all(
        f"""SELECT lt.{_COLS.replace(', ', ', lt.')}
              FROM leave_type lt
              JOIN region r ON r.id = lt.region_id
             WHERE r.tenant_id = %s
             ORDER BY r.country_name, lt.name""",
        (tenant_id,),
    )


async def find_by_id(leave_type_id: UUID) -> dict | None:
    return await fetch_one(f"SELECT {_COLS} FROM leave_type WHERE id = %s", (leave_type_id,))


async def insert(
    *,
    region_id: UUID,
    name: str,
    is_paid: bool,
    is_active: bool,
    requires_approval: bool,
    approval_levels: int = 1,
    escalate_above_days: int | None = None,
) -> dict:
    row = await fetch_one(
        f"""INSERT INTO leave_type
              (region_id, name, is_paid, is_active, requires_approval,
               approval_levels, escalate_above_days)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING {_COLS}""",
        (
            region_id,
            name,
            is_paid,
            is_active,
            requires_approval,
            approval_levels,
            escalate_above_days,
        ),
    )
    assert row is not None
    return row


async def update(
    leave_type_id: UUID,
    *,
    approval_levels: int | None = None,
    escalate_above_days: int | None = None,
    clear_escalation: bool = False,
    is_active: bool | None = None,
    final_approver_role_id: UUID | None = None,
    clear_final_approver_role: bool = False,
) -> dict | None:
    """Partial update of a type's approval configuration.

    `clear_escalation` distinguishes "remove the threshold" from "leave it
    alone", which a plain None cannot express.
    """
    sets, params = [], []
    if approval_levels is not None:
        sets.append("approval_levels = %s")
        params.append(approval_levels)
    if clear_escalation:
        sets.append("escalate_above_days = NULL")
    elif escalate_above_days is not None:
        sets.append("escalate_above_days = %s")
        params.append(escalate_above_days)
    if is_active is not None:
        sets.append("is_active = %s")
        params.append(is_active)
    if clear_final_approver_role:
        sets.append("final_approver_role_id = NULL")
    elif final_approver_role_id is not None:
        sets.append("final_approver_role_id = %s")
        params.append(final_approver_role_id)
    if not sets:
        return await find_by_id(leave_type_id)

    params.append(leave_type_id)
    return await fetch_one(
        f"UPDATE leave_type SET {', '.join(sets)} WHERE id = %s RETURNING {_COLS}",
        tuple(params),
    )


async def request_count(leave_type_id: UUID) -> int:
    """How many leave requests reference this type. Non-zero blocks deletion."""
    row = await fetch_one(
        "SELECT count(*) AS n FROM leave_request WHERE leave_type_id = %s", (leave_type_id,)
    )
    return row["n"] if row else 0


async def delete(leave_type_id: UUID) -> None:
    await fetch_one("DELETE FROM leave_type WHERE id = %s RETURNING id", (leave_type_id,))


async def count_by_tenant(tenant_id: UUID) -> int:
    row = await fetch_one(
        """SELECT count(*) AS n FROM leave_type lt
             JOIN region r ON r.id = lt.region_id WHERE r.tenant_id = %s""",
        (tenant_id,),
    )
    return row["n"] if row else 0
