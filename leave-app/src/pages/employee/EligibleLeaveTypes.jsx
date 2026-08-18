import React from "react";
import { useNavigate } from "react-router-dom";
import { COLORS, FONTS } from "../../theme/colors";
import { fmtDateFull } from "../../utils/dateHelpers";
import { useLeave } from "../../context/LeaveContext";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SectionLabel from "../../components/SectionLabel";

export default function EligibleLeaveTypes() {
  const navigate = useNavigate();
  const { employee, leaveTypes, loading } = useLeave();

  if (loading) {
    return <div style={{ fontFamily: FONTS.body, color: COLORS.inkSoft }}>Loading…</div>;
  }

  return (
    <div>
      <SectionLabel eyebrow="Configured for you">Eligible leave types</SectionLabel>
      <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.inkSoft, marginBottom: 20 }}>
        Scoped to your region — {employee?.region}, joined {fmtDateFull(employee?.joinDate)}.
        The server returns only the active leave types configured for that region.
      </div>

      {leaveTypes.length === 0 ? (
        <Card style={{ fontFamily: FONTS.body, color: COLORS.inkSoft }}>
          No leave types are configured for your region yet.
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {leaveTypes.map((lt) => (
            <Card key={lt.id}>
              <div style={{ fontFamily: FONTS.body, fontWeight: 600, fontSize: 15, marginBottom: 10, color: COLORS.ink }}>
                {lt.label}
              </div>
              <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.inkSoft, marginBottom: 4 }}>
                {lt.isPaid ? "Paid leave" : "Unpaid leave"}
              </div>
              <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.inkSoft, marginBottom: 14 }}>
                {lt.requiresApproval ? "Requires manager approval" : "Auto-approved"}
              </div>
              <Button onClick={() => navigate("/employee/apply", { state: { preselect: lt.id } })}>
                Apply
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
