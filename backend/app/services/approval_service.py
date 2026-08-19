"""Multi-tier approval: chain resolution and the step state machine.

Two independent inputs decide a chain:

  WHO approves  -- the employee's own reporting line (per employee)
  HOW MANY tiers -- leave_type.approval_levels, plus one more when the request
                    exceeds leave_type.escalate_above_days (per region, because
                    leave types are already region-scoped)

The resolved chain is FROZEN as rows at submit time. If the org chart changes
while a request is in review it must not silently change hands, and the history
has to stay answerable afterwards.
"""

from uuid import UUID

from app.errors import ApiError
from app.repositories import (
    approval_repository,
    employee_repository,
    leave_request_repository,
    role_repository,
)

# step_order 1 is the direct manager, 2 the skip-level, 3 above that.
_ROLE_BY_DEPTH = {1: "MANAGER", 2: "SKIP_LEVEL", 3: "DEPT_HEAD"}

MAX_LEVELS = 3


def required_levels(leave_type: dict, chargeable_days: int) -> int:
    """How many approvals this request needs."""
    levels = leave_type.get("approval_levels") or 1
    threshold = leave_type.get("escalate_above_days")
    # A long request gets one extra pair of eyes.
    if threshold is not None and chargeable_days > threshold:
        levels += 1
    return max(1, min(levels, MAX_LEVELS))


async def resolve_approvers(employee_id: UUID, levels: int) -> list[UUID | None]:
    """Walk the reporting line upward, returning one approver per level.

    Returns None for a level the reporting line cannot reach, so the caller can
    record it as SKIPPED rather than leaving the request stuck forever. The
    employee themselves is never an approver, and nobody appears twice.
    """
    chain = await employee_repository.management_chain(employee_id)
    # management_chain() includes the employee at index 0; drop them and dedupe
    # while preserving order.
    seen: set[UUID] = {employee_id}
    ladder: list[UUID] = []
    for eid in chain:
        if eid not in seen:
            seen.add(eid)
            ladder.append(eid)

    return [ladder[i] if i < len(ladder) else None for i in range(levels)]


async def build_chain(
    *,
    leave_request_id: UUID,
    employee_id: UUID,
    leave_type: dict,
    chargeable_days: int,
    region_id: UUID | None = None,
) -> list[dict]:
    """Create and freeze the approval steps for a newly submitted request.

    Two different sources feed the chain:

      * the reporting line, walked upward one rung per tier
      * optionally a ROLE holder as the final step

    The second exists because a hierarchy walk can never reach HR. Walking up
    from an engineer yields their manager and their manager's manager forever;
    HR is a role someone holds, not a rung above them.
    """
    levels = required_levels(leave_type, chargeable_days)
    approvers = await resolve_approvers(employee_id, levels)

    steps = []
    for idx, approver_id in enumerate(approvers, start=1):
        steps.append(
            await approval_repository.insert_step(
                leave_request_id=leave_request_id,
                step_order=idx,
                approver_id=approver_id,
                approver_role=_ROLE_BY_DEPTH.get(idx, "DEPT_HEAD"),
                # No approver reachable at this depth -> skip rather than block.
                status="PENDING" if approver_id else "SKIPPED",
            )
        )

    # Final role-based sign-off, resolved for the requester's own region so the
    # same rule reaches India's HR for an Indian employee and the UAE's for a
    # UAE one.
    role_id = leave_type.get("final_approver_role_id")
    if role_id and region_id:
        holder = await role_repository.resolve_holder(role_id, region_id)
        already = {a for a in approvers if a}
        # If the role holder has already signed higher up the line, do not ask
        # the same person twice.
        if holder is None or holder["id"] in already:
            status, approver = "SKIPPED", (holder["id"] if holder else None)
        else:
            status, approver = "PENDING", holder["id"]
        steps.append(
            await approval_repository.insert_step(
                leave_request_id=leave_request_id,
                step_order=len(approvers) + 1,
                approver_id=approver,
                approver_role="ROLE",
                # Frozen with the step: an admin repointing this leave type
                # from HR to Finance next month must not rewrite the label on
                # a request HR already signed.
                approver_role_id=role_id,
                status=status,
            )
        )

    return steps


async def derive_request_status(leave_request_id: UUID) -> str:
    """The request's status, computed from its steps.

    leave_request.status is a cache of this and must never be written directly,
    or the two can disagree permanently.
    """
    steps = await approval_repository.find_by_request(leave_request_id)
    if not steps:
        return "PENDING"
    if any(s["status"] == "REJECTED" for s in steps):
        return "REJECTED"
    if any(s["status"] == "PENDING" for s in steps):
        return "PENDING"
    # Everything decided and nothing rejected. A chain that is entirely SKIPPED
    # means nobody could be routed to, which counts as approved rather than
    # leaving the employee waiting on a queue that does not exist.
    return "APPROVED"


async def decide_step(
    *, step_id: UUID, approver_id: UUID, approve: bool, comment: str | None
) -> dict:
    """Approve or reject one step, then re-derive the request's status."""
    step = await approval_repository.find_step(step_id)
    if step is None:
        raise ApiError.not_found("Approval step not found")

    request_id = step["leave_request_id"]

    if step["status"] != "PENDING":
        raise ApiError.conflict(
            f"This step is already {step['status']}",
            {"decidedAt": step["decided_at"].isoformat() if step["decided_at"] else None},
        )

    # Only the assigned approver may decide their own step.
    if step["approver_id"] != approver_id:
        raise ApiError.conflict("You are not the approver for this step")

    # Tier 2 must wait for tier 1. Without this an approver who appears at both
    # levels could short-circuit their own chain.
    current = await approval_repository.current_step(request_id)
    if current and current["id"] != step["id"]:
        raise ApiError.conflict(
            "An earlier approval is still outstanding",
            {"waitingOn": current.get("approver_name"), "stepOrder": current["step_order"]},
        )

    new_status = "APPROVED" if approve else "REJECTED"
    await approval_repository.decide_step(step_id, new_status, comment)

    # A rejection ends the chain; later steps never get asked.
    if not approve:
        await approval_repository.skip_remaining(request_id, step["step_order"])

    derived = await derive_request_status(request_id)
    await leave_request_repository.update_status(request_id, derived)

    # A rejection anywhere in the chain gives the reserved days back. Approval
    # needs no entry — the deduction taken at submit already stands.
    if derived == "REJECTED":
        from app.services import reservation_service

        await reservation_service.release(request_id=request_id, reason="rejected")

    # Approver -> employee, and onward to the next tier when one is waiting.
    # `derived` is passed rather than re-read so the message and the stored
    # status are guaranteed to be the same value.
    from app import notifications

    await notifications.step_decided(
        request_id=request_id,
        approver_id=approver_id,
        approved=approve,
        comment=comment,
        request_status=derived,
    )

    return {
        "requestId": request_id,
        "stepId": step_id,
        "stepStatus": new_status,
        "requestStatus": derived,
    }


async def get_chain(leave_request_id: UUID) -> list[dict]:
    rows = await approval_repository.find_by_request(leave_request_id)
    return [
        {
            "id": r["id"],
            "stepOrder": r["step_order"],
            "approverId": r["approver_id"],
            "approverName": r.get("approver_name"),
            "approverRole": r["approver_role"],
            # Only a ROLE step has one; the hierarchy tiers are named by depth.
            "roleName": r.get("role_name"),
            "status": r["status"],
            "comment": r["comment"],
            "decidedAt": r["decided_at"],
        }
        for r in rows
    ]
