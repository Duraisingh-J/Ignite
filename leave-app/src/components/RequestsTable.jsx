import React from "react";
import { COLORS, FONTS } from "../theme/colors";
import Badge from "./Badge";
import { fmtDate } from "../utils/dateHelpers";

// requests: array of request objects. onSelect: (request) => void
export default function RequestsTable({ requests, onSelect }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONTS.body }}>
      <thead>
        <tr style={{ background: COLORS.paperDim }}>
          {["Type", "Dates", "Days", "Status"].map((h) => (
            <th
              key={h}
              style={{
                textAlign: "left",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                color: COLORS.inkSoft,
                padding: "10px 16px",
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {requests.map((r) => (
          <tr
            key={r.id}
            onClick={() => onSelect && onSelect(r)}
            style={{ cursor: onSelect ? "pointer" : "default", borderTop: `1px solid ${COLORS.line}` }}
            onMouseEnter={(e) => onSelect && (e.currentTarget.style.background = COLORS.paperDim)}
            onMouseLeave={(e) => onSelect && (e.currentTarget.style.background = "transparent")}
          >
            <td style={{ padding: "12px 16px", fontSize: 14, color: COLORS.ink, fontWeight: 500 }}>{r.type}</td>
            <td style={{ padding: "12px 16px", fontSize: 14, color: COLORS.inkSoft }}>
              {r.start === r.end ? fmtDate(r.start) : `${fmtDate(r.start)} – ${fmtDate(r.end)}`}
            </td>
            <td style={{ padding: "12px 16px", fontSize: 14, fontFamily: FONTS.mono, color: COLORS.ink }}>{r.days}</td>
            <td style={{ padding: "12px 16px" }}>
              <Badge status={r.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
