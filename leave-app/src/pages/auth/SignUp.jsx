import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSession } from "../../context/SessionContext";
import { COLORS, FONTS, inputStyle } from "../../theme/colors";

export default function SignUp() {
  const [orgName, setOrgName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [regionName, setRegionName] = useState("");
  const navigate = useNavigate();
  const { login } = useSession();

  const [error, setError] = useState(null);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName,
          adminName,
          email,
          password,
          regionName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Sign up failed");
      }
      
      // Store token using session context
      login(data.access_token);
      
      // Admin is created, so redirect to admin dashboard
      navigate("/admin");
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
          maxWidth: 480,
          border: `1px solid ${COLORS.line}`,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1
            style={{
              fontFamily: FONTS.display,
              fontSize: 28,
              fontWeight: 600,
              color: COLORS.navyDeep,
              margin: "0 0 8px 0",
            }}
          >
            Create Your Workspace
          </h1>
          <p style={{ margin: 0, color: COLORS.inkSoft, fontSize: 15 }}>
            Set up Ignite for your organization
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: 20, padding: 12, background: COLORS.claySoft, color: COLORS.clay, borderRadius: 8, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Corp"
                required
                style={{ ...inputStyle, outlineColor: COLORS.navy }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Region Name</label>
              <input
                type="text"
                value={regionName}
                onChange={(e) => setRegionName(e.target.value)}
                placeholder="Global / US / UK"
                required
                style={{ ...inputStyle, outlineColor: COLORS.navy }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Admin Name</label>
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Jane Doe"
              required
              style={{ ...inputStyle, outlineColor: COLORS.navy }}
            />
          </div>

          <div>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@company.com"
              required
              style={{ ...inputStyle, outlineColor: COLORS.navy }}
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              style={{ ...inputStyle, outlineColor: COLORS.navy }}
            />
            <span style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: 4, display: "block" }}>
              Must be at least 8 characters.
            </span>
          </div>

          <button
            type="submit"
            style={{
              marginTop: 16,
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
            Create Workspace
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <span style={{ color: COLORS.inkSoft, fontSize: 13 }}>
            Already have an account? <Link to="/login" style={{ color: COLORS.navy, fontWeight: 500, textDecoration: "none" }}>Sign In</Link>
          </span>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontSize: 14,
  fontWeight: 500,
  color: COLORS.ink,
};
