import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "../context/SessionContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, user } = useSession();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to the appropriate dashboard based on their role
    if (user.role === "EMPLOYEE") {
      return <Navigate to="/employee" replace />;
    } else if (user.role === "MANAGER") {
      return <Navigate to="/manager" replace />;
    } else if (user.role === "ADMIN" || user.role === "HR_ADMIN") {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
}
