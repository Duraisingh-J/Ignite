from uuid import UUID

from fastapi import APIRouter, Query, status

from app.schemas import (
    AccrualPolicyCreate,
    AccrualPolicyOut,
    AccrualPolicyUpdate,
    CoverageIssueOut,
    DataResponse,
)
from app.services import accrual_policy_service

router = APIRouter(prefix="/accrual-policies", tags=["accrual-policies"])


@router.get("", response_model=DataResponse[list[AccrualPolicyOut]])
async def list_policies(tenant_id: UUID = Query(..., alias="tenantId")):
    """Every accrual rule in the tenant, ordered by region, type, then tenure."""
    rows = await accrual_policy_service.list_for_tenant(tenant_id)
    return {"data": [AccrualPolicyOut.model_validate(r, from_attributes=True) for r in rows]}


@router.get("/coverage", response_model=DataResponse[list[CoverageIssueOut]])
async def check_coverage(tenant_id: UUID = Query(..., alias="tenantId")):
    """Gaps and overlaps in the tenure bands.

    A gap is silent and costly: an employee whose tenure matches no band accrues
    nothing that month and nothing errors. Bands written as "0-24" and "25+"
    read fine in English but leave month 24 uncovered, because the upper bound
    is exclusive.
    """
    rows = await accrual_policy_service.list_for_tenant(tenant_id)
    issues = accrual_policy_service.coverage_issues(rows)
    return {"data": [CoverageIssueOut.model_validate(i) for i in issues]}


@router.post("", status_code=status.HTTP_201_CREATED, response_model=DataResponse[AccrualPolicyOut])
async def create_policy(payload: AccrualPolicyCreate):
    created = await accrual_policy_service.create(
        payload.tenant_id, payload.model_dump(exclude={"tenant_id"}, by_alias=False)
    )
    return {"data": AccrualPolicyOut.model_validate(created, from_attributes=True)}


@router.patch("/{policy_id}", response_model=DataResponse[AccrualPolicyOut])
async def update_policy(policy_id: UUID, payload: AccrualPolicyUpdate):
    """Partial update.

    Changes affect future accrual runs only. Entries already written are never
    rewritten, so a rate change does not retroactively alter what somebody has
    already earned.
    """
    fields = payload.model_dump(exclude_unset=True, by_alias=False)
    if not fields:
        raise __import__("app.errors", fromlist=["ApiError"]).ApiError.bad_request(
            "Nothing to update"
        )
    updated = await accrual_policy_service.update(policy_id, fields)
    return {"data": AccrualPolicyOut.model_validate(updated, from_attributes=True)}


@router.delete("/{policy_id}", response_model=DataResponse[dict])
async def delete_policy(policy_id: UUID):
    """Remove a rule.

    Ledger entries keep the policy name they were written with, so history
    survives. Future accrual for that tenure band stops until it is replaced —
    which the coverage check will then report as a gap.
    """
    return {"data": await accrual_policy_service.delete(policy_id)}
