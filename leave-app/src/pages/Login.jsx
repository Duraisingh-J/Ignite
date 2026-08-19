// Administrator sign-in.
//
// Three fields, not two: the account is scoped to a tenant, so the same address
// could administer more than one organisation. Naming the organisation also
// keeps the lookup from having to be globally unique across tenants.
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { COLORS, FONTS, inputStyle } from "../theme/colors";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();

  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Where they were headed before the guard intercepted them.
  const from = location.state?.from || "/admin";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!orgName.trim() || !email.trim() || !password) {
      setError("Organisation, email and password are all required.");
      return;
    }
    setBusy(true);
    try {
      await signIn({ orgName: orgName.trim(), email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      // The server returns one generic message for every credential failure,
      // deliberately — see auth/service.py. Passing it straight through keeps
      // the UI from inventing a more specific one.
      setError(err.message || "Could not sign you in.");
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: COLORS.paper,
        padding: 24,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 420,
          background: COLORS.card,
          borderRadius: 14,
          border: `1px solid ${COLORS.line}`,
          boxShadow: "0 1px 2px rgba(27,36,48,.04), 0 18px 44px -28px rgba(27,36,48,.28)",
          padding: "44px 40px 36px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 34,
              fontWeight: 700,
              color: COLORS.ink,
              letterSpacing: "-0.02em",
            }}
          >
            Meridian
          </div>
          <div
            style={{
              fontFamily: FONTS.body,
              fontSize: 15,
              color: COLORS.inkSoft,
              marginTop: 4,
            }}
          >
            Sign in to your workspace
          </div>
        </div>

        <Field label="Organisation">
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Your organisation name"
            autoComplete="organization"
            autoFocus
            style={inputStyle}
          />
        </Field>

        <Field label="Email Address">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="username"
            style={inputStyle}
          />
        </Field>

        <Field label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            style={inputStyle}
          />
        </Field>

        {error && (
          <div
            role="alert"
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              background: COLORS.claySoft,
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 18,
            }}
          >
            <AlertCircle size={15} color={COLORS.clay} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.clay }}>
              {error}
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          style={{
            width: "100%",
            padding: "13px 16px",
            borderRadius: 9,
            border: "none",
            background: busy ? COLORS.inkSoft : COLORS.navy,
            color: "#fff",
            fontFamily: FONTS.body,
            fontSize: 15,
            fontWeight: 600,
            cursor: busy ? "default" : "pointer",
            marginTop: 6,
          }}
        >
          {busy ? "Signing in…" : "Sign In"}
        </button>

        <div
          style={{
            textAlign: "center",
            marginTop: 24,
            fontFamily: FONTS.body,
            fontSize: 13.5,
            color: COLORS.inkSoft,
          }}
        >
          Forgot password? Contact HR.
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: 10,
            fontFamily: FONTS.body,
            fontSize: 12.5,
            color: COLORS.inkSoft,
          }}
        >
          {/* No sign-up link, and no way past this card. Accounts are
              provisioned with scripts/create_admin.py — a public sign-up
              against a tenant-admin table would let anyone make themselves an
              administrator. */}
          Accounts are created by your administrator.
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label
        style={{
          display: "block",
          fontFamily: FONTS.body,
          fontSize: 13.5,
          fontWeight: 600,
          color: COLORS.ink,
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
