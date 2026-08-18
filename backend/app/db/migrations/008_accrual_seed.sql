-- =============================================================
-- 008 · Regional accrual policies
--
-- Every rule below is expressed in the SAME table. The differences between
-- regions are not configuration taste — they are statutory, and they have
-- different shapes, which is why `method` needs more than one value.
--
-- Leave types are looked up by (region, name) rather than by fixed UUID, so
-- this survives a reseed.
-- Idempotent: policies are keyed by name.
-- =============================================================

-- ---------------- INDIA ----------------
-- Casual Leave: straightforward monthly accrual, capped, nothing carries over.
INSERT INTO accrual_policy
  (tenant_id, name, region_id, leave_type_id, method, rate,
   max_balance, carryover_max, reset_basis, priority)
SELECT '11111111-1111-1111-1111-111111111111',
       'India · Casual Leave', r.id, lt.id, 'MONTHLY', 1.00,
       12, 0, 'CALENDAR', 10
  FROM region r JOIN leave_type lt ON lt.region_id = r.id
 WHERE r.code = 'IN' AND lt.name = 'Casual Leave'
   AND NOT EXISTS (SELECT 1 FROM accrual_policy p WHERE p.name = 'India · Casual Leave');

-- Sick Leave: granted whole at the start of each year, use it or lose it.
INSERT INTO accrual_policy
  (tenant_id, name, region_id, leave_type_id, method, rate,
   max_balance, carryover_max, reset_basis, priority)
SELECT '11111111-1111-1111-1111-111111111111',
       'India · Sick Leave', r.id, lt.id, 'ANNUAL_GRANT', 12.00,
       12, 0, 'CALENDAR', 10
  FROM region r JOIN leave_type lt ON lt.region_id = r.id
 WHERE r.code = 'IN' AND lt.name = 'Sick Leave'
   AND NOT EXISTS (SELECT 1 FROM accrual_policy p WHERE p.name = 'India · Sick Leave');

-- Annual Leave, band 1 (under 2 years): 15 days a year.
INSERT INTO accrual_policy
  (tenant_id, name, region_id, leave_type_id, tenure_from_months, tenure_to_months,
   method, rate, max_balance, carryover_max, is_encashable, reset_basis, priority)
SELECT '11111111-1111-1111-1111-111111111111',
       'India · Annual Leave · 0-24 months', r.id, lt.id, 0, 24,
       'MONTHLY', 1.25, 30, 10, TRUE, 'CALENDAR', 20
  FROM region r JOIN leave_type lt ON lt.region_id = r.id
 WHERE r.code = 'IN' AND lt.name = 'Annual Leave'
   AND NOT EXISTS (SELECT 1 FROM accrual_policy p WHERE p.name = 'India · Annual Leave · 0-24 months');

-- Annual Leave, band 2 (2 years and over): 21 days a year. Same region, same
-- leave type, different row — this is what makes tenure tiers dynamic.
INSERT INTO accrual_policy
  (tenant_id, name, region_id, leave_type_id, tenure_from_months, tenure_to_months,
   method, rate, max_balance, carryover_max, is_encashable, reset_basis, priority)
SELECT '11111111-1111-1111-1111-111111111111',
       'India · Annual Leave · 25+ months', r.id, lt.id, 25, NULL,
       'MONTHLY', 1.75, 45, 15, TRUE, 'CALENDAR', 20
  FROM region r JOIN leave_type lt ON lt.region_id = r.id
 WHERE r.code = 'IN' AND lt.name = 'Annual Leave'
   AND NOT EXISTS (SELECT 1 FROM accrual_policy p WHERE p.name = 'India · Annual Leave · 25+ months');

-- ---------------- UNITED ARAB EMIRATES ----------------
-- The UAE statute IS a tenure band: nothing for six months, then 2 days a
-- month until one year, then 30 days a year. Three rows, one leave type.
INSERT INTO accrual_policy
  (tenant_id, name, region_id, leave_type_id, tenure_from_months, tenure_to_months,
   method, rate, waiting_period_days, max_balance, carryover_max, reset_basis, priority)
SELECT '11111111-1111-1111-1111-111111111111',
       'UAE · Annual Leave · under 6 months', r.id, lt.id, 0, 6,
       'MONTHLY', 0.00, 180, 30, 0, 'ANNIVERSARY', 20
  FROM region r JOIN leave_type lt ON lt.region_id = r.id
 WHERE r.code = 'AE' AND lt.name = 'Annual Leave'
   AND NOT EXISTS (SELECT 1 FROM accrual_policy p WHERE p.name = 'UAE · Annual Leave · under 6 months');

INSERT INTO accrual_policy
  (tenant_id, name, region_id, leave_type_id, tenure_from_months, tenure_to_months,
   method, rate, max_balance, carryover_max, reset_basis, priority)
SELECT '11111111-1111-1111-1111-111111111111',
       'UAE · Annual Leave · 6-12 months', r.id, lt.id, 6, 12,
       'MONTHLY', 2.00, 30, 0, 'ANNIVERSARY', 20
  FROM region r JOIN leave_type lt ON lt.region_id = r.id
 WHERE r.code = 'AE' AND lt.name = 'Annual Leave'
   AND NOT EXISTS (SELECT 1 FROM accrual_policy p WHERE p.name = 'UAE · Annual Leave · 6-12 months');

INSERT INTO accrual_policy
  (tenant_id, name, region_id, leave_type_id, tenure_from_months, tenure_to_months,
   method, rate, max_balance, carryover_max, reset_basis, priority)
SELECT '11111111-1111-1111-1111-111111111111',
       'UAE · Annual Leave · 12+ months', r.id, lt.id, 12, NULL,
       'ANNUAL_GRANT', 30.00, 60, 30, 'ANNIVERSARY', 20
  FROM region r JOIN leave_type lt ON lt.region_id = r.id
 WHERE r.code = 'AE' AND lt.name = 'Annual Leave'
   AND NOT EXISTS (SELECT 1 FROM accrual_policy p WHERE p.name = 'UAE · Annual Leave · 12+ months');

-- ---------------- UNITED KINGDOM ----------------
-- Statutory 5.6 weeks is 28 days INCLUDING public holidays, and this engine
-- treats holidays as additional non-chargeable days. Seeding 28 would
-- over-grant, so 20 is seeded and the 8 bank holidays stay separate.
INSERT INTO accrual_policy
  (tenant_id, name, region_id, leave_type_id, method, rate,
   waiting_period_days, max_balance, carryover_max, reset_basis, priority)
SELECT '11111111-1111-1111-1111-111111111111',
       'UK · Annual Leave', r.id, lt.id, 'MONTHLY', 1.67,
       0, 30, 5, 'CALENDAR', 10
  FROM region r JOIN leave_type lt ON lt.region_id = r.id
 WHERE r.code = 'UK' AND lt.name = 'Annual Leave'
   AND NOT EXISTS (SELECT 1 FROM accrual_policy p WHERE p.name = 'UK · Annual Leave');

-- ---------------- UNITED STATES ----------------
-- No federal floor. Accrues per pay period, and carryover is left unlimited
-- because several states outlaw use-it-or-lose-it.
INSERT INTO accrual_policy
  (tenant_id, name, region_id, leave_type_id, method, rate,
   pay_periods_per_year, max_balance, carryover_max, reset_basis, priority)
SELECT '11111111-1111-1111-1111-111111111111',
       'US · PTO', r.id, lt.id, 'PER_PAY_PERIOD', 0.83,
       24, 30, NULL, 'CALENDAR', 10
  FROM region r JOIN leave_type lt ON lt.region_id = r.id
 WHERE r.code = 'US' AND lt.name = 'PTO'
   AND NOT EXISTS (SELECT 1 FROM accrual_policy p WHERE p.name = 'US · PTO');
