// Who you are "logged in" as.
//
// There is no authentication yet, so identity is a demo affordance rather than
// a security boundary: the server trusts whatever id it is given. Holding it in
// context instead of a build-time env var means you can move between people
// without editing .env and restarting Vite — which matters for multi-tier
// approval, where tier 1 and tier 2 belong to different people.
//
// Replace this with a real session when auth lands; every call site already
// takes the id as a parameter, so only this provider changes.
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchAllEmployees, fetchRoles } from "../api/leaveApi";
import { EMPLOYEE_ID } from "../api/client";

const STORAGE_KEY = "leave-app.currentUserId";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [currentUserId, setCurrentUserId] = useState(
    () => localStorage.getItem(STORAGE_KEY) || EMPLOYEE_ID
  );
  const [people, setPeople] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  // employeeId -> [role name, ...]. A role holder approves without managing
  // anybody, so the reporting line alone cannot identify every approver.
  const [roleHolders, setRoleHolders] = useState(() => new Map());

  useEffect(() => {
    fetchAllEmployees(undefined, { limit: 200 })
      .then((res) => setPeople(res.rows))
      .catch(() => setPeople([]))
      .finally(() => setLoadingPeople(false));
  }, []);

  useEffect(() => {
    fetchRoles()
      .then((roles) => {
        const map = new Map();
        for (const role of roles ?? []) {
          for (const h of role.holders ?? []) {
            map.set(h.employeeId, [...(map.get(h.employeeId) ?? []), role.name]);
          }
        }
        setRoleHolders(map);
      })
      // Roles are an enrichment: without them the switcher still lists every
      // manager, so a failure here must not blank the control.
      .catch(() => setRoleHolders(new Map()));
  }, []);

  const switchUser = useCallback((id) => {
    localStorage.setItem(STORAGE_KEY, id);
    setCurrentUserId(id);
  }, []);

  return (
    <SessionContext.Provider value={{ currentUserId, switchUser, people, loadingPeople, roleHolders }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
