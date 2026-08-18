import React from "react";
import { COLORS, FONTS } from "../theme/colors";

export default function SectionLabel({ children, eyebrow }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {eyebrow && (
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: COLORS.gold,
            marginBottom: 4,
          }}
        >
          {eyebrow}
        </div>
      )}
      <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: 22, color: COLORS.ink }}>{children}</div>
    </div>
  );
}
