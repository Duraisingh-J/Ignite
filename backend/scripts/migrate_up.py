"""Apply the numbered SQL files in app/db/migrations, in order, once each.

Unlike scripts.migrate (which DROPs and recreates the schema), this is additive
and safe against a live database. Applied filenames are recorded in
schema_migrations so re-running is a no-op.

Run: python -m scripts.migrate_up
"""

import sys
from pathlib import Path

import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "app" / "db" / "migrations"


def main() -> int:
    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not files:
        print(f"[migrate_up] no .sql files in {MIGRATIONS_DIR}")
        return 0

    try:
        with psycopg.connect(settings.dsn()) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """CREATE TABLE IF NOT EXISTS schema_migrations (
                           filename   TEXT PRIMARY KEY,
                           applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
                       )"""
                )
                conn.commit()

                cur.execute("SELECT filename FROM schema_migrations")
                done = {r[0] for r in cur.fetchall()}

                for path in files:
                    if path.name in done:
                        print(f"[migrate_up] skip     {path.name}")
                        continue
                    print(f"[migrate_up] applying {path.name}")
                    # Each migration is one transaction: a failure part-way
                    # leaves nothing behind and nothing recorded.
                    cur.execute(path.read_text(encoding="utf-8"))
                    cur.execute(
                        "INSERT INTO schema_migrations (filename) VALUES (%s)", (path.name,)
                    )
                    conn.commit()

        print("[migrate_up] done")
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"[migrate_up] failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
