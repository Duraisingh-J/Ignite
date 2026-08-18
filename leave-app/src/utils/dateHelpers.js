// Civil-date helpers. Dates are "YYYY-MM-DD" strings throughout.
//
// Everything below iterates and formats in UTC. Mixing local getDay()/setDate()
// with toISOString() (which converts to UTC) misidentifies weekends in any
// negative-offset timezone, so the two must never be combined.

function parseCivil(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function dateRange(startStr, endStr) {
  const start = parseCivil(startStr);
  const end = parseCivil(endStr);
  const days = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}

/**
 * Builds the lookup the preview matches against.
 *
 * A holiday row is either recurrence "ANNUAL" (the month/day repeats every
 * year; the stored year is only an anchor) or "NONE" (that exact date only).
 * Matching ANNUAL rows on the full date would silently miss them in every
 * year but the anchor's, so they are keyed by "MM-DD" instead.
 *
 * This mirrors expand() in backend/app/services/holiday_expansion.py. The
 * server recomputes authoritatively on submit; if the two ever disagree, the
 * server wins.
 */
function buildHolidayLookup(holidays) {
  const exact = new Set();
  const annual = new Set();
  for (const h of holidays) {
    if (!h?.date) continue;
    if (h.recurrence === "ANNUAL") annual.add(h.date.slice(5)); // "MM-DD"
    else exact.add(h.date);
  }
  return { exact, annual };
}

/**
 * Breaks a date range into calendar days / weekend days / holidays / chargeable days.
 *
 * This is a *preview* so the form stays responsive while typing. The server
 * recomputes it on submit — treat the response as the truth.
 *
 * @param {string} startStr  "YYYY-MM-DD"
 * @param {string} endStr    "YYYY-MM-DD"
 * @param {Array<{date: string, recurrence?: string}>} holidays  region holidays
 */
export function calcLeaveBreakdown(startStr, endStr, holidays = []) {
  if (!startStr || !endStr) return null;
  const days = dateRange(startStr, endStr);
  if (days.length === 0) return null;

  const { exact, annual } = buildHolidayLookup(holidays);
  let weekend = 0;
  let holiday = 0;

  days.forEach((d) => {
    const iso = d.toISOString().slice(0, 10);
    const dow = d.getUTCDay(); // 0 = Sun, 6 = Sat
    // Weekend wins: a holiday falling on a Saturday is counted once, not twice.
    if (dow === 0 || dow === 6) weekend++;
    else if (exact.has(iso) || annual.has(iso.slice(5))) holiday++;
  });

  return {
    calendarDays: days.length,
    weekend,
    holiday,
    chargeable: days.length - weekend - holiday,
  };
}

export function fmtDate(str) {
  return parseCivil(str).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export function fmtDateFull(str) {
  return parseCivil(str).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
