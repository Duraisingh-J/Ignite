"""Balance reservation across the approval lifecycle.

Days are held from SUBMIT, not from final approval. A multi-tier chain can sit
pending for days across several approvers, and if the balance were only debited
on approval an employee could submit several overlapping requests that each
pass the balance check independently.

Release is always a compensating REVERSAL row, never a delete. Deleting the
deduction would erase the fact that leave was requested and refused, which is
exactly what an audit asks about later.
"""

from datetime import date
from decimal import Decimal
from uuid import UUID

from app.errors import ApiError
from app.repositories import accrual_policy_repository, ledger_repository
from app.services.accrual_service import tenure_months


async def check_sufficient(
    *, employee: dict, leave_type_id: UUID, chargeable_days: Decimal, on: date
) -> None:
    """Refuse a request the employee cannot cover.

    Pending requests already hold their days as DEDUCTION rows, so the balance
    read here is net of them — no separate subtraction is needed.
    """
    policy = await accrual_policy_repository.select_for(
        region_id=employee["region_id"],
        leave_type_id=leave_type_id,
        tenure_months=tenure_months(employee["join_date"], on),
    )
    # No policy means this type is not accrued at all; nothing to check against.
    if policy is None:
        return

    # Every entry counted, not just those up to `on`: leave already booked for
    # a later date must not be spendable a second time.
    balance = await ledger_repository.available_total(employee["id"], leave_type_id)
    allowed_negative = Decimal(policy.get("negative_allowed_days") or 0)

    if balance - chargeable_days < -allowed_negative:
        available = balance + allowed_negative
        raise ApiError.bad_request(
            f"Not enough balance: {chargeable_days} day(s) requested, "
            f"{available} available.",
            {
                "requested": str(chargeable_days),
                "available": str(available),
                "balance": str(balance),
                "negativeAllowed": str(allowed_negative),
            },
        )


async def reserve(
    *, employee: dict, leave_type_id: UUID, request_id: UUID,
    chargeable_days: Decimal, start_date: date,
) -> dict | None:
    """Hold the days for a newly submitted request."""
    return await ledger_repository.insert_entry(
        tenant_id=employee["tenant_id"],
        employee_id=employee["id"],
        leave_type_id=leave_type_id,
        entry_type="DEDUCTION",
        amount=-chargeable_days,
        effective_date=start_date,
        source_id=request_id,
        # Keyed so a retried submit cannot double-debit.
        idempotency_key=f"reserve:{request_id}",
        note="Reserved on submit",
    )


async def release(*, request_id: UUID, reason: str) -> dict | None:
    """Give the days back after a rejection or cancellation.

    Writes a compensating entry rather than removing the deduction, so both the
    request and its refusal remain visible in the ledger.
    """
    deductions = await ledger_repository.find_by_source(request_id, "DEDUCTION")
    if not deductions:
        return None

    # Already released — a second rejection or a repeated cancel is a no-op.
    existing = await ledger_repository.find_by_source(request_id, "REVERSAL")
    if existing:
        return None

    d = deductions[0]
    return await ledger_repository.insert_entry(
        tenant_id=(await _tenant_of(d["employee_id"])),
        employee_id=d["employee_id"],
        leave_type_id=d["leave_type_id"],
        entry_type="REVERSAL",
        amount=-Decimal(d["amount"]),  # deduction is negative, so this is a credit
        effective_date=d["effective_date"],
        source_id=request_id,
        idempotency_key=f"reverse:{request_id}",
        note=f"Released — {reason}",
    )


async def _tenant_of(employee_id: UUID) -> UUID:
    from app.repositories import employee_repository

    employee = await employee_repository.find_by_id(employee_id)
    return employee["tenant_id"]
