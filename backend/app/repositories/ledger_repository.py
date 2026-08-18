from datetime import date
from decimal import Decimal
from uuid import UUID

from app.db import fetch_all, fetch_one


async def balance_as_of(
    employee_id: UUID, leave_type_id: UUID, as_of: date
) -> Decimal:
    """The balance is a fold over the ledger, never a stored column.

    Entries dated after `as_of` are excluded, which is what makes
    "what was my balance in April" answerable at all.
    """
    row = await fetch_one(
        """SELECT COALESCE(sum(amount), 0) AS balance
             FROM leave_ledger
            WHERE employee_id = %s AND leave_type_id = %s AND effective_date <= %s""",
        (employee_id, leave_type_id, as_of),
    )
    return Decimal(row["balance"]) if row else Decimal(0)


async def balance_detail(
    employee_id: UUID, leave_type_id: UUID, as_of: date
) -> dict:
    """Balance split by what produced it, for "why is it 12?".

    `reserved` is the portion already deducted for requests that are still
    pending — it is part of the balance, not a further subtraction.
    """
    row = await fetch_one(
        """
        SELECT
          COALESCE(sum(amount) FILTER (WHERE entry_type = 'ACCRUAL'), 0)    AS accrued,
          COALESCE(sum(amount) FILTER (WHERE entry_type = 'CARRYOVER'), 0)  AS carried_over,
          COALESCE(sum(amount) FILTER (WHERE entry_type = 'OPENING'), 0)    AS opening,
          COALESCE(sum(amount) FILTER (WHERE entry_type = 'ADJUSTMENT'), 0) AS adjusted,
          COALESCE(sum(amount) FILTER (WHERE entry_type = 'EXPIRY'), 0)     AS expired,
          COALESCE(sum(amount) FILTER (WHERE entry_type = 'ENCASHMENT'), 0) AS encashed,
          -- DEDUCTION and REVERSAL net to the days actually consumed.
          COALESCE(sum(amount) FILTER (WHERE entry_type IN ('DEDUCTION','REVERSAL')), 0) AS used,
          COALESCE(sum(amount), 0) AS balance
        FROM leave_ledger
        WHERE employee_id = %s AND leave_type_id = %s AND effective_date <= %s
        """,
        (employee_id, leave_type_id, as_of),
    )
    return row or {}


async def available_total(employee_id: UUID, leave_type_id: UUID) -> Decimal:
    """What is left to book, counting every entry regardless of date.

    Distinct from balance_as_of(today): a request for next October is dated next
    October, so it is correctly absent from today's balance but must still not
    be bookable twice. This is the figure the Apply Leave form checks.
    """
    row = await fetch_one(
        """SELECT COALESCE(sum(amount), 0) AS available
             FROM leave_ledger
            WHERE employee_id = %s AND leave_type_id = %s""",
        (employee_id, leave_type_id),
    )
    return Decimal(row["available"]) if row else Decimal(0)


async def reserved_amount(employee_id: UUID, leave_type_id: UUID) -> Decimal:
    """Days held by requests that are submitted but not yet finally decided."""
    row = await fetch_one(
        """SELECT COALESCE(-sum(l.amount), 0) AS reserved
             FROM leave_ledger l
             JOIN leave_request lr ON lr.id = l.source_id
            WHERE l.employee_id = %s AND l.leave_type_id = %s
              AND l.entry_type = 'DEDUCTION'
              AND lr.status = 'PENDING'""",
        (employee_id, leave_type_id),
    )
    return Decimal(row["reserved"]) if row else Decimal(0)


async def entries(
    employee_id: UUID, leave_type_id: UUID | None = None, limit: int = 200
) -> list[dict]:
    """The ledger itself — this is the answer to "why is my balance 12?"."""
    if leave_type_id:
        return await fetch_all(
            """SELECT l.id, l.entry_type, l.amount, l.effective_date, l.note,
                      l.source_id, l.created_at, lt.name AS leave_type_name
                 FROM leave_ledger l JOIN leave_type lt ON lt.id = l.leave_type_id
                WHERE l.employee_id = %s AND l.leave_type_id = %s
                ORDER BY l.effective_date, l.created_at
                LIMIT %s""",
            (employee_id, leave_type_id, limit),
        )
    return await fetch_all(
        """SELECT l.id, l.entry_type, l.amount, l.effective_date, l.note,
                  l.source_id, l.created_at, lt.name AS leave_type_name
             FROM leave_ledger l JOIN leave_type lt ON lt.id = l.leave_type_id
            WHERE l.employee_id = %s
            ORDER BY l.effective_date, l.created_at
            LIMIT %s""",
        (employee_id, limit),
    )


async def insert_entry(
    *,
    tenant_id: UUID,
    employee_id: UUID,
    leave_type_id: UUID,
    entry_type: str,
    amount: Decimal,
    effective_date: date,
    source_id: UUID | None = None,
    idempotency_key: str | None = None,
    note: str | None = None,
) -> dict | None:
    """Append an entry.

    Returns None when `idempotency_key` already exists, which is how the runner
    stays safe to replay: ON CONFLICT DO NOTHING yields no row, and the caller
    simply moves on.
    """
    return await fetch_one(
        """INSERT INTO leave_ledger
             (tenant_id, employee_id, leave_type_id, entry_type, amount,
              effective_date, source_id, idempotency_key, note)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
           ON CONFLICT (idempotency_key) DO NOTHING
           RETURNING id, entry_type, amount, effective_date, note""",
        (
            tenant_id,
            employee_id,
            leave_type_id,
            entry_type,
            amount,
            effective_date,
            source_id,
            idempotency_key,
            note,
        ),
    )


async def find_by_source(source_id: UUID, entry_type: str | None = None) -> list[dict]:
    """Entries produced by one leave request — its deduction and any reversal."""
    if entry_type:
        return await fetch_all(
            """SELECT id, employee_id, leave_type_id, entry_type, amount, effective_date
                 FROM leave_ledger WHERE source_id = %s AND entry_type = %s""",
            (source_id, entry_type),
        )
    return await fetch_all(
        """SELECT id, employee_id, leave_type_id, entry_type, amount, effective_date
             FROM leave_ledger WHERE source_id = %s ORDER BY created_at""",
        (source_id,),
    )
