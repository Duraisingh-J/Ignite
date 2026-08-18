import React, { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { COLORS, FONTS } from "../../theme/colors";
import { fetchStats } from "../../api/leaveApi";
import Card from "../../components/Card";
import SectionLabel from "../../components/SectionLabel";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStats().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: COLORS.claySoft, borderRadius: 8, padding: "12px 14px", maxWidth: 480 }}>
        <AlertCircle size={15} color={COLORS.clay} style={{ flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.clay }}>{error}</span>
      </div>
    );
  }
  if (!stats) {
    return <div style={{ fontFamily: FONTS.body, color: COLORS.inkSoft }}>Loading…</div>;
  }

  // Every figure below is counted in SQL — nothing here is hardcoded.
  const tiles = [
    ["Total employees", stats.totalEmployees, COLORS.navy],
    ["Pending requests", stats.pendingRequests, COLORS.gold],
    ["On leave today", stats.employeesOnLeaveToday, COLORS.teal],
    ["Leave types", stats.leaveTypes, COLORS.navy],
    ["Regions", stats.regions, COLORS.inkSoft],
    ["Holidays", stats.holidays, COLORS.inkSoft],
  ];

  return (
    <div>
      <SectionLabel eyebrow="System">Admin dashboard</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {tiles.map(([label, val, color]) => (
          <Card key={label} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: FONTS.mono, fontWeight: 700, fontSize: 26, color }}>{val}</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginTop: 2 }}>{label}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
