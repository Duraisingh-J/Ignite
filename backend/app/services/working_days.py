"""Pure working-day calculator over civil dates.

`datetime.date` carries no timezone, so weekend detection is unambiguous —
no UTC/local mixing is possible here.

The working week is per-region rather than hardcoded Mon–Fri: most of the
world works Mon–Fri, but Gulf states run Sun–Thu and a few run Sat–Wed.
Holidays come from the employee's region. Together these implement the
model's `LeaveRequest ..> HolidayCalendar : excludes_dates_via_region`.
"""

from dataclasses import dataclass, asdict
from datetime import date, timedelta

# date.weekday(): 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri 5=Sat 6=Sun
DEFAULT_WORK_DAYS = frozenset({0, 1, 2, 3, 4})  # Mon–Fri

WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


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
    work_days: set[int] | frozenset[int] | list[int] | None = None,
) -> DayBreakdown:
    """Break a date range into calendar / weekend / holiday / chargeable days.

    @param work_days  weekday numbers that are working days for the region.
                      Defaults to Mon–Fri when the region has none configured.
    """
    holidays = holidays or set()
    working = frozenset(work_days) if work_days else DEFAULT_WORK_DAYS

    calendar_days = 0
    weekend_days = 0
    holiday_days = 0
    excluded: list[str] = []

    current = start
    while current <= end:
        calendar_days += 1
        if current.weekday() not in working:
            # "Weekend" means any non-working day for this region, which is not
            # necessarily Saturday and Sunday.
            weekend_days += 1
            excluded.append(current.isoformat())
        elif current in holidays:
            # elif, so a holiday on a non-working day is counted once.
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
