from datetime import date
from uuid import UUID

from fastapi import APIRouter, Query

from app.schemas import BalanceOut, DataResponse, LedgerEntryOut
from app.services import accrual_service

router = APIRouter(prefix="/balances", tags=["balances"])


@router.get("/{employee_id}", response_model=DataResponse[list[BalanceOut]])
async def get_balances(
    employee_id: UUID,
    as_of: date | None = Query(None, alias="asOf"),
):
    """Balance per leave type, with the breakdown behind each figure.

    `asOf` answers "what was my balance in April" — entries dated later are
    excluded from the fold, which a stored balance column could never do.
    """
    rows = await accrual_service.balances_for(employee_id, as_of)
    return {"data": [BalanceOut.model_validate(r) for r in rows]}


@router.get("/{employee_id}/ledger", response_model=DataResponse[list[LedgerEntryOut]])
async def get_ledger(
    employee_id: UUID,
    leave_type_id: UUID | None = Query(None, alias="leaveTypeId"),
    limit: int = Query(200, ge=1, le=1000),
):
    """The entries themselves — the answer to "why is my balance 12?"."""
    from app.repositories import ledger_repository

    rows = await ledger_repository.entries(employee_id, leave_type_id, limit)
    return {"data": [LedgerEntryOut.model_validate(r, from_attributes=True) for r in rows]}


@router.post("/{employee_id}/run-accrual", response_model=DataResponse[dict])
async def run_accrual(
    employee_id: UUID,
    as_of: date | None = Query(None, alias="asOf"),
):
    """Bring this employee's accrual up to date.

    Safe to call repeatedly: each period entry carries a unique idempotency key,
    so a second run creates nothing and reports zero entries.
    """
    return {"data": await accrual_service.run_for_employee(employee_id, as_of)}
