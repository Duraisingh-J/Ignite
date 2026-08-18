import React, { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { COLORS, FONTS } from "../../theme/colors";
import { fmtDateFull } from "../../utils/dateHelpers";
import { useLeave } from "../../context/LeaveContext";
import { chainToSteps, fetchApprovalChain } from "../../api/leaveApi";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import SectionLabel from "../../components/SectionLabel";
import RequestsTable from "../../components/RequestsTable";
import Stepper from "../../components/Stepper";

const FILTERS = ["All", "Pending", "Approved", "Rejected"];

export default function MyRequests() {
  const { requests, loading, error } = useLeave();
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [chain, setChain] = useState(null);

  // The approval timeline is only needed when a request is opened, so it is
  // fetched per request rather than loaded for the whole list.
  useEffect(() => {
    if (!selected) {
      setChain(null);
      return;
    }
    let cancelled = false;
    fetchApprovalChain(selected.id)
      .then((c) => !cancelled && setChain(c))
      .catch(() => !cancelled && setChain([]));
    return () => {
      cancelled = true;
    };
  }, [selected]);

  if (loading) {
    return <div style={{ fontFamily: FONTS.body, color: COLORS.inkSoft }}>Loading…</div>;
  }

  if (error) {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: COLORS.claySoft, borderRadius: 8, padding: "12px 14px", maxWidth: 480 }}>
        <AlertCircle size={15} color={COLORS.clay} style={{ flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.clay }}>{error.message}</span>
      </div>
    );
  }

  const filtered = filter === "All" ? requests : requests.filter((r) => r.status === filter);

  if (selected) {
    const b = selected.breakdown;
    return (
      <div style={{ maxWidth: 480 }}>
        <button
          onClick={() => setSelected(null)}
          style={{ background: "none", border: "none", color: COLORS.inkSoft, fontFamily: FONTS.body, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}
        >
          ← Back to requests
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: 22, color: COLORS.ink }}>{selected.type}</div>
          <Badge status={selected.status} />
        </div>
        <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.inkSoft, marginBottom: 20 }}>
          {fmtDateFull(selected.start)} – {fmtDateFull(selected.end)}
        </div>

        <Card style={{ marginBottom: 20 }}>
          {[
            ["Chargeable days", `${selected.days} day${selected.days !== 1 ? "s" : ""}`],
            ["Reason", selected.reason || "—"],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontFamily: FONTS.body, fontSize: 13, padding: "6px 0" }}>
              <span style={{ color: COLORS.inkSoft }}>{label}</span>
              <span style={{ fontFamily: FONTS.mono, color: COLORS.ink, fontWeight: 600, textAlign: "right" }}>{val}</span>
            </div>
          ))}
        </Card>

        {/* The frozen approval chain: who was asked, in what order, and what they said. */}
        {chain !== null && chain.length > 0 && (
          <>
            <SectionLabel eyebrow="Timeline">Approval progress</SectionLabel>
            <Card style={{ marginBottom: 20 }}>
              <Stepper steps={chainToSteps(chain)} />
            </Card>
          </>
        )}

        {/* How the server arrived at the day count (weekends + region holidays removed). */}
        {b && (
          <>
            <SectionLabel eyebrow="Breakdown">How this was calculated</SectionLabel>
            <Card>
              {[
                ["Calendar days", b.calendarDays],
                ["Weekend days", b.weekendDays],
                ["Holidays", b.holidayDays],
                ["Chargeable", b.chargeableDays],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontFamily: FONTS.body, fontSize: 13, padding: "5px 0" }}>
                  <span style={{ color: COLORS.inkSoft }}>{label}</span>
                  <span style={{ fontFamily: FONTS.mono, fontWeight: 600, color: COLORS.ink }}>{val}</span>
                </div>
              ))}
              {b.excludedDates?.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${COLORS.line}` }}>
                  <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginBottom: 4 }}>
                    Excluded dates
                  </div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.ink }}>
                    {b.excludedDates.join(", ")}
                  </div>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <SectionLabel eyebrow="History">My leave requests</SectionLabel>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontFamily: FONTS.body,
              fontSize: 13,
              fontWeight: 600,
              padding: "7px 14px",
              borderRadius: 999,
              border: `1px solid ${filter === f ? COLORS.navy : COLORS.line}`,
              background: filter === f ? COLORS.navy : "transparent",
              color: filter === f ? "#fff" : COLORS.inkSoft,
              cursor: "pointer",
            }}
          >
            {f}
          </button>
        ))}
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", fontFamily: FONTS.body, color: COLORS.inkSoft, fontSize: 14 }}>
            No {filter.toLowerCase()} requests yet.
          </div>
        ) : (
          <RequestsTable requests={filtered} onSelect={setSelected} />
        )}
      </Card>
    </div>
  );
}
