import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LeaveProvider } from "./context/LeaveContext";
import { SessionProvider } from "./context/SessionContext";

import EmployeeLayout from "./layouts/EmployeeLayout";
import ManagerLayout from "./layouts/ManagerLayout";
import AdminLayout from "./layouts/AdminLayout";

import EmployeeDashboard from "./pages/employee/Dashboard";
import ApplyLeave from "./pages/employee/ApplyLeave";
import MyRequests from "./pages/employee/MyRequests";
import EligibleLeaveTypes from "./pages/employee/EligibleLeaveTypes";
import EmployeeHolidays from "./pages/employee/Holidays";
import Profile from "./pages/employee/Profile";
import Balance from "./pages/employee/Balance";

import ManagerDashboard from "./pages/manager/Dashboard";
import Approvals from "./pages/manager/Approvals";
import Team from "./pages/manager/Team";
import Calendar from "./pages/manager/Calendar";

import AdminDashboard from "./pages/admin/Dashboard";
import Employees from "./pages/admin/Employees";
import AdminLeaveTypes from "./pages/admin/LeaveTypes";
import Policies from "./pages/admin/Policies";
import AdminHolidays from "./pages/admin/Holidays";
import Regions from "./pages/admin/Regions";
import Roles from "./pages/admin/Roles";
import AccrualPolicies from "./pages/admin/AccrualPolicies";

export default function App() {
  return (
    // Session wraps Leave: switching person re-keys every fetch below it.
    <SessionProvider>
      <LeaveProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/employee" replace />} />

          <Route path="/employee" element={<EmployeeLayout />}>
            <Route index element={<EmployeeDashboard />} />
            <Route path="apply" element={<ApplyLeave />} />
            <Route path="requests" element={<MyRequests />} />
            <Route path="balance" element={<Balance />} />
            <Route path="eligible" element={<EligibleLeaveTypes />} />
            <Route path="holidays" element={<EmployeeHolidays />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route path="/manager" element={<ManagerLayout />}>
            <Route index element={<ManagerDashboard />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="team" element={<Team />} />
            <Route path="calendar" element={<Calendar />} />
          </Route>

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route path="types" element={<AdminLeaveTypes />} />
            <Route path="policies" element={<Policies />} />
            <Route path="regions" element={<Regions />} />
            <Route path="roles" element={<Roles />} />
            <Route path="accrual" element={<AccrualPolicies />} />
            <Route path="holidays" element={<AdminHolidays />} />
          </Route>
          </Routes>
        </BrowserRouter>
      </LeaveProvider>
    </SessionProvider>
  );
}
