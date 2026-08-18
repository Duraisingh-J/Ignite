from uuid import UUID

from app.repositories import region_repository


async def list_by_tenant(tenant_id: UUID) -> list[dict]:
    return await region_repository.find_by_tenant(tenant_id)
