"""Dynamic accrual: policy selection, the period runner, and balances.

A balance is never stored. It is a fold over an append-only ledger, which is
what makes "what was my balance in April", a retroactive correction, and
"why is it 12?" answerable at all.

Two properties carry the design:

  IDEMPOTENCY   every accrual entry has a key of
                'accrual:<employee>:<policy>:<period>'. Running late, twice, or
                replaying a year produces the same result. Without it a cron
                that fires twice silently doubles everyone's leave.

  TENURE PER PERIOD  the policy is selected inside the period loop, not once
                before it. An employee crossing a tenure band in March accrues
                at the old rate through February and the new rate from March.
"""

from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from app.errors import ApiError
from app.repositories import (
    accrual_policy_repository,
    employee_repository,
    ledger_repository,
    leave_type_repository,
)

ZERO = Decimal("0")


# ---------------------------------------------------------------- helpers
def tenure_months(join_date: date, as_of: date) -> int:
    """Whole months of service completed by `as_of`."""
    months = (as_of.year - join_date.year) * 12 + (as_of.month - join_date.month)
    if as_of.day < join_date.day:
        months -= 1
    return max(0, months)


def round_to_step(value: Decimal, step: Decimal) -> Decimal:
    """Round for DISPLAY only.

    Never applied to a stored amount: a 1.25 rate rounded to 0.5 steps every
    month grants 18 days a year instead of 15 — a 20% over-grant that stays
    invisible until year end.
    """
    if step <= 0:
        return value
    return (value / step).quantize(Decimal("1"), rounding=ROUND_HALF_UP) * step


def _month_periods(start: date, end: date) -> list[date]:
    """Last day of each month from `start`'s month to `end`'s month.

    Accrual is in arrears — earned at period end — so a month is credited on
    its final day and a new joiner cannot book leave they have not yet earned.
    """
    out: list[date] = []
    y, m = start.year, start.month
    while (y, m) <= (end.year, end.month):
        last = date(y, m, monthrange(y, m)[1])
        if last <= end:
            out.append(last)
        m += 1
        if m > 12:
            y, m = y + 1, 1
    return out


def _period_key(kind: str, employee_id: UUID, policy_id: UUID, period: date) -> str:
    return f"{kind}:{employee_id}:{policy_id}:{period.isoformat()}"


# ---------------------------------------------------------------- amounts
def period_amount(policy: dict, period_end: date, join_date: date) -> Decimal:
    """Days earned for one period, before the balance cap is applied."""
    method = policy["method"]
    rate = Decimal(policy["rate"])

    if method == "ANNUAL_GRANT":
        # Granted whole, on the last period of the reset year.
        return rate if period_end.month == 12 else ZERO

    if method == "PER_PAY_PERIOD":
        # Two pay periods a month at the default of 24 a year.
        per_year = policy.get("pay_periods_per_year") or 24
        return rate * Decimal(per_year) / Decimal(12)

    if method == "PER_DAYS_WORKED":
        # India's statutory rule: one day per N days worked. Attendance data is
        # not modelled, so working days in the month stand in for days worked.
        divisor = policy.get("days_worked_divisor") or 20
        worked = sum(
            1
            for d in _days_in_month(period_end)
            if d.weekday() < 5 and d >= join_date
        )
        return (Decimal(worked) / Decimal(divisor)).quantize(Decimal("0.01"))

    return rate  # MONTHLY


def _days_in_month(period_end: date) -> list[date]:
    first = period_end.replace(day=1)
    return [first + timedelta(days=i) for i in range(period_end.day)]


def prorate(amount: Decimal, period_end: date, join_date: date) -> Decimal:
    """Scale a first-period amount by the fraction of it the employee was present."""
    if join_date.year != period_end.year or join_date.month != period_end.month:
        return amount
    days_in_period = period_end.day
    days_present = days_in_period - join_date.day + 1
    if days_present >= days_in_period:
        return amount
    return (amount * Decimal(days_present) / Decimal(days_in_period)).quantize(Decimal("0.01"))


# ---------------------------------------------------------------- the runner
async def run_for_employee_type(
    *, employee: dict, leave_type: dict, as_of: date
) -> list[dict]:
    """Create any accrual entries that should exist for this employee and type."""
    join_date: date = employee["join_date"]
    created: list[dict] = []

    # Nothing accrues until the waiting period is served. Read from the policy
    # in force at joining, since that is the rule the employee started under.
    starting = await accrual_policy_repository.select_for(
        region_id=employee["region_id"], leave_type_id=leave_type["id"], tenure_months=0
    )
    waiting = int((starting or {}).get("waiting_period_days") or 0)
    first_eligible = join_date + timedelta(days=waiting)
    if first_eligible > as_of:
        return []

    for period_end in _month_periods(first_eligible, as_of):
        # Re-selected every period — this is what makes tenure bands work.
        policy = await accrual_policy_repository.select_for(
            region_id=employee["region_id"],
            leave_type_id=leave_type["id"],
            tenure_months=tenure_months(join_date, period_end),
        )
        if policy is None:
            continue

        key = _period_key("accrual", employee["id"], policy["id"], period_end)

        amount = period_amount(policy, period_end, join_date)
        if policy["prorate_on_join"]:
            amount = prorate(amount, period_end, join_date)
        if amount <= 0:
            continue

        # The cap stops accrual rather than overshooting and discarding: credit
        # only the room that is left, so the ledger records what was granted.
        cap = policy.get("max_balance")
        if cap is not None:
            balance = await ledger_repository.balance_as_of(
                employee["id"], leave_type["id"], period_end
            )
            room = Decimal(cap) - balance
            if room <= 0:
                continue
            amount = min(amount, room)

        row = await ledger_repository.insert_entry(
            tenant_id=employee["tenant_id"],
            employee_id=employee["id"],
            leave_type_id=leave_type["id"],
            entry_type="ACCRUAL",
            amount=amount,
            effective_date=period_end,
            idempotency_key=key,
            note=policy["name"],
        )
        # None means the key already existed — already accrued, nothing to do.
        if row:
            created.append(row)

    return created


async def run_for_employee(employee_id: UUID, as_of: date | None = None) -> dict:
    """Run accrual across every leave type available in the employee's region."""
    as_of = as_of or date.today()
    employee = await employee_repository.find_by_id(employee_id)
    if employee is None:
        raise ApiError.not_found("Employee not found")

    types = await leave_type_repository.find_active_by_region(employee["region_id"])
    created: list[dict] = []
    for lt in types:
        created += await run_for_employee_type(employee=employee, leave_type=lt, as_of=as_of)

    return {
        "employeeId": str(employee_id),
        "asOf": as_of.isoformat(),
        "entriesCreated": len(created),
        # Empty on a re-run: the idempotency keys already exist.
        "entries": [
            {
                "amount": str(e["amount"]),
                "effectiveDate": e["effective_date"].isoformat(),
                "note": e["note"],
            }
            for e in created
        ],
    }


# ---------------------------------------------------------------- balances
async def balances_for(employee_id: UUID, as_of: date | None = None) -> list[dict]:
    """Balance per leave type, with the breakdown behind each figure."""
    as_of = as_of or date.today()
    employee = await employee_repository.find_by_id(employee_id)
    if employee is None:
        raise ApiError.not_found("Employee not found")

    types = await leave_type_repository.find_active_by_region(employee["region_id"])
    out = []
    for lt in types:
        d = await ledger_repository.balance_detail(employee["id"], lt["id"], as_of)
        reserved = await ledger_repository.reserved_amount(employee["id"], lt["id"])
        available = await ledger_repository.available_total(employee["id"], lt["id"])
        booked_ahead = await ledger_repository.booked_ahead(employee["id"], lt["id"], as_of)
        policy = await accrual_policy_repository.select_for(
            region_id=employee["region_id"],
            leave_type_id=lt["id"],
            tenure_months=tenure_months(employee["join_date"], as_of),
        )
        step = Decimal((policy or {}).get("rounding_step") or "0.5")
        balance = Decimal(d.get("balance") or 0)

        out.append(
            {
                "leaveTypeId": lt["id"],
                "leaveTypeName": lt["name"],
                # Exact value, plus the figure a UI should show.
                # Balance today, versus what can still be booked. They differ
                # whenever leave is booked for a future date: that deduction is
                # dated in the future, so it is rightly absent from today's
                # balance but must not be spendable again.
                "balance": balance,
                "displayBalance": round_to_step(balance, step),
                "available": available,
                # balance - bookedAhead = available. Named so the two headline
                # figures visibly reconcile instead of differing by an unexplained
                # amount once a request is approved.
                "bookedAhead": booked_ahead,
                "accrued": Decimal(d.get("accrued") or 0),
                "carriedOver": Decimal(d.get("carried_over") or 0),
                "used": -Decimal(d.get("used") or 0),
                "reserved": reserved,
                "adjusted": Decimal(d.get("adjusted") or 0),
                "expired": -Decimal(d.get("expired") or 0),
                "policyName": (policy or {}).get("name"),
                "maxBalance": (policy or {}).get("max_balance"),
            }
        )
    return out
