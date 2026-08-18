import React from "react";
import { COLORS, FONTS } from "../../theme/colors";
import { TEAM } from "../../data/mockData";
import Card from "../../components/Card";
import SectionLabel from "../../components/SectionLabel";

export default function Calendar() {
  const onLeave = TEAM.filter((t) => t.onLeave);
  return (
    <div>
      <SectionLabel eyebrow="This month">Team calendar</SectionLabel>
      <Card>
        <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.inkSoft, marginBottom: 12 }}>
          Who's out, at a glance.
        </div>
        {onLeave.map((m) => (
          <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.teal }} />
            <span style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.ink }}>{m.name}</span>
            <span style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft }}>— on leave this week</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
