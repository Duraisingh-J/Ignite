from uuid import UUID

from fastapi import APIRouter, Query, status

from app.schemas import DataResponse, RoleCreate, RoleHolderCreate, RoleOut
from app.services import role_service

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("", response_model=DataResponse[list[RoleOut]])
async def list_roles(tenant_id: UUID = Query(..., alias="tenantId")):
    """Roles and who holds them.

    Roles exist because the reporting line cannot reach every approver: walking
    upward from an engineer yields managers forever and never HR.
    """
    rows = await role_service.list_for_tenant(tenant_id)
    return {"data": [RoleOut.model_validate(r, from_attributes=True) for r in rows]}


@router.post("", status_code=status.HTTP_201_CREATED, response_model=DataResponse[RoleOut])
async def create_role(payload: RoleCreate):
    created = await role_service.create(
        tenant_id=payload.tenant_id, code=payload.code, name=payload.name
    )
    return {"data": RoleOut.model_validate(created, from_attributes=True)}


@router.delete("/{role_id}", response_model=DataResponse[dict])
async def delete_role(role_id: UUID):
    """Refused (409) while a leave type still routes its final approval here."""
    return {"data": await role_service.delete(role_id)}


@router.post(
    "/{role_id}/holders",
    status_code=status.HTTP_201_CREATED,
    response_model=DataResponse[dict],
)
async def add_holder(role_id: UUID, payload: RoleHolderCreate):
    """Give someone this role.

    A null regionId means the whole tenant; a value scopes them to that region,
    and a region-specific holder takes precedence over a tenant-wide one.
    """
    return {
        "data": await role_service.assign_holder(
            role_id=role_id, employee_id=payload.employee_id, region_id=payload.region_id
        )
    }


@router.delete("/{role_id}/holders/{assignment_id}", response_model=DataResponse[dict])
async def remove_holder(role_id: UUID, assignment_id: UUID):
    return {"data": await role_service.remove_holder(assignment_id)}
