// Where the admin token lives.
//
// localStorage, not a cookie, because the API is stateless and takes a bearer
// header. The trade-off is honest: localStorage is readable by any script on
// the origin, so an XSS bug leaks the token. A httpOnly cookie would not have
// that exposure, but would need CSRF protection and a same-site deployment,
// neither of which exists here. Recorded so the choice is visible rather than
// assumed.

const KEY = "meridian.admin.token";
const EXP = "meridian.admin.expiresAt";

export function getToken() {
  const token = localStorage.getItem(KEY);
  if (!token) return null;

  // Discard a token we can already see is stale, rather than sending it and
  // waiting for a 401. Purely a courtesy — the server is the authority and
  // checks the signed expiry regardless of what this says.
  const expiresAt = localStorage.getItem(EXP);
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    clearToken();
    return null;
  }
  return token;
}

export function setToken(token, expiresAt) {
  localStorage.setItem(KEY, token);
  if (expiresAt) localStorage.setItem(EXP, expiresAt);
}

export function clearToken() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(EXP);
}
