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
    // Which tier this approver is being asked to decide, out of how many.
    stepId: a.stepId,
    stepOrder: a.stepOrder,
    totalSteps: a.totalSteps,
  };
}

const ROLE_LABEL = {
  MANAGER: "Manager",
  SKIP_LEVEL: "Skip-level",
  DEPT_HEAD: "Department head",
};

/** API approval chain -> the { label, state, comment } shape Stepper expects. */
export function chainToSteps(chain) {
  const steps = [{ label: "Request submitted", state: "APPROVED" }];
  for (const s of chain) {
    const role = ROLE_LABEL[s.approverRole] ?? s.approverRole;
    const who = s.approverName ?? "Unassigned";
    let label = `${who} · ${role}`;
    if (s.status === "APPROVED") label += " approved";
    else if (s.status === "REJECTED") label += " rejected";
    else if (s.status === "SKIPPED") {
      // A step with nobody to route to, or one bypassed by a rejection above.
      label = s.approverName ? `${who} · ${role} — not required` : `${role} — no approver in the reporting line`;
    }
    steps.push({
      id: s.id,
      label,
      state: s.status,
      comment: s.comment,
      meta: s.decidedAt ? new Date(s.decidedAt).toLocaleString("en-GB") : undefined,
    });
  }
  return steps;
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
    // Approval depth. Must be carried through, or the admin editor renders
    // "undefined approvals" and its controls never show the stored value.
    approvalLevels: t.approvalLevels ?? 1,
    escalateAboveDays: t.escalateAboveDays ?? null,
    finalApproverRoleId: t.finalApproverRoleId ?? null,
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

export async function submitLeaveRequest(
  { leaveTypeId, startDate, endDate, reason },
  employeeId = EMPLOYEE_ID
) {
  const created = await request(`/leave-requests`, {
    method: "POST",
    body: JSON.stringify({
      employeeId,
      leaveTypeId,
      startDate,
      endDate,
      reason,
    }),
  });
  return toUiRequest(created);
}

// ---------- manager ----------

/** What is waiting on this person right now, across every tier of the chain. */
export async function fetchApprovals(approverId = MANAGER_ID) {
  const rows = await request(`/leave-requests/approvals?approverId=${approverId}`);
  return rows.map(toUiApproval);
}

/** The frozen approval chain for one request — feeds the Stepper. */
export async function fetchApprovalChain(requestId) {
  return await request(`/leave-requests/${requestId}/approvals`);
}

/** Decide one tier. `approve: false` rejects and ends the chain. */
export async function decideApprovalStep(requestId, stepId, { approverId, approve, comment }) {
  return await request(`/leave-requests/${requestId}/approvals/${stepId}`, {
    method: "PATCH",
    body: JSON.stringify({ approverId, approve, comment }),
  });
}

export async function updateLeaveType(id, body) {
  return toUiLeaveType(
    await request(`/leave-types/${id}`, { method: "PATCH", body: JSON.stringify(body) })
  );
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

/** Refused (409) if they have direct reports or own a pending approval. */
export async function deleteEmployee(id) {
  return await request(`/employees/${id}`, { method: "DELETE" });
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

// ---------- roles ----------

/** Roles with their holders. A role reaches approvers the reporting line cannot. */
export async function fetchRoles(tenantId = TENANT_ID) {
  return await request(`/roles?tenantId=${tenantId}`);
}

export async function createRole(body) {
  return await request(`/roles`, { method: "POST", body: JSON.stringify(body) });
}

/** Refused (409) while a leave type still routes its final approval here. */
export async function deleteRole(id) {
  return await request(`/roles/${id}`, { method: "DELETE" });
}

/** regionId null = the whole tenant. */
export async function addRoleHolder(roleId, body) {
  return await request(`/roles/${roleId}/holders`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function removeRoleHolder(roleId, assignmentId) {
  return await request(`/roles/${roleId}/holders/${assignmentId}`, { method: "DELETE" });
}

/** Refused (409) while employees are still assigned to the region. */
export async function deleteRegion(id) {
  return await request(`/regions/${id}`, { method: "DELETE" });
}

/** Refused (409) once any leave request uses the type — deactivate instead. */
export async function deleteLeaveType(id) {
  return await request(`/leave-types/${id}`, { method: "DELETE" });
}
