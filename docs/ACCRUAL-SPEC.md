# Dynamic Accrual — Build Specification

> **Status: specification, not built.** This is the plan for the accrual engine.
> Design reasoning lives in the *Ideology* section; everything after it is
> implementable as written.

---

## 1. The core idea

**A balance is not a stored number. It is a fold over an append-only ledger.**

```
balance(employee, leaveType, asOf) = Σ amount WHERE effective_date <= asOf
```

Every change is an immutable row. Nothing is ever updated in place.

Four things this buys that a `balance` column cannot provide:

| Requirement | Ledger | Mutable column |
| --- | --- | --- |
| "What was my balance on 1 April?" | sum to that date | lost |
| Payroll corrects March retroactively | dated correction row | destroys history |
| "Why is my balance 12?" | read the entries | unanswerable |
| Cancel approved leave | compensating `+` entry | mutate and hope |

An account that moved 10 days in and 10 days out is not the same as one that
never moved, though both net to zero. A single number cannot tell them apart.

---

## 2. Decisions — defaults chosen, change if wrong

These four shape everything below. Each has a default so the build can start;
each is a one-line change if you disagree.

| # | Decision | **Default taken** | Why |
| --- | --- | --- | --- |
| 1 | Reset basis | **Calendar year** (1 Jan) | Simplest to reason about and demo. UAE law is anniversary-shaped, so `reset_basis` is a column, not a constant |
| 2 | Advance or arrears | **Arrears** — earned at period end | A new joiner cannot book leave they have not yet earned; matches most Indian and UK practice |
| 3 | Negative balance | **Not allowed** (`negative_allowed_days = 0`) | Keeps the first version honest; the column exists to relax it per policy |
| 4 | Rounding | **0.5 day**, half-up at period end | 1.25 days/month is unusable in a UI that only books whole days |

Decision 4 has a consequence: **half-days are not currently in the schema.**
Either accrual rounds to whole days (crude — 1.25/month becomes 1), or
`leave_request` gains half-day support. Recommendation: store the ledger in
`NUMERIC(6,2)` from day one, and let the UI book whole days until half-days land.

---

## 3. Schema

### 3.1 `leave_ledger` — the append-only truth

```sql
CREATE TABLE leave_ledger (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    employee_id    UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    leave_type_id  UUID NOT NULL REFERENCES leave_type(id),

    entry_type     TEXT NOT NULL CHECK (entry_type IN
                     ('ACCRUAL','CARRYOVER','DEDUCTION','REVERSAL',
                      'ADJUSTMENT','EXPIRY','ENCASHMENT','OPENING')),
    amount         NUMERIC(6,2) NOT NULL,   -- signed: + credits, - debits
    effective_date DATE NOT NULL,           -- the date it counts from

    -- What caused this entry. A DEDUCTION points at its leave_request.
    source_id      UUID,
    -- Idempotency: 'accrual:<employeeId>:<policyId>:2026-03' etc.
    -- A unique key is what makes the runner safe to replay.
    idempotency_key TEXT UNIQUE,

    note           TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_balance
    ON leave_ledger (employee_id, leave_type_id, effective_date);
```

**Never** `UPDATE` or `DELETE` a row here. Corrections are new rows.

### 3.2 `accrual_policy` — rules as data

```sql
CREATE TABLE accrual_policy (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,

    -- ---- applies to (NULL = any) ----
    region_id     UUID REFERENCES region(id) ON DELETE CASCADE,
    leave_type_id UUID REFERENCES leave_type(id) ON DELETE CASCADE,
    tenure_from_months SMALLINT NOT NULL DEFAULT 0,
    tenure_to_months   SMALLINT,           -- NULL = no upper bound

    -- ---- earning ----
    method        TEXT NOT NULL CHECK (method IN
                    ('MONTHLY','ANNUAL_GRANT','PER_PAY_PERIOD','PER_DAYS_WORKED')),
    rate          NUMERIC(6,2) NOT NULL,   -- days per period
    days_worked_divisor SMALLINT,          -- PER_DAYS_WORKED: 1 day per N worked

    -- ---- joining ----
    waiting_period_days SMALLINT NOT NULL DEFAULT 0,
    prorate_on_join     BOOLEAN NOT NULL DEFAULT TRUE,

    -- ---- limits ----
    max_balance          NUMERIC(6,2),     -- accrual STOPS at this, not clamps
    negative_allowed_days NUMERIC(6,2) NOT NULL DEFAULT 0,
    rounding_step        NUMERIC(4,2) NOT NULL DEFAULT 0.5,

    -- ---- year end ----
    reset_basis            TEXT NOT NULL DEFAULT 'CALENDAR'
                             CHECK (reset_basis IN ('CALENDAR','FISCAL','ANNIVERSARY')),
    carryover_max          NUMERIC(6,2) NOT NULL DEFAULT 0,
    carryover_expiry_months SMALLINT,      -- NULL = never expires
    is_encashable          BOOLEAN NOT NULL DEFAULT FALSE,

    priority   INT NOT NULL DEFAULT 0,     -- higher wins when several match
    is_active  BOOLEAN NOT NULL DEFAULT TRUE
);
```

**Tenure tiers are rows.** `0–24`, `25–60`, `61+` months are three rows of the
same table for the same region and leave type. Adding a fourth band is a row,
not a deploy — this is what makes accrual *dynamic* rather than hardcoded.

### 3.3 Policy selection

Most specific wins, then highest `priority`:

```
region + leave_type + tenure   >   region + leave_type
                               >   leave_type
                               >   global
```

---

## 4. The engine

### 4.1 Balance

```python
async def balance_as_of(employee_id, leave_type_id, as_of: date) -> Decimal
```

One `SUM` over the index above. Cheap; no cache until proven necessary.

```python
async def balance_detail(employee_id, leave_type_id, as_of) -> dict
# { accrued, carriedOver, used, reserved, adjusted, expired, available }
```

`available` is what the Apply Leave form checks. `reserved` covers requests
already submitted but not yet fully approved.

### 4.2 Accrual runner — idempotent by construction

```python
async def run_accrual(employee_id, as_of: date) -> list[LedgerEntry]
```

1. Resolve the policy for `(region, leave_type, tenure_at_period)`
2. Enumerate every period from `max(join_date + waiting_period, policy start)` to `as_of`
3. For each period, build `idempotency_key = f"accrual:{employee}:{policy}:{period}"`
4. **Insert only keys that do not already exist**
5. Skip any period where the balance already sits at `max_balance`

That unique key is the whole safety property. Run it late, twice, or replay a
year — the result is identical. Without it a cron firing twice silently doubles
everyone's leave, and nobody notices until year end.

**Tenure is evaluated per period, not once.** An employee crossing 24 months in
March accrues at the old rate through February and the new rate from March. Do
not resolve the policy once and reuse it across the loop.

### 4.3 Proration on join

```
joined 20 Mar, monthly rate 1.5, March has 31 days
→ 12 remaining days / 31 = 0.387 × 1.5 = 0.58 → rounds to 0.5
```

Same routine handles exit, with the fraction taken from the other end.

### 4.4 Year end

Run once per reset boundary, in this order:

1. `CARRYOVER` — credit `min(balance, carryover_max)` into the new year
2. `EXPIRY` — debit whatever exceeded the cap, so the loss is *visible* rather than a number quietly changing
3. Schedule expiry of the carried amount if `carryover_expiry_months` is set

---

## 5. Reservation — where this meets multi-tier approval

**The most important integration point, and the easiest to get wrong.**

A request now sits `PENDING` across up to four approvers. That forces a choice:

| Deduct when? | Failure |
| --- | --- |
| On final approval | Employee submits five overlapping requests; each passes the balance check independently |
| On submit, no reversal | A rejection silently destroys the leave |

**Do this instead:**

| Event | Ledger action |
| --- | --- |
| Request submitted | `DEDUCTION` −N, `source_id = request`, note `reserved` |
| Fully approved | *nothing* — the deduction already stands |
| Rejected | `REVERSAL` +N referencing the same request |
| Cancelled | `REVERSAL` +N |
| Approved then cancelled | `REVERSAL` +N |

A reversal is a **new compensating row**, never a delete. Deleting would erase
the fact that leave was requested and refused — precisely what an audit asks
about later.

`chargeableDays` already comes from the working-day engine, so the amount is
solved. Only the lifecycle is new, and it hangs off the approval state machine
that already exists.

---

## 6. Regional policies to seed

Every one of these is expressible in the single schema above. Sources in §11.

### 🇮🇳 India — attendance-earned, tenure-tiered

```
Earned Leave   PER_DAYS_WORKED  divisor 20   (≈15 days/yr)
               waiting 240 days · carryover 30 · encashable
Casual Leave   MONTHLY  1.0 · max_balance 12 · carryover 0
Sick Leave     ANNUAL_GRANT  12 · carryover 0
```

India's statutory rule is **1 day per 20 days worked** — this is why
`PER_DAYS_WORKED` must exist. It cannot be expressed as "N per month."

### 🇦🇪 UAE — a tenure tier written into law

```
tenure 0–6 months    ANNUAL_GRANT 0      (nothing accrues)
tenure 6–12 months   MONTHLY 2.0         (2 calendar days/month)
tenure 12+ months    ANNUAL_GRANT 30     (30 calendar days/year)
```

Three rows, one leave type. The statute is literally a tenure-banded accrual,
which is the strongest argument for tiers being rows rather than a column.

⚠️ UAE counts **calendar** days, not working days. Your engine currently charges
working days only. Flag as a known divergence or add `counts_calendar_days` to
`leave_type`.

### 🇬🇧 UK — accrues from day one

```
Annual Leave   MONTHLY 2.33   (28 days/yr = 5.6 weeks)
               waiting 0 · carryover 5 · prorate_on_join TRUE
```

⚠️ The UK's 28 days **includes** 8 bank holidays. Your engine treats holidays as
*additional* non-chargeable days, so seeding 28 over-grants. Either seed 20 and
keep holidays separate, or model UK holidays as inside the entitlement.

### 🇺🇸 US — no statutory floor

```
PTO   PER_PAY_PERIOD 0.83   (≈20 days/yr, 24 periods)
      max_balance 30 · carryover unlimited
```

Some states ban "use it or lose it", so `carryover_max` must support unlimited
(NULL) rather than assuming a cap exists.

---

## 7. API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/balances?employeeId=` | Per leave type, with the detail breakdown |
| `GET` | `/api/v1/balances/{employeeId}/ledger?leaveTypeId=` | The entries — "why is it 12?" |
| `GET` | `/api/v1/accrual-policies?tenantId=` | Admin list |
| `POST` `PATCH` `DELETE` | `/api/v1/accrual-policies` | Admin CRUD |
| `POST` | `/api/v1/accrual/run` | Trigger the runner (idempotent; safe to expose) |

---

## 8. UI

| Screen | Change |
| --- | --- |
| Apply Leave | Real balance; block when `chargeable > available`; show *balance after* |
| My Requests | Ledger extract per request — the deduction and any reversal |
| Employee Dashboard | **Restore the leave dials** — they were removed for having nothing behind them |
| Admin → Policies | Becomes real: tenure tiers, rates, caps, carryover |
| Admin → Employees | "Run accrual" action, plus a per-employee ledger view |

The dials returning is the visible payoff: the original prototype had them, they
were deleted for being fiction, and this is what makes them true.

---

## 9. Test matrix

Each row is a specific bug this design is exposed to.

| Case | Expected |
| --- | --- |
| Runner executed twice for one month | One entry — idempotency key holds |
| Employee joins 20 Mar | March prorated, not a full month |
| Tenure crosses a tier mid-year | Old rate before, new rate after, in the same run |
| Balance at `max_balance` | Accrual **stops**; no silently discarded entry |
| Request rejected | `REVERSAL` restores the balance; both rows survive |
| Two overlapping pending requests | Second blocked — the first is reserved |
| Year end with `carryover_max = 5`, balance 12 | +5 carried, 7 explicitly `EXPIRY` |
| `balance_as_of` a past date | Ignores later entries |
| Waiting period unmet | Zero accrual, no entries at all |

---

## 10. Build order

| # | Step | Est. | Why this order |
| --- | --- | --- | --- |
| 1 | `leave_ledger` + `balance_as_of` | 45 min | Nothing else works without it |
| 2 | `accrual_policy` + selection | 45 min | Rules before the runner that reads them |
| 3 | Idempotent runner + proration | 1.5 hr | The heart |
| 4 | Reservation on submit/reject/cancel | 1 hr | Wires into the existing approval machine |
| 5 | Balance API + Apply Leave check | 45 min | First visible payoff |
| 6 | Seed the four regional policies | 30 min | Proves the schema generalises |
| 7 | Admin → Policies made real | 1 hr | Demonstrates *dynamic* |
| 8 | Ledger view + dials | 45 min | "Show your working" |

**≈7 hours.** Steps 1–5 (≈4 hr) are a credible standalone slice; 6–8 make it
demo-ready.

---

## 11. Deferred — and defensible

| Not building | One-line answer if asked |
| --- | --- |
| Encashment | Ledger already has the `ENCASHMENT` type; only payroll integration is missing |
| Carryover expiry scheduling | Column exists; needs a scheduled job |
| Hours-worked accrual | Fifth `method` value; no schema change |
| FTE / part-time proration | A multiplier on `rate` |
| Half-days | Ledger is already `NUMERIC(6,2)`; the UI is the blocker |
| Negative balances | Column exists, defaulted to 0 |

Everything deferred is a **row or a column**, not a redesign. That is the test of
whether the schema is right.

---

## 12. Sources

- [OrangeHRM — Leave Accruals](https://orangehrm.com/resources/hr-dictionary/accruals-leave) — accrual periods, prorate conditions, max limits, carry-over, expiry
- [HR Cloud — PTO Accrual Policies](https://www.hrcloud.com/resources/glossary/accrual-policies) — balance caps stop accrual rather than clamping
- [NetSuite — Leave Accrual Balance and Transactions](https://docs.oracle.com/en/cloud/saas/netsuite-openair/nsoa-online-help/section_N297892.html) — ledger-of-transactions model in a production HR system
- [Building an accrual-based credit ledger](https://dev.to/pvgomes/how-to-build-an-accrual-based-credit-ledger-1dpj) — why transaction-based beats a running balance
- [UAE annual leave entitlement](https://www.leavebalance.com/blog/annual-leave-entitlement-uae/) — 2 days/month at 6–12 months, 30 days after 1 year
- [India annual leave entitlement](https://www.leavebalance.com/blog/annual-leave-entitlement-india/) — 1 day per 20 days worked; encashable
- [UK statutory leave](https://x0pa.com/glossary/statutory-leave/) — accrues from day one including probation
- [Annual leave entitlements overview](https://testlify.com/hr-glossary/annual-leave/) — 5.6 weeks including bank holidays
