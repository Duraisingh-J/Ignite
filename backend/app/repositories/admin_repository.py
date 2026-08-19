"""Tenant administrator lookups.

Login resolves the organisation by name before the account, so a wrong org name
and a wrong email are indistinguishable from outside.
"""

from uuid import UUID

from app.db import fetch_one

_COLS = """
    a.id, a.tenant_id, a.email, a.password_hash, a.name,
    a.is_active, a.created_at, a.last_login_at
"""


async def find_tenant_by_org_name(org_name: str) -> dict | None:
    return await fetch_one(
        "SELECT id, org_name FROM tenant WHERE lower(org_name) = lower(%s)",
        (org_name.strip(),),
    )


async def find_admin(tenant_id: UUID, email: str) -> dict | None:
    return await fetch_one(
        f"""SELECT {_COLS}, t.org_name
              FROM tenant_admin a
              JOIN tenant t ON t.id = a.tenant_id
             WHERE a.tenant_id = %s AND lower(a.email) = lower(%s)""",
        (tenant_id, email.strip()),
    )


async def find_admin_by_id(admin_id: UUID) -> dict | None:
    return await fetch_one(
        f"""SELECT {_COLS}, t.org_name
              FROM tenant_admin a
              JOIN tenant t ON t.id = a.tenant_id
             WHERE a.id = %s""",
        (admin_id,),
    )


async def touch_last_login(admin_id: UUID) -> None:
    await fetch_one(
        "UPDATE tenant_admin SET last_login_at = now() WHERE id = %s RETURNING id",
        (admin_id,),
    )


async def insert_admin(
    *, tenant_id: UUID, email: str, password_hash: str, name: str | None
) -> dict:
    row = await fetch_one(
        f"""INSERT INTO tenant_admin (tenant_id, email, password_hash, name)
            VALUES (%s, %s, %s, %s)
            RETURNING {_COLS.replace('a.', '')}""",
        (tenant_id, email.strip().lower(), password_hash, name),
    )
    assert row is not None
    return row


async def update_password(admin_id: UUID, password_hash: str) -> None:
    await fetch_one(
        "UPDATE tenant_admin SET password_hash = %s WHERE id = %s RETURNING id",
        (password_hash, admin_id),
    )
