import React from "react";
import { useNavigate } from "react-router-dom";
import { COLORS, FONTS } from "../../theme/colors";
import { useLeave } from "../../context/LeaveContext";
import Card from "../../components/Card";
import SectionLabel from "../../components/SectionLabel";
import ApprovalCard from "../../components/ApprovalCard";

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { approvals, team, loading } = useLeave();

  if (loading) {
    return <div style={{ fontFamily: FONTS.body, color: COLORS.inkSoft }}>Loading…</div>;
  }

  const onLeaveCount = team.filter((t) => t.onLeave).length;

  return (
    <div>
      <SectionLabel eyebrow="Manager">Manager dashboard</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          ["Pending approvals", approvals.length, COLORS.gold],
          ["Team members", team.length, COLORS.navy],
          ["On leave today", onLeaveCount, COLORS.teal],
        ].map(([label, val, color]) => (
          <Card key={label} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: FONTS.mono, fontWeight: 700, fontSize: 28, color }}>{val}</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginTop: 2 }}>{label}</div>
          </Card>
        ))}
      </div>

      <SectionLabel eyebrow="Needs you">Pending leave requests</SectionLabel>
      {approvals.length === 0 ? (
        <Card style={{ textAlign: "center", color: COLORS.inkSoft, fontFamily: FONTS.body }}>
          Nothing pending. You are all caught up.
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {approvals.slice(0, 2).map((a) => (
            <ApprovalCard key={a.id} a={a} onOpen={() => navigate("/manager/approvals")} compact />
          ))}
        </div>
      )}
    </div>
  );
}
