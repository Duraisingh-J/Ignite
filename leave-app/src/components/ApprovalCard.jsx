// Shared by ManagerDashboard (compact) and ManagerApprovals (full actions).
import React from "react";
import { ChevronRight, Check, X } from "lucide-react";
import { COLORS, FONTS } from "../theme/colors";
import { fmtDate } from "../utils/dateHelpers";
import Card from "./Card";
import Badge from "./Badge";
import Button from "./Button";

export default function ApprovalCard({ a, onOpen, onApprove, onReject, compact }) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: FONTS.body, fontWeight: 700, fontSize: 15, color: COLORS.ink }}>{a.employee}</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.inkSoft, marginTop: 2 }}>{a.type}</div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.inkSoft, marginTop: 4 }}>
            {fmtDate(a.start)} – {fmtDate(a.end)} · {a.days} days
          </div>
        </div>
        <Badge status="Pending" />
      </div>
      <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.ink, marginTop: 10 }}>
        Balance: <span style={{ fontFamily: FONTS.mono }}>{a.balance} days</span>
      </div>
      <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.inkSoft, marginTop: 2 }}>Reason: {a.reason}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {compact ? (
          <Button variant="ghost" onClick={onOpen} style={{ fontSize: 13, padding: "7px 14px" }}>
            View Details <ChevronRight size={13} />
          </Button>
        ) : (
          <>
            <Button variant="success" onClick={onApprove}>
              <Check size={14} /> Approve
            </Button>
            <Button variant="danger" onClick={onReject}>
              <X size={14} /> Reject
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
