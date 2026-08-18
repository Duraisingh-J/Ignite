"""Give any leave request that has no approval chain a proper one.

A request submitted while the server was running pre-multi-tier code gets no
leave_request_approval rows, which makes it invisible to every approval queue
and permanently PENDING. Nothing errors — it just silently cannot be actioned.

This rebuilds those chains through the real resolver, so they get the correct
tier count for their leave type and duration rather than a stub step.

Idempotent: requests that already have a chain are left alone.

Run: python -m scripts.repair_chains
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.db import fetch_all, pool  # noqa: E402
from app.repositories import holiday_repository, leave_type_repository, region_repository  # noqa: E402
from app.services import approval_service  # noqa: E402
from app.services.working_days import calc_working_days  # noqa: E402


async def main() -> int:
    await pool.open()
    try:
        orphans = await fetch_all(
            """
            SELECT lr.id, lr.employee_id, lr.leave_type_id, lr.start_date, lr.end_date,
                   lr.status, e.region_id, e.name AS employee_name
              FROM leave_request lr
              JOIN employee e ON e.id = lr.employee_id
             WHERE NOT EXISTS (
                 SELECT 1 FROM leave_request_approval a WHERE a.leave_request_id = lr.id
             )
             ORDER BY lr.submitted_at
            """
        )

        if not orphans:
            print("[repair] no requests missing an approval chain")
            return 0

        print(f"[repair] {len(orphans)} request(s) without a chain")
        for r in orphans:
            leave_type = await leave_type_repository.find_by_id(r["leave_type_id"])
            if leave_type is None:
                print(f"  - {r['id']}: leave type missing, skipped")
                continue

            # Recompute the day count the same way submit() would, so the tier
            # count reflects the real duration.
            region = await region_repository.find_by_id(r["region_id"])
            work_days = (region or {}).get("work_days") or [0, 1, 2, 3, 4]
            holidays = await holiday_repository.find_dates_in_range(
                r["region_id"], r["start_date"], r["end_date"]
            )
            breakdown = calc_working_days(
                r["start_date"], r["end_date"], holidays, work_days
            )

            steps = await approval_service.build_chain(
                leave_request_id=r["id"],
                employee_id=r["employee_id"],
                leave_type=leave_type,
                chargeable_days=breakdown.chargeable_days,
            )
            print(
                f"  + {r['employee_name']} · {leave_type['name']} · "
                f"{breakdown.chargeable_days}d -> {len(steps)} step(s)"
            )

            # An already-decided request must not be dragged back to PENDING by
            # a freshly created chain, so only re-derive while it is still open.
            if r["status"] == "PENDING":
                derived = await approval_service.derive_request_status(r["id"])
                if derived != "PENDING":
                    from app.repositories import leave_request_repository

                    await leave_request_repository.update_status(r["id"], derived)
                    print(f"      status re-derived to {derived}")

        print("[repair] done")
        return 0
    finally:
        await pool.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
