-- =============================================================
-- 005 · Seed the HR role and its holders
--
-- Deliberately assigns people who are NOT in the requester's reporting line.
-- That is the whole point: Meera does not manage Ravi and never appears when
-- you walk his chain upward, yet she can be required to approve his leave.
--
-- Idempotent.
-- =============================================================

INSERT INTO role (id, tenant_id, code, name) VALUES
  ('66666666-6666-6666-6666-666666666601',
   '11111111-1111-1111-1111-111111111111', 'HR', 'Human Resources'),
  ('66666666-6666-6666-6666-666666666602',
   '11111111-1111-1111-1111-111111111111', 'FINANCE', 'Finance')
ON CONFLICT (tenant_id, code) DO NOTHING;

-- HR for India: Meera Krishnan. She sits outside Ravi's reporting line, which
-- is exactly why a hierarchy walk could never have reached her.
INSERT INTO employee_role (employee_id, role_id, region_id)
SELECT e.id,
       '66666666-6666-6666-6666-666666666601',
       '22222222-2222-2222-2222-222222222222'
  FROM employee e
 WHERE e.name = 'Meera Krishnan'
ON CONFLICT (employee_id, role_id, region_id) DO NOTHING;

-- HR for the UAE: a different holder, so the same role resolves to a different
-- person depending on the requester's region.
INSERT INTO employee_role (employee_id, role_id, region_id)
SELECT e.id,
       '66666666-6666-6666-6666-666666666601',
       '22222222-2222-2222-2222-222222222004'
  FROM employee e
 WHERE e.region_id = '22222222-2222-2222-2222-222222222004'
 LIMIT 1
ON CONFLICT (employee_id, role_id, region_id) DO NOTHING;

-- India's Annual Leave now ends with an HR sign-off on top of its line tiers.
UPDATE leave_type
   SET final_approver_role_id = '66666666-6666-6666-6666-666666666601'
 WHERE region_id = '22222222-2222-2222-2222-222222222222'
   AND name = 'Annual Leave';
