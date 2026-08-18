import React from 'react';
import ShimmerBlock from '../../components/ShimmerBlock';

import { COLORS, FONTS } from "../../theme/colors";
import { fmtDateFull } from "../../utils/dateHelpers";
import { useLeave } from "../../context/LeaveContext";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import SectionLabel from "../../components/SectionLabel";

export default function Team() {
  const { team, loading } = useLeave();

  

  return (
    <div>
      <SectionLabel eyebrow={`${team.length} direct reports`}>Team</SectionLabel>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 20 }}>
            <ShimmerBlock height={50} style={{ marginBottom: 12 }} />
            <ShimmerBlock height={50} style={{ marginBottom: 12 }} />
            <ShimmerBlock height={50} />
          </div>
        ) : team.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", fontFamily: FONTS.body, color: COLORS.inkSoft, fontSize: 14 }}>
            No direct reports.
          </div>
        ) : (
          team.map((m, i) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "14px 20px",
                borderBottom: i < team.length - 1 ? `1px solid ${COLORS.line}` : "none",
              }}
            >
              <div>
                <div style={{ fontFamily: FONTS.body, fontWeight: 600, fontSize: 14, color: COLORS.ink }}>
                  {m.name}
                </div>
                <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft }}>
                  {m.email} · joined {fmtDateFull(m.joinDate)}
                </div>
              </div>
              {m.onLeave ? (
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <Badge status="Approved" />
                  <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.inkSoft, marginTop: 3 }}>
                    until {fmtDateFull(m.leaveUntil)}
                  </div>
                </div>
              ) : (
                <span style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, flexShrink: 0 }}>
                  In office
                </span>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
