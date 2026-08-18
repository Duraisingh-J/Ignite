from uuid import UUID

from app.db import fetch_all, fetch_one

_COLS = """
    p.id, p.tenant_id, p.name, p.region_id, p.leave_type_id,
    p.tenure_from_months, p.tenure_to_months,
    p.method, p.rate, p.days_worked_divisor, p.pay_periods_per_year,
    p.waiting_period_days, p.prorate_on_join,
    p.max_balance, p.negative_allowed_days, p.rounding_step,
    p.reset_basis, p.carryover_max, p.carryover_expiry_months, p.is_encashable,
    p.priority, p.is_active
"""


async def find_by_tenant(tenant_id: UUID) -> list[dict]:
    return await fetch_all(
        f"""SELECT {_COLS}, r.country_name AS region_name, lt.name AS leave_type_name
              FROM accrual_policy p
              LEFT JOIN region r ON r.id = p.region_id
              LEFT JOIN leave_type lt ON lt.id = p.leave_type_id
             WHERE p.tenant_id = %s
             ORDER BY r.country_name NULLS FIRST, lt.name NULLS FIRST,
                      p.tenure_from_months""",
        (tenant_id,),
    )


async def find_by_id(policy_id: UUID) -> dict | None:
    return await fetch_one(f"SELECT {_COLS} FROM accrual_policy p WHERE p.id = %s", (policy_id,))


async def select_for(
    *, region_id: UUID, leave_type_id: UUID, tenure_months: int
) -> dict | None:
    """The policy governing one employee's leave type at a given tenure.

    Most specific wins, then highest priority. A NULL region or leave type acts
    as a wildcard, so a tenant-wide default can sit under regional overrides.

    Tenure is a parameter rather than being read once, because the caller
    re-selects per accrual period: someone crossing 24 months in March must
    accrue at the old rate through February and the new rate from March.
    """
    return await fetch_one(
        f"""SELECT {_COLS} FROM accrual_policy p
             WHERE p.is_active
               AND (p.region_id = %(region)s OR p.region_id IS NULL)
               AND (p.leave_type_id = %(type)s OR p.leave_type_id IS NULL)
               AND p.tenure_from_months <= %(tenure)s
               AND (p.tenure_to_months IS NULL OR p.tenure_to_months > %(tenure)s)
             ORDER BY (p.region_id IS NULL),      -- concrete region first
                      (p.leave_type_id IS NULL),  -- then concrete type
                      p.priority DESC,
                      p.tenure_from_months DESC
             LIMIT 1""",
        {"region": region_id, "type": leave_type_id, "tenure": tenure_months},
    )


async def insert(**kw) -> dict:
    row = await fetch_one(
        f"""INSERT INTO accrual_policy
              (tenant_id, name, region_id, leave_type_id,
               tenure_from_months, tenure_to_months, method, rate,
               days_worked_divisor, pay_periods_per_year, waiting_period_days,
               prorate_on_join, max_balance, negative_allowed_days, rounding_step,
               reset_basis, carryover_max, carryover_expiry_months, is_encashable,
               priority, is_active)
            VALUES (%(tenant_id)s, %(name)s, %(region_id)s, %(leave_type_id)s,
                    %(tenure_from_months)s, %(tenure_to_months)s, %(method)s, %(rate)s,
                    %(days_worked_divisor)s, %(pay_periods_per_year)s, %(waiting_period_days)s,
                    %(prorate_on_join)s, %(max_balance)s, %(negative_allowed_days)s,
                    %(rounding_step)s, %(reset_basis)s, %(carryover_max)s,
                    %(carryover_expiry_months)s, %(is_encashable)s, %(priority)s, TRUE)
            RETURNING {_COLS.replace('p.', '')}""",
        kw,
    )
    assert row is not None
    return row


async def update(policy_id: UUID, fields: dict) -> dict | None:
    if not fields:
        return await find_by_id(policy_id)
    sets = ", ".join(f"{k} = %({k})s" for k in fields)
    params = {**fields, "pid": policy_id}
    return await fetch_one(
        f"UPDATE accrual_policy SET {sets} WHERE id = %(pid)s RETURNING {_COLS.replace('p.', '')}",
        params,
    )


async def delete(policy_id: UUID) -> None:
    await fetch_one("DELETE FROM accrual_policy WHERE id = %s RETURNING id", (policy_id,))
