import React from "react";
import { FONTS } from "../../theme/colors";
import { TEAM } from "../../data/mockData";
import { COLORS } from "../../theme/colors";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import SectionLabel from "../../components/SectionLabel";

export default function Team() {
  return (
    <div>
      <SectionLabel eyebrow="Payments">Team</SectionLabel>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {TEAM.map((m, i) => (
          <div
            key={m.name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 20px",
              borderBottom: i < TEAM.length - 1 ? `1px solid ${COLORS.line}` : "none",
            }}
          >
            <div>
              <div style={{ fontFamily: FONTS.body, fontWeight: 600, fontSize: 14, color: COLORS.ink }}>{m.name}</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft }}>{m.role}</div>
            </div>
            {m.onLeave ? <Badge status="Approved" /> : <span style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft }}>In office</span>}
          </div>
        ))}
      </Card>
    </div>
  );
}
