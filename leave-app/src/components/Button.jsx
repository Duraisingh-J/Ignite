import React from "react";
import { COLORS, FONTS } from "../theme/colors";

// variant: "primary" | "ghost" | "success" | "danger"
export default function Button({ children, onClick, variant = "primary", style, disabled }) {
  const variants = {
    primary: { background: COLORS.navy, color: "#fff", border: "none" },
    ghost: { background: "transparent", color: COLORS.navy, border: `1px solid ${COLORS.line}` },
    success: { background: COLORS.teal, color: "#fff", border: "none" },
    danger: { background: "transparent", color: COLORS.clay, border: `1px solid ${COLORS.claySoft}` },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: FONTS.body,
        fontWeight: 600,
        fontSize: 14,
        padding: "10px 18px",
        borderRadius: 9,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}
