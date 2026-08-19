"""Apply seed.sql against the target database (idempotent).

Run: python -m scripts.seed
"""

import sys
from pathlib import Path

import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402

SEED_PATH = Path(__file__).resolve().parent.parent / "app" / "db" / "seed.sql"


def main() -> int:
    try:
        sql = SEED_PATH.read_text(encoding="utf-8")
        # psycopg cursor.execute() only handles a single statement at a time.
        # Split on ";" and execute each non-empty statement individually.
        statements = [s.strip() for s in sql.split(";") if s.strip()]
        with psycopg.connect(settings.dsn()) as conn:
            with conn.cursor() as cur:
                for stmt in statements:
                    cur.execute(stmt)
            conn.commit()
        print(f"[seed] done — {len(statements)} statement(s) applied")
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"[seed] failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
