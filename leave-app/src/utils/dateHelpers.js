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
 * Breaks a date range into calendar days / weekend days / holidays / chargeable days.
 *
 * This is a *preview* so the form stays responsive while typing. The server
 * recomputes it authoritatively on submit — treat the response as the truth.
 *
 * @param {string} startStr  "YYYY-MM-DD"
 * @param {string} endStr    "YYYY-MM-DD"
 * @param {Array<{date: string}>} holidays  region holidays from the API
 */
export function calcLeaveBreakdown(startStr, endStr, holidays = []) {
  if (!startStr || !endStr) return null;
  const days = dateRange(startStr, endStr);
  if (days.length === 0) return null;

  const holidaySet = new Set(holidays.map((h) => h.date));
  let weekend = 0;
  let holiday = 0;

  days.forEach((d) => {
    const iso = d.toISOString().slice(0, 10);
    const dow = d.getUTCDay(); // 0 = Sun, 6 = Sat
    if (dow === 0 || dow === 6) weekend++;
    else if (holidaySet.has(iso)) holiday++;
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
