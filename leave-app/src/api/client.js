// Thin fetch wrapper around the v1 API.
// Unwraps the { data: ... } envelope and turns { error: {...} } into a throw.

import { getToken, clearToken } from "../auth/token";

const BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";

export const EMPLOYEE_ID = import.meta.env.VITE_EMPLOYEE_ID;
export const MANAGER_ID = import.meta.env.VITE_MANAGER_ID;
export const TENANT_ID = import.meta.env.VITE_TENANT_ID;

/**
 * @param {string} path
 * @param {object} options  fetch options, plus `raw: true` to get the whole
 *                          envelope (needed for paginated { data, meta }).
 */
export async function request(path, { raw = false, skipAuth = false, ...options } = {}) {
  // Attach the admin token when there is one. Reads are open to everyone, so
  // this is additive: employee and manager screens simply send no header and
  // are served exactly as before.
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (!skipAuth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    const err = new Error("Can't reach the API server.");
    err.code = "NETWORK";
    throw err;
  }

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    // A rejected token is dead: drop it so the guard sends them to sign in
    // again rather than every subsequent screen failing the same way.
    if (res.status === 401 && !skipAuth) clearToken();

    const err = new Error(payload?.error?.message || `Request failed (${res.status})`);
    err.code = payload?.error?.code;
    err.details = payload?.error?.details;
    err.status = res.status;
    throw err;
  }

  return raw ? payload : payload.data;
}
