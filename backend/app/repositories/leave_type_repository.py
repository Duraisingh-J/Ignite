from uuid import UUID

from app.db import fetch_all, fetch_one

_COLS = "id, region_id, name, is_paid, is_active, requires_approval"


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
    *, region_id: UUID, name: str, is_paid: bool, is_active: bool, requires_approval: bool
) -> dict:
    row = await fetch_one(
        f"""INSERT INTO leave_type (region_id, name, is_paid, is_active, requires_approval)
            VALUES (%s, %s, %s, %s, %s) RETURNING {_COLS}""",
        (region_id, name, is_paid, is_active, requires_approval),
    )
    assert row is not None
    return row


async def count_by_tenant(tenant_id: UUID) -> int:
    row = await fetch_one(
        """SELECT count(*) AS n FROM leave_type lt
             JOIN region r ON r.id = lt.region_id WHERE r.tenant_id = %s""",
        (tenant_id,),
    )
    return row["n"] if row else 0
