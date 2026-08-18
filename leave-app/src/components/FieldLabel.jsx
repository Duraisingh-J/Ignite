import React from "react";
import { COLORS, FONTS } from "../theme/colors";

export default function FieldLabel({ children }) {
  return (
    <div style={{ fontFamily: FONTS.body, fontSize: 12, fontWeight: 600, color: COLORS.inkSoft, marginBottom: 6 }}>
      {children}
    </div>
  );
}
