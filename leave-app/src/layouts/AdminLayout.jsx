import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Home, Users, Layers, Settings, CalendarDays, Globe, ShieldCheck, TrendingUp, LogOut } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { COLORS, FONTS } from "../theme/colors";
import { useAuth } from "../auth/AuthContext";

const NAV_ITEMS = [
  { to: "", label: "Dashboard", icon: Home },
  { to: "employees", label: "Employees", icon: Users },
  { to: "types", label: "Leave Types", icon: Layers },
  { to: "policies", label: "Policies", icon: Settings },
  { to: "accrual", label: "Accrual", icon: TrendingUp },
  { to: "regions", label: "Regions", icon: Globe },
  { to: "roles", label: "Roles", icon: ShieldCheck },
  { to: "holidays", label: "Holidays", icon: CalendarDays },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { admin, signOut } = useAuth();

  function handleSignOut() {
    signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.paper }}>
      <Sidebar items={NAV_ITEMS} basePath="/admin" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Tenant-wide configuration — none of it varies by who is signed in. */}
        <Topbar title="Admin" avatarLetter={(admin?.email?.[0] || "A").toUpperCase()} hideSwitcher />

        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 16, padding: "10px 32px",
            borderBottom: `1px solid ${COLORS.line}`,
            background: COLORS.paperDim,
          }}
        >
          <div style={{ fontFamily: FONTS.body, fontSize: 12.5, color: COLORS.inkSoft, minWidth: 0 }}>
            {admin?.orgName && (
              <>
                <span style={{ fontWeight: 700, color: COLORS.ink }}>{admin.orgName}</span>
                {admin.email && <span> · {admin.email}</span>}
              </>
            )}
          </div>
          <button
              onClick={handleSignOut}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "none", border: `1px solid ${COLORS.line}`,
                borderRadius: 7, padding: "5px 11px",
                fontFamily: FONTS.body, fontSize: 12.5, fontWeight: 600,
                color: COLORS.inkSoft, cursor: "pointer", flexShrink: 0,
              }}
            >
            <LogOut size={13} /> Sign out
          </button>
        </div>

        <div style={{ padding: 32, flex: 1, overflowY: "auto" }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
