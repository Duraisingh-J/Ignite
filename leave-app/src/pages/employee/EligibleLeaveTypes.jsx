// The UI only ever renders LEAVE_TYPES — leave types an employee isn't
// eligible for (by employee type / region / tenure / policy) should be
// filtered out of that array server-side before it reaches this page.
import React from "react";
import { useNavigate } from "react-router-dom";
import { COLORS, FONTS } from "../../theme/colors";
import { EMPLOYEE, LEAVE_TYPES } from "../../data/mockData";
import { fmtDateFull } from "../../utils/dateHelpers";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SectionLabel from "../../components/SectionLabel";

export default function EligibleLeaveTypes() {
  const navigate = useNavigate();

  return (
    <div>
      <SectionLabel eyebrow="Configured for you">Eligible leave types</SectionLabel>
      <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.inkSoft, marginBottom: 20 }}>
        Based on your employee type, region, and tenure — {EMPLOYEE.role}, {EMPLOYEE.region}, joined {fmtDateFull(EMPLOYEE.joinDate)}.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
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
              <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.inkSoft, marginBottom: 12 }}>{lt.desc}</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.ink, marginBottom: 4 }}>
                Available: <span style={{ fontFamily: FONTS.mono, fontWeight: 700 }}>{lt.balance} days</span>
              </div>
              <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.inkSoft, marginBottom: 14 }}>
                Approval: {lt.approval}
              </div>
              {/* navigate with state so ApplyLeave can preselect this leave type */}
              <Button onClick={() => navigate("/employee/apply", { state: { preselect: lt.id } })}>Apply</Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
