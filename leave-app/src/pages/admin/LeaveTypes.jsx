import React, { useEffect, useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { COLORS, FONTS, inputStyle } from "../../theme/colors";
import { createLeaveType, fetchAllLeaveTypes, fetchRegions } from "../../api/leaveApi";
import Card from "../../components/Card";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import SectionLabel from "../../components/SectionLabel";
import FieldLabel from "../../components/FieldLabel";

export default function LeaveTypes() {
  const [types, setTypes] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", regionId: "", isPaid: true, requiresApproval: true });

  async function reload() {
    setTypes(await fetchAllLeaveTypes());
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
    if (!form.name.trim()) return setError("Give the leave type a name.");
    setBusy(true);
    try {
      await createLeaveType({
        regionId: form.regionId,
        name: form.name.trim(),
        isPaid: form.isPaid,
        isActive: true,
        requiresApproval: form.requiresApproval,
      });
      setForm({ ...form, name: "" });
      await reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div style={{ fontFamily: FONTS.body, color: COLORS.inkSoft }}>Loading…</div>;
  }

  const regionName = (id) => regions.find((r) => r.id === id)?.countryName ?? "—";

  return (
    <div>
      <SectionLabel eyebrow="New">Add leave type</SectionLabel>
      <Card style={{ maxWidth: 440, marginBottom: 32 }}>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Name</FieldLabel>
          <input
            value={form.name}
            placeholder="e.g. Bereavement Leave"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Region</FieldLabel>
          <select value={form.regionId} onChange={(e) => setForm({ ...form, regionId: e.target.value })} style={inputStyle}>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.countryName}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 18, marginBottom: 16 }}>
          <label style={{ display: "flex", gap: 7, alignItems: "center", fontFamily: FONTS.body, fontSize: 13, color: COLORS.ink, cursor: "pointer" }}>
            <input type="checkbox" checked={form.isPaid} onChange={(e) => setForm({ ...form, isPaid: e.target.checked })} />
            Paid
          </label>
          <label style={{ display: "flex", gap: 7, alignItems: "center", fontFamily: FONTS.body, fontSize: 13, color: COLORS.ink, cursor: "pointer" }}>
            <input type="checkbox" checked={form.requiresApproval} onChange={(e) => setForm({ ...form, requiresApproval: e.target.checked })} />
            Requires approval
          </label>
        </div>
        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: COLORS.claySoft, borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
            <AlertCircle size={15} color={COLORS.clay} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.clay }}>{error}</span>
          </div>
        )}
        <Button onClick={handleCreate} disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
          {busy ? "Creating…" : "Create Leave Type"}
        </Button>
      </Card>

      <SectionLabel eyebrow={`${types.length} configured`}>Leave types</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {types.map((lt) => (
          <Card key={lt.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
              <div style={{ fontFamily: FONTS.body, fontWeight: 600, fontSize: 15, color: COLORS.ink }}>{lt.label}</div>
              {!lt.isActive && <Badge status="Cancelled" />}
            </div>
            <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.inkSoft }}>
              Region: {regionName(lt.regionId)}
            </div>
            <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.inkSoft }}>
              {lt.isPaid ? "Paid" : "Unpaid"} · {lt.requiresApproval ? "Needs approval" : "Auto-approved"}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
