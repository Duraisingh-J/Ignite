import React from "react";
import { COLORS, FONTS } from "../theme/colors";

export default function Badge({ status }) {
  const map = {
    Pending: { bg: COLORS.goldSoft, fg: "#8A5E10" },
    Approved: { bg: COLORS.tealSoft, fg: COLORS.teal },
    Rejected: { bg: COLORS.claySoft, fg: COLORS.clay },
    Cancelled: { bg: "#EDEDED", fg: "#6B6B6B" },
  };
  const c = map[status] || map.Cancelled;
  return (
    <span
      style={{
        background: c.bg,
        color: c.fg,
        fontFamily: FONTS.body,
        fontWeight: 600,
        fontSize: 12,
        padding: "3px 10px",
        borderRadius: 999,
        letterSpacing: 0.2,
      }}
    >
      {status}
    </span>
  );
}
