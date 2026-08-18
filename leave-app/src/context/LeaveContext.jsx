// Shared state so pages stay in sync without prop-drilling.
// Wrap your route tree in <LeaveProvider> once (see App.jsx), then call useLeave()
// from any page.
//
// Everything here is loaded from the v1 API — there is no mock data left in this
// provider. Identity comes from SessionContext, and every fetch is keyed to it:
// switching person reloads the whole view, so one identity drives the employee
// screens, the approvals queue, and the team views alike.
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  decideApprovalStep,
  decideLeaveRequest,
  fetchApprovals,
  fetchBalances,
  fetchEmployee,
  fetchHolidays,
  fetchLeaveTypes,
  fetchMyRequests,
  fetchTeam,
  fetchTeamOnLeave,
  submitLeaveRequest,
} from "../api/leaveApi";
import { useSession } from "./SessionContext";

const LeaveContext = createContext(null);

export function LeaveProvider({ children }) {
  const { currentUserId } = useSession();

  const [employee, setEmployee] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState([]);

  const [approvals, setApprovals] = useState([]);
  const [team, setTeam] = useState([]);
  const [onLeave, setOnLeave] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reloadRequests = useCallback(async () => {
    setRequests(await fetchMyRequests(currentUserId));
  }, [currentUserId]);

  // Balances move whenever a request is submitted, rejected or cancelled, so
  // they are refreshed alongside the request list rather than on their own.
  const reloadBalances = useCallback(async () => {
    try {
      setBalances(await fetchBalances(currentUserId));
    } catch {
      // A leave type with no accrual policy simply has no balance; the employee
      // screens must still work.
      setBalances([]);
    }
  }, [currentUserId]);

  // Approver views share one refresh so a decision updates the queue, the team
  // list and the calendar together.
  const reloadManager = useCallback(async () => {
    const [a, t, o] = await Promise.all([
      fetchApprovals(currentUserId),
      fetchTeam(currentUserId),
      fetchTeamOnLeave(currentUserId),
    ]);
    setApprovals(a);
    setTeam(t);
    setOnLeave(o);
  }, [currentUserId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const emp = await fetchEmployee(currentUserId);
        if (cancelled) return;
        setEmployee(emp);

        // Leave types and holidays are both scoped to this person's region, so
        // switching to a UAE employee changes both.
        const [types, hols, reqs] = await Promise.all([
          fetchLeaveTypes(emp.regionId),
          fetchHolidays(currentUserId),
          fetchMyRequests(currentUserId),
        ]);
        if (cancelled) return;
        setLeaveTypes(types);
        setHolidays(hols);
        setRequests(reqs);
        await reloadBalances();

        // Approver data is secondary — someone with no reports still needs the
        // employee screens to work, so a failure here must not blank them.
        try {
          await reloadManager();
        } catch (e) {
          console.warn("approver data unavailable:", e.message);
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
  }, [currentUserId, reloadManager, reloadBalances]);

  // Submits to the API, then refreshes. Throws on failure so the calling page
  // can surface the server's message (overlap, all-weekend range, ...).
  async function addRequest({ leaveTypeId, startDate, endDate, reason }) {
    const created = await submitLeaveRequest(
      { leaveTypeId, startDate, endDate, reason },
      currentUserId
    );
    await Promise.all([reloadRequests(), reloadBalances()]);
    // A new request may land in someone's approval queue.
    reloadManager().catch(() => {});
    return created;
  }

  /**
   * Decide one tier of a request's approval chain, acting as the current user.
   *
   * The request only becomes APPROVED once every tier has signed off, so the
   * result carries the re-derived request status rather than assuming this
   * decision settled it.
   */
  async function decideStep(requestId, stepId, { approve, comment } = {}) {
    const result = await decideApprovalStep(requestId, stepId, {
      approverId: currentUserId,
      approve,
      comment: comment || null,
    });
    await Promise.all([reloadManager(), reloadRequests(), reloadBalances()]);
    return result;
  }

  // Employee withdrawing their own request. Bypasses the chain.
  async function cancelRequest(id) {
    const updated = await decideLeaveRequest(id, "CANCELLED");
    await Promise.all([reloadRequests(), reloadBalances(), reloadManager().catch(() => {})]);
    return updated;
  }

  const value = {
    employee,
    leaveTypes,
    holidays,
    requests,
    balances,
    approvals,
    team,
    onLeave,
    loading,
    error,
    addRequest,
    decideStep,
    cancelRequest,
    reloadRequests,
    reloadBalances,
    reloadManager,
  };

  return <LeaveContext.Provider value={value}>{children}</LeaveContext.Provider>;
}

export function useLeave() {
  const ctx = useContext(LeaveContext);
  if (!ctx) throw new Error("useLeave must be used inside <LeaveProvider>");
  return ctx;
}
