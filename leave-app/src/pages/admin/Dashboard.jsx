import React from "react";
import { COLORS, FONTS } from "../../theme/colors";
import Card from "../../components/Card";
import SectionLabel from "../../components/SectionLabel";

// Replace these with real aggregate counts from your API.
const STATS = [
  ["Total employees", 120],
  ["Pending requests", 18],
  ["Employees on leave", 9],
  ["Leave policies", 6],
];

export default function AdminDashboard() {
  return (
    <div>
      <SectionLabel eyebrow="System">Admin dashboard</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {STATS.map(([label, val]) => (
          <Card key={label} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: FONTS.mono, fontWeight: 700, fontSize: 26, color: COLORS.navy }}>{val}</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginTop: 2 }}>{label}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
