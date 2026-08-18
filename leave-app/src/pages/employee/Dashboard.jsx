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
import LeaveDial from "../../components/LeaveDial";

// Fixed order, assigned by position — never cycled, so a leave type keeps its
// colour as types are added or removed.
const DIAL_COLORS = [COLORS.navy, COLORS.teal, COLORS.clay, COLORS.gold];

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { employee, requests, holidays, balances, loading } = useLeave();

  if (loading) {
    return <div style={{ fontFamily: FONTS.body, color: COLORS.inkSoft }}>Loading…</div>;
  }

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

  // A type with no accrual policy has no balance to show, so it is left out
  // rather than rendered as a zero that looks like an exhausted allowance.
  const withPolicy = (balances ?? []).filter((b) => b.policyName);
  // Nothing accrued yet is a different state from nothing left: this employee
  // has policies but the runner has not been past. Saying so beats three dials
  // reading zero, which looks like an exhausted allowance.
  const notYetAccrued =
    withPolicy.length > 0 && withPolicy.every((b) => Number(b.accrued) === 0);

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

      {withPolicy.length > 0 && (
        <>
          <SectionLabel eyebrow="Balance">Available leave</SectionLabel>

          {notYetAccrued && (
            <Card style={{ background: COLORS.paperDim, border: "none", marginBottom: 16 }}>
              <div style={{ fontFamily: FONTS.body, fontSize: 13.5, color: COLORS.ink, marginBottom: 8 }}>
                No leave has accrued for {employee?.name} yet.
              </div>
              <div style={{ fontFamily: FONTS.body, fontSize: 12.5, color: COLORS.inkSoft, marginBottom: 12 }}>
                Policies are configured, but the accrual runner has not been past
                this employee. Run it to fill in every period since they joined.
              </div>
              <Button variant="ghost" onClick={() => navigate("/employee/balance")} style={{ fontSize: 13 }}>
                Go to Balance to run it
              </Button>
            </Card>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
              marginBottom: 10,
            }}
          >
            {withPolicy.map((b, i) => (
              <Card key={b.leaveTypeId} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <LeaveDial
                  label={b.leaveTypeName}
                  balance={b.displayBalance}
                  maxBalance={b.maxBalance}
                  reserved={Number(b.bookedAhead) || 0}
                  color={DIAL_COLORS[i % DIAL_COLORS.length]}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: FONTS.body, fontWeight: 600, fontSize: 15, color: COLORS.ink }}>
                    {b.leaveTypeName}
                  </div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.inkSoft, marginTop: 3 }}>
                    {b.available} to book
                  </div>
                  {Number(b.bookedAhead) > 0 && (
                    <div style={{ fontFamily: FONTS.body, fontSize: 11.5, color: COLORS.gold, marginTop: 2 }}>
                      {b.bookedAhead} booked ahead
                      {Number(b.reserved) > 0 && ` · ${b.reserved} awaiting approval`}
                    </div>
                  )}
                  <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.inkSoft, marginTop: 4 }}>
                    {b.accrued} accrued · {b.used} taken
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginBottom: 32 }}>
            The ring fills against the point at which accrual stops.{" "}
            <button
              onClick={() => navigate("/employee/balance")}
              style={{ background: "none", border: "none", padding: 0, color: COLORS.navy, fontFamily: FONTS.body, fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
            >
              See how each balance was reached
            </button>
          </div>
        </>
      )}

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
          <RequestsTable requests={requests.slice(0, 3)} onSelect={() => navigate("/employee/requests")} />
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
                display: "flex", justifyContent: "space-between", padding: "10px 0",
                borderBottom: i < upcoming.length - 1 ? `1px solid ${COLORS.line}` : "none",
                fontFamily: FONTS.body, fontSize: 14,
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
