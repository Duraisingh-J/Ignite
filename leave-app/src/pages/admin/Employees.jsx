import React, { useState } from "react";
import { Check, AlertCircle } from "lucide-react";
import { COLORS, FONTS, inputStyle } from "../../theme/colors";
import { LEAVE_TYPES } from "../../data/mockData";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SectionLabel from "../../components/SectionLabel";
import FieldLabel from "../../components/FieldLabel";

const TEXT_FIELDS = [
  ["name", "Name", "text"],
  ["email", "Email", "email"],
  ["designation", "Designation", "text"],
  ["joinDate", "Join date", "date"],
];

const SELECT_FIELDS = [
  ["type", "Employee type", ["Full-Time", "Contract", "Intern"]],
  ["region", "Region", ["India", "US", "EU"]],
  ["manager", "Manager", ["Priya", "Arjun", "Meera"]],
  ["team", "Team", ["Payments", "Platform", "Growth"]],
];

export default function AdminEmployees() {
  const [form, setForm] = useState({
    name: "", email: "", type: "Full-Time", region: "India",
    manager: "Priya", team: "Payments", designation: "", joinDate: "",
  });
  const [created, setCreated] = useState(false);
  const [error, setError] = useState("");

  function handleCreate() {
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setError("");
    setCreated(true);
    // POST `form` to your API here, then let the server return the
    // applicable policies / workflow instead of assuming LEAVE_TYPES.
  }

  if (created) {
    return (
      <div style={{ maxWidth: 440 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <div style={{ background: COLORS.tealSoft, borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={16} color={COLORS.teal} strokeWidth={3} />
          </div>
          <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: 20 }}>Employee created</div>
        </div>
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: FONTS.body, fontWeight: 700, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: COLORS.inkSoft, marginBottom: 10 }}>
            Applicable policies detected
          </div>
          {LEAVE_TYPES.map((lt) => (
            <div key={lt.id} style={{ display: "flex", justifyContent: "space-between", fontFamily: FONTS.body, fontSize: 13, padding: "5px 0" }}>
              <span style={{ color: COLORS.ink }}>{lt.label}</span>
              <span style={{ fontFamily: FONTS.mono, color: COLORS.inkSoft }}>{lt.accrual} days/month</span>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{ fontFamily: FONTS.body, fontWeight: 700, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: COLORS.inkSoft, marginBottom: 8 }}>
            Workflow assigned
          </div>
          <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.ink }}>Manager → HR</div>
        </Card>
        <Button onClick={() => setCreated(false)} style={{ marginTop: 20 }}>Add another</Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 440 }}>
      <SectionLabel eyebrow="New hire">Add employee</SectionLabel>
      {TEXT_FIELDS.map(([key, label, type]) => (
        <div key={key} style={{ marginBottom: 14 }}>
          <FieldLabel>{label}</FieldLabel>
          <input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} style={inputStyle} />
        </div>
      ))}
      {SELECT_FIELDS.map(([key, label, opts]) => (
        <div key={key} style={{ marginBottom: 14 }}>
          <FieldLabel>{label}</FieldLabel>
          <select value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} style={inputStyle}>
            {opts.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      ))}
      {error && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: COLORS.claySoft, borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
          <AlertCircle size={15} color={COLORS.clay} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.clay }}>{error}</span>
        </div>
      )}
      <Button onClick={handleCreate} style={{ width: "100%", justifyContent: "center" }}>Create Employee</Button>
    </div>
  );
}
