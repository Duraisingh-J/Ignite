"""Create the target database if needed, then apply schema.sql.

Run: python -m scripts.migrate
"""

import sys
from pathlib import Path

import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402

SCHEMA_PATH = Path(__file__).resolve().parent.parent / "app" / "db" / "schema.sql"


def ensure_database() -> None:
    # Connect to the maintenance DB so we can CREATE the target if absent.
    with psycopg.connect(settings.dsn("postgres"), autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s", (settings.pgdatabase,)
            )
            if cur.fetchone() is None:
                # Identifier can't be parameterized; the name comes from our own env.
                cur.execute(f'CREATE DATABASE "{settings.pgdatabase}"')
                print(f'[migrate] created database "{settings.pgdatabase}"')
            else:
                print(f'[migrate] database "{settings.pgdatabase}" already exists')


def apply_schema() -> None:
    sql = SCHEMA_PATH.read_text(encoding="utf-8")
    with psycopg.connect(settings.dsn()) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
    print("[migrate] schema applied")


def main() -> int:
    try:
        ensure_database()
        apply_schema()
        print("[migrate] done")
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"[migrate] failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
