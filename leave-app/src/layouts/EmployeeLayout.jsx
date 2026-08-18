import React from "react";
import { Outlet } from "react-router-dom";
import { Home, FileText, ClipboardList, CalendarDays, User, Wallet } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { COLORS } from "../theme/colors";

const NAV_ITEMS = [
  { to: "", label: "Dashboard", icon: Home },
  { to: "apply", label: "Apply Leave", icon: FileText },
  { to: "requests", label: "My Requests", icon: ClipboardList },
  { to: "balance", label: "Balance", icon: Wallet },
  { to: "holidays", label: "Holidays", icon: CalendarDays },
  { to: "profile", label: "Profile", icon: User },
];

export default function EmployeeLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.paper }}>
      <Sidebar items={NAV_ITEMS} basePath="/employee" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Topbar title="Employee" avatarLetter="R" eligibleLink={{ to: "/employee/eligible" }} />
        <div style={{ padding: 32, flex: 1, overflowY: "auto" }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
