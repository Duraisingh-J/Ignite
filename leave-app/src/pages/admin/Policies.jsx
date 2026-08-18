import React from "react";
import { COLORS, FONTS } from "../../theme/colors";
import { LEAVE_TYPES } from "../../data/mockData";
import Card from "../../components/Card";
import SectionLabel from "../../components/SectionLabel";

export default function AdminPolicies() {
  return (
    <div>
      <SectionLabel eyebrow="Rules engine">Accrual policies</SectionLabel>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONTS.body }}>
          <thead>
            <tr style={{ background: COLORS.paperDim }}>
              {["Leave Type", "Accrual", "Applies To"].map((h) => (
                <th key={h} style={{ textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: COLORS.inkSoft, padding: "10px 16px" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LEAVE_TYPES.map((lt) => (
              <tr key={lt.id} style={{ borderTop: `1px solid ${COLORS.line}` }}>
                <td style={{ padding: "12px 16px", fontSize: 14 }}>{lt.label}</td>
                <td style={{ padding: "12px 16px", fontSize: 14, fontFamily: FONTS.mono }}>{lt.accrual}/month</td>
                <td style={{ padding: "12px 16px", fontSize: 14, color: COLORS.inkSoft }}>Full-Time · All regions</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
