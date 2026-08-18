import React from "react";
import { COLORS, FONTS } from "../../theme/colors";
import { LEAVE_TYPES } from "../../data/mockData";
import Card from "../../components/Card";
import SectionLabel from "../../components/SectionLabel";

export default function AdminLeaveTypes() {
  return (
    <div>
      <SectionLabel eyebrow="Configured">Leave types</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {LEAVE_TYPES.map((lt) => {
          const Icon = lt.icon;
          return (
            <Card key={lt.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ background: lt.soft, borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={17} color={lt.color} />
                </div>
                <div style={{ fontFamily: FONTS.body, fontWeight: 600, fontSize: 15 }}>{lt.label}</div>
              </div>
              <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.inkSoft }}>{lt.accrual} days accrued / month</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.inkSoft }}>Approval: {lt.approval}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
