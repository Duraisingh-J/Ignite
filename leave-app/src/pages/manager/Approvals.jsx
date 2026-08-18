import React, { useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { COLORS, FONTS } from "../../theme/colors";
import { TEAM } from "../../data/mockData";
import { useLeave } from "../../context/LeaveContext";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SectionLabel from "../../components/SectionLabel";
import ApprovalCard from "../../components/ApprovalCard";

export default function ManagerApprovals() {
  const { approvals, decideApproval } = useLeave();
  const [openedId, setOpenedId] = useState(null);

  if (openedId) {
    const a = approvals.find((x) => x.id === openedId);
    if (!a) {
      // Was just approved/rejected from this view — bounce back to the list.
      setOpenedId(null);
      return null;
    }
    const teamOnLeave = TEAM.filter((t) => t.onLeave).length;
    return (
      <div style={{ maxWidth: 480 }}>
        <button
          onClick={() => setOpenedId(null)}
          style={{ background: "none", border: "none", color: COLORS.inkSoft, fontFamily: FONTS.body, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}
        >
          ← Back to approvals
        </button>
        <SectionLabel>{a.employee}'s request</SectionLabel>
        <Card style={{ marginBottom: 16 }}>
          {[
            ["Employee", a.employee],
            ["Role", a.role],
            ["Team", a.team],
            ["Region", a.region],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontFamily: FONTS.body, fontSize: 13, padding: "6px 0" }}>
              <span style={{ color: COLORS.inkSoft }}>{label}</span>
              <span style={{ color: COLORS.ink, fontWeight: 500 }}>{val}</span>
            </div>
          ))}
          <div style={{ height: 1, background: COLORS.line, margin: "8px 0" }} />
          {[
            ["Requested", `${a.days} days`],
            ["Available balance", a.balance],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontFamily: FONTS.body, fontSize: 13, padding: "6px 0" }}>
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
            {teamOnLeave} / {TEAM.length} members already on leave this week
          </div>
        </Card>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: FONTS.body, fontSize: 13, color: COLORS.ink, marginBottom: 20 }}>
          <span>You</span>
          <ArrowRight size={13} color={COLORS.inkSoft} />
          <span>HR</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="success" onClick={() => decideApproval(a.id, "Approved")}>
            <Check size={14} /> Approve
          </Button>
          <Button variant="danger" onClick={() => decideApproval(a.id, "Rejected")}>
            <X size={14} /> Reject
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionLabel eyebrow={`${approvals.length} waiting`}>Pending approvals</SectionLabel>
      {approvals.length === 0 ? (
        <Card style={{ textAlign: "center", color: COLORS.inkSoft, fontFamily: FONTS.body }}>
          Nothing pending — you're all caught up.
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {approvals.map((a) => (
            <ApprovalCard
              key={a.id}
              a={a}
              onApprove={() => decideApproval(a.id, "Approved")}
              onReject={() => decideApproval(a.id, "Rejected")}
              onOpen={() => setOpenedId(a.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
