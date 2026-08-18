import React, { useEffect, useState } from "react";
import { AlertCircle, Check, Globe } from "lucide-react";
import { COLORS, FONTS, inputStyle } from "../../theme/colors";
import { createRegion, fetchRegions } from "../../api/leaveApi";
import { TENANT_ID } from "../../api/client";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SectionLabel from "../../components/SectionLabel";
import FieldLabel from "../../components/FieldLabel";

// date.weekday(): 0=Mon .. 6=Sun — the same numbering the backend uses.
const DAYS = [
  [0, "Mon"],
  [1, "Tue"],
  [2, "Wed"],
  [3, "Thu"],
  [4, "Fri"],
  [5, "Sat"],
  [6, "Sun"],
];

const PRESETS = [
  ["Mon – Fri", [0, 1, 2, 3, 4]],
  ["Sun – Thu", [6, 0, 1, 2, 3]],
  ["Mon – Sat", [0, 1, 2, 3, 4, 5]],
];

export default function Regions() {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const [form, setForm] = useState({
    code: "",
    countryName: "",
    timezone: "UTC",
    workDays: [0, 1, 2, 3, 4],
  });

  async function reload() {
    setRegions(await fetchRegions());
  }

  useEffect(() => {
    reload()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function toggleDay(d) {
    setForm((f) => ({
      ...f,
      workDays: f.workDays.includes(d)
        ? f.workDays.filter((x) => x !== d)
        : [...f.workDays, d].sort(),
    }));
  }

  async function handleCreate() {
    setError("");
    setCreated(null);
    if (!form.code.trim() || !form.countryName.trim()) {
      return setError("Country code and name are required.");
    }
    if (form.workDays.length === 0) return setError("Pick at least one working day.");
    setBusy(true);
    try {
      const r = await createRegion({
        tenantId: TENANT_ID,
        code: form.code.trim().toUpperCase(),
        countryName: form.countryName.trim(),
        workDays: form.workDays,
        timezone: form.timezone.trim() || "UTC",
      });
      setCreated(r);
      setForm({ code: "", countryName: "", timezone: "UTC", workDays: [0, 1, 2, 3, 4] });
      await reload();
    } catch (e) {
      // Duplicate code in the tenant comes back as 409.
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div style={{ fontFamily: FONTS.body, color: COLORS.inkSoft }}>Loading…</div>;
  }

  const labelFor = (wd) =>
    DAYS.filter(([d]) => wd.includes(d))
      .map(([, n]) => n)
      .join(", ");

  return (
    <div>
      <SectionLabel eyebrow="New">Add region</SectionLabel>
      <Card style={{ maxWidth: 460, marginBottom: 32 }}>
        {created && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", background: COLORS.tealSoft, borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
            <Check size={15} color={COLORS.teal} strokeWidth={3} />
            <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.teal }}>
              Created {created.countryName}. Add its leave types and holidays next.
            </span>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 110 }}>
            <FieldLabel>Code</FieldLabel>
            <input
              value={form.code}
              placeholder="SG"
              maxLength={8}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              style={{ ...inputStyle, fontFamily: FONTS.mono }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel>Country name</FieldLabel>
            <input
              value={form.countryName}
              placeholder="Singapore"
              onChange={(e) => setForm({ ...form, countryName: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Timezone</FieldLabel>
          <input
            value={form.timezone}
            placeholder="Asia/Singapore"
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            style={{ ...inputStyle, fontFamily: FONTS.mono }}
          />
        </div>

        <FieldLabel>Working week</FieldLabel>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {DAYS.map(([d, name]) => {
            const on = form.workDays.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 12.5,
                  fontWeight: 600,
                  padding: "7px 11px",
                  borderRadius: 8,
                  cursor: "pointer",
                  border: `1px solid ${on ? COLORS.navy : COLORS.line}`,
                  background: on ? COLORS.navy : "transparent",
                  color: on ? "#fff" : COLORS.inkSoft,
                }}
              >
                {name}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          {PRESETS.map(([label, days]) => (
            <button
              key={label}
              type="button"
              onClick={() => setForm({ ...form, workDays: days })}
              style={{
                fontFamily: FONTS.body,
                fontSize: 11.5,
                fontWeight: 600,
                padding: "5px 10px",
                borderRadius: 999,
                cursor: "pointer",
                border: `1px solid ${COLORS.line}`,
                background: "transparent",
                color: COLORS.inkSoft,
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginBottom: 16 }}>
          Days left unselected are treated as the weekend and are never charged as
          leave. Much of the Gulf works Sun–Thu rather than Mon–Fri.
        </div>

        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: COLORS.claySoft, borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
            <AlertCircle size={15} color={COLORS.clay} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.clay }}>{error}</span>
          </div>
        )}
        <Button onClick={handleCreate} disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
          {busy ? "Creating…" : "Create Region"}
        </Button>
      </Card>

      <SectionLabel eyebrow={`${regions.length} configured`}>Regions</SectionLabel>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {regions.map((r, i) => (
          <div
            key={r.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 20px",
              borderBottom: i < regions.length - 1 ? `1px solid ${COLORS.line}` : "none",
            }}
          >
            <div style={{ background: COLORS.tealSoft, borderRadius: 8, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Globe size={17} color={COLORS.teal} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONTS.body, fontWeight: 600, fontSize: 14, color: COLORS.ink }}>
                {r.countryName}{" "}
                <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.inkSoft }}>
                  ({r.code})
                </span>
              </div>
              <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft }}>
                Works {labelFor(r.workDays)} · {r.timezone}
              </div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
