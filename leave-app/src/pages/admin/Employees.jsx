import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { COLORS, FONTS, inputStyle } from "../../theme/colors";
import { fmtDateFull } from "../../utils/dateHelpers";
import { createEmployee, fetchAllEmployees, fetchRegions } from "../../api/leaveApi";
import { TENANT_ID } from "../../api/client";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SectionLabel from "../../components/SectionLabel";
import FieldLabel from "../../components/FieldLabel";

const PAGE_SIZE = 25;

export default function Employees() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, limit: PAGE_SIZE, offset: 0 });
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", regionId: "", joinDate: "" });

  const load = useCallback(async (offset = 0) => {
    const res = await fetchAllEmployees(TENANT_ID, { limit: PAGE_SIZE, offset });
    setRows(res.rows);
    setMeta(res.meta);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [regs] = await Promise.all([fetchRegions(), load(0)]);
        setRegions(regs);
        setForm((f) => ({ ...f, regionId: regs[0]?.id ?? "" }));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  async function handleCreate() {
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.joinDate) {
      setError("Name, email and join date are required.");
      return;
    }
    setBusy(true);
    try {
      const emp = await createEmployee({
        tenantId: TENANT_ID,
        regionId: form.regionId,
        name: form.name.trim(),
        email: form.email.trim(),
        joinDate: form.joinDate,
      });
      setCreated(emp);
      setForm({ name: "", email: "", regionId: regions[0]?.id ?? "", joinDate: "" });
      await load(0);
    } catch (e) {
      // Duplicate email comes back as 409 from the server.
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
      <SectionLabel eyebrow="New hire">Add employee</SectionLabel>
      <Card style={{ maxWidth: 440, marginBottom: 32 }}>
        {created && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", background: COLORS.tealSoft, borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
            <Check size={15} color={COLORS.teal} strokeWidth={3} />
            <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.teal }}>
              Created {created.name}
            </span>
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Name</FieldLabel>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Email</FieldLabel>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Region</FieldLabel>
          <select value={form.regionId} onChange={(e) => setForm({ ...form, regionId: e.target.value })} style={inputStyle}>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.countryName}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Join date</FieldLabel>
          <input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} style={inputStyle} />
        </div>
        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: COLORS.claySoft, borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
            <AlertCircle size={15} color={COLORS.clay} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.clay }}>{error}</span>
          </div>
        )}
        <Button onClick={handleCreate} disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
          {busy ? "Creating…" : "Create Employee"}
        </Button>
      </Card>

      <SectionLabel eyebrow={`${meta.total} total`}>Employees</SectionLabel>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONTS.body }}>
            <thead>
              <tr style={{ background: COLORS.paperDim }}>
                {["Name", "Email", "Region", "Manager", "Joined"].map((h) => (
                  <th key={h} style={{ textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: COLORS.inkSoft, padding: "10px 16px", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} style={{ borderTop: `1px solid ${COLORS.line}` }}>
                  <td style={{ padding: "12px 16px", fontSize: 14, color: COLORS.ink, fontWeight: 500, whiteSpace: "nowrap" }}>{e.name}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.inkSoft }}>{e.email}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.inkSoft }}>{e.regionCountry}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.inkSoft }}>{e.managerName || "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontFamily: FONTS.mono, color: COLORS.inkSoft, whiteSpace: "nowrap" }}>{fmtDateFull(e.joinDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {meta.total > meta.limit && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 14 }}>
          <Button variant="ghost" disabled={meta.offset === 0} onClick={() => load(Math.max(0, meta.offset - meta.limit))}>
            Previous
          </Button>
          <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.inkSoft }}>
            {meta.offset + 1}–{Math.min(meta.offset + meta.limit, meta.total)} of {meta.total}
          </span>
          <Button variant="ghost" disabled={meta.offset + meta.limit >= meta.total} onClick={() => load(meta.offset + meta.limit)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
