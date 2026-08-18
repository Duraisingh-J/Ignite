import React from "react";
import { Check, Clock, Minus, X } from "lucide-react";
import { COLORS, FONTS } from "../theme/colors";

// steps: [{ label, state, comment?, meta? }]
// state: "APPROVED" | "REJECTED" | "SKIPPED" | "PENDING"
// `done: true` is still accepted as shorthand for APPROVED.
const VISUALS = {
  APPROVED: { bg: COLORS.teal, fg: "#fff", Icon: Check, line: COLORS.teal, strong: true },
  REJECTED: { bg: COLORS.clay, fg: "#fff", Icon: X, line: COLORS.clay, strong: true },
  SKIPPED: { bg: "#E3E1DA", fg: "#8A8A82", Icon: Minus, line: COLORS.line, strong: false },
  PENDING: { bg: COLORS.paperDim, fg: COLORS.inkSoft, Icon: Clock, line: COLORS.line, strong: false },
};

export default function Stepper({ steps }) {
  return (
    <div>
      {steps.map((s, i) => {
        const state = s.state ?? (s.done ? "APPROVED" : "PENDING");
        const v = VISUALS[state] ?? VISUALS.PENDING;
        const { Icon } = v;
        const isLast = i === steps.length - 1;
        return (
          <div key={s.id ?? i} style={{ display: "flex", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: v.bg,
                  border: state === "PENDING" ? `2px solid ${COLORS.line}` : "none",
                  flexShrink: 0,
                }}
              >
                <Icon size={12} color={v.fg} strokeWidth={3} />
              </div>
              {!isLast && (
                <div style={{ width: 2, flex: 1, minHeight: 24, background: v.line }} />
              )}
            </div>
            <div style={{ paddingBottom: isLast ? 0 : 20 }}>
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontWeight: v.strong ? 600 : 500,
                  fontSize: 14,
                  color: v.strong ? COLORS.ink : COLORS.inkSoft,
                }}
              >
                {s.label}
              </div>
              {s.meta && (
                <div style={{ fontFamily: FONTS.mono, fontSize: 11.5, color: COLORS.inkSoft, marginTop: 2 }}>
                  {s.meta}
                </div>
              )}
              {s.comment && (
                <div style={{ fontFamily: FONTS.display, fontStyle: "italic", fontSize: 13, color: COLORS.inkSoft, marginTop: 4 }}>
                  &ldquo;{s.comment}&rdquo;
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
