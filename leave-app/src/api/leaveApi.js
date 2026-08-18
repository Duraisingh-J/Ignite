// Endpoint functions + adapters.
//
// The API speaks the persistence model (leaveTypeName, startDate, workingDays,
// status "PENDING"). The pages/components in this app were written against a
// flatter UI shape (type, start, days, status "Pending"). Mapping happens here,
// at the boundary, so RequestsTable / Badge / Dashboard stay untouched.

import { request, EMPLOYEE_ID } from "./client";

// ---------- adapters ----------

const STATUS_TO_UI = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

/** API leave request -> the shape RequestsTable / Badge / Dashboard expect. */
export function toUiRequest(r) {
  return {
    id: r.id,
    type: r.leaveTypeName,
    start: r.startDate,
    end: r.endDate,
    days: r.workingDays,
    status: STATUS_TO_UI[r.status] ?? r.status,
    reason: r.reason ?? "",
    // Extra, only used by the detail view: how the day count was reached.
    breakdown: r.breakdown,
    submittedAt: r.submittedAt,
  };
}

/** API leave type -> the { id, label } shape the dropdown expects. */
export function toUiLeaveType(t) {
  return {
    id: t.id,
    label: t.name,
    isPaid: t.isPaid,
    requiresApproval: t.requiresApproval,
  };
}

/** API employee -> the shape Profile / Topbar expect. */
export function toUiEmployee(e) {
  return {
    id: e.id,
    name: e.name,
    email: e.email,
    region: e.regionCountry,
    regionId: e.regionId,
    manager: e.managerName,
    joinDate: e.joinDate,
  };
}

// ---------- endpoints ----------

export async function fetchEmployee(id = EMPLOYEE_ID) {
  return toUiEmployee(await request(`/employees/${id}`));
}

export async function fetchHolidays(id = EMPLOYEE_ID) {
  return await request(`/employees/${id}/holidays`);
}

export async function fetchLeaveTypes(regionId) {
  const types = await request(`/leave-types?regionId=${regionId}`);
  return types.map(toUiLeaveType);
}

export async function fetchMyRequests(id = EMPLOYEE_ID) {
  const rows = await request(`/leave-requests?employeeId=${id}`);
  return rows.map(toUiRequest);
}

export async function submitLeaveRequest({ leaveTypeId, startDate, endDate, reason }) {
  const created = await request(`/leave-requests`, {
    method: "POST",
    body: JSON.stringify({
      employeeId: EMPLOYEE_ID,
      leaveTypeId,
      startDate,
      endDate,
      reason,
    }),
  });
  return toUiRequest(created);
}
