import React, { useEffect, useState } from 'react';
import ShimmerBlock from '../../components/ShimmerBlock';

import { AlertCircle } from "lucide-react";
import { COLORS, FONTS } from "../../theme/colors";
import { fetchStats } from "../../api/leaveApi";
import Card from "../../components/Card";
import SectionLabel from "../../components/SectionLabel";
import Donut, { CATEGORICAL, STATUS_COLORS } from "../../components/Donut";

// Status labels read better in sentence case than the stored SCREAMING_CASE.
const STATUS_LABEL = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

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
  

  // Every figure below is counted in SQL — nothing here is hardcoded.
  const tiles = [
    ["Total employees", stats?.totalEmployees ?? 0, COLORS.navy],
    ["Pending requests", stats?.pendingRequests ?? 0, COLORS.gold],
    ["On leave today", stats?.employeesOnLeaveToday ?? 0, COLORS.teal],
    ["Leave types", stats?.leaveTypes ?? 0, COLORS.navy],
    ["Regions", stats?.regions ?? 0, COLORS.inkSoft],
    ["Holidays", stats?.holidays ?? 0, COLORS.inkSoft],
  ];

  const statusSlices = (stats?.requestsByStatus ?? []).map((s) => ({
    label: STATUS_LABEL[s.label] ?? s.label,
    value: s.value,
    key: s.label,
  }));

  return (
    <div>
      <SectionLabel eyebrow="System">Admin dashboard</SectionLabel>

      {/* Totals. The rings below break these down; they never restate them. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 32 }}>
        {!stats ? (<><ShimmerBlock height={100} borderRadius={12}/><ShimmerBlock height={100} borderRadius={12}/><ShimmerBlock height={100} borderRadius={12}/><ShimmerBlock height={100} borderRadius={12}/><ShimmerBlock height={100} borderRadius={12}/><ShimmerBlock height={100} borderRadius={12}/></>) : tiles.map(([label, val, color]) => (
          <Card key={label} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: FONTS.mono, fontWeight: 700, fontSize: 26, color, fontVariantNumeric: "tabular-nums" }}>
              {val}
            </div>
            <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginTop: 2 }}>{label}</div>
          </Card>
        ))}
      </div>

      <SectionLabel eyebrow="Breakdowns">How it splits</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 16 }}>
        {!stats ? (
          <>
             <ShimmerBlock height={250} borderRadius={12} />
             <ShimmerBlock height={250} borderRadius={12} />
             <ShimmerBlock height={250} borderRadius={12} />
          </>
        ) : (
          <>
            <Donut
              title="Leave requests by status"
              centerLabel="requests"
              slices={statusSlices}
              // Reserved status palette: these encode state, not identity.
              colors={(s) => STATUS_COLORS[s.key] ?? STATUS_COLORS.CANCELLED}
            />
            <Donut
              title="Employees by region"
              centerLabel="employees"
              slices={stats?.employeesByRegion ?? []}
              colors={CATEGORICAL}
            />
            <Donut
              title="Requests by leave type"
              centerLabel="requests"
              slices={stats?.requestsByLeaveType ?? []}
              colors={CATEGORICAL}
            />
          </>
        )}
      </div>

      <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginTop: 14, maxWidth: 640 }}>
        Counts are computed in SQL across the whole tenant. A region with nobody in
        it still appears, at zero — an empty region is worth seeing.
      </div>
    </div>
  );
}
