import React, { useEffect, useState } from "react";
import { AlertCircle, Sun } from "lucide-react";
import { COLORS, FONTS, inputStyle } from "../../theme/colors";
import { fmtDateFull } from "../../utils/dateHelpers";
import { createHoliday, fetchRegions, fetchTenantHolidays } from "../../api/leaveApi";
import { TENANT_ID } from "../../api/client";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SectionLabel from "../../components/SectionLabel";
import FieldLabel from "../../components/FieldLabel";

export default function AdminHolidays() {
  const [holidays, setHolidays] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", date: "", regionId: "" });

  async function reload() {
    setHolidays(await fetchTenantHolidays());
  }

  useEffect(() => {
    (async () => {
      try {
        const [regs] = await Promise.all([fetchRegions(), reload()]);
        setRegions(regs);
        setForm((f) => ({ ...f, regionId: regs[0]?.id ?? "" }));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
      });
      setForm({ ...form, name: "", date: "" });
      await reload();
    } catch (e) {
      // A duplicate date for the region comes back as 409.
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
        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Region</FieldLabel>
          <select value={form.regionId} onChange={(e) => setForm({ ...form, regionId: e.target.value })} style={inputStyle}>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.countryName}</option>
            ))}
          </select>
        </div>
        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: COLORS.claySoft, borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
            <AlertCircle size={15} color={COLORS.clay} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.clay }}>{error}</span>
          </div>
        )}
        <Button onClick={handleCreate} disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
          {busy ? "Adding…" : "Add Holiday"}
        </Button>
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginTop: 12 }}>
          Holidays are excluded from chargeable leave for employees in that region.
        </div>
      </Card>

      <SectionLabel eyebrow={`${holidays.length} configured`}>Holiday calendar</SectionLabel>
      <Card>
        {holidays.length === 0 ? (
          <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.inkSoft, padding: "8px 0" }}>
            No holidays configured yet.
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
              <div>
                <div style={{ fontFamily: FONTS.body, fontWeight: 600, fontSize: 14, color: COLORS.ink }}>{h.name}</div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.inkSoft }}>{fmtDateFull(h.date)}</div>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
