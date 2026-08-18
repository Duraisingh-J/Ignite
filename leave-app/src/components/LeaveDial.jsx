// Signature visual for the app: a sundial-style ring standing in for a
// leave-type balance, in place of a generic progress bar.
import React from "react";
import { COLORS, FONTS } from "../theme/colors";

export default function LeaveDial({ leaveType, size = 96 }) {
  const total = leaveType.balance + 6; // headroom for the ring's visual scale
  const pct = Math.min(leaveType.balance / total, 1);
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const Icon = leaveType.icon;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={COLORS.line} strokeWidth={6} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={leaveType.color}
          strokeWidth={6}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color={leaveType.color} strokeWidth={2} />
        <div style={{ fontFamily: FONTS.mono, fontWeight: 700, fontSize: 20, color: COLORS.ink, marginTop: 2 }}>
          {leaveType.balance}
        </div>
      </div>
    </div>
  );
}
