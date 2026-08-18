import React from "react";
import { Outlet } from "react-router-dom";
import { Home, Users, Layers, Settings, CalendarDays } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { COLORS } from "../theme/colors";

const NAV_ITEMS = [
  { to: "", label: "Dashboard", icon: Home },
  { to: "employees", label: "Employees", icon: Users },
  { to: "types", label: "Leave Types", icon: Layers },
  { to: "policies", label: "Policies", icon: Settings },
  { to: "holidays", label: "Holidays", icon: CalendarDays },
];

export default function AdminLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.paper }}>
      <Sidebar items={NAV_ITEMS} basePath="/admin" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Topbar title="Admin" avatarLetter="S" />
        <div style={{ padding: 32, flex: 1, overflowY: "auto" }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
