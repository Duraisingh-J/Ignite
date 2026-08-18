-- =============================================================
-- 002 · Multi-tier approval
--
-- Additive and idempotent: safe to run against a live database with
-- existing leave requests. Nothing is dropped and no rows are rewritten.
-- =============================================================

-- ---------- 1. Approval depth on leave_type ----------
-- Leave types are already region-scoped, so putting depth here makes it
-- region-specific with no policy table.
ALTER TABLE leave_type
    ADD COLUMN IF NOT EXISTS approval_levels SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE leave_type
    ADD COLUMN IF NOT EXISTS escalate_above_days SMALLINT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_type_approval_levels_chk') THEN
        ALTER TABLE leave_type ADD CONSTRAINT leave_type_approval_levels_chk
            CHECK (approval_levels BETWEEN 1 AND 3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_type_escalate_chk') THEN
        ALTER TABLE leave_type ADD CONSTRAINT leave_type_escalate_chk
            CHECK (escalate_above_days IS NULL OR escalate_above_days > 0);
    END IF;
END $$;

-- ---------- 2. The frozen approval chain ----------
CREATE TABLE IF NOT EXISTS leave_request_approval (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_request_id UUID NOT NULL REFERENCES leave_request(id) ON DELETE CASCADE,
    step_order       SMALLINT NOT NULL CHECK (step_order > 0),
    approver_id      UUID REFERENCES employee(id) ON DELETE SET NULL,
    approver_role    TEXT NOT NULL DEFAULT 'MANAGER'
                       CHECK (approver_role IN ('MANAGER', 'SKIP_LEVEL', 'DEPT_HEAD')),
    status           TEXT NOT NULL DEFAULT 'PENDING'
                       CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED')),
    comment          TEXT,
    decided_at       TIMESTAMPTZ,
    UNIQUE (leave_request_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_approval_request
    ON leave_request_approval (leave_request_id, step_order);
CREATE INDEX IF NOT EXISTS idx_approval_approver
    ON leave_request_approval (approver_id, status);

-- ---------- 3. Backfill existing requests ----------
-- Requests that predate this feature have no chain. Give each one a single
-- step reflecting its current state, so the Stepper renders history rather
-- than an empty timeline, and PENDING ones remain actionable.
INSERT INTO leave_request_approval
    (leave_request_id, step_order, approver_id, approver_role, status, decided_at)
SELECT lr.id,
       1,
       e.manager_id,
       'MANAGER',
       CASE
           -- A pre-existing decision is recorded as made; a manager-less
           -- employee could never have been routed, so mark it SKIPPED.
           WHEN lr.status = 'APPROVED' THEN 'APPROVED'
           WHEN lr.status = 'REJECTED' THEN 'REJECTED'
           WHEN lr.status = 'CANCELLED' THEN 'SKIPPED'
           WHEN e.manager_id IS NULL THEN 'SKIPPED'
           ELSE 'PENDING'
       END,
       CASE WHEN lr.status IN ('APPROVED', 'REJECTED') THEN lr.submitted_at END
  FROM leave_request lr
  JOIN employee e ON e.id = lr.employee_id
 WHERE NOT EXISTS (
     SELECT 1 FROM leave_request_approval a WHERE a.leave_request_id = lr.id
 );
