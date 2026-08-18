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
class RegionOut(CamelModel):
    id: UUID
    tenant_id: UUID
    code: str
    country_name: str


# ============================ Employee ============================
class EmployeeOut(CamelModel):
    id: UUID
    tenant_id: UUID
    manager_id: UUID | None
    manager_name: str | None
    region_id: UUID
    region_code: str
    region_country: str
    name: str
    email: str
    join_date: date


class EmployeeSummaryOut(CamelModel):
    """Lighter row for list/table views."""

    id: UUID
    name: str
    email: str
    join_date: date
    region_country: str
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


class LeaveTypeCreate(CamelIn):
    region_id: UUID
    name: str = Field(min_length=1, max_length=80)
    is_paid: bool = True
    is_active: bool = True
    requires_approval: bool = True


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
    """A pending request enriched with who submitted it (manager queue)."""

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
