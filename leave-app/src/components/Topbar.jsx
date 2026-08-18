import React from "react";
import { Link } from "react-router-dom";
import { Briefcase, Bell } from "lucide-react";
import { COLORS, FONTS } from "../theme/colors";

// title: "Employee" | "Manager" | "Admin"
// avatarLetter: single letter shown in the avatar circle
// eligibleLink: optional { to } — shows the "Eligible Leave Types" quick link (employee only)
export default function Topbar({ title, avatarLetter, eligibleLink }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 32px",
        borderBottom: `1px solid ${COLORS.line}`,
        background: COLORS.card,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: FONTS.body, fontSize: 13, color: COLORS.inkSoft }}>
        <Briefcase size={14} />
        {title}
        {eligibleLink && (
          <>
            <span style={{ color: COLORS.line }}>·</span>
            <Link
              to={eligibleLink.to}
              style={{ color: COLORS.navy, fontFamily: FONTS.body, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
            >
              Eligible Leave Types
            </Link>
          </>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Bell size={17} color={COLORS.inkSoft} />
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: COLORS.goldSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONTS.display,
            fontWeight: 600,
            fontSize: 13,
            color: COLORS.gold,
          }}
        >
          {avatarLetter}
        </div>
      </div>
    </div>
  );
}
