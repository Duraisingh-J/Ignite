import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSession } from "../../context/SessionContext";
import { COLORS, FONTS, inputStyle } from "../../theme/colors";

export default function Login() {
    const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login } = useSession();

  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Login failed");
      }
      
      // Store token (in localStorage for now)
      login(data.access_token);
      
      // Redirect based on role
      if (data.role === "ADMIN" || data.role === "HR_ADMIN") {
        navigate("/admin");
      } else if (data.role === "MANAGER") {
        navigate("/manager");
      } else {
        navigate("/employee");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: COLORS.paper,
        fontFamily: FONTS.body,
        color: COLORS.ink,
      }}
    >
      <div
        style={{
          background: COLORS.card,
          padding: "48px 40px",
          borderRadius: 16,
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          width: "100%",
          maxWidth: 400,
          border: `1px solid ${COLORS.line}`,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1
            style={{
              fontFamily: FONTS.display,
              fontSize: 32,
              fontWeight: 600,
              color: COLORS.navyDeep,
              margin: "0 0 8px 0",
            }}
          >
            Ignite
          </h1>
          <p style={{ margin: 0, color: COLORS.inkSoft, fontSize: 15 }}>
            Sign in to your workspace
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: 20, padding: 12, background: COLORS.claySoft, color: COLORS.clay, borderRadius: 8, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 500,
                color: COLORS.ink,
              }}
            >
              Organization Name
            </label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="e.g. Acme Corp"
              required
              style={{ ...inputStyle, outlineColor: COLORS.navy }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 500,
                color: COLORS.ink,
              }}
            >
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              style={{ ...inputStyle, outlineColor: COLORS.navy }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 500,
                color: COLORS.ink,
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ ...inputStyle, outlineColor: COLORS.navy }}
            />
          </div>

          <button
            type="submit"
            style={{
              marginTop: 8,
              background: COLORS.navy,
              color: COLORS.paper,
              border: "none",
              padding: "12px 24px",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: FONTS.body,
              transition: "background 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = COLORS.navyDeep)}
            onMouseOut={(e) => (e.currentTarget.style.background = COLORS.navy)}
          >
            Sign In
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <a
            href="#"
            style={{
              color: COLORS.inkSoft,
              fontSize: 13,
              textDecoration: "none",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = COLORS.navy)}
            onMouseOut={(e) => (e.currentTarget.style.color = COLORS.inkSoft)}
          >
            Forgot password? Contact HR.
          </a>
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <span style={{ color: COLORS.inkSoft, fontSize: 13 }}>
            Don&apos;t have an account? <Link to="/signup" style={{ color: COLORS.navy, fontWeight: 500, textDecoration: "none" }}>Create a workspace</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
