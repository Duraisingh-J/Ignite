"""Rendering: one leave event -> one channel-agnostic Message.

Templates live apart from both the domain services and the channels so that
wording changes touch nothing else, and so a message reads identically however
it is delivered.

Every template states the chargeable figure *and how it was reached*. The
number is the one thing recipients query — "why is 12-15 August three days and
not four?" — and answering it in the notification saves the round trip.
"""

from dataclasses import dataclass
from datetime import date

from app.config import settings

from .channels import Message


@dataclass(frozen=True)
class LeaveContext:
    """Everything any template might need about one request."""

    employee_name: str
    leave_type: str
    start_date: date
    end_date: date
    chargeable_days: int
    calendar_days: int
    weekend_days: int
    holiday_days: int
    reason: str | None = None
    # Where the recipient sits in the chain, when they are an approver.
    step_order: int | None = None
    total_steps: int | None = None
    approver_capacity: str | None = None
    # Set on a decision.
    decided_by: str | None = None
    comment: str | None = None


def _dates(ctx: LeaveContext) -> str:
    fmt = "%d %b %Y"
    if ctx.start_date == ctx.end_date:
        return ctx.start_date.strftime(fmt)
    return f"{ctx.start_date.strftime(fmt)} - {ctx.end_date.strftime(fmt)}"


def _breakdown(ctx: LeaveContext) -> str:
    """The arithmetic, spelled out.

    Weekends and holidays are reported separately because they are excluded for
    different reasons, and a day that is both is counted once — under weekend —
    so the three figures always reconcile against the calendar total.
    """
    parts = [f"{ctx.calendar_days} calendar days"]
    if ctx.weekend_days:
        parts.append(f"{ctx.weekend_days} non-working")
    if ctx.holiday_days:
        parts.append(f"{ctx.holiday_days} public holiday")
    return f"  {ctx.chargeable_days} chargeable  ({' - '.join(parts)})"


def _summary(ctx: LeaveContext) -> str:
    lines = [
        f"  Employee : {ctx.employee_name}",
        f"  Type     : {ctx.leave_type}",
        f"  Dates    : {_dates(ctx)}",
        _breakdown(ctx),
    ]
    if ctx.reason:
        lines.append(f"  Reason   : {ctx.reason}")
    return "\n".join(lines)


def _link(path: str) -> str:
    return f"{settings.app_base_url.rstrip('/')}{path}"


def awaiting_approval(ctx: LeaveContext) -> Message:
    """To an approver: this has arrived and is waiting on you."""
    where = ""
    if ctx.total_steps and ctx.total_steps > 1:
        where = f"\n\nYou are approval {ctx.step_order} of {ctx.total_steps}"
        if ctx.approver_capacity:
            where += f", as {ctx.approver_capacity}"
        where += "."
    return Message(
        subject=f"Leave request awaiting you - {ctx.employee_name}",
        body=f"{ctx.employee_name} has requested leave and it needs your decision.\n\n"
        f"{_summary(ctx)}{where}",
        link=_link("/manager/approvals"),
    )


def approved(ctx: LeaveContext) -> Message:
    """To the employee: the whole chain cleared."""
    return Message(
        subject=f"Approved - your {ctx.leave_type}",
        body=f"Your leave request has been fully approved.\n\n{_summary(ctx)}\n\n"
        f"{ctx.chargeable_days} day(s) have been deducted from your balance.",
        link=_link("/employee/requests"),
    )


def rejected(ctx: LeaveContext) -> Message:
    """To the employee: someone in the chain declined it."""
    who = f" by {ctx.decided_by}" if ctx.decided_by else ""
    note = f"\n\nComment: {ctx.comment}" if ctx.comment else ""
    return Message(
        subject=f"Declined - your {ctx.leave_type}",
        body=f"Your leave request was declined{who}.\n\n{_summary(ctx)}{note}\n\n"
        f"The {ctx.chargeable_days} day(s) held for this request have been "
        f"returned to your balance.",
        link=_link("/employee/requests"),
    )


def step_cleared(ctx: LeaveContext) -> Message:
    """To the employee: one tier passed, but it is not settled yet.

    Worth sending because a multi-tier request otherwise goes silent for days,
    and silence is indistinguishable from being ignored.
    """
    who = f" by {ctx.decided_by}" if ctx.decided_by else ""
    return Message(
        subject=f"Progress - your {ctx.leave_type}",
        body=f"Your leave request was approved{who}, and has moved to the next "
        f"approver.\n\n{_summary(ctx)}\n\n"
        f"Approval {ctx.step_order} of {ctx.total_steps} is complete.",
        link=_link("/employee/requests"),
    )


def cancelled(ctx: LeaveContext) -> Message:
    """To approvers who were still holding it: stand down."""
    return Message(
        subject=f"Withdrawn - {ctx.employee_name}'s {ctx.leave_type}",
        body=f"{ctx.employee_name} has withdrawn this request, so it no longer "
        f"needs your decision.\n\n{_summary(ctx)}",
        link=_link("/manager/approvals"),
    )
