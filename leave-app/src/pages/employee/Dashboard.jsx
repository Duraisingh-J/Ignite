import React from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Plus } from "lucide-react";
import { COLORS, FONTS } from "../../theme/colors";
import { fmtDate } from "../../utils/dateHelpers";
import { useLeave } from "../../context/LeaveContext";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SectionLabel from "../../components/SectionLabel";
import RequestsTable from "../../components/RequestsTable";

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { employee, requests, holidays, loading } = useLeave();

  if (loading) {
    return <div style={{ fontFamily: FONTS.body, color: COLORS.inkSoft }}>Loading…</div>;
  }

  // All figures are derived from live data. There is no balance concept in the
  // current schema, so no balance is shown rather than an invented one.
  const summary = {
    pending: requests.filter((r) => r.status === "Pending").length,
    approved: requests.filter((r) => r.status === "Approved").length,
    rejected: requests.filter((r) => r.status === "Rejected").length,
    daysTaken: requests
      .filter((r) => r.status === "Approved")
      .reduce((total, r) => total + (r.days || 0), 0),
  };

  const upcoming = holidays
    .filter((h) => h.date >= new Date().toISOString().slice(0, 10))
    .slice(0, 5);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 28, fontWeight: 600, color: COLORS.ink }}>
          Hi {employee?.name} 👋
        </div>
        <div style={{ fontFamily: FONTS.body, color: COLORS.inkSoft, fontSize: 14, marginTop: 2 }}>
          Here's where things stand.
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <Button onClick={() => navigate("/employee/apply")}>
          <Plus size={16} /> Apply Leave
        </Button>
      </div>

      <SectionLabel eyebrow="Your requests">Leave summary</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 32 }}>
        {[
          ["Pending", summary.pending, COLORS.gold],
          ["Approved", summary.approved, COLORS.teal],
          ["Rejected", summary.rejected, COLORS.clay],
          ["Days taken", summary.daysTaken, COLORS.navy],
        ].map(([label, val, color]) => (
          <Card key={label} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: FONTS.mono, fontWeight: 700, fontSize: 26, color }}>{val}</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginTop: 2 }}>{label}</div>
          </Card>
        ))}
      </div>

      <SectionLabel eyebrow="Activity">Recent requests</SectionLabel>
      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 32 }}>
        {requests.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", fontFamily: FONTS.body, color: COLORS.inkSoft, fontSize: 14 }}>
            No requests yet.
          </div>
        ) : (
          <RequestsTable
            requests={requests.slice(0, 3)}
            onSelect={() => navigate("/employee/requests")}
          />
        )}
      </Card>

      <SectionLabel eyebrow="Coming up">Upcoming holidays</SectionLabel>
      <Card>
        {upcoming.length === 0 ? (
          <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.inkSoft }}>
            No upcoming holidays in your region.
          </div>
        ) : (
          upcoming.map((h, i) => (
            <div
              key={h.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: i < upcoming.length - 1 ? `1px solid ${COLORS.line}` : "none",
                fontFamily: FONTS.body,
                fontSize: 14,
              }}
            >
              <span style={{ color: COLORS.inkSoft, fontFamily: FONTS.mono }}>{fmtDate(h.date)}</span>
              <span style={{ color: COLORS.ink }}>{h.name}</span>
            </div>
          ))
        )}
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginTop: 10 }}>
          <MapPin size={11} style={{ display: "inline", marginRight: 4, verticalAlign: -1 }} />
          Region: {employee?.region}
        </div>
      </Card>
    </div>
  );
}
