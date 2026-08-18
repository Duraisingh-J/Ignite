import React, { useEffect, useState } from "react";
import { AlertCircle, Plus, ShieldCheck, X } from "lucide-react";
import { COLORS, FONTS, inputStyle } from "../../theme/colors";
import {
  addRoleHolder,
  createRole,
  deleteRole,
  fetchAllEmployees,
  fetchRegions,
  fetchRoles,
  removeRoleHolder,
} from "../../api/leaveApi";
import { TENANT_ID } from "../../api/client";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SectionLabel from "../../components/SectionLabel";
import FieldLabel from "../../components/FieldLabel";
import DeleteButton from "../../components/DeleteButton";

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [people, setPeople] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ code: "", name: "" });
  // Per-role draft for the "add holder" row.
  const [draft, setDraft] = useState({});

  async function reload() {
    setRoles(await fetchRoles());
  }

  useEffect(() => {
    (async () => {
      try {
        const [emps, regs] = await Promise.all([
          fetchAllEmployees(TENANT_ID, { limit: 200 }),
          fetchRegions(),
          reload(),
        ]);
        setPeople(emps.rows);
        setRegions(regs);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleCreate() {
    setError("");
    if (!form.code.trim() || !form.name.trim()) {
      return setError("Both a code and a name are required.");
    }
    setBusy(true);
    try {
      await createRole({ tenantId: TENANT_ID, code: form.code.trim(), name: form.name.trim() });
      setForm({ code: "", name: "" });
      await reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddHolder(role) {
    setError("");
    const d = draft[role.id] ?? {};
    if (!d.employeeId) return setError("Pick who holds the role.");
    try {
      await addRoleHolder(role.id, {
        employeeId: d.employeeId,
        // Blank means the whole tenant rather than one region.
        regionId: d.regionId || null,
      });
      setDraft({ ...draft, [role.id]: {} });
      await reload();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleRemoveHolder(roleId, assignmentId) {
    setError("");
    try {
      await removeRoleHolder(roleId, assignmentId);
      await reload();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDeleteRole(role) {
    setError("");
    try {
      await deleteRole(role.id);
      await reload();
    } catch (e) {
      // Still referenced by a leave type -> 409.
      setError(e.message);
    }
  }

  if (loading) {
    return <div style={{ fontFamily: FONTS.body, color: COLORS.inkSoft }}>Loading…</div>;
  }

  const setDraftFor = (roleId, patch) =>
    setDraft({ ...draft, [roleId]: { ...(draft[roleId] ?? {}), ...patch } });

  return (
    <div>
      <SectionLabel eyebrow="New">Add role</SectionLabel>
      <Card style={{ maxWidth: 460, marginBottom: 32 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 130 }}>
            <FieldLabel>Code</FieldLabel>
            <input
              value={form.code}
              placeholder="FINANCE"
              maxLength={24}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              style={{ ...inputStyle, fontFamily: FONTS.mono }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel>Name</FieldLabel>
            <input
              value={form.name}
              placeholder="Finance"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginBottom: 16 }}>
          A role reaches an approver the reporting line never can. Walking upward
          from an employee gives their manager, then their manager's manager — it
          will never arrive at HR, because HR is a role somebody holds rather than
          a rung above them.
        </div>
        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: COLORS.claySoft, borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
            <AlertCircle size={15} color={COLORS.clay} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.clay }}>{error}</span>
          </div>
        )}
        <Button onClick={handleCreate} disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
          {busy ? "Creating…" : "Create Role"}
        </Button>
      </Card>

      <SectionLabel eyebrow={`${roles.length} configured`}>Roles</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {roles.map((role) => {
          const d = draft[role.id] ?? {};
          return (
            <Card key={role.id}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                <div style={{ background: COLORS.tealSoft, borderRadius: 8, width: 36, height: 36, display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <ShieldCheck size={17} color={COLORS.teal} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontFamily: FONTS.body, fontWeight: 600, fontSize: 15, color: COLORS.ink }}>
                    {role.name}{" "}
                    <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.inkSoft }}>
                      ({role.code})
                    </span>
                  </div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft }}>
                    {role.holderCount} holder{role.holderCount === 1 ? "" : "s"}
                  </div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <DeleteButton label={role.name} onConfirm={() => handleDeleteRole(role)} />
                </div>
              </div>

              {/* Holders */}
              {role.holders.length === 0 ? (
                <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.inkSoft, padding: "6px 0 12px" }}>
                  Nobody holds this role yet — a leave type routed here would skip the step.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  {role.holders.map((h) => (
                    <div
                      key={h.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        background: COLORS.paperDim, borderRadius: 8, padding: "7px 10px",
                      }}
                    >
                      <span style={{ fontFamily: FONTS.body, fontSize: 13, fontWeight: 500, color: COLORS.ink }}>
                        {h.employeeName}
                      </span>
                      <span style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft }}>
                        {h.regionName ?? "all regions"}
                      </span>
                      <button
                        onClick={() => handleRemoveHolder(role.id, h.id)}
                        title={`Remove ${h.employeeName} from ${role.name}`}
                        aria-label={`Remove ${h.employeeName} from ${role.name}`}
                        style={{
                          marginLeft: "auto", display: "grid", placeItems: "center",
                          width: 22, height: 22, borderRadius: 6, border: "none",
                          background: "transparent", color: COLORS.inkSoft,
                          opacity: 0.6, cursor: "pointer",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = COLORS.clay; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.color = COLORS.inkSoft; }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add a holder */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: "2 1 170px" }}>
                  <FieldLabel>Who holds it</FieldLabel>
                  <select
                    value={d.employeeId ?? ""}
                    onChange={(e) => setDraftFor(role.id, { employeeId: e.target.value })}
                    style={{ ...inputStyle, fontSize: 13, padding: "7px 9px" }}
                  >
                    <option value="">— pick a person —</option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: "1 1 140px" }}>
                  <FieldLabel>Scope</FieldLabel>
                  <select
                    value={d.regionId ?? ""}
                    onChange={(e) => setDraftFor(role.id, { regionId: e.target.value })}
                    style={{ ...inputStyle, fontSize: 13, padding: "7px 9px" }}
                  >
                    <option value="">All regions</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>{r.countryName}</option>
                    ))}
                  </select>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => handleAddHolder(role)}
                  style={{ fontSize: 13, padding: "7px 12px" }}
                >
                  <Plus size={13} /> Add
                </Button>
              </div>
              <div style={{ fontFamily: FONTS.body, fontSize: 11.5, color: COLORS.inkSoft, marginTop: 8 }}>
                A region-scoped holder wins over an all-regions one, so a local HR
                takes precedence in their own region while a global lead covers the rest.
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
