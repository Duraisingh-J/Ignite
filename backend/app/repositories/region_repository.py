from uuid import UUID

from app.db import fetch_all, fetch_one


async def find_by_tenant(tenant_id: UUID) -> list[dict]:
    return await fetch_all(
        "SELECT id, tenant_id, code, country_name FROM region WHERE tenant_id = %s ORDER BY country_name",
        (tenant_id,),
    )


async def find_by_id(region_id: UUID) -> dict | None:
    return await fetch_one(
        "SELECT id, tenant_id, code, country_name FROM region WHERE id = %s",
        (region_id,),
    )


async def count_by_tenant(tenant_id: UUID) -> int:
    row = await fetch_one("SELECT count(*) AS n FROM region WHERE tenant_id = %s", (tenant_id,))
    return row["n"] if row else 0
