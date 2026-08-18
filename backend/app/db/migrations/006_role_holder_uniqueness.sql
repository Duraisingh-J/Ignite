-- =============================================================
-- 006 · Fix duplicate role holders
--
-- UNIQUE (employee_id, role_id, region_id) does not stop the same person being
-- given the same role twice at tenant scope, because in Postgres NULL is never
-- equal to NULL — two rows with region_id NULL simply do not conflict. The
-- ON CONFLICT clause therefore never fired and the duplicate was inserted.
--
-- Two partial indexes cover both cases properly:
--   * scoped assignments are unique per (employee, role, region)
--   * tenant-wide assignments are unique per (employee, role)
--
-- Existing duplicates are collapsed first, keeping the earliest row.
-- =============================================================

DELETE FROM employee_role a
 USING employee_role b
 WHERE a.ctid > b.ctid
   AND a.employee_id = b.employee_id
   AND a.role_id = b.role_id
   AND a.region_id IS NOT DISTINCT FROM b.region_id;

ALTER TABLE employee_role DROP CONSTRAINT IF EXISTS employee_role_employee_id_role_id_region_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_employee_role_scoped
    ON employee_role (employee_id, role_id, region_id)
 WHERE region_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_employee_role_global
    ON employee_role (employee_id, role_id)
 WHERE region_id IS NULL;
