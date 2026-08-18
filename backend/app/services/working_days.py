"""Pure working-day calculator over civil dates.

`datetime.date` carries no timezone, so weekend detection is unambiguous —
no UTC/local mixing is possible here. Weekend = Sat/Sun; holidays come from
the employee's region. This implements the model's
`LeaveRequest ..> HolidayCalendar : excludes_dates_via_region`.
"""

from dataclasses import dataclass, asdict
from datetime import date, timedelta


@dataclass(frozen=True)
class DayBreakdown:
    calendar_days: int
    weekend_days: int
    holiday_days: int
    chargeable_days: int
    excluded_dates: list[str]

    def to_camel(self) -> dict:
        d = asdict(self)
        return {
            "calendarDays": d["calendar_days"],
            "weekendDays": d["weekend_days"],
            "holidayDays": d["holiday_days"],
            "chargeableDays": d["chargeable_days"],
            "excludedDates": d["excluded_dates"],
        }


def calc_working_days(
    start: date,
    end: date,
    holidays: set[date] | None = None,
) -> DayBreakdown:
    holidays = holidays or set()

    calendar_days = 0
    weekend_days = 0
    holiday_days = 0
    excluded: list[str] = []

    current = start
    while current <= end:
        calendar_days += 1
        # Monday = 0 ... Saturday = 5, Sunday = 6
        if current.weekday() >= 5:
            weekend_days += 1
            excluded.append(current.isoformat())
        elif current in holidays:
            holiday_days += 1
            excluded.append(current.isoformat())
        current += timedelta(days=1)

    return DayBreakdown(
        calendar_days=calendar_days,
        weekend_days=weekend_days,
        holiday_days=holiday_days,
        chargeable_days=calendar_days - weekend_days - holiday_days,
        excluded_dates=excluded,
    )
