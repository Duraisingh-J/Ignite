"""Who gets told what, and when.

This is the only part of the module that knows what leave *is*. It reaches into
repositories directly rather than into leave_request_service, which keeps the
package self-contained and avoids a cycle: services import notifications, so
notifications must not import services.

Two rules govern everything here:

  NEVER RAISE      A notification is a side effect of an action, never a
                   precondition for it. Nobody should be unable to request
                   leave because an SMTP server is unreachable.

  NEVER BLOCK      Dispatch is fire-and-forget. The request returns as soon as
                   the state change is durable; delivery catches up behind it.
                   Awaiting delivery would put a TLS handshake on the critical
                   path of every submit.
"""

import asyncio
import logging
from uuid import UUID

from app.config import settings
from app.repositories import (
    approval_repository,
    employee_repository,
    holiday_repository,
    leave_request_repository,
    region_repository,
)
from app.services.holiday_expansion import expand
from app.services.working_days import calc_working_days

from . import messages
from .channels import Message, Recipient, active
from .messages import LeaveContext

log = logging.getLogger(__name__)

# Held so the garbage collector cannot reclaim an in-flight task. asyncio keeps
# only weak references to tasks, so a fire-and-forget task with no strong
# reference can vanish mid-send.
_INFLIGHT: set[asyncio.Task] = set()

_CAPACITY = {
    "MANAGER": "their manager",
    "SKIP_LEVEL": "skip-level approver",
    "DEPT_HEAD": "department head",
}


# ------------------------------------------------------------------ dispatch
async def _deliver(recipient: Recipient, message: Message) -> None:
    """Try each configured channel until one accepts the message."""
    if not settings.notifications_enabled:
        return
    if not recipient.email:
        log.warning("notify: %s has no address; nothing to send to", recipient.name)
        return
    # Every configured channel gets the message, rather than stopping at the
    # first success. They reach different audiences: a Slack channel is a team
    # feed, an email is the individual. Stopping early would mean switching
    # Slack on silently turned email off, which is not what "also post to
    # Slack" is ever taken to mean.
    delivered = []
    for channel in active():
        try:
            if await channel.send(recipient, message):
                delivered.append(channel.name)
        except Exception:
            # A channel is contractually not supposed to raise, but a broken
            # third-party client must still not take down the dispatcher.
            log.exception("notify: channel %s raised", channel.name)
    if delivered:
        log.info(
            "notify: %r -> %s via %s", message.subject, recipient.email, ", ".join(delivered)
        )
    else:
        log.warning("notify: no channel delivered %r to %s", message.subject, recipient.email)


def _fire(recipient: Recipient | None, message: Message) -> None:
    """Schedule delivery without waiting for it."""
    if recipient is None:
        return
    try:
        task = asyncio.create_task(_deliver(recipient, message))
    except RuntimeError:
        # No running loop (a script, a test). Sending is not possible and not
        # important enough to be worth starting one.
        log.debug("notify: no event loop; skipped %r", message.subject)
        return
    _INFLIGHT.add(task)
    task.add_done_callback(_INFLIGHT.discard)


def _recipient(employee: dict | None) -> Recipient | None:
    if not employee:
        return None
    return Recipient(name=employee["name"], email=employee.get("email") or "")


# ------------------------------------------------------------------ context
async def _context(request_id: UUID) -> tuple[LeaveContext, dict] | None:
    """Assemble everything the templates need for one request.

    The day breakdown is recomputed here from the region's own rules rather
    than passed in, so a notification can never disagree with what the screens
    show - the two derive from the same function over the same inputs.
    """
    row = await leave_request_repository.find_by_id(request_id)
    if row is None:
        return None
    employee = await employee_repository.find_by_id(row["employee_id"])
    if employee is None:
        return None

    region = await region_repository.find_by_id(employee["region_id"])
    work_days = (region or {}).get("work_days") or [0, 1, 2, 3, 4]
    holiday_rows = await holiday_repository.find_by_region(employee["region_id"])
    holidays = expand(holiday_rows, row["start_date"], row["end_date"])
    breakdown = calc_working_days(row["start_date"], row["end_date"], holidays, work_days)

    ctx = LeaveContext(
        employee_name=employee["name"],
        leave_type=row["leave_type_name"],
        start_date=row["start_date"],
        end_date=row["end_date"],
        chargeable_days=breakdown.chargeable_days,
        calendar_days=breakdown.calendar_days,
        weekend_days=breakdown.weekend_days,
        holiday_days=breakdown.holiday_days,
        reason=row["reason"],
    )
    return ctx, employee


def _with(ctx: LeaveContext, **kw) -> LeaveContext:
    return LeaveContext(**{**ctx.__dict__, **kw})


# ------------------------------------------------------------------ events
async def leave_submitted(request_id: UUID) -> None:
    """Employee -> approver. Tells whoever the chain actually landed on.

    Driven by the frozen chain rather than by employee.manager_id, because a
    request whose tier 1 is unreachable is routed straight to tier 2 - and the
    person who has to act is the one who should hear about it.
    """
    found = await _context(request_id)
    if found is None:
        return
    ctx, _ = found

    step = await approval_repository.current_step(request_id)
    if step is None or step["approver_id"] is None:
        return
    chain = await approval_repository.find_by_request(request_id)
    approver = await employee_repository.find_by_id(step["approver_id"])

    capacity = step.get("role_name") or _CAPACITY.get(step["approver_role"])
    _fire(
        _recipient(approver),
        messages.awaiting_approval(
            _with(
                ctx,
                step_order=step["step_order"],
                total_steps=len(chain),
                approver_capacity=capacity,
            )
        ),
    )


async def step_decided(
    *,
    request_id: UUID,
    approver_id: UUID,
    approved: bool,
    comment: str | None,
    request_status: str,
) -> None:
    """Approver -> employee, and onward to the next approver when there is one.

    `request_status` is the value already derived from the steps, so this never
    re-derives it and the two can never disagree.
    """
    found = await _context(request_id)
    if found is None:
        return
    ctx, employee = found

    decider = await employee_repository.find_by_id(approver_id)
    ctx = _with(ctx, decided_by=(decider or {}).get("name"), comment=comment)
    chain = await approval_repository.find_by_request(request_id)

    if request_status == "REJECTED":
        _fire(_recipient(employee), messages.rejected(ctx))
        return

    if request_status == "APPROVED":
        _fire(_recipient(employee), messages.approved(ctx))
        return

    # Still pending: one tier cleared and another is now holding it. Tell both
    # the employee (so the request does not go silent) and the next approver.
    nxt = await approval_repository.current_step(request_id)
    decided = sum(1 for s in chain if s["status"] != "PENDING")
    _fire(
        _recipient(employee),
        messages.step_cleared(_with(ctx, step_order=decided, total_steps=len(chain))),
    )
    if nxt and nxt["approver_id"]:
        next_approver = await employee_repository.find_by_id(nxt["approver_id"])
        capacity = nxt.get("role_name") or _CAPACITY.get(nxt["approver_role"])
        _fire(
            _recipient(next_approver),
            messages.awaiting_approval(
                _with(
                    ctx,
                    step_order=nxt["step_order"],
                    total_steps=len(chain),
                    approver_capacity=capacity,
                )
            ),
        )


async def leave_cancelled(request_id: UUID, pending_approver_ids: list[UUID]) -> None:
    """Employee -> approvers who were still holding it.

    The ids are captured by the caller *before* the steps are skipped: once
    cancellation has run there is no longer any record of who was waiting.
    """
    found = await _context(request_id)
    if found is None:
        return
    ctx, _ = found
    for approver_id in pending_approver_ids:
        approver = await employee_repository.find_by_id(approver_id)
        _fire(_recipient(approver), messages.cancelled(ctx))
