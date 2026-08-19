// Route guard. Wraps every screen — without a session there is no access.
//
// There is no unauthenticated path into the application. The employee and
// manager portals sit behind this too: one real credential gates the app, and
// the identity switcher moves between people inside it.
//
// Renders nothing while the stored token is being validated: showing the login
// form during that window would flash it at an admin who is already signed in.
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { COLORS, FONTS } from "../theme/colors";
import { useAuth } from "./AuthContext";

export default function RequireAuth({ children }) {
  const { isSignedIn, checking } = useAuth();
  const location = useLocation();

  if (checking) {
    return (
      <div style={{ padding: 48, fontFamily: FONTS.body, color: COLORS.inkSoft, fontSize: 14 }}>
        Checking your session…
      </div>
    );
  }

  if (!isSignedIn) {
    // Carry where they were headed, so signing in resumes it instead of
    // dumping them on the dashboard.
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
