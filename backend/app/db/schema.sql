-- =============================================================
-- Leave Management - schema (v1)
-- Mirrors simple_leave_submission_model (6).mermaid exactly.
-- Scope: onboarding -> submission. No balances, accrual, or
-- multi-tier approval. AdminDashboard is a query service, not a
-- table, so it is intentionally absent here.
-- Idempotent: safe to re-run.
-- =============================================================

DROP TABLE IF EXISTS leave_request CASCADE;
DROP TABLE IF EXISTS leave_type CASCADE;
DROP TABLE IF EXISTS holiday_calendar CASCADE;
DROP TABLE IF EXISTS employee CASCADE;
DROP TABLE IF EXISTS region CASCADE;
DROP TABLE IF EXISTS tenant CASCADE;

-- ---------- Tenant ----------
CREATE TABLE tenant (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_name  TEXT NOT NULL
);

-- ---------- Region ----------
CREATE TABLE region (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    code          TEXT NOT NULL,
    country_name  TEXT NOT NULL,
    work_days     SMALLINT[] NOT NULL DEFAULT '{0,1,2,3,4}',
    timezone      TEXT NOT NULL DEFAULT 'UTC',
    UNIQUE (tenant_id, code)
);

-- ---------- HolidayCalendar (one row per holiday, region-scoped) ----------
CREATE TABLE holiday_calendar (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    region_id  UUID NOT NULL REFERENCES region(id) ON DELETE CASCADE,
    date       DATE NOT NULL,
    name       TEXT NOT NULL,
    -- ANNUAL: the month/day repeats every year (the stored year is the anchor).
    -- NONE:   that exact date only - one-off closures, and lunar festivals
    --         (Diwali, Eid) which follow no formula and are entered per year.
    recurrence TEXT NOT NULL DEFAULT 'NONE'
                 CHECK (recurrence IN ('NONE', 'ANNUAL')),
    UNIQUE (region_id, date)
);

-- ---------- Employee ----------
CREATE TABLE employee (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    manager_id  UUID REFERENCES employee(id) ON DELETE SET NULL,
    region_id   UUID NOT NULL REFERENCES region(id),
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    join_date   DATE NOT NULL,
    password_hash TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'EMPLOYEE' CHECK (role IN ('ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'))
);

-- ---------- LeaveType (region-scoped, per v1 model) ----------
-- Approval depth lives here rather than in a separate policy table. Leave
-- types are already region-scoped, so this makes approval depth region-specific
-- for free: India's Annual Leave can need two approvals while the UAE's needs one.
CREATE TABLE leave_type (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id           UUID NOT NULL REFERENCES region(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    is_paid             BOOLEAN NOT NULL DEFAULT TRUE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    requires_approval   BOOLEAN NOT NULL DEFAULT TRUE,
    -- Base number of approvals a request of this type needs.
    approval_levels     SMALLINT NOT NULL DEFAULT 1
                          CHECK (approval_levels BETWEEN 1 AND 3),
    -- When set, a request longer than this many chargeable days needs one
    -- extra approval. NULL means duration never changes the depth.
    escalate_above_days SMALLINT
                          CHECK (escalate_above_days IS NULL OR escalate_above_days > 0),
    UNIQUE (region_id, name)
);

-- ---------- LeaveRequest ----------
CREATE TABLE leave_request (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    employee_id   UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_type(id),
    start_date    DATE NOT NULL,
    end_date      DATE NOT NULL,
    status        TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    reason        TEXT,
    submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_date >= start_date)
);

-- ---------- LeaveRequestApproval (the frozen approval chain) ----------
-- One row per tier, created when the request is submitted. The approver is
-- resolved from the employee's reporting line at that moment and then frozen:
-- if the org chart changes mid-review, an in-flight request must not silently
-- change hands, and the history has to stay answerable.
--
-- leave_request.status is DERIVED from these rows and must never be set
-- directly, or the two can disagree permanently.
CREATE TABLE leave_request_approval (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_request_id UUID NOT NULL REFERENCES leave_request(id) ON DELETE CASCADE,
    -- 1-based tier. Duplicates are allowed by design so parallel approvals
    -- ("any 2 of 3") can be added later without a migration.
    step_order       SMALLINT NOT NULL CHECK (step_order > 0),
    -- NULL when the reporting line ran out before the required depth; such a
    -- step is recorded as SKIPPED rather than blocking the request forever.
    approver_id      UUID REFERENCES employee(id) ON DELETE SET NULL,
    approver_role    TEXT NOT NULL DEFAULT 'MANAGER'
                       CHECK (approver_role IN ('MANAGER', 'SKIP_LEVEL', 'DEPT_HEAD')),
    status           TEXT NOT NULL DEFAULT 'PENDING'
                       CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED')),
    comment          TEXT,
    decided_at       TIMESTAMPTZ,
    UNIQUE (leave_request_id, step_order)
);

CREATE INDEX idx_approval_request ON leave_request_approval (leave_request_id, step_order);
-- Drives "what is waiting on me": the approver's pending steps.
CREATE INDEX idx_approval_approver ON leave_request_approval (approver_id, status);

-- Indexes for the two read paths the employee UI uses.
CREATE INDEX idx_leave_request_employee ON leave_request (employee_id, submitted_at DESC);
CREATE INDEX idx_leave_request_tenant_status ON leave_request (tenant_id, status);
CREATE INDEX idx_leave_type_region ON leave_type (region_id) WHERE is_active;
CREATE INDEX idx_holiday_region ON holiday_calendar (region_id, date);
