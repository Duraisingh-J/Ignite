from uuid import UUID

from app.db import fetch_all, fetch_one

_PLAIN = "id, tenant_id, code, country_name, work_days, timezone"
_COLS = "r.id, r.tenant_id, r.code, r.country_name, r.work_days, r.timezone"


async def find_by_tenant(tenant_id: UUID) -> list[dict]:
    return await fetch_all(
        f"""SELECT {_COLS},
                   (SELECT count(*) FROM employee e         WHERE e.region_id  = r.id) AS employee_count,
                   (SELECT count(*) FROM leave_type lt      WHERE lt.region_id = r.id) AS leave_type_count,
                   (SELECT count(*) FROM holiday_calendar h WHERE h.region_id  = r.id) AS holiday_count
              FROM region r
             WHERE r.tenant_id = %s
             ORDER BY r.country_name""",
        (tenant_id,),
    )


async def find_by_id(region_id: UUID) -> dict | None:
    return await fetch_one(f"SELECT {_PLAIN} FROM region WHERE id = %s", (region_id,))


async def find_by_code(tenant_id: UUID, code: str) -> dict | None:
    return await fetch_one(
        f"SELECT {_PLAIN} FROM region WHERE tenant_id = %s AND upper(code) = upper(%s)",
        (tenant_id, code),
    )


async def insert(
    *, tenant_id: UUID, code: str, country_name: str, work_days: list[int], timezone: str
) -> dict:
    row = await fetch_one(
        f"""INSERT INTO region (tenant_id, code, country_name, work_days, timezone)
            VALUES (%s, %s, %s, %s, %s) RETURNING {_PLAIN}""",
        (tenant_id, code, country_name, work_days, timezone),
    )
    assert row is not None
    return row


async def dependents(region_id: UUID) -> dict:
    """What a delete would take with it.

    leave_type and holiday_calendar cascade; employee does not, so an employee
    in the region blocks the delete at the database level.
    """
    row = await fetch_one(
        """
        SELECT (SELECT count(*) FROM employee e         WHERE e.region_id  = %(r)s) AS employees,
               (SELECT count(*) FROM leave_type lt      WHERE lt.region_id = %(r)s) AS leave_types,
               (SELECT count(*) FROM holiday_calendar h WHERE h.region_id  = %(r)s) AS holidays
        """,
        {"r": region_id},
    )
    return row or {"employees": 0, "leave_types": 0, "holidays": 0}


async def delete(region_id: UUID) -> None:
    await fetch_one("DELETE FROM region WHERE id = %s RETURNING id", (region_id,))


async def count_by_tenant(tenant_id: UUID) -> int:
    row = await fetch_one("SELECT count(*) AS n FROM region WHERE tenant_id = %s", (tenant_id,))
    return row["n"] if row else 0
