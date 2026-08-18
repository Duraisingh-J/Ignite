from uuid import UUID

from app.db import fetch_all, fetch_one

_COLS = "id, tenant_id, code, country_name, work_days, timezone"


async def find_by_tenant(tenant_id: UUID) -> list[dict]:
    return await fetch_all(
        f"SELECT {_COLS} FROM region WHERE tenant_id = %s ORDER BY country_name",
        (tenant_id,),
    )


async def find_by_id(region_id: UUID) -> dict | None:
    return await fetch_one(f"SELECT {_COLS} FROM region WHERE id = %s", (region_id,))


async def find_by_code(tenant_id: UUID, code: str) -> dict | None:
    return await fetch_one(
        f"SELECT {_COLS} FROM region WHERE tenant_id = %s AND upper(code) = upper(%s)",
        (tenant_id, code),
    )


async def insert(
    *, tenant_id: UUID, code: str, country_name: str, work_days: list[int], timezone: str
) -> dict:
    row = await fetch_one(
        f"""INSERT INTO region (tenant_id, code, country_name, work_days, timezone)
            VALUES (%s, %s, %s, %s, %s) RETURNING {_COLS}""",
        (tenant_id, code, country_name, work_days, timezone),
    )
    assert row is not None
    return row


async def count_by_tenant(tenant_id: UUID) -> int:
    row = await fetch_one("SELECT count(*) AS n FROM region WHERE tenant_id = %s", (tenant_id,))
    return row["n"] if row else 0
