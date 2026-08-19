"""Provision a tenant administrator.

The only way an account is created. There is no registration endpoint, because
a public sign-up against a tenant-admin table would let anyone make themselves
an administrator of somebody else's organisation.

    python scripts/create_admin.py --org "Ignite" --email you@example.com
    python scripts/create_admin.py --org "Ignite" --email you@example.com --password secret123
    python scripts/create_admin.py --list
    python scripts/create_admin.py --org "Ignite" --email you@example.com --reset-password

With no --password, one is generated and printed once. It is never stored in
plain text and cannot be recovered afterwards.
"""

import argparse
import asyncio
import secrets
import string
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.auth.passwords import hash_password  # noqa: E402
from app.auth.service import create_admin  # noqa: E402
from app.db import fetch_all, pool  # noqa: E402
from app.errors import ApiError  # noqa: E402
from app.repositories import admin_repository  # noqa: E402

# Excludes characters that are misread aloud or in a terminal: O/0, l/1/I.
_ALPHABET = "".join(
    c for c in string.ascii_letters + string.digits if c not in "O0lI1"
)


def _generate(length: int = 16) -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(length))


async def _list() -> None:
    rows = await fetch_all(
        """SELECT t.org_name, a.email, a.name, a.is_active, a.last_login_at
             FROM tenant_admin a JOIN tenant t ON t.id = a.tenant_id
            ORDER BY t.org_name, a.email"""
    )
    if not rows:
        print("No administrators yet.")
        print("Create one:  python scripts/create_admin.py --org \"<org>\" --email <address>")
        return
    print(f"{'ORGANISATION':<22} {'EMAIL':<34} {'ACTIVE':<7} LAST LOGIN")
    for r in rows:
        last = r["last_login_at"].strftime("%Y-%m-%d %H:%M") if r["last_login_at"] else "never"
        print(f'{r["org_name"]:<22} {r["email"]:<34} {str(r["is_active"]):<7} {last}')


async def _orgs() -> None:
    rows = await fetch_all("SELECT org_name FROM tenant ORDER BY org_name")
    print("Known organisations:")
    for r in rows:
        print("   ", r["org_name"])


async def main() -> int:
    ap = argparse.ArgumentParser(description="Provision a tenant administrator")
    ap.add_argument("--org", help="Organisation name, as stored on the tenant")
    ap.add_argument("--email", help="Sign-in address")
    ap.add_argument("--password", help="Omit to generate one")
    ap.add_argument("--name", help="Display name")
    ap.add_argument("--reset-password", action="store_true", help="Replace an existing password")
    ap.add_argument("--list", action="store_true", help="List existing administrators")
    args = ap.parse_args()

    await pool.open()
    try:
        if args.list:
            await _list()
            return 0

        if not args.org or not args.email:
            ap.print_help()
            print()
            await _orgs()
            return 2

        password = args.password or _generate()
        generated = args.password is None

        if args.reset_password:
            tenant = await admin_repository.find_tenant_by_org_name(args.org)
            if tenant is None:
                print(f"No organisation named {args.org!r}")
                await _orgs()
                return 1
            admin = await admin_repository.find_admin(tenant["id"], args.email)
            if admin is None:
                print(f"{args.email} is not an administrator of {args.org}")
                return 1
            await admin_repository.update_password(admin["id"], hash_password(password))
            action = "Password reset"
        else:
            try:
                await create_admin(
                    org_name=args.org,
                    email=args.email,
                    password=password,
                    name=args.name,
                )
            except ApiError as exc:
                print(f"{exc.message}")
                if exc.code == "CONFLICT":
                    print("Use --reset-password to change the existing password.")
                else:
                    await _orgs()
                return 1
            action = "Administrator created"

        print()
        print(f"  {action}")
        print(f"  Organisation : {args.org}")
        print(f"  Email        : {args.email}")
        if generated:
            print(f"  Password     : {password}")
            print()
            print("  This is shown once and is not recoverable. Store it now.")
        print()
        return 0
    finally:
        await pool.close()


if __name__ == "__main__":
    # Same reason as run.py: psycopg's async driver is incompatible with the
    # Windows default ProactorEventLoop.
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    raise SystemExit(asyncio.run(main()))
