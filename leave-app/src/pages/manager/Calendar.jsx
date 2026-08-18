import React from "react";
import { COLORS, FONTS } from "../../theme/colors";
import { fmtDateFull } from "../../utils/dateHelpers";
import { useLeave } from "../../context/LeaveContext";
import Card from "../../components/Card";
import SectionLabel from "../../components/SectionLabel";

export default function Calendar() {
  const { onLeave, loading } = useLeave();

  if (loading) {
    return <div style={{ fontFamily: FONTS.body, color: COLORS.inkSoft }}>Loading…</div>;
  }

  return (
    <div>
      <SectionLabel eyebrow="Today">Team calendar</SectionLabel>
      <Card>
        <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.inkSoft, marginBottom: 12 }}>
          Who is out, at a glance. Only approved leave appears here.
        </div>
        {onLeave.length === 0 ? (
          <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.inkSoft, padding: "8px 0" }}>
            Nobody is on approved leave today.
          </div>
        ) : (
          onLeave.map((m) => (
            <div
              key={m.id}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", flexWrap: "wrap" }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.teal, flexShrink: 0 }} />
              <span style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.ink }}>{m.employee}</span>
              <span style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft }}>
                — {m.type}, {fmtDateFull(m.start)} to {fmtDateFull(m.end)}
              </span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
