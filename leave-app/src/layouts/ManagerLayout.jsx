import React from "react";
import { Outlet } from "react-router-dom";
import { Home, CheckSquare, Users, Calendar } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { COLORS } from "../theme/colors";

const NAV_ITEMS = [
  { to: "", label: "Dashboard", icon: Home },
  { to: "approvals", label: "Approvals", icon: CheckSquare },
  { to: "team", label: "Team", icon: Users },
  { to: "calendar", label: "Team Calendar", icon: Calendar },
];

export default function ManagerLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.paper }}>
      <Sidebar items={NAV_ITEMS} basePath="/manager" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Only people who actually have reports can approve anything here. */}
        <Topbar title="Manager" avatarLetter="P" managersOnly />
        <div style={{ padding: 32, flex: 1, overflowY: "auto" }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
