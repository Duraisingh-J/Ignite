// Shared by ManagerDashboard (compact) and ManagerApprovals (full actions).
import React from "react";
import { ChevronRight, Check, X } from "lucide-react";
import { COLORS, FONTS } from "../theme/colors";
import { fmtDate } from "../utils/dateHelpers";
import Card from "./Card";
import Badge from "./Badge";
import Button from "./Button";

export default function ApprovalCard({ a, onOpen, onApprove, onReject, compact, busy }) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontFamily: FONTS.body, fontWeight: 700, fontSize: 15, color: COLORS.ink }}>{a.employee}</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.inkSoft, marginTop: 2 }}>{a.type}</div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.inkSoft, marginTop: 4 }}>
            {fmtDate(a.start)} – {fmtDate(a.end)} · {a.days} working day{a.days !== 1 ? "s" : ""}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <Badge status={a.status} />
          {/* Only meaningful on a multi-tier request. */}
          {a.totalSteps > 1 && (
            <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.inkSoft, marginTop: 4 }}>
              approval {a.stepOrder} of {a.totalSteps}
            </div>
          )}
        </div>
      </div>

      {/* The server's day calculation, so a manager can see why it's N days. */}
      {a.breakdown && (
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginTop: 10 }}>
          {a.breakdown.calendarDays} calendar days − {a.breakdown.weekendDays} weekend
          {a.breakdown.holidayDays > 0 ? ` − ${a.breakdown.holidayDays} holiday` : ""} ={" "}
          <span style={{ fontFamily: FONTS.mono, color: COLORS.ink, fontWeight: 600 }}>
            {a.breakdown.chargeableDays}
          </span>{" "}
          chargeable
        </div>
      )}

      <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.inkSoft, marginTop: 6 }}>
        Reason: {a.reason || "—"}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {compact ? (
          <Button variant="ghost" onClick={onOpen} style={{ fontSize: 13, padding: "7px 14px" }}>
            View Details <ChevronRight size={13} />
          </Button>
        ) : (
          <>
            <Button variant="success" onClick={onApprove} disabled={busy}>
              <Check size={14} /> Approve
            </Button>
            <Button variant="danger" onClick={onReject} disabled={busy}>
              <X size={14} /> Reject
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
