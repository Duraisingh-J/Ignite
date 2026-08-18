import React, { useEffect, useState } from 'react';
import ShimmerBlock from '../../components/ShimmerBlock';

import { AlertCircle } from "lucide-react";
import { COLORS, FONTS } from "../../theme/colors";
import { fetchAllLeaveTypes, fetchRegions } from "../../api/leaveApi";
import Card from "../../components/Card";
import SectionLabel from "../../components/SectionLabel";

export default function Policies() {
  const [types, setTypes] = useState([]);
  const [regions, setRegions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchAllLeaveTypes(), fetchRegions()])
      .then(([t, r]) => {
        setTypes(t);
        setRegions(r);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  
  if (error) {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: COLORS.claySoft, borderRadius: 8, padding: "12px 14px", maxWidth: 480 }}>
        <AlertCircle size={15} color={COLORS.clay} style={{ flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.clay }}>{error}</span>
      </div>
    );
  }

  const regionName = (id) => regions.find((r) => r.id === id)?.countryName ?? "—";
  const th = {
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: COLORS.inkSoft,
    padding: "10px 16px",
    whiteSpace: "nowrap",
  };

  return (
    <div>
      <SectionLabel eyebrow="Rules engine">Leave policies</SectionLabel>
      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONTS.body }}>
            <thead>
              <tr style={{ background: COLORS.paperDim }}>
                <th style={th}>Leave Type</th>
                <th style={th}>Region</th>
                <th style={th}>Paid</th>
                <th style={th}>Approval</th>
                <th style={th}>Active</th>
              </tr>
            </thead>
            <tbody>
              {types.map((lt) => (
                <tr key={lt.id} style={{ borderTop: `1px solid ${COLORS.line}` }}>
                  <td style={{ padding: "12px 16px", fontSize: 14, color: COLORS.ink, fontWeight: 500 }}>{lt.label}</td>
                  <td style={{ padding: "12px 16px", fontSize: 14, color: COLORS.inkSoft }}>{regionName(lt.regionId)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 14, color: COLORS.inkSoft }}>{lt.isPaid ? "Paid" : "Unpaid"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 14, color: COLORS.inkSoft }}>
                    {lt.requiresApproval ? "Manager approval" : "Auto-approved"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 14, color: COLORS.inkSoft }}>{lt.isActive ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Honest about what the current data model does not cover. */}
      <Card style={{ background: COLORS.paperDim, border: "none", maxWidth: 620 }}>
        <div style={{ fontFamily: FONTS.body, fontWeight: 700, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: COLORS.inkSoft, marginBottom: 8 }}>
          Not yet modelled
        </div>
        <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.ink, lineHeight: 1.6 }}>
          Accrual rates, carryover caps and expiry are <strong>not</strong> part of the current
          schema, so they are deliberately absent rather than shown as placeholder numbers.
          Adding them means an accrual ledger plus a policy table — see the roadmap in the
          project README.
        </div>
      </Card>
    </div>
  );
}
