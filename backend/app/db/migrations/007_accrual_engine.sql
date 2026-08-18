-- =============================================================
-- 007 · Dynamic accrual engine
--
-- A balance is never stored. It is a fold over an append-only ledger, so
-- "what was my balance in April", a retroactive correction, and "why is it 12?"
-- are all answerable — none of which a mutable column can do.
--
-- Additive and idempotent.
-- =============================================================

-- ---------- 1. The append-only ledger ----------
CREATE TABLE IF NOT EXISTS leave_ledger (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    employee_id    UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    leave_type_id  UUID NOT NULL REFERENCES leave_type(id) ON DELETE CASCADE,

    entry_type     TEXT NOT NULL CHECK (entry_type IN
                     ('OPENING','ACCRUAL','CARRYOVER','DEDUCTION',
                      'REVERSAL','ADJUSTMENT','EXPIRY','ENCASHMENT')),

    -- Signed: credits positive, debits negative. Stored EXACT — rounding a
    -- 1.25 rate to half-day steps every month grants 18 days instead of 15.
    amount         NUMERIC(6,2) NOT NULL,
    effective_date DATE NOT NULL,

    -- What caused it. A DEDUCTION and its REVERSAL both point at the request.
    source_id      UUID,

    -- 'accrual:<employee>:<policy>:<period>'. UNIQUE, and the single reason the
    -- runner is safe to replay: run it late, twice, or backfill a year and the
    -- result is identical.
    idempotency_key TEXT UNIQUE,

    note           TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_balance
    ON leave_ledger (employee_id, leave_type_id, effective_date);
CREATE INDEX IF NOT EXISTS idx_ledger_source
    ON leave_ledger (source_id) WHERE source_id IS NOT NULL;

-- ---------- 2. Accrual rules, as data ----------
CREATE TABLE IF NOT EXISTS accrual_policy (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,

    -- Applies to. NULL means "any".
    region_id     UUID REFERENCES region(id) ON DELETE CASCADE,
    leave_type_id UUID REFERENCES leave_type(id) ON DELETE CASCADE,

    -- Tenure bands are ROWS, not columns: 0-24, 25-60, 61+ are three rows for
    -- the same region and type. Adding a band is a row, not a deploy. The UAE
    -- statute is literally such a band.
    tenure_from_months SMALLINT NOT NULL DEFAULT 0,
    tenure_to_months   SMALLINT,

    method        TEXT NOT NULL CHECK (method IN
                    ('MONTHLY','ANNUAL_GRANT','PER_PAY_PERIOD','PER_DAYS_WORKED')),
    rate          NUMERIC(6,2) NOT NULL DEFAULT 0,
    days_worked_divisor SMALLINT,
    pay_periods_per_year SMALLINT NOT NULL DEFAULT 24,

    waiting_period_days SMALLINT NOT NULL DEFAULT 0,
    prorate_on_join     BOOLEAN NOT NULL DEFAULT TRUE,

    -- Accrual stops at the cap rather than overshooting and discarding.
    max_balance           NUMERIC(6,2),
    negative_allowed_days NUMERIC(6,2) NOT NULL DEFAULT 0,
    rounding_step         NUMERIC(4,2) NOT NULL DEFAULT 0.5,

    reset_basis            TEXT NOT NULL DEFAULT 'CALENDAR'
                             CHECK (reset_basis IN ('CALENDAR','FISCAL','ANNIVERSARY')),
    carryover_max          NUMERIC(6,2),   -- NULL = unlimited (some US states)
    carryover_expiry_months SMALLINT,
    is_encashable          BOOLEAN NOT NULL DEFAULT FALSE,

    priority   INT NOT NULL DEFAULT 0,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,

    CHECK (tenure_to_months IS NULL OR tenure_to_months > tenure_from_months),
    CHECK (method <> 'PER_DAYS_WORKED' OR days_worked_divisor > 0)
);

CREATE INDEX IF NOT EXISTS idx_accrual_policy_lookup
    ON accrual_policy (tenant_id, region_id, leave_type_id) WHERE is_active;
