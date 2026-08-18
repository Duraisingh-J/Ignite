"""Pydantic request/response models.

Responses use camelCase aliases so the React client needs no key mapping.
"""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ---------- Employee ----------
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


# ---------- Holiday ----------
class HolidayOut(CamelModel):
    id: UUID
    region_id: UUID
    date: date
    name: str


# ---------- LeaveType ----------
class LeaveTypeOut(CamelModel):
    id: UUID
    region_id: UUID
    name: str
    is_paid: bool
    is_active: bool
    requires_approval: bool


# ---------- LeaveRequest ----------
class DayBreakdownOut(CamelModel):
    calendar_days: int
    weekend_days: int
    holiday_days: int
    chargeable_days: int
    excluded_dates: list[date]


class LeaveRequestCreate(CamelModel):
    employee_id: UUID
    leave_type_id: UUID
    start_date: date
    end_date: date
    reason: str | None = Field(default=None, max_length=1000)


class LeaveRequestOut(CamelModel):
    id: UUID
    employee_id: UUID
    leave_type_id: UUID
    leave_type_name: str
    start_date: date
    end_date: date
    status: str
    reason: str | None
    submitted_at: datetime
    working_days: int
    breakdown: DayBreakdownOut


# ---------- Envelope ----------
class DataResponse[T](BaseModel):
    data: T
