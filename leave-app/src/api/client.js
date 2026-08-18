// Thin fetch wrapper around the v1 API.
// Unwraps the { data: ... } envelope and turns { error: {...} } into a throw.

const BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";

export const EMPLOYEE_ID = import.meta.env.VITE_EMPLOYEE_ID;
export const MANAGER_ID = import.meta.env.VITE_MANAGER_ID;
export const TENANT_ID = import.meta.env.VITE_TENANT_ID;

/**
 * @param {string} path
 * @param {object} options  fetch options, plus `raw: true` to get the whole
 *                          envelope (needed for paginated { data, meta }).
 */
export async function request(path, { raw = false, ...options } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    const err = new Error("Can't reach the API server.");
    err.code = "NETWORK";
    throw err;
  }

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(payload?.error?.message || `Request failed (${res.status})`);
    err.code = payload?.error?.code;
    err.details = payload?.error?.details;
    err.status = res.status;
    throw err;
  }

  return raw ? payload : payload.data;
}
