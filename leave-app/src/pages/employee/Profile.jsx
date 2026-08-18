import React from "react";
import { COLORS, FONTS } from "../../theme/colors";
import { fmtDateFull } from "../../utils/dateHelpers";
import { useLeave } from "../../context/LeaveContext";
import Card from "../../components/Card";
import SectionLabel from "../../components/SectionLabel";

export default function Profile() {
  const { employee, loading } = useLeave();

  if (loading) {
    return <div style={{ fontFamily: FONTS.body, color: COLORS.inkSoft }}>Loading…</div>;
  }
  if (!employee) return null;

  // Only fields the v1 model actually carries — no team/designation columns exist.
  const rows = [
    ["Name", employee.name],
    ["Email", employee.email],
    ["Region", employee.region],
    ["Manager", employee.manager ?? "—"],
    ["Joined", fmtDateFull(employee.joinDate)],
  ];

  return (
    <div style={{ maxWidth: 420 }}>
      <SectionLabel eyebrow="You">Profile</SectionLabel>
      <Card>
        {rows.map(([label, val]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontFamily: FONTS.body, fontSize: 14, padding: "9px 0", borderBottom: `1px solid ${COLORS.line}` }}>
            <span style={{ color: COLORS.inkSoft }}>{label}</span>
            <span style={{ color: COLORS.ink, fontWeight: 500, textAlign: "right" }}>{val}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
