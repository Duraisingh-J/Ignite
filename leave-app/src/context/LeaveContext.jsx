// Shared state so pages stay in sync without prop-drilling.
// Wrap your route tree in <LeaveProvider> once (see App.jsx), then call useLeave()
// from any page.
//
// Everything here is loaded from the v1 API — there is no mock data left in
// this provider. Identities come from .env until authentication exists.
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  decideLeaveRequest,
  fetchApprovals,
  fetchEmployee,
  fetchHolidays,
  fetchLeaveTypes,
  fetchMyRequests,
  fetchTeam,
  fetchTeamOnLeave,
  submitLeaveRequest,
} from "../api/leaveApi";

const LeaveContext = createContext(null);

export function LeaveProvider({ children }) {
  const [employee, setEmployee] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [requests, setRequests] = useState([]);

  const [approvals, setApprovals] = useState([]);
  const [team, setTeam] = useState([]);
  const [onLeave, setOnLeave] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reloadRequests = useCallback(async () => {
    setRequests(await fetchMyRequests());
  }, []);

  // Manager views share one refresh so approving updates the team/calendar too.
  const reloadManager = useCallback(async () => {
    const [a, t, o] = await Promise.all([fetchApprovals(), fetchTeam(), fetchTeamOnLeave()]);
    setApprovals(a);
    setTeam(t);
    setOnLeave(o);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const emp = await fetchEmployee();
        if (cancelled) return;
        setEmployee(emp);

        // Leave types and holidays are both scoped to the employee's region.
        const [types, hols, reqs] = await Promise.all([
          fetchLeaveTypes(emp.regionId),
          fetchHolidays(),
          fetchMyRequests(),
        ]);
        if (cancelled) return;
        setLeaveTypes(types);
        setHolidays(hols);
        setRequests(reqs);

        // Manager data is secondary — a failure here shouldn't blank the
        // employee screens, so it gets its own catch.
        try {
          await reloadManager();
        } catch (e) {
          console.warn("manager data unavailable:", e.message);
        }
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadManager]);

  // Submits to the API, then refreshes. Throws on failure so the calling page
  // can surface the server's message (overlap, all-weekend range, ...).
  async function addRequest({ leaveTypeId, startDate, endDate, reason }) {
    const created = await submitLeaveRequest({ leaveTypeId, startDate, endDate, reason });
    await reloadRequests();
    // A new request belongs in the manager queue too.
    reloadManager().catch(() => {});
    return created;
  }

  // status: "APPROVED" | "REJECTED" | "CANCELLED"
  async function decideApproval(id, status) {
    const updated = await decideLeaveRequest(id, status);
    await Promise.all([reloadManager(), reloadRequests()]);
    return updated;
  }

  const value = {
    employee,
    leaveTypes,
    holidays,
    requests,
    approvals,
    team,
    onLeave,
    loading,
    error,
    addRequest,
    decideApproval,
    reloadRequests,
    reloadManager,
  };

  return <LeaveContext.Provider value={value}>{children}</LeaveContext.Provider>;
}

export function useLeave() {
  const ctx = useContext(LeaveContext);
  if (!ctx) throw new Error("useLeave must be used inside <LeaveProvider>");
  return ctx;
}
