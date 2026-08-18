import React from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MapPin } from "lucide-react";
import { COLORS, FONTS } from "../../theme/colors";
import { EMPLOYEE, LEAVE_TYPES, HOLIDAYS_2026 } from "../../data/mockData";
import { fmtDate } from "../../utils/dateHelpers";
import { useLeave } from "../../context/LeaveContext";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SectionLabel from "../../components/SectionLabel";
import LeaveDial from "../../components/LeaveDial";
import RequestsTable from "../../components/RequestsTable";

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { requests } = useLeave();

  const summary = {
    available: LEAVE_TYPES.reduce((a, l) => a + l.balance, 0),
    used: 5,
    pending: requests.filter((r) => r.status === "Pending").length,
    approved: requests.filter((r) => r.status === "Approved").length,
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 28, fontWeight: 600, color: COLORS.ink }}>
          Hi {EMPLOYEE.name} 👋
        </div>
        <div style={{ fontFamily: FONTS.body, color: COLORS.inkSoft, fontSize: 14, marginTop: 2 }}>
          Good afternoon — here's where things stand.
        </div>
      </div>

      <SectionLabel eyebrow="Balance">Available leave</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
        {LEAVE_TYPES.map((lt) => (
          <Card key={lt.id} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <LeaveDial leaveType={lt} />
            <div>
              <div style={{ fontFamily: FONTS.body, fontWeight: 600, fontSize: 15, color: COLORS.ink }}>{lt.label}</div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 13, color: COLORS.inkSoft, marginTop: 4 }}>
                {lt.accrual} days / month accrued
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ marginBottom: 32 }}>
        <Button onClick={() => navigate("/employee/apply")}>
          <Plus size={16} /> Apply Leave
        </Button>
      </div>

      <SectionLabel eyebrow="This period">Leave summary</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
        {[
          ["Available", summary.available, COLORS.navy],
          ["Used", summary.used, COLORS.inkSoft],
          ["Pending", summary.pending, COLORS.gold],
          ["Approved", summary.approved, COLORS.teal],
        ].map(([label, val, color]) => (
          <Card key={label} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: FONTS.mono, fontWeight: 700, fontSize: 26, color }}>{val}</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginTop: 2 }}>{label}</div>
          </Card>
        ))}
      </div>

      <SectionLabel eyebrow="Activity">Recent requests</SectionLabel>
      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 32 }}>
        <RequestsTable requests={requests.slice(0, 3)} onSelect={() => navigate("/employee/requests")} />
      </Card>

      <SectionLabel eyebrow="Coming up">Upcoming holidays</SectionLabel>
      <Card>
        {HOLIDAYS_2026.map((h, i) => (
          <div
            key={h.date}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: i < HOLIDAYS_2026.length - 1 ? `1px solid ${COLORS.line}` : "none",
              fontFamily: FONTS.body,
              fontSize: 14,
            }}
          >
            <span style={{ color: COLORS.inkSoft, fontFamily: FONTS.mono }}>{fmtDate(h.date)}</span>
            <span style={{ color: COLORS.ink }}>{h.name}</span>
          </div>
        ))}
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginTop: 8 }}>
          <MapPin size={11} style={{ display: "inline", marginRight: 4, verticalAlign: -1 }} />
          Region: {EMPLOYEE.region}
        </div>
      </Card>
    </div>
  );
}
