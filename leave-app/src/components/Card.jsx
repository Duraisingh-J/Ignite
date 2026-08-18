import React from "react";
import { COLORS } from "../theme/colors";

export default function Card({ children, style, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 14,
        padding: 20,
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.15s ease",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.boxShadow = "0 4px 16px rgba(27,36,48,0.08)";
      }}
      onMouseLeave={(e) => {
        if (onClick) e.currentTarget.style.boxShadow = "none";
      }}
    >
      {children}
    </div>
  );
}
