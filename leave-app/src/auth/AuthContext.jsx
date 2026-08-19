// Admin authentication.
//
// Self-contained: the rest of the app touches this only through <RequireAuth>
// and the token that client.js reads. Removing authentication means deleting
// this folder, the /login route, and the <RequireAuth> wrapper — nothing else.
//
// Every screen is behind this. The identity switcher still moves between people
// for the approval demo, but only inside an authenticated session: one real
// credential gates the application, and the switcher operates within it.
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { request } from "../api/client";
import { getToken, setToken, clearToken } from "./token";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  // Distinct from "not signed in": on first paint we hold a token but do not
  // yet know whether it is still good, and rendering the login form during
  // that window would flash it in front of an already-authenticated admin.
  const [checking, setChecking] = useState(true);

  const signOut = useCallback(() => {
    clearToken();
    setAdmin(null);
  }, []);

  const signIn = useCallback(async ({ orgName, email, password }) => {
    const data = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ orgName, email, password }),
      // The login call is the one request that must not carry a stale token.
      skipAuth: true,
    });
    setToken(data.token, data.expiresAt);
    setAdmin(data.admin);
    return data.admin;
  }, []);

  // Validate whatever is in storage before trusting it. A token can expire
  // while the tab is closed, and finding out on the first real request means
  // the failure surfaces as a broken screen instead of a sign-in prompt.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await request("/auth/me");
        if (cancelled) return;
        setAdmin({
          id: me.adminId,
          email: me.email,
          orgName: me.orgName,
          tenantId: me.tenantId,
          name: null,
        });
      } catch {
        // No token, or one the server rejected. Either way: signed out.
        if (!cancelled) clearToken();
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ admin, checking, signIn, signOut, isSignedIn: Boolean(admin) }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export { getToken };
