from datetime import datetime, timezone
from uuid import UUID

from app.db import fetch_all, fetch_one

_COLS = """
    a.id, a.leave_request_id, a.step_order, a.approver_id,
    a.approver_role, a.approver_role_id, a.status, a.comment, a.decided_at
"""

# Display names for a step: who the approver is, and — for a ROLE step — the
# name of the role they were picked for. Both are LEFT joins: an unreachable
# tier has no approver, and a hierarchy tier has no role.
_NAMES = """
    e.name AS approver_name, r.name AS role_name
"""

_JOINS = """
    LEFT JOIN employee e ON e.id = a.approver_id
    LEFT JOIN role r ON r.id = a.approver_role_id
"""


async def insert_step(
    *,
    leave_request_id: UUID,
    step_order: int,
    approver_id: UUID | None,
    approver_role: str,
    status: str,
    approver_role_id: UUID | None = None,
) -> dict:
    row = await fetch_one(
        f"""INSERT INTO leave_request_approval
              (leave_request_id, step_order, approver_id, approver_role,
               approver_role_id, status, decided_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING {_COLS.replace('a.', '')}""",
        (
            leave_request_id,
            step_order,
            approver_id,
            approver_role,
            approver_role_id,
            status,
            # A step skipped at creation time is already decided.
            datetime.now(timezone.utc) if status == "SKIPPED" else None,
        ),
    )
    assert row is not None
    return row


async def find_by_request(leave_request_id: UUID) -> list[dict]:
    """The full chain for one request, with approver names for display."""
    return await fetch_all(
        f"""SELECT {_COLS}, {_NAMES}
              FROM leave_request_approval a {_JOINS}
             WHERE a.leave_request_id = %s
             ORDER BY a.step_order""",
        (leave_request_id,),
    )


async def find_step(step_id: UUID) -> dict | None:
    return await fetch_one(
        f"""SELECT {_COLS}, {_NAMES}
              FROM leave_request_approval a {_JOINS}
             WHERE a.id = %s""",
        (step_id,),
    )


async def current_step(leave_request_id: UUID) -> dict | None:
    """The lowest-order step still awaiting a decision."""
    return await fetch_one(
        f"""SELECT {_COLS}, {_NAMES}
              FROM leave_request_approval a {_JOINS}
             WHERE a.leave_request_id = %s AND a.status = 'PENDING'
             ORDER BY a.step_order
             LIMIT 1""",
        (leave_request_id,),
    )


async def decide_step(step_id: UUID, status: str, comment: str | None) -> dict | None:
    await fetch_one(
        """UPDATE leave_request_approval
              SET status = %s, comment = %s, decided_at = now()
            WHERE id = %s
            RETURNING id""",
        (status, comment, step_id),
    )
    return await find_step(step_id)


async def skip_remaining(leave_request_id: UUID, after_step: int) -> int:
    """Mark later pending steps SKIPPED — used when a request is rejected."""
    rows = await fetch_all(
        """UPDATE leave_request_approval
              SET status = 'SKIPPED', decided_at = now()
            WHERE leave_request_id = %s AND step_order > %s AND status = 'PENDING'
            RETURNING id""",
        (leave_request_id, after_step),
    )
    return len(rows)


async def pending_for_approver(approver_id: UUID) -> list[dict]:
    """Steps awaiting this approver that are actually actionable.

    A step is only actionable when no earlier step of the same request is
    still pending — otherwise a tier-2 approver would see requests their
    tier-1 colleague has not looked at yet.
    """
    return await fetch_all(
        f"""SELECT {_COLS}, {_NAMES}
              FROM leave_request_approval a {_JOINS}
             WHERE a.approver_id = %s
               AND a.status = 'PENDING'
               AND NOT EXISTS (
                   SELECT 1 FROM leave_request_approval earlier
                    WHERE earlier.leave_request_id = a.leave_request_id
                      AND earlier.step_order < a.step_order
                      AND earlier.status = 'PENDING'
               )
             ORDER BY a.step_order""",
        (approver_id,),
    )
