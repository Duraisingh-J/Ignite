import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { COLORS, FONTS, inputStyle } from "../../theme/colors";
import { fmtDateFull } from "../../utils/dateHelpers";
import {
  createEmployee,
  deleteEmployee,
  fetchAllEmployees,
  fetchRegions,
  updateEmployee,
} from "../../api/leaveApi";
import { TENANT_ID } from "../../api/client";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SectionLabel from "../../components/SectionLabel";
import FieldLabel from "../../components/FieldLabel";
import DeleteButton from "../../components/DeleteButton";

/**
 * Would making `candidate` the manager of `employee` form a loop?
 *
 * Walks the candidate's reporting line upward; if it passes through the
 * employee, the two would end up reporting to each other. Derived from the
 * list already loaded, so the picker can hide impossible options instead of
 * offering them and letting the server reject the choice.
 */
function wouldCycle(candidateId, employeeId, byId) {
  let cursor = candidateId;
  const seen = new Set();
  while (cursor && !seen.has(cursor)) {
    if (cursor === employeeId) return true;
    seen.add(cursor);
    cursor = byId.get(cursor)?.managerId ?? null;
  }
  return false;
}

const PAGE_SIZE = 25;
// Large enough to list every colleague in the manager pickers without paging.
const ALL = 200;

export default function Employees() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, limit: PAGE_SIZE, offset: 0 });
  const [everyone, setEveryone] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    regionId: "",
    managerId: "",
    joinDate: "",
  });

  const load = useCallback(async (offset = 0) => {
    const [page, all] = await Promise.all([
      fetchAllEmployees(TENANT_ID, { limit: PAGE_SIZE, offset }),
      fetchAllEmployees(TENANT_ID, { limit: ALL, offset: 0 }),
    ]);
    setRows(page.rows);
    setMeta(page.meta);
    setEveryone(all.rows);
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
        // Omit rather than send null when nobody is picked.
        ...(form.managerId ? { managerId: form.managerId } : {}),
        name: form.name.trim(),
        email: form.email.trim(),
        joinDate: form.joinDate,
      });
      setCreated(emp);
      setForm({ ...form, name: "", email: "", managerId: "", joinDate: "" });
      await load(meta.offset);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(emp) {
    setError("");
    try {
      const res = await deleteEmployee(emp.id);
      await load(meta.offset);
      if (res.requestsRemoved) {
        setError(`Removed ${res.deleted} and their ${res.requestsRemoved} leave request(s).`);
      }
    } catch (e) {
      // Direct reports or a pending approval come back as 409.
      setError(e.message);
    }
  }

  // Inline reassign from the table. "" means detach.
  async function handleReassign(employeeId, managerId) {
    setError("");
    setSavingId(employeeId);
    try {
      await updateEmployee(
        employeeId,
        managerId ? { managerId } : { clearManager: true }
      );
      await load(meta.offset);
    } catch (e) {
      // Self-reference and reporting cycles are rejected by the server.
      setError(e.message);
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <div style={{ fontFamily: FONTS.body, color: COLORS.inkSoft }}>Loading…</div>;
  }

  const byId = new Map(everyone.map((p) => [p.id, p]));
  // Candidates for one employee: everyone except themselves and anyone who
  // already reports to them, directly or through someone else.
  const managerOptionsFor = (employeeId) =>
    everyone.filter((m) => m.id !== employeeId && !wouldCycle(m.id, employeeId, byId));

  const th = {
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: COLORS.inkSoft,
    padding: "10px 16px",
    whiteSpace: "nowrap",
  };

  return (
    <div>
      <SectionLabel eyebrow="New hire">Add employee</SectionLabel>
      <Card style={{ maxWidth: 460, marginBottom: 32 }}>
        {created && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", background: COLORS.tealSoft, borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
            <Check size={15} color={COLORS.teal} strokeWidth={3} />
            <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.teal }}>
              Created {created.name}
              {created.managerName ? ` — reports to ${created.managerName}` : ""}
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
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Manager</FieldLabel>
          <select value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })} style={inputStyle}>
            <option value="">— No manager —</option>
            {everyone.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {m.regionCountry}
              </option>
            ))}
          </select>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginTop: 6 }}>
            Managers may sit in any region. Leave is always calculated using the
            employee's own region calendar and working week.
          </div>
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
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Region</th>
                <th style={th}>Reports to</th>
                <th style={th}>Joined</th>
                <th style={th} aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} style={{ borderTop: `1px solid ${COLORS.line}` }}>
                  <td style={{ padding: "12px 16px", fontSize: 14, color: COLORS.ink, fontWeight: 500, whiteSpace: "nowrap" }}>{e.name}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.inkSoft }}>{e.email}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.inkSoft }}>{e.regionCountry}</td>
                  <td style={{ padding: "8px 16px" }}>
                    {/* Inline reassign — the server rejects cycles and self-reference. */}
                    <select
                      value={e.managerId ?? ""}
                      disabled={savingId === e.id || managerOptionsFor(e.id).length === 0}
                      title={
                        managerOptionsFor(e.id).length === 0
                          ? `Everyone else already reports to ${e.name}, directly or indirectly, so no one can be their manager`
                          : undefined
                      }
                      onChange={(ev) => handleReassign(e.id, ev.target.value)}
                      style={{ ...inputStyle, fontSize: 13, padding: "6px 8px", minWidth: 170 }}
                    >
                      <option value="">— No manager —</option>
                      {managerOptionsFor(e.id).map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontFamily: FONTS.mono, color: COLORS.inkSoft, whiteSpace: "nowrap" }}>{fmtDateFull(e.joinDate)}</td>
                  {/* Widens only while the confirm is showing, so the column
                      stays narrow the rest of the time. */}
                  <td style={{ padding: "6px 12px", textAlign: "right", minWidth: 200 }}>
                    <DeleteButton
                      label={e.name}
                      disabled={e.directReports > 0 || e.pendingApprovals > 0}
                      disabledReason={
                        e.directReports > 0
                          ? `${e.directReports} employee(s) report to ${e.name} — reassign them first`
                          : `${e.name} is the approver on ${e.pendingApprovals} pending request(s)`
                      }
                      warning={
                        e.ownRequests
                          ? `Also deletes their ${e.ownRequests} leave request(s).`
                          : undefined
                      }
                      onConfirm={() => handleDelete(e)}
                    />
                  </td>
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
