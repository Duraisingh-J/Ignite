"""Pydantic request/response models.

Every endpoint declares both an input model and a `response_model`, so FastAPI
validates data on the way *out* as well as in — a repository returning an
unexpected shape fails loudly here instead of reaching the browser.

Responses use camelCase aliases so the React client needs no key mapping.
"""

from datetime import date, datetime
from enum import Enum
from typing import Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator
from pydantic.alias_generators import to_camel


class CamelIn(BaseModel):
    """Base for REQUEST bodies.

    Unknown keys are rejected: a typo'd field name should be a 400, not a
    silently ignored no-op that leaves the caller thinking it took effect.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )


class CamelModel(BaseModel):
    """Base for RESPONSE models.

    Extras are ignored rather than forbidden — repository rows carry more
    columns than a given view needs (a summary row still selects tenant_id,
    region_id, ...), and narrowing is the whole point of a response model.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="ignore",
    )


class Recurrence(str, Enum):
    """How a holiday repeats.

    NONE   - that exact date only. Use for one-off closures and for lunar or
             otherwise variable festivals (Diwali, Eid), which follow no
             formula and must be entered per year.
    ANNUAL - the same month/day every year; the stored date is just the anchor.
    """

    NONE = "NONE"
    ANNUAL = "ANNUAL"


class LeaveStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


# ============================ Region ============================
# date.weekday(): 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri 5=Sat 6=Sun
WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


class RegionOut(CamelModel):
    id: UUID
    tenant_id: UUID
    code: str
    country_name: str
    # Which weekdays are working days here. Mon-Fri in most of the world,
    # Sun-Thu across much of the Gulf.
    work_days: list[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4])
    timezone: str = "UTC"


class RegionCreate(CamelIn):
    tenant_id: UUID
    code: str = Field(min_length=2, max_length=8)
    country_name: str = Field(min_length=1, max_length=80)
    work_days: list[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4])
    timezone: str = Field(default="UTC", max_length=64)

    @model_validator(mode="after")
    def _valid_work_days(self):
        if not self.work_days:
            raise ValueError("workDays must contain at least one weekday")
        if any(d < 0 or d > 6 for d in self.work_days):
            raise ValueError("workDays entries must be 0 (Mon) to 6 (Sun)")
        if len(set(self.work_days)) == 7:
            raise ValueError("workDays cannot be all seven days — there would be no weekend")
        return self


# ============================ Employee ============================
class EmployeeOut(CamelModel):
    id: UUID
    tenant_id: UUID
    manager_id: UUID | None
    manager_name: str | None
    region_id: UUID
    region_code: str
    region_country: str
    # Mirrors the region's working week so the client preview can match the
    # server's calculation without a second request.
    region_work_days: list[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4])
    name: str
    email: str
    join_date: date


class EmployeeSummaryOut(CamelModel):
    """Lighter row for list/table views."""

    id: UUID
    name: str
    email: str
    join_date: date
    region_id: UUID
    region_country: str
    # Both the id and the name: the id binds the reassign dropdown reliably
    # (two colleagues can share a name), the name renders without a lookup.
    manager_id: UUID | None
    manager_name: str | None


class TeamMemberOut(CamelModel):
    """A manager's direct report, plus whether they are out today."""

    id: UUID
    name: str
    email: str
    join_date: date
    on_leave: bool
    leave_until: date | None


class EmployeeCreate(CamelIn):
    tenant_id: UUID
    region_id: UUID
    manager_id: UUID | None = None
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    join_date: date

    @model_validator(mode="after")
    def _not_own_manager(self):
        # A new employee has no id yet, so this only guards obvious misuse.
        if self.manager_id is not None and self.manager_id == self.region_id:
            raise ValueError("managerId looks like a regionId")
        return self


class EmployeeUpdate(CamelIn):
    """Partial update. Send managerId: null to detach an employee from their
    manager; omit the field entirely to leave the reporting line unchanged."""

    manager_id: UUID | None = None
    clear_manager: bool = False
    region_id: UUID | None = None
    name: str | None = Field(default=None, min_length=1, max_length=120)


# ============================ Holiday ============================
class HolidayOut(CamelModel):
    id: UUID
    region_id: UUID
    date: date
    name: str
    recurrence: Recurrence = Recurrence.NONE


class HolidayCreate(CamelIn):
    tenant_id: UUID
    region_id: UUID
    date: date
    name: str = Field(min_length=1, max_length=120)
    # Defaults to repeating: most entries on a holiday calendar are fixed-date
    # national holidays. Set NONE for one-off or lunar dates.
    recurrence: Recurrence = Recurrence.ANNUAL


# ============================ LeaveType ============================
class LeaveTypeOut(CamelModel):
    id: UUID
    region_id: UUID
    name: str
    is_paid: bool
    is_active: bool
    requires_approval: bool
    # Approval depth. Lives on the type, which is already region-scoped, so
    # depth is region-specific without a separate policy table.
    approval_levels: int = 1
    escalate_above_days: int | None = None


class LeaveTypeCreate(CamelIn):
    region_id: UUID
    name: str = Field(min_length=1, max_length=80)
    is_paid: bool = True
    is_active: bool = True
    requires_approval: bool = True
    approval_levels: int = Field(default=1, ge=1, le=3)
    escalate_above_days: int | None = Field(default=None, ge=1, le=365)


class LeaveTypeUpdate(CamelIn):
    """Partial update of a type's approval configuration."""

    approval_levels: int | None = Field(default=None, ge=1, le=3)
    escalate_above_days: int | None = Field(default=None, ge=1, le=365)
    clear_escalation: bool = False
    is_active: bool | None = None


# ---------- Approval chain ----------
class ApprovalStepOut(CamelModel):
    id: UUID
    step_order: int
    approver_id: UUID | None
    approver_name: str | None
    approver_role: str
    status: str
    comment: str | None
    decided_at: datetime | None


class ApprovalDecision(CamelIn):
    """One approver acting on one step of the chain."""

    approver_id: UUID
    approve: bool
    comment: str | None = Field(default=None, max_length=1000)


class ApprovalResultOut(CamelModel):
    request_id: UUID
    step_id: UUID
    step_status: str
    # The request's status re-derived from the whole chain.
    request_status: str


# ============================ LeaveRequest ============================
class DayBreakdownOut(CamelModel):
    calendar_days: int = Field(ge=0)
    weekend_days: int = Field(ge=0)
    holiday_days: int = Field(ge=0)
    chargeable_days: int = Field(ge=0)
    excluded_dates: list[date]


class LeaveRequestCreate(CamelIn):
    employee_id: UUID
    leave_type_id: UUID
    start_date: date
    end_date: date
    reason: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def _dates_ordered(self):
        if self.end_date < self.start_date:
            raise ValueError("endDate cannot be before startDate")
        # Guard against absurd ranges reaching the day-by-day loop.
        if (self.end_date - self.start_date).days > 365:
            raise ValueError("range cannot exceed 365 days")
        return self


class LeaveRequestDecision(CamelIn):
    """Approve or reject a pending request."""

    status: LeaveStatus

    @model_validator(mode="after")
    def _decidable(self):
        if self.status not in (LeaveStatus.APPROVED, LeaveStatus.REJECTED, LeaveStatus.CANCELLED):
            raise ValueError("status must be APPROVED, REJECTED or CANCELLED")
        return self


class LeaveRequestOut(CamelModel):
    id: UUID
    employee_id: UUID
    leave_type_id: UUID
    leave_type_name: str
    start_date: date
    end_date: date
    status: LeaveStatus
    reason: str | None
    submitted_at: datetime
    working_days: int = Field(ge=0)
    breakdown: DayBreakdownOut


class ApprovalOut(CamelModel):
    """A request awaiting a decision, enriched with who submitted it."""

    id: UUID
    employee_id: UUID
    employee_name: str
    region_country: str
    leave_type_name: str
    start_date: date
    end_date: date
    status: LeaveStatus
    reason: str | None
    submitted_at: datetime
    working_days: int = Field(ge=0)
    breakdown: DayBreakdownOut
    # Present when the row came from an approver's queue: which tier they are
    # being asked to decide, and how many tiers the request has in total.
    step_id: UUID | None = None
    step_order: int | None = None
    total_steps: int | None = None


# ============================ Stats ============================
class StatsOut(CamelModel):
    total_employees: int = Field(ge=0)
    pending_requests: int = Field(ge=0)
    employees_on_leave_today: int = Field(ge=0)
    leave_types: int = Field(ge=0)
    regions: int = Field(ge=0)
    holidays: int = Field(ge=0)


# ============================ Envelopes ============================
T = TypeVar("T")


class DataResponse(BaseModel, Generic[T]):
    """Every success response is { "data": ... }."""

    data: T


class PageMeta(CamelModel):
    total: int = Field(ge=0)
    limit: int = Field(ge=1)
    offset: int = Field(ge=0)


class PagedResponse(BaseModel, Generic[T]):
    data: list[T]
    meta: PageMeta

# --- Auth Schemas ---

class LoginRequest(CamelModel):
    email: str
    password: str
    organization: str | None = None

class Token(CamelModel):
    access_token: str
    token_type: str = "bearer"
    role: str
