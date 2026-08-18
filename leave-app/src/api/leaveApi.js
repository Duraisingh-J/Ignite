// Endpoint functions + adapters.
//
// The API speaks the persistence model (leaveTypeName, startDate, workingDays,
// status "PENDING"). The pages/components in this app were written against a
// flatter UI shape (type, start, days, status "Pending"). Mapping happens here,
// at the boundary, so RequestsTable / Badge / ApprovalCard stay untouched.

import { request, EMPLOYEE_ID, TENANT_ID, MANAGER_ID } from "./client";

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
    breakdown: r.breakdown,
    submittedAt: r.submittedAt,
  };
}

/** API approval row -> the shape ApprovalCard / Approvals page expect. */
export function toUiApproval(a) {
  return {
    id: a.id,
    employeeId: a.employeeId,
    employee: a.employeeName,
    region: a.regionCountry,
    type: a.leaveTypeName,
    start: a.startDate,
    end: a.endDate,
    days: a.workingDays,
    status: STATUS_TO_UI[a.status] ?? a.status,
    reason: a.reason ?? "",
    breakdown: a.breakdown,
  };
}

/** API leave type -> the { id, label } shape the dropdown expects. */
export function toUiLeaveType(t) {
  return {
    id: t.id,
    label: t.name,
    regionId: t.regionId,
    isPaid: t.isPaid,
    isActive: t.isActive,
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
    regionWorkDays: e.regionWorkDays,
    tenantId: e.tenantId,
    managerId: e.managerId,
    manager: e.managerName,
    joinDate: e.joinDate,
  };
}

// ---------- employee ----------

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

// ---------- manager ----------

export async function fetchApprovals(managerId = MANAGER_ID, status = "PENDING") {
  const qs = status ? `&status=${status}` : "";
  const rows = await request(`/leave-requests/approvals?managerId=${managerId}${qs}`);
  return rows.map(toUiApproval);
}

export async function fetchTeam(managerId = MANAGER_ID) {
  return await request(`/employees/${managerId}/team`);
}

export async function fetchTeamOnLeave(managerId = MANAGER_ID) {
  const rows = await request(`/leave-requests/on-leave?managerId=${managerId}`);
  return rows.map(toUiApproval);
}

/** status: "APPROVED" | "REJECTED" | "CANCELLED" */
export async function decideLeaveRequest(id, status) {
  const updated = await request(`/leave-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return toUiRequest(updated);
}

// ---------- admin ----------

export async function fetchStats(tenantId = TENANT_ID) {
  return await request(`/stats?tenantId=${tenantId}`);
}

export async function fetchAllEmployees(tenantId = TENANT_ID, { limit = 50, offset = 0 } = {}) {
  // This endpoint returns { data, meta } rather than a bare list.
  const res = await request(`/employees?tenantId=${tenantId}&limit=${limit}&offset=${offset}`, {
    raw: true,
  });
  return { rows: res.data, meta: res.meta };
}

export async function createEmployee(body) {
  return await request(`/employees`, { method: "POST", body: JSON.stringify(body) });
}

/** Partial update. Pass { clearManager: true } to detach a manager. */
export async function updateEmployee(id, body) {
  return await request(`/employees/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function fetchAllLeaveTypes(tenantId = TENANT_ID) {
  const types = await request(`/leave-types?tenantId=${tenantId}`);
  return types.map(toUiLeaveType);
}

export async function createLeaveType(body) {
  return toUiLeaveType(await request(`/leave-types`, { method: "POST", body: JSON.stringify(body) }));
}

export async function fetchTenantHolidays(tenantId = TENANT_ID, year) {
  const qs = year ? `&year=${year}` : "";
  return await request(`/holidays?tenantId=${tenantId}${qs}`);
}

export async function createHoliday(body) {
  return await request(`/holidays`, { method: "POST", body: JSON.stringify(body) });
}

export async function fetchRegions(tenantId = TENANT_ID) {
  return await request(`/regions?tenantId=${tenantId}`);
}

export async function createRegion(body) {
  return await request(`/regions`, { method: "POST", body: JSON.stringify(body) });
}
