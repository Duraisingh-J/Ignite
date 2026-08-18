from uuid import UUID

from app.db import fetch_all, fetch_one


async def find_active_by_region(region_id: UUID) -> list[dict]:
    """LeaveType.getDropdownOptions(regionId)"""
    return await fetch_all(
        """
        SELECT id, region_id, name, is_paid, is_active, requires_approval
          FROM leave_type
         WHERE region_id = %s AND is_active = TRUE
         ORDER BY name
        """,
        (region_id,),
    )


async def find_by_id(leave_type_id: UUID) -> dict | None:
    return await fetch_one(
        """
        SELECT id, region_id, name, is_paid, is_active, requires_approval
          FROM leave_type
         WHERE id = %s
        """,
        (leave_type_id,),
    )
