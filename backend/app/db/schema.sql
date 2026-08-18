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
    UNIQUE (tenant_id, code)
);

-- ---------- HolidayCalendar (one row per holiday, region-scoped) ----------
CREATE TABLE holiday_calendar (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    region_id  UUID NOT NULL REFERENCES region(id) ON DELETE CASCADE,
    date       DATE NOT NULL,
    name       TEXT NOT NULL,
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
    join_date   DATE NOT NULL
);

-- ---------- LeaveType (region-scoped, per v1 model) ----------
CREATE TABLE leave_type (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id         UUID NOT NULL REFERENCES region(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    is_paid           BOOLEAN NOT NULL DEFAULT TRUE,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
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

-- Indexes for the two read paths the employee UI uses.
CREATE INDEX idx_leave_request_employee ON leave_request (employee_id, submitted_at DESC);
CREATE INDEX idx_leave_request_tenant_status ON leave_request (tenant_id, status);
CREATE INDEX idx_leave_type_region ON leave_type (region_id) WHERE is_active;
CREATE INDEX idx_holiday_region ON holiday_calendar (region_id, date);
