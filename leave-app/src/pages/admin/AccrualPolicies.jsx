import React, { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Check, Plus } from "lucide-react";
import { COLORS, FONTS, inputStyle } from "../../theme/colors";
import {
  createAccrualPolicy,
  deleteAccrualPolicy,
  fetchAccrualPolicies,
  fetchCoverage,
  fetchAllLeaveTypes,
  fetchRegions,
  updateAccrualPolicy,
} from "../../api/leaveApi";
import { TENANT_ID } from "../../api/client";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SectionLabel from "../../components/SectionLabel";
import FieldLabel from "../../components/FieldLabel";
import DeleteButton from "../../components/DeleteButton";

const METHODS = [
  ["MONTHLY", "Monthly — a fixed amount each month"],
  ["ANNUAL_GRANT", "Annual grant — the whole allowance in one go"],
  ["PER_PAY_PERIOD", "Per pay period — twice a month by default"],
  ["PER_DAYS_WORKED", "Per days worked — one day earned per N days"],
];

const BLANK = {
  name: "",
  regionId: "",
  leaveTypeId: "",
  tenureFromMonths: 0,
  tenureToMonths: "",
  method: "MONTHLY",
  rate: "1.00",
  daysWorkedDivisor: "",
  waitingPeriodDays: 0,
  prorateOnJoin: true,
  maxBalance: "",
  carryoverMax: "",
  isEncashable: false,
};

export default function AccrualPolicies() {
  const [policies, setPolicies] = useState([]);
  const [issues, setIssues] = useState([]);
  const [regions, setRegions] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(BLANK);

  async function reload() {
    const [p, c] = await Promise.all([fetchAccrualPolicies(), fetchCoverage()]);
    setPolicies(p);
    setIssues(c);
  }

  useEffect(() => {
    (async () => {
      try {
        const [regs, lts] = await Promise.all([fetchRegions(), fetchAllLeaveTypes(), reload()]);
        setRegions(regs);
        setTypes(lts);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Blank numeric inputs mean "not set" rather than zero, so they are dropped
  // rather than sent as 0 — a max_balance of 0 would stop all accrual.
  const num = (v) => (v === "" || v === null ? undefined : Number(v));

  async function handleCreate() {
    setError("");
    if (!form.name.trim()) return setError("Give the policy a name.");
    setBusy(true);
    try {
      await createAccrualPolicy({
        tenantId: TENANT_ID,
        name: form.name.trim(),
        regionId: form.regionId || null,
        leaveTypeId: form.leaveTypeId || null,
        tenureFromMonths: Number(form.tenureFromMonths) || 0,
        tenureToMonths: num(form.tenureToMonths),
        method: form.method,
        rate: Number(form.rate) || 0,
        daysWorkedDivisor: num(form.daysWorkedDivisor),
        waitingPeriodDays: Number(form.waitingPeriodDays) || 0,
        prorateOnJoin: form.prorateOnJoin,
        maxBalance: num(form.maxBalance),
        carryoverMax: num(form.carryoverMax),
        isEncashable: form.isEncashable,
      });
      setForm(BLANK);
      setShowNew(false);
      await reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function save(id, patch) {
    setError("");
    setSavingId(id);
    try {
      await updateAccrualPolicy(id, patch);
      await reload();
    } catch (e) {
      // Carryover above the cap, or a band that ends before it starts.
      setError(e.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(p) {
    setError("");
    try {
      await deleteAccrualPolicy(p.id);
      await reload();
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) {
    return <div style={{ fontFamily: FONTS.body, color: COLORS.inkSoft }}>Loading…</div>;
  }

  const small = { ...inputStyle, fontSize: 13, padding: "6px 8px" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <SectionLabel eyebrow="Rules engine">Accrual policies</SectionLabel>
        <Button variant="ghost" onClick={() => setShowNew((v) => !v)} style={{ fontSize: 13 }}>
          <Plus size={13} /> {showNew ? "Cancel" : "New policy"}
        </Button>
      </div>

      {error && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: COLORS.claySoft, borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
          <AlertCircle size={15} color={COLORS.clay} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.clay }}>{error}</span>
        </div>
      )}

      {/* Coverage: a gap here means somebody quietly accrues nothing. */}
      {issues.length > 0 && (
        <Card style={{ borderLeft: `3px solid ${COLORS.clay}`, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <AlertTriangle size={15} color={COLORS.clay} />
            <span style={{ fontFamily: FONTS.body, fontWeight: 700, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", color: COLORS.clay }}>
              {issues.length} coverage problem{issues.length === 1 ? "" : "s"}
            </span>
          </div>
          {issues.map((i, n) => (
            <div key={n} style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.ink, padding: "4px 0" }}>
              <strong>{i.scope}</strong> — {i.message}
            </div>
          ))}
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginTop: 8 }}>
            A tenure band runs from its start up to <em>but not including</em> its
            end, so a band ending at 24 and the next starting at 25 leaves month 24
            uncovered. Set the next band to start where the previous one ends.
          </div>
        </Card>
      )}
      {issues.length === 0 && policies.length > 0 && (
        <div style={{ display: "flex", gap: 7, alignItems: "center", fontFamily: FONTS.body, fontSize: 12.5, color: COLORS.teal, marginBottom: 20 }}>
          <Check size={14} strokeWidth={3} /> Every tenure band is covered, with no overlaps.
        </div>
      )}

      {showNew && (
        <Card style={{ maxWidth: 620, marginBottom: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <FieldLabel>Policy name</FieldLabel>
            <input value={form.name} placeholder="India · Annual Leave · 0-24 months"
                   onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 180px" }}>
              <FieldLabel>Region</FieldLabel>
              <select value={form.regionId} onChange={(e) => setForm({ ...form, regionId: e.target.value })} style={small}>
                <option value="">All regions</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.countryName}</option>)}
              </select>
            </div>
            <div style={{ flex: "1 1 180px" }}>
              <FieldLabel>Leave type</FieldLabel>
              <select value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })} style={small}>
                <option value="">All types</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <FieldLabel>How it is earned</FieldLabel>
            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} style={inputStyle}>
              {METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 110px" }}>
              <FieldLabel>Days per period</FieldLabel>
              <input type="number" step="0.01" value={form.rate}
                     onChange={(e) => setForm({ ...form, rate: e.target.value })} style={{ ...small, fontFamily: FONTS.mono }} />
            </div>
            <div style={{ flex: "1 1 110px" }}>
              <FieldLabel>Tenure from (mo)</FieldLabel>
              <input type="number" value={form.tenureFromMonths}
                     onChange={(e) => setForm({ ...form, tenureFromMonths: e.target.value })} style={{ ...small, fontFamily: FONTS.mono }} />
            </div>
            <div style={{ flex: "1 1 110px" }}>
              <FieldLabel>Tenure to (mo)</FieldLabel>
              <input type="number" value={form.tenureToMonths} placeholder="no limit"
                     onChange={(e) => setForm({ ...form, tenureToMonths: e.target.value })} style={{ ...small, fontFamily: FONTS.mono }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 110px" }}>
              <FieldLabel>Cap (bucket size)</FieldLabel>
              <input type="number" step="0.5" value={form.maxBalance} placeholder="none"
                     onChange={(e) => setForm({ ...form, maxBalance: e.target.value })} style={{ ...small, fontFamily: FONTS.mono }} />
            </div>
            <div style={{ flex: "1 1 110px" }}>
              <FieldLabel>Carryover max</FieldLabel>
              <input type="number" step="0.5" value={form.carryoverMax} placeholder="none"
                     onChange={(e) => setForm({ ...form, carryoverMax: e.target.value })} style={{ ...small, fontFamily: FONTS.mono }} />
            </div>
            <div style={{ flex: "1 1 110px" }}>
              <FieldLabel>Waiting (days)</FieldLabel>
              <input type="number" value={form.waitingPeriodDays}
                     onChange={(e) => setForm({ ...form, waitingPeriodDays: e.target.value })} style={{ ...small, fontFamily: FONTS.mono }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 18, marginBottom: 14, flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 7, alignItems: "center", fontFamily: FONTS.body, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={form.prorateOnJoin}
                     onChange={(e) => setForm({ ...form, prorateOnJoin: e.target.checked })} />
              Prorate the joining month
            </label>
            <label style={{ display: "flex", gap: 7, alignItems: "center", fontFamily: FONTS.body, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={form.isEncashable}
                     onChange={(e) => setForm({ ...form, isEncashable: e.target.checked })} />
              Encashable
            </label>
          </div>
          <Button onClick={handleCreate} disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
            {busy ? "Creating…" : "Create policy"}
          </Button>
        </Card>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {policies.map((p) => (
          <Card key={p.id}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontFamily: FONTS.body, fontWeight: 600, fontSize: 15, color: COLORS.ink }}>{p.name}</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginTop: 2 }}>
                  {p.regionName ?? "All regions"} · {p.leaveTypeName ?? "All leave types"} ·{" "}
                  months {p.tenureFromMonths}–{p.tenureToMonths ?? "∞"} ·{" "}
                  <span style={{ fontFamily: FONTS.mono }}>{p.method}</span>
                </div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <DeleteButton label={p.name} onConfirm={() => handleDelete(p)} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[
                ["Days per period", "rate", 0.01],
                ["Cap", "maxBalance", 0.5],
                ["Carryover max", "carryoverMax", 0.5],
                ["Tenure from", "tenureFromMonths", 1],
                ["Tenure to", "tenureToMonths", 1],
              ].map(([label, field, step]) => (
                <div key={field} style={{ flex: "1 1 110px" }}>
                  <FieldLabel>{label}</FieldLabel>
                  <input
                    type="number"
                    step={step}
                    defaultValue={p[field] ?? ""}
                    placeholder={field === "tenureToMonths" ? "no limit" : "none"}
                    disabled={savingId === p.id}
                    onBlur={(e) => {
                      const v = e.target.value;
                      if (String(v) === String(p[field] ?? "")) return;
                      save(p.id, { [field]: v === "" ? null : Number(v) });
                    }}
                    style={{ ...small, fontFamily: FONTS.mono }}
                  />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginTop: 16, maxWidth: 660, lineHeight: 1.6 }}>
        Edits apply to future accrual runs only. Entries already written are never
        rewritten, so changing a rate does not alter leave somebody has already
        earned — the ledger keeps the policy name each entry was created under.
      </div>
    </div>
  );
}
