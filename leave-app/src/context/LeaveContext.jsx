// Shared state so pages stay in sync without prop-drilling.
// Wrap your route tree in <LeaveProvider> once (see App.jsx), then call useLeave()
// from any page.
//
// Employee data (profile, region leave types, holidays, own requests) is loaded
// from the v1 API. Manager approvals are still the mock array — there is no
// approval endpoint in this slice.
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  fetchEmployee,
  fetchHolidays,
  fetchLeaveTypes,
  fetchMyRequests,
  submitLeaveRequest,
} from "../api/leaveApi";
import { PENDING_APPROVALS } from "../data/mockData";

const LeaveContext = createContext(null);

export function LeaveProvider({ children }) {
  const [employee, setEmployee] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Manager approvals remain mock — no endpoint for them in this slice.
  const [approvals, setApprovals] = useState(PENDING_APPROVALS);

  const reloadRequests = useCallback(async () => {
    setRequests(await fetchMyRequests());
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
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Submits to the API, then refreshes the list. Throws on failure so the
  // calling page can show the server's message.
  async function addRequest({ leaveTypeId, startDate, endDate, reason }) {
    const created = await submitLeaveRequest({ leaveTypeId, startDate, endDate, reason });
    await reloadRequests();
    return created;
  }

  // status: "Approved" | "Rejected" — mock-only until an approval endpoint exists.
  function decideApproval(id, status) {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
  }

  const value = {
    employee,
    leaveTypes,
    holidays,
    requests,
    approvals,
    loading,
    error,
    addRequest,
    reloadRequests,
    decideApproval,
  };

  return <LeaveContext.Provider value={value}>{children}</LeaveContext.Provider>;
}

export function useLeave() {
  const ctx = useContext(LeaveContext);
  if (!ctx) throw new Error("useLeave must be used inside <LeaveProvider>");
  return ctx;
}
