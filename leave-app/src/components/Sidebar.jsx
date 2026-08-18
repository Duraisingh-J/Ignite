import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Sun, Shuffle } from "lucide-react";
import { COLORS, FONTS } from "../theme/colors";

// items: [{ to, label, icon }] — `to` is relative to the role's base path (e.g. "" for index, "apply" for /employee/apply)
export default function Sidebar({ items, basePath }) {
  const navigate = useNavigate();

  return (
    <div style={{ width: 220, background: COLORS.navyDeep, display: "flex", flexDirection: "column", padding: "24px 14px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 10px", marginBottom: 30 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: COLORS.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sun size={15} color={COLORS.navyDeep} strokeWidth={2.5} />
        </div>
        <span style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: 17, color: "#fff" }}>Meridian</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.to === "" ? basePath : `${basePath}/${item.to}`}
              end={item.to === ""}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 8,
                textDecoration: "none",
                background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                fontFamily: FONTS.body,
                fontSize: 13.5,
                fontWeight: isActive ? 600 : 500,
              })}
            >
              <Icon size={16} />
              {item.label}
            </NavLink>
          );
        })}
      </div>

      {/* Remove this block once real auth/role routing replaces the demo switcher */}
      <div style={{ marginTop: "auto" }}>
        <div style={{ fontFamily: FONTS.body, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", padding: "0 10px", marginBottom: 8 }}>
          Demo · switch role
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {["employee", "manager", "admin"].map((r) => (
            <button
              key={r}
              onClick={() => navigate(`/${r}`)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 12px",
                borderRadius: 8,
                border: "none",
                background: basePath === `/${r}` ? COLORS.gold : "transparent",
                color: basePath === `/${r}` ? COLORS.navyDeep : "rgba(255,255,255,0.55)",
                fontFamily: FONTS.body,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
                textAlign: "left",
              }}
            >
              <Shuffle size={12} />
              {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
