const BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";
export const EMPLOYEE_ID = import.meta.env.VITE_EMPLOYEE_ID;

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(payload?.error?.message || `Request failed (${res.status})`);
    err.code = payload?.error?.code;
    err.details = payload?.error?.details;
    throw err;
  }
  return payload.data;
}

export const api = {
  getEmployee: (id) => request(`/employees/${id}`),
  getHolidays: (employeeId) => request(`/employees/${employeeId}/holidays`),
  getLeaveTypes: (regionId) => request(`/leave-types?regionId=${regionId}`),
  getMyRequests: (employeeId) => request(`/leave-requests?employeeId=${employeeId}`),
  submitRequest: (body) =>
    request(`/leave-requests`, { method: "POST", body: JSON.stringify(body) }),
};
