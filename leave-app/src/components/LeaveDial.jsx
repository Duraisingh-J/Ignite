// Signature visual for the app: a sundial-style ring standing in for a
// leave-type balance, in place of a generic progress bar.
//
// The ring is filled against the policy's max_balance — the real ceiling at
// which accrual stops. The earlier version used `balance + 6` as an invented
// denominator, so the ring was always roughly the same size regardless of the
// number underneath it, and carried no information at all.
import React from "react";
import { COLORS, FONTS } from "../theme/colors";

export default function LeaveDial({
  label,
  balance,
  maxBalance,
  reserved = 0,
  color = COLORS.navy,
  size = 96,
}) {
  const value = Number(balance) || 0;
  const cap = Number(maxBalance) || 0;
  // With no cap configured there is nothing to fill against, so the ring shows
  // a full circle and the number carries the meaning on its own.
  const pct = cap > 0 ? Math.min(Math.max(value / cap, 0), 1) : 1;

  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const atCap = cap > 0 && value >= cap;

  return (
    // The label lives on the container rather than in a visually-hidden span:
    // this app styles inline and has no utility stylesheet, so a `sr-only`
    // class would not be hidden — it would simply render.
    <div
      role="img"
      aria-label={`${label}: ${value} days available${cap ? ` of a ${cap} day cap` : ""}`}
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={COLORS.line} strokeWidth={6} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={atCap ? COLORS.gold : color}
          strokeWidth={6}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}
      >
        <div style={{ fontFamily: FONTS.mono, fontWeight: 700, fontSize: 21, color: COLORS.ink, lineHeight: 1.1 }}>
          {value}
        </div>
        {cap > 0 && (
          <div style={{ fontFamily: FONTS.mono, fontSize: 10.5, color: COLORS.inkSoft }}>
            of {cap}
          </div>
        )}
        {reserved > 0 && (
          <div style={{ fontFamily: FONTS.body, fontSize: 9.5, color: COLORS.gold, marginTop: 1 }}>
            {reserved} booked
          </div>
        )}
      </div>
    </div>
  );
}
