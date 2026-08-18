import React, { useEffect, useState } from "react";
import { AlertCircle, Check, Globe } from "lucide-react";
import { COLORS, FONTS, inputStyle } from "../../theme/colors";
import { createRegion, deleteRegion, fetchRegions } from "../../api/leaveApi";
import { TENANT_ID } from "../../api/client";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SectionLabel from "../../components/SectionLabel";
import FieldLabel from "../../components/FieldLabel";
import DeleteButton from "../../components/DeleteButton";
import CountrySelect from "../../components/CountrySelect";
import ct from "countries-and-timezones";

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
  const [availableTimezones, setAvailableTimezones] = useState([{ id: "UTC", label: "(UTC+00:00) UTC", offset: 0 }]);

  const handleCountryChange = (country) => {
    const tzList = country.timezones || ["UTC"];
    
    // Map to rich objects and sort by UTC offset (West to East)
    const enrichedTzList = tzList
      .map(tz => {
        const info = ct.getTimezone(tz);
        return info ? { id: tz, label: `(UTC${info.utcOffsetStr}) ${tz}`, offset: info.utcOffset } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.offset - b.offset || a.id.localeCompare(b.id));

    if (enrichedTzList.length === 0) {
      enrichedTzList.push({ id: "UTC", label: "(UTC+00:00) UTC", offset: 0 });
    }

    setAvailableTimezones(enrichedTzList);
    setForm((f) => ({
      ...f,
      countryName: country.name,
      code: country.id,
      timezone: enrichedTzList.length === 1 ? enrichedTzList[0].id : (enrichedTzList.some(t => t.id === f.timezone) ? f.timezone : enrichedTzList[0].id)
    }));
  };

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

  async function handleDelete(r) {
    setError("");
    try {
      const res = await deleteRegion(r.id);
      setCreated(null);
      await reload();
      if (res.leaveTypesRemoved || res.holidaysRemoved) {
        setError(
          `Removed ${res.deleted}, along with ${res.leaveTypesRemoved} leave type(s) ` +
          `and ${res.holidaysRemoved} holiday(s).`
        );
      }
    } catch (e) {
      // Employees still assigned come back as 409.
      setError(e.message);
    }
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
              readOnly
              placeholder="SG"
              style={{ ...inputStyle, fontFamily: FONTS.mono, backgroundColor: COLORS.paperDim, color: COLORS.inkSoft }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel>Country name</FieldLabel>
            <CountrySelect
              value={form.countryName}
              onChange={handleCountryChange}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Timezone</FieldLabel>
          <select
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            style={{ ...inputStyle, fontFamily: FONTS.mono, appearance: "auto" }}
          >
            {availableTimezones.map((tz) => (
              <option key={tz.id} value={tz.id}>{tz.label}</option>
            ))}
          </select>
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
              // Lets the delete confirm drop to its own line instead of
              // squeezing the region name.
              flexWrap: "wrap",
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
                {(r.employeeCount > 0 || r.leaveTypeCount > 0) && (
                  <> · {r.employeeCount} employee{r.employeeCount === 1 ? "" : "s"}, {r.leaveTypeCount} leave type{r.leaveTypeCount === 1 ? "" : "s"}</>
                )}
              </div>
            </div>
            <DeleteButton
              label={r.countryName}
              disabled={r.employeeCount > 0}
              disabledReason={`${r.employeeCount} employee(s) are assigned to this region — move them first`}
              warning={
                r.leaveTypeCount || r.holidayCount
                  ? `Also removes ${r.leaveTypeCount} leave type(s) and ${r.holidayCount} holiday(s).`
                  : undefined
              }
              onConfirm={() => handleDelete(r)}
            />
          </div>
        ))}
      </Card>
    </div>
  );
}
