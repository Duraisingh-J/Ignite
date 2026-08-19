import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { fetchAllEmployees } from "../api/leaveApi";

const STORAGE_KEY = "leave-app.token";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState(null);
  
  const [people, setPeople] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(true);

  // Decode token on mount or when token changes
  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Ensure token is not expired
        if (decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          setUser({
            employeeId: decoded.sub,
            tenantId: decoded.tenant_id,
            role: decoded.role,
          });
        }
      } catch (err) {
        console.error("Failed to decode token", err);
        logout();
      }
    } else {
      setUser(null);
    }
  }, [token]);

  // Optionally fetch all employees for the UI (e.g. employee directory)
  useEffect(() => {
    if (user) {
      fetchAllEmployees(undefined, { limit: 200 })
        .then((res) => setPeople(res.rows))
        .catch(() => setPeople([]))
        .finally(() => setLoadingPeople(false));
    } else {
      setPeople([]);
      setLoadingPeople(false);
    }
  }, [user]);

  const login = useCallback((newToken) => {
    localStorage.setItem(STORAGE_KEY, newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Backwards compatibility with the old "switchUser" fake auth for development if needed,
  // but we remove it now since we have real auth.
  
  return (
    <SessionContext.Provider value={{ 
      token, 
      user, 
      isAuthenticated: !!user,
      currentUserId: user?.employeeId,
      login, 
      logout, 
      people, 
      loadingPeople 
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
