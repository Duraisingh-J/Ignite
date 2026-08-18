-- =============================================================
-- 004 · Role-based approvers (the HR gap)
--
-- Approvers were resolved only by walking the reporting line, which can never
-- produce HR: HR is a ROLE, not a rung on anyone's ladder. Walking upward from
-- an engineer yields their manager and their manager's manager, forever.
--
-- Roles are data, not an enum, so an organisation can invent FINANCE or LEGAL
-- without a schema change. Assignments are region-scoped, so India's HR handles
-- India and the UAE's handles the UAE automatically.
--
-- Additive and idempotent.
-- =============================================================

-- ---------- 1. Roles an organisation defines for itself ----------
CREATE TABLE IF NOT EXISTS role (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    code      TEXT NOT NULL,
    name      TEXT NOT NULL,
    UNIQUE (tenant_id, code)
);

-- ---------- 2. Who holds a role, and where ----------
-- region_id NULL means the whole tenant; a value scopes the holder to that
-- region, so a request resolves to the holder for the requester's own region.
CREATE TABLE IF NOT EXISTS employee_role (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    role_id     UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    region_id   UUID REFERENCES region(id) ON DELETE CASCADE,
    UNIQUE (employee_id, role_id, region_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_role_lookup
    ON employee_role (role_id, region_id);

-- ---------- 3. A leave type may end with a role approval ----------
-- The reporting-line tiers stay exactly as they are; this appends one final
-- step resolved by role instead of by hierarchy.
ALTER TABLE leave_type
    ADD COLUMN IF NOT EXISTS final_approver_role_id UUID REFERENCES role(id) ON DELETE SET NULL;

-- ---------- 4. Allow ROLE as a step's approver kind ----------
DO $$
BEGIN
    ALTER TABLE leave_request_approval DROP CONSTRAINT IF EXISTS leave_request_approval_approver_role_check;
    ALTER TABLE leave_request_approval ADD CONSTRAINT leave_request_approval_approver_role_check
        CHECK (approver_role IN ('MANAGER', 'SKIP_LEVEL', 'DEPT_HEAD', 'ROLE'));
END $$;
