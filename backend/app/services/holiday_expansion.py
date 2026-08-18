"""Expand recurring holiday rules into concrete dates for a date range.

A holiday row is either:
  * recurrence = 'NONE'   -> the stored date, that year only (one-off closures,
                             and lunar/variable festivals which follow no formula
                             and must be entered per year)
  * recurrence = 'ANNUAL' -> the stored month/day, every year forever. The
                             stored date acts as the anchor; its year is only
                             the year the rule was first recorded.

Expansion happens here rather than in SQL so the hot path stays a plain
BETWEEN scan on the (region_id, date) index, and so leap-day handling is
explicit rather than buried in a query.
"""

from datetime import date


def expand(rows: list[dict], start: date, end: date) -> set[date]:
    """Concrete holiday dates falling inside [start, end].

    @param rows  holiday_calendar rows with at least `date` and `recurrence`
    """
    out: set[date] = set()

    for row in rows:
        anchor: date = row["date"]
        recurrence = row.get("recurrence", "NONE")

        if recurrence != "ANNUAL":
            if start <= anchor <= end:
                out.add(anchor)
            continue

        # A request range is capped at 365 days, so it spans at most two years,
        # but iterate the full span anyway to stay correct for wider queries.
        for year in range(start.year, end.year + 1):
            try:
                occurrence = anchor.replace(year=year)
            except ValueError:
                # 29 Feb in a non-leap year: the rule simply does not occur.
                # Observing it on the 28th is a policy decision, not a default.
                continue
            if start <= occurrence <= end:
                out.add(occurrence)

    return out


def occurrences_for_year(rows: list[dict], year: int) -> list[dict]:
    """Rows projected onto a specific year, for calendar display.

    ANNUAL rows are rewritten to that year; NONE rows are kept only if they
    already fall in it.
    """
    out: list[dict] = []
    for row in rows:
        anchor: date = row["date"]
        if row.get("recurrence") == "ANNUAL":
            try:
                out.append({**row, "date": anchor.replace(year=year)})
            except ValueError:
                continue
        elif anchor.year == year:
            out.append(dict(row))
    return sorted(out, key=lambda r: r["date"])
