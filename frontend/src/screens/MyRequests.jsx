import { useState } from "react";
import { Badge, Card, SectionLabel } from "../components/primitives.jsx";
import { fmtDate, fmtDateFull } from "../format.js";

const FILTERS = [
  ["All", null],
  ["Pending", "PENDING"],
  ["Approved", "APPROVED"],
  ["Rejected", "REJECTED"],
];

const TH =
  "px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.06em] " +
  "text-ink-soft whitespace-nowrap";

export default function MyRequests({ requests }) {
  const [filter, setFilter] = useState("All");
  const status = FILTERS.find(([label]) => label === filter)?.[1] ?? null;
  const rows = status ? requests.filter((r) => r.status === status) : requests;

  return (
    <div>
      <SectionLabel eyebrow="History">My leave requests</SectionLabel>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([label]) => (
          <button
            key={label}
            onClick={() => setFilter(label)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
              filter === label
                ? "border-navy bg-navy text-white"
                : "border-line text-ink-soft hover:bg-paper-dim"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-ink-soft">
            No {filter.toLowerCase()} requests yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-paper-dim">
                  <th className={TH}>Type</th>
                  <th className={TH}>Dates</th>
                  <th className={TH}>Days</th>
                  <th className={TH}>Reason</th>
                  <th className={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-ink">
                      {r.leaveTypeName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-soft">
                      {r.startDate === r.endDate
                        ? fmtDateFull(r.startDate)
                        : `${fmtDate(r.startDate)} – ${fmtDateFull(r.endDate)}`}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-ink">{r.workingDays}</td>
                    <td className="max-w-[220px] px-4 py-3 text-sm text-ink-soft">
                      {r.reason || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
