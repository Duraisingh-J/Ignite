-- =============================================================
-- Seed data (mirrors the sample UI: tenant "Meridian", India region,
-- employee Ravi, three leave types, three 2026 holidays).
-- Fixed UUIDs so the frontend can point at Ravi without a login flow.
-- Idempotent via ON CONFLICT.
-- =============================================================

-- Tenant
INSERT INTO tenant (id, org_name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Meridian')
ON CONFLICT (id) DO NOTHING;

-- Region
INSERT INTO region (id, tenant_id, code, country_name) VALUES
  ('22222222-2222-2222-2222-222222222222',
   '11111111-1111-1111-1111-111111111111', 'IN', 'India')
ON CONFLICT (id) DO NOTHING;

-- Holidays (region-scoped)
INSERT INTO holiday_calendar (id, tenant_id, region_id, date, name, recurrence) VALUES
  ('55555555-5555-5555-5555-555555555501',
   '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222', '2026-08-15', 'Independence Day', 'ANNUAL'),
  ('55555555-5555-5555-5555-555555555502',
   '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222', '2026-08-27', 'Regional Holiday', 'NONE'),
  ('55555555-5555-5555-5555-555555555503',
   '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222', '2026-10-02', 'Gandhi Jayanti', 'ANNUAL')
ON CONFLICT (region_id, date) DO NOTHING;

-- Manager (Priya) and Employee (Ravi)
INSERT INTO employee (id, tenant_id, manager_id, region_id, name, email, join_date) VALUES
  ('33333333-3333-3333-3333-333333333334',
   '11111111-1111-1111-1111-111111111111', NULL,
   '22222222-2222-2222-2222-222222222222', 'Priya', 'priya@meridian.io', '2022-06-01')
ON CONFLICT (id) DO NOTHING;

INSERT INTO employee (id, tenant_id, manager_id, region_id, name, email, join_date) VALUES
  ('33333333-3333-3333-3333-333333333333',
   '11111111-1111-1111-1111-111111111111',
   '33333333-3333-3333-3333-333333333334',
   '22222222-2222-2222-2222-222222222222', 'Ravi', 'ravi@meridian.io', '2025-03-10')
ON CONFLICT (id) DO NOTHING;

-- Leave types (region-scoped)
INSERT INTO leave_type (id, region_id, name, is_paid, is_active, requires_approval) VALUES
  ('44444444-4444-4444-4444-444444444401',
   '22222222-2222-2222-2222-222222222222', 'Annual Leave', TRUE, TRUE, TRUE),
  ('44444444-4444-4444-4444-444444444402',
   '22222222-2222-2222-2222-222222222222', 'Sick Leave', TRUE, TRUE, TRUE),
  ('44444444-4444-4444-4444-444444444403',
   '22222222-2222-2222-2222-222222222222', 'Casual Leave', TRUE, TRUE, TRUE)
ON CONFLICT (region_id, name) DO NOTHING;

-- =============================================================
-- 10 additional employees (India region, reporting to Priya).
-- Fixed UUIDs so re-running this seed is idempotent.
-- =============================================================
INSERT INTO employee (id, tenant_id, manager_id, region_id, name, email, join_date) VALUES
  ('33333333-3333-3333-3333-333333330001', '11111111-1111-1111-1111-111111111111',
   '33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222222',
   'Ananya Iyer',      'ananya.iyer@meridian.io',      '2023-01-16'),
  ('33333333-3333-3333-3333-333333330002', '11111111-1111-1111-1111-111111111111',
   '33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222222',
   'Karthik Nair',     'karthik.nair@meridian.io',     '2023-04-03'),
  ('33333333-3333-3333-3333-333333330003', '11111111-1111-1111-1111-111111111111',
   '33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222222',
   'Divya Menon',      'divya.menon@meridian.io',      '2023-07-10'),
  ('33333333-3333-3333-3333-333333330004', '11111111-1111-1111-1111-111111111111',
   '33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222222',
   'Mohit Sharma',     'mohit.sharma@meridian.io',     '2022-11-21'),
  ('33333333-3333-3333-3333-333333330005', '11111111-1111-1111-1111-111111111111',
   '33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222222',
   'Sneha Reddy',      'sneha.reddy@meridian.io',      '2024-02-05'),
  ('33333333-3333-3333-3333-333333330006', '11111111-1111-1111-1111-111111111111',
   '33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222222',
   'Arjun Verma',      'arjun.verma@meridian.io',      '2024-06-17'),
  ('33333333-3333-3333-3333-333333330007', '11111111-1111-1111-1111-111111111111',
   '33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222222',
   'Meera Krishnan',   'meera.krishnan@meridian.io',   '2021-09-13'),
  ('33333333-3333-3333-3333-333333330008', '11111111-1111-1111-1111-111111111111',
   '33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222222',
   'Rahul Desai',      'rahul.desai@meridian.io',      '2025-01-08'),
  ('33333333-3333-3333-3333-333333330009', '11111111-1111-1111-1111-111111111111',
   '33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222222',
   'Pooja Bhatt',      'pooja.bhatt@meridian.io',      '2025-05-26'),
  ('33333333-3333-3333-3333-333333330010', '11111111-1111-1111-1111-111111111111',
   '33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222222',
   'Vikram Rao',       'vikram.rao@meridian.io',       '2022-03-14')
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- Additional regions. work_days uses Python date.weekday() numbers:
--   0=Mon 1=Tue 2=Wed 3=Thu 4=Fri 5=Sat 6=Sun
-- United Arab Emirates deliberately runs Sun-Thu, so the working-day
-- engine is exercised against a non Mon-Fri week.
-- =============================================================
INSERT INTO region (id, tenant_id, code, country_name, work_days, timezone) VALUES
  ('22222222-2222-2222-2222-222222222002', '11111111-1111-1111-1111-111111111111',
   'US', 'United States',        '{0,1,2,3,4}', 'America/New_York'),
  ('22222222-2222-2222-2222-222222222003', '11111111-1111-1111-1111-111111111111',
   'UK', 'United Kingdom',       '{0,1,2,3,4}', 'Europe/London'),
  ('22222222-2222-2222-2222-222222222004', '11111111-1111-1111-1111-111111111111',
   'AE', 'United Arab Emirates', '{6,0,1,2,3}', 'Asia/Dubai')
ON CONFLICT (id) DO NOTHING;

-- Region-scoped leave types. Names deliberately differ per region.
INSERT INTO leave_type (id, region_id, name, is_paid, is_active, requires_approval) VALUES
  ('44444444-4444-4444-4444-444444444421', '22222222-2222-2222-2222-222222222002', 'PTO', TRUE, TRUE, TRUE),
  ('44444444-4444-4444-4444-444444444422', '22222222-2222-2222-2222-222222222002', 'Sick Leave', TRUE, TRUE, TRUE),
  ('44444444-4444-4444-4444-444444444423', '22222222-2222-2222-2222-222222222002', 'Parental Leave', TRUE, TRUE, TRUE),
  ('44444444-4444-4444-4444-444444444431', '22222222-2222-2222-2222-222222222003', 'Annual Leave', TRUE, TRUE, TRUE),
  ('44444444-4444-4444-4444-444444444432', '22222222-2222-2222-2222-222222222003', 'Sick Leave', TRUE, TRUE, TRUE),
  ('44444444-4444-4444-4444-444444444433', '22222222-2222-2222-2222-222222222003', 'Compassionate Leave', TRUE, TRUE, TRUE),
  ('44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222004', 'Annual Leave', TRUE, TRUE, TRUE),
  ('44444444-4444-4444-4444-444444444442', '22222222-2222-2222-2222-222222222004', 'Sick Leave', TRUE, TRUE, TRUE)
ON CONFLICT (region_id, name) DO NOTHING;

-- Region-scoped holidays. ANNUAL entries repeat every year.
INSERT INTO holiday_calendar (id, tenant_id, region_id, date, name, recurrence) VALUES
  ('55555555-5555-5555-5555-555555555521', '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222002', '2026-07-04', 'Independence Day (US)', 'ANNUAL'),
  ('55555555-5555-5555-5555-555555555522', '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222002', '2026-12-25', 'Christmas Day', 'ANNUAL'),
  ('55555555-5555-5555-5555-555555555531', '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222003', '2026-12-25', 'Christmas Day', 'ANNUAL'),
  ('55555555-5555-5555-5555-555555555532', '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222003', '2026-12-26', 'Boxing Day', 'ANNUAL'),
  ('55555555-5555-5555-5555-555555555541', '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222004', '2026-12-02', 'UAE National Day', 'ANNUAL')
ON CONFLICT (region_id, date) DO NOTHING;
