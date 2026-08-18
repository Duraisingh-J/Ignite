import React, { useState } from "react";
import { AlertCircle, Check, X } from "lucide-react";
import { COLORS, FONTS, inputStyle } from "../../theme/colors";
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
  const { approvals, team, decideStep, loading } = useLeave();
  const [opened, setOpened] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");

  async function decide(a, approve) {
    setError("");
    setNote("");
    setBusy(true);
    try {
      const res = await decideStep(a.id, a.stepId, { approve, comment });
      setComment("");
      setOpened(null);
      // An intermediate approval leaves the request pending on the next tier,
      // so say so rather than implying it is settled.
      setNote(
        res.requestStatus === "PENDING"
          ? `Recorded. This request still needs a further approval.`
          : `Request ${res.requestStatus.toLowerCase()}.`
      );
    } catch (e) {
      // Already-decided steps and out-of-turn tiers come back as 409.
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
        <SectionLabel
          eyebrow={a.totalSteps > 1 ? `Approval ${a.stepOrder} of ${a.totalSteps}` : "Approval"}
        >
          {a.employee}
        </SectionLabel>

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

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, fontWeight: 600, color: COLORS.inkSoft, marginBottom: 6 }}>
            Comment (optional)
          </div>
          <textarea
            rows={2}
            value={comment}
            placeholder="Recorded against your decision in the request timeline."
            onChange={(e) => setComment(e.target.value)}
            style={{ ...inputStyle, resize: "vertical", fontFamily: FONTS.body }}
          />
        </div>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="success" disabled={busy} onClick={() => decide(a, true)}>
            <Check size={14} /> {busy ? "Saving..." : "Approve"}
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => decide(a, false)}>
            <X size={14} /> Reject
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionLabel eyebrow={`${approvals.length} waiting on you`}>Pending approvals</SectionLabel>
      {error && <ErrorBanner>{error}</ErrorBanner>}
      {note && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", background: COLORS.tealSoft, borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
          <Check size={15} color={COLORS.teal} strokeWidth={3} />
          <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.teal }}>{note}</span>
        </div>
      )}
      {approvals.length === 0 ? (
        <Card style={{ textAlign: "center", color: COLORS.inkSoft, fontFamily: FONTS.body }}>
          Nothing pending. You are all caught up.
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {approvals.map((x) => (
            <ApprovalCard
              key={x.stepId ?? x.id}
              a={x}
              busy={busy}
              onApprove={() => decide(x, true)}
              onReject={() => decide(x, false)}
              onOpen={() => {
                setComment("");
                setOpened(x.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
