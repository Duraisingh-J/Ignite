import React from "react";
import { COLORS, FONTS } from "../theme/colors";
import { Check } from "lucide-react";

// steps: [{ label, done, comment? }]
export default function Stepper({ steps }) {
  return (
    <div>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: s.done ? COLORS.teal : COLORS.paperDim,
                border: s.done ? "none" : `2px solid ${COLORS.line}`,
                flexShrink: 0,
              }}
            >
              {s.done && <Check size={12} color="#fff" strokeWidth={3} />}
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 2, flex: 1, minHeight: 24, background: s.done ? COLORS.teal : COLORS.line }} />
            )}
          </div>
          <div style={{ paddingBottom: 20 }}>
            <div style={{ fontFamily: FONTS.body, fontWeight: s.done ? 600 : 500, fontSize: 14, color: s.done ? COLORS.ink : COLORS.inkSoft }}>
              {s.label}
            </div>
            {s.comment && (
              <div style={{ fontFamily: FONTS.display, fontStyle: "italic", fontSize: 13, color: COLORS.inkSoft, marginTop: 4 }}>
                "{s.comment}"
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
