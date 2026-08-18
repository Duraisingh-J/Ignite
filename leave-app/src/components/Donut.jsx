import React, { useState } from "react";
import { COLORS, FONTS } from "../theme/colors";

/**
 * Part-to-whole ring with a legend.
 *
 * Palettes were validated with the dataviz colour checker rather than picked by
 * eye: the raw brand hues failed as a categorical set (navy read as grey, and
 * clay against gold sat at ΔE 14.5 — below the normal-vision floor). These
 * steps pass lightness, chroma, CVD separation and the normal-vision floor.
 *
 * Identity is never carried by colour alone: every slice is also named and
 * numbered in the legend, which doubles as the table view.
 */

// Reserved status palette — these encode state, not identity, and are never
// reused as "series 4".
export const STATUS_COLORS = {
  APPROVED: COLORS.teal,
  PENDING: COLORS.gold,
  REJECTED: COLORS.clay,
  CANCELLED: "#8A8F98",
};

// Categorical: fixed order, assigned by position, never cycled.
export const CATEGORICAL = ["#3D6FC4", "#D99420", "#1F8F76", "#C44A2C", "#8257B8"];

const SIZE = 168;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;
const GAP = 2; // px of surface between segments

export default function Donut({ title, slices, colors, centerLabel }) {
  const [hover, setHover] = useState(null);

  const total = slices.reduce((sum, s) => sum + s.value, 0);
  // A zero-value slice has no arc to draw, but still belongs in the legend —
  // "United Kingdom: 0" is information, not an absence.
  const drawn = slices.filter((s) => s.value > 0);

  const colorFor = (slice, i) =>
    typeof colors === "function" ? colors(slice, i) : colors[i % colors.length];

  let offset = 0;
  const arcs = drawn.map((s, i) => {
    const frac = s.value / total;
    const len = frac * CIRC;
    // Never let the gap eat a genuinely tiny slice entirely.
    const dash = Math.max(len - GAP, 1);
    const arc = { ...s, dash, offset, color: colorFor(s, slices.indexOf(s)), frac };
    offset += len;
    return arc;
  });

  if (total === 0) {
    return (
      <div style={card}>
        <div style={titleStyle}>{title}</div>
        <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.inkSoft, padding: "28px 0" }}>
          Nothing recorded yet.
        </div>
      </div>
    );
  }

  const active = hover !== null ? arcs[hover] : null;

  return (
    <div style={card}>
      <div style={titleStyle}>{title}</div>

      <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: SIZE, height: SIZE, flexShrink: 0 }}>
          <svg width={SIZE} height={SIZE} style={{ transform: "rotate(-90deg)" }} role="img"
               aria-label={`${title}: ${slices.map((s) => `${s.label} ${s.value}`).join(", ")}`}>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none"
                    stroke={COLORS.paperDim} strokeWidth={STROKE} />
            {arcs.map((a, i) => (
              <circle
                key={a.label}
                cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
                fill="none"
                stroke={a.color}
                strokeWidth={hover === i ? STROKE + 4 : STROKE}
                strokeDasharray={`${a.dash} ${CIRC - a.dash}`}
                strokeDashoffset={-a.offset}
                style={{ transition: "stroke-width .12s ease", cursor: "default" }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            ))}
          </svg>

          {/* Centre carries the headline number, or the hovered slice. */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", pointerEvents: "none", padding: 12 }}>
            <div style={{ fontFamily: FONTS.mono, fontWeight: 700, fontSize: 28, color: COLORS.ink,
                          fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
              {active ? active.value : total}
            </div>
            <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.inkSoft,
                          textAlign: "center", lineHeight: 1.3, marginTop: 2 }}>
              {active ? `${Math.round(active.frac * 100)}% ${active.label}` : centerLabel}
            </div>
          </div>
        </div>

        {/* Legend doubles as the table view: every slice named and numbered. */}
        <div style={{ flex: 1, minWidth: 150, display: "flex", flexDirection: "column", gap: 5 }}>
          {slices.map((s, i) => {
            const idx = arcs.findIndex((a) => a.label === s.label);
            return (
              <div
                key={s.label}
                onMouseEnter={() => idx >= 0 && setHover(idx)}
                onMouseLeave={() => setHover(null)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  fontFamily: FONTS.body, fontSize: 12.5,
                  opacity: s.value === 0 ? 0.5 : 1,
                  color: hover === idx && idx >= 0 ? COLORS.ink : COLORS.inkSoft,
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0,
                               background: s.value === 0 ? COLORS.line : colorFor(s, i) }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.label}
                </span>
                <span style={{ fontFamily: FONTS.mono, fontWeight: 600, color: COLORS.ink,
                               fontVariantNumeric: "tabular-nums" }}>
                  {s.value}
                </span>
                <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.inkSoft,
                               width: 34, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {total ? Math.round((s.value / total) * 100) : 0}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const card = {
  background: COLORS.card,
  border: `1px solid ${COLORS.line}`,
  borderRadius: 14,
  padding: 20,
};

const titleStyle = {
  fontFamily: FONTS.body,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.9,
  textTransform: "uppercase",
  color: COLORS.inkSoft,
  marginBottom: 16,
};
