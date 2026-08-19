-- =============================================================
-- 010 · Tenant administrator accounts
--
-- The API has trusted whatever employee id it was handed since day one. This
-- closes that hole for the admin surface only: the screens that can rewrite
-- accrual rates, delete regions and reassign reporting lines.
--
-- Employee and manager screens stay open deliberately. They are driven by the
-- demo identity switcher, and putting real credentials on fifteen seeded staff
-- would make multi-tier approval undemonstrable without adding any safety --
-- the interesting privilege boundary is the admin console, not Ananya's own
-- leave balance.
--
-- There is NO registration. Accounts are created by scripts/create_admin.py or
-- inserted directly; a public sign-up endpoint on a tenant-admin table would
-- let anyone mint themselves an administrator.
--
-- Additive and idempotent.
-- =============================================================

CREATE TABLE IF NOT EXISTS tenant_admin (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    email         TEXT NOT NULL,
    -- Format: pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>
    -- Self-describing so the iteration count can be raised later without
    -- invalidating existing hashes.
    password_hash TEXT NOT NULL,
    name          TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ,
    -- Scoped to the tenant, not global: two organisations may each have an
    -- administrator at the same address.
    UNIQUE (tenant_id, email)
);

-- Login resolves the tenant by org name first, so that lookup needs an index
-- once there is more than one tenant.
CREATE INDEX IF NOT EXISTS idx_tenant_admin_email ON tenant_admin (lower(email));
CREATE INDEX IF NOT EXISTS idx_tenant_org_name ON tenant (lower(org_name));
