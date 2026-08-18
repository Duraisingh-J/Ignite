-- =============================================================
-- 003 · Seed data for multi-tier approval
--
-- Multi-tier approval cannot be demonstrated with a one-level org chart.
-- Priya had no manager, so every chain was capped at a single tier no matter
-- what the policy asked for. This adds a level above her:
--
--     Aarti (HR Head)
--       └── Priya (Manager)
--             └── Ravi, Ananya, Karthik, ... (12 reports)
--
-- Idempotent.
-- =============================================================

-- ---------- 1. Aarti, above Priya ----------
INSERT INTO employee (id, tenant_id, manager_id, region_id, name, email, join_date) VALUES
  ('33333333-3333-3333-3333-3333333330aa',
   '11111111-1111-1111-1111-111111111111',
   NULL,
   '22222222-2222-2222-2222-222222222222',
   'Aarti Deshpande', 'aarti.deshpande@meridian.io', '2019-04-08')
ON CONFLICT (id) DO NOTHING;

-- Priya now reports to Aarti, which gives every India employee a two-deep line.
UPDATE employee
   SET manager_id = '33333333-3333-3333-3333-3333333330aa'
 WHERE id = '33333333-3333-3333-3333-333333333334'
   AND manager_id IS NULL;

-- ---------- 2. Approval depth per leave type ----------
-- Deliberately varied so the same system produces different chain lengths.

-- India: Annual Leave always needs two approvals.
UPDATE leave_type SET approval_levels = 2, escalate_above_days = NULL
 WHERE region_id = '22222222-2222-2222-2222-222222222222' AND name = 'Annual Leave';

-- India: Casual Leave needs one, but more than 3 days escalates to two.
-- This is the interesting case: same type, depth depends on duration.
UPDATE leave_type SET approval_levels = 1, escalate_above_days = 3
 WHERE region_id = '22222222-2222-2222-2222-222222222222' AND name = 'Casual Leave';

-- India: Sick Leave stays a single approval regardless of length.
UPDATE leave_type SET approval_levels = 1, escalate_above_days = NULL
 WHERE region_id = '22222222-2222-2222-2222-222222222222' AND name = 'Sick Leave';

-- US: more generous — one approval up to 10 days.
UPDATE leave_type SET approval_levels = 1, escalate_above_days = 10
 WHERE region_id = '22222222-2222-2222-2222-222222222002' AND name = 'PTO';

-- UAE: stricter — Annual Leave always takes two approvals. Same leave type
-- name as India, different depth, purely because the type row is region-scoped.
UPDATE leave_type SET approval_levels = 2, escalate_above_days = NULL
 WHERE region_id = '22222222-2222-2222-2222-222222222004' AND name = 'Annual Leave';
