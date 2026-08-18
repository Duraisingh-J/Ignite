import React, { useState } from "react";
import { AlertCircle, Check, X } from "lucide-react";
import { COLORS, FONTS } from "../../theme/colors";
import { fmtDateFull } from "../../utils/dateHelpers";
import { useLeave } from "../../context/LeaveContext";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SectionLabel from "../../components/SectionLabel";
import ApprovalCard from "../../components/ApprovalCard";

function ErrorBanner({ children }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: COLORS.claySoft, borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
      <AlertCircle size={15} color={COLORS.clay} style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.clay }}>{children}</span>
    </div>
  );
}

export default function Approvals() {
  const { approvals, team, decideApproval, loading } = useLeave();
  const [opened, setOpened] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function decide(id, status) {
    setError("");
    setBusy(true);
    try {
      await decideApproval(id, status);
      setOpened(null);
    } catch (e) {
      // Illegal transitions (already decided elsewhere) surface here as 409.
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div style={{ fontFamily: FONTS.body, color: COLORS.inkSoft }}>Loading…</div>;
  }

  const a = opened ? approvals.find((x) => x.id === opened) : null;

  if (a) {
    const teamOnLeave = team.filter((t) => t.onLeave).length;
    return (
      <div style={{ maxWidth: 480 }}>
        <button
          onClick={() => setOpened(null)}
          style={{ background: "none", border: "none", color: COLORS.inkSoft, fontFamily: FONTS.body, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}
        >
          &larr; Back to approvals
        </button>
        <SectionLabel>{a.employee}</SectionLabel>

        <Card style={{ marginBottom: 16 }}>
          {[
            ["Employee", a.employee],
            ["Region", a.region],
            ["Leave type", a.type],
            ["Dates", fmtDateFull(a.start) + " to " + fmtDateFull(a.end)],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontFamily: FONTS.body, fontSize: 13, padding: "6px 0" }}>
              <span style={{ color: COLORS.inkSoft }}>{label}</span>
              <span style={{ color: COLORS.ink, fontWeight: 500, textAlign: "right" }}>{val}</span>
            </div>
          ))}
          <div style={{ height: 1, background: COLORS.line, margin: "8px 0" }} />
          {a.breakdown &&
            [
              ["Calendar days", a.breakdown.calendarDays],
              ["Weekend days", a.breakdown.weekendDays],
              ["Holidays", a.breakdown.holidayDays],
              ["Chargeable", a.breakdown.chargeableDays],
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontFamily: FONTS.body, fontSize: 13, padding: "5px 0" }}>
                <span style={{ color: COLORS.inkSoft }}>{label}</span>
                <span style={{ fontFamily: FONTS.mono, color: COLORS.ink, fontWeight: 600 }}>{val}</span>
              </div>
            ))}
        </Card>

        <Card style={{ marginBottom: 16, background: COLORS.paperDim, border: "none" }}>
          <div style={{ fontFamily: FONTS.body, fontWeight: 700, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: COLORS.inkSoft, marginBottom: 8 }}>
            Team availability
          </div>
          <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.ink }}>
            {teamOnLeave} of {team.length} team members on approved leave today
          </div>
        </Card>

        <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.inkSoft, marginBottom: 16 }}>
          Reason: {a.reason || "-"}
        </div>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="success" disabled={busy} onClick={() => decide(a.id, "APPROVED")}>
            <Check size={14} /> {busy ? "Saving..." : "Approve"}
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => decide(a.id, "REJECTED")}>
            <X size={14} /> Reject
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionLabel eyebrow={`${approvals.length} waiting`}>Pending approvals</SectionLabel>
      {error && <ErrorBanner>{error}</ErrorBanner>}
      {approvals.length === 0 ? (
        <Card style={{ textAlign: "center", color: COLORS.inkSoft, fontFamily: FONTS.body }}>
          Nothing pending. You are all caught up.
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {approvals.map((x) => (
            <ApprovalCard
              key={x.id}
              a={x}
              busy={busy}
              onApprove={() => decide(x.id, "APPROVED")}
              onReject={() => decide(x.id, "REJECTED")}
              onOpen={() => setOpened(x.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
