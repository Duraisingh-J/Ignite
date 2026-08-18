import React, { useEffect, useState } from "react";
import { AlertCircle, Repeat, Sun } from "lucide-react";
import { COLORS, FONTS, inputStyle } from "../../theme/colors";
import { fmtDateFull } from "../../utils/dateHelpers";
import { createHoliday, fetchRegions, fetchTenantHolidays } from "../../api/leaveApi";
import { TENANT_ID } from "../../api/client";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SectionLabel from "../../components/SectionLabel";
import FieldLabel from "../../components/FieldLabel";

const THIS_YEAR = new Date().getFullYear();

export default function AdminHolidays() {
  const [holidays, setHolidays] = useState([]);
  const [regions, setRegions] = useState([]);
  const [year, setYear] = useState(THIS_YEAR);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", date: "", regionId: "", repeats: true });

  async function reload(y = year) {
    // ?year= projects ANNUAL rules onto that year so the list shows real dates.
    setHolidays(await fetchTenantHolidays(TENANT_ID, y));
  }

  useEffect(() => {
    (async () => {
      try {
        const [regs] = await Promise.all([fetchRegions(), reload(THIS_YEAR)]);
        setRegions(regs);
        setForm((f) => ({ ...f, regionId: regs[0]?.id ?? "" }));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function changeYear(y) {
    setYear(y);
    try {
      await reload(y);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleCreate() {
    setError("");
    if (!form.name.trim() || !form.date) return setError("Name and date are required.");
    setBusy(true);
    try {
      await createHoliday({
        tenantId: TENANT_ID,
        regionId: form.regionId,
        date: form.date,
        name: form.name.trim(),
        recurrence: form.repeats ? "ANNUAL" : "NONE",
      });
      setForm({ ...form, name: "", date: "" });
      await reload();
    } catch (e) {
      // Duplicate date, or an annual rule already on that month/day -> 409.
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div style={{ fontFamily: FONTS.body, color: COLORS.inkSoft }}>Loading…</div>;
  }

  return (
    <div>
      <SectionLabel eyebrow="New">Add holiday</SectionLabel>
      <Card style={{ maxWidth: 440, marginBottom: 32 }}>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Holiday name</FieldLabel>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Date</FieldLabel>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Region</FieldLabel>
          <select value={form.regionId} onChange={(e) => setForm({ ...form, regionId: e.target.value })} style={inputStyle}>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.countryName}</option>
            ))}
          </select>
        </div>

        <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 16, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={form.repeats}
            onChange={(e) => setForm({ ...form, repeats: e.target.checked })}
            style={{ marginTop: 3 }}
          />
          <span>
            <span style={{ fontFamily: FONTS.body, fontSize: 13, fontWeight: 600, color: COLORS.ink }}>
              Repeats every year
            </span>
            <span style={{ display: "block", fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginTop: 2 }}>
              Keep this on for fixed-date holidays (26 Jan, 25 Dec). Turn it off for
              one-off closures and for lunar festivals like Diwali or Eid, whose date
              shifts each year and must be entered per year.
            </span>
          </span>
        </label>

        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: COLORS.claySoft, borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
            <AlertCircle size={15} color={COLORS.clay} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.clay }}>{error}</span>
          </div>
        )}
        <Button onClick={handleCreate} disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
          {busy ? "Adding…" : "Add Holiday"}
        </Button>
      </Card>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <SectionLabel eyebrow={`${holidays.length} in ${year}`}>Holiday calendar</SectionLabel>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[THIS_YEAR, THIS_YEAR + 1, THIS_YEAR + 2].map((y) => (
            <button
              key={y}
              onClick={() => changeYear(y)}
              style={{
                fontFamily: FONTS.mono,
                fontSize: 13,
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: 999,
                border: `1px solid ${year === y ? COLORS.navy : COLORS.line}`,
                background: year === y ? COLORS.navy : "transparent",
                color: year === y ? "#fff" : COLORS.inkSoft,
                cursor: "pointer",
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <Card>
        {holidays.length === 0 ? (
          <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.inkSoft, padding: "8px 0" }}>
            No holidays fall in {year}.
          </div>
        ) : (
          holidays.map((h, i) => (
            <div
              key={h.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 0",
                borderBottom: i < holidays.length - 1 ? `1px solid ${COLORS.line}` : "none",
              }}
            >
              <div style={{ background: COLORS.goldSoft, borderRadius: 8, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Sun size={18} color={COLORS.gold} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONTS.body, fontWeight: 600, fontSize: 14, color: COLORS.ink }}>{h.name}</div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.inkSoft }}>{fmtDateFull(h.date)}</div>
              </div>
              {h.recurrence === "ANNUAL" && (
                <span
                  title="Repeats every year"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, background: COLORS.tealSoft, color: COLORS.teal, borderRadius: 999, padding: "3px 9px", fontFamily: FONTS.body, fontSize: 11, fontWeight: 600, flexShrink: 0 }}
                >
                  <Repeat size={11} /> Yearly
                </span>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
