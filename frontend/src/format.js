// Civil-date formatting. Dates arrive as "YYYY-MM-DD"; parse them as UTC and
// format in UTC so the displayed day never shifts with the viewer's timezone.
function toUtc(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function fmtDate(str) {
  return toUtc(str).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export function fmtDateFull(str) {
  return toUtc(str).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
