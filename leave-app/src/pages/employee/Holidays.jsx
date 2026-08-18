import React from "react";
import { Repeat, Sun } from "lucide-react";
import { COLORS, FONTS } from "../../theme/colors";
import { fmtDateFull } from "../../utils/dateHelpers";
import { useLeave } from "../../context/LeaveContext";
import Card from "../../components/Card";
import SectionLabel from "../../components/SectionLabel";

export default function Holidays() {
  const { employee, holidays, loading } = useLeave();

  if (loading) {
    return <div style={{ fontFamily: FONTS.body, color: COLORS.inkSoft }}>Loading…</div>;
  }

  return (
    <div>
      <SectionLabel eyebrow={`Region: ${employee?.region ?? "—"}`}>Holiday calendar</SectionLabel>
      <Card>
        {holidays.length === 0 ? (
          <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.inkSoft, padding: "8px 0" }}>
            No holidays configured for this region.
          </div>
        ) : (
          holidays.map((h, i) => (
            <div
              key={h.id ?? h.date}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 0",
                borderBottom: i < holidays.length - 1 ? `1px solid ${COLORS.line}` : "none",
              }}
            >
              <div style={{ background: COLORS.goldSoft, borderRadius: 8, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Sun size={18} color={COLORS.gold} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONTS.body, fontWeight: 600, fontSize: 14, color: COLORS.ink }}>{h.name}</div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.inkSoft }}>{fmtDateFull(h.date)}</div>
              </div>
              {h.recurrence === "ANNUAL" && (
                <span
                  title="Repeats every year"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, background: COLORS.tealSoft, color: COLORS.teal, borderRadius: 999, padding: "3px 9px", fontFamily: FONTS.body, fontSize: 11, fontWeight: 600, flexShrink: 0 }}
                >
                  <Repeat size={11} /> Yearly
                </span>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
