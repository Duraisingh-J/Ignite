import React, { useEffect, useState } from "react";
import { AlertCircle, Check, Users } from "lucide-react";
import { COLORS, FONTS, inputStyle } from "../../theme/colors";
import {
  createLeaveType,
  fetchAllLeaveTypes,
  fetchRegions,
  updateLeaveType,
} from "../../api/leaveApi";
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
  const [savingId, setSavingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    regionId: "",
    isPaid: true,
    requiresApproval: true,
    approvalLevels: 1,
    escalateAboveDays: "",
  });

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
        approvalLevels: Number(form.approvalLevels),
        // Blank means duration never changes the approval depth.
        ...(form.escalateAboveDays
          ? { escalateAboveDays: Number(form.escalateAboveDays) }
          : {}),
      });
      setForm({ ...form, name: "", escalateAboveDays: "" });
      await reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Inline edit of approval depth. Existing chains are frozen, so this only
  // affects requests submitted from now on.
  async function saveConfig(id, patch) {
    setError("");
    setSavingId(id);
    try {
      await updateLeaveType(id, patch);
      await reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <div style={{ fontFamily: FONTS.body, color: COLORS.inkSoft }}>Loading…</div>;
  }

  const regionName = (id) => regions.find((r) => r.id === id)?.countryName ?? "—";

  return (
    <div>
      <SectionLabel eyebrow="New">Add leave type</SectionLabel>
      <Card style={{ maxWidth: 460, marginBottom: 32 }}>
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

        <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Approvals required</FieldLabel>
            <select
              value={form.approvalLevels}
              onChange={(e) => setForm({ ...form, approvalLevels: e.target.value })}
              style={inputStyle}
            >
              <option value={1}>1 — manager</option>
              <option value={2}>2 — + skip-level</option>
              <option value={3}>3 — + dept head</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel>Escalate above (days)</FieldLabel>
            <input
              type="number"
              min={1}
              max={365}
              value={form.escalateAboveDays}
              placeholder="none"
              onChange={(e) => setForm({ ...form, escalateAboveDays: e.target.value })}
              style={{ ...inputStyle, fontFamily: FONTS.mono }}
            />
          </div>
        </div>
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginBottom: 16 }}>
          A request longer than the escalation threshold needs one extra approval.
          Leave it blank if duration should never change the depth.
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {types.map((lt) => (
          <Card key={lt.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: FONTS.body, fontWeight: 600, fontSize: 15, color: COLORS.ink }}>{lt.label}</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft }}>
                  {regionName(lt.regionId)} · {lt.isPaid ? "Paid" : "Unpaid"}
                </div>
              </div>
              {!lt.isActive && <Badge status="Cancelled" />}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Users size={13} color={COLORS.inkSoft} />
              <span style={{ fontFamily: FONTS.body, fontSize: 12.5, color: COLORS.inkSoft }}>
                {lt.approvalLevels} approval{lt.approvalLevels !== 1 ? "s" : ""}
                {lt.escalateAboveDays
                  ? `, ${lt.approvalLevels + 1} over ${lt.escalateAboveDays} days`
                  : ""}
              </span>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <FieldLabel>Approvals</FieldLabel>
                <select
                  value={lt.approvalLevels}
                  disabled={savingId === lt.id}
                  onChange={(e) => saveConfig(lt.id, { approvalLevels: Number(e.target.value) })}
                  style={{ ...inputStyle, fontSize: 13, padding: "6px 8px" }}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <FieldLabel>Escalate &gt;</FieldLabel>
                <input
                  type="number"
                  min={1}
                  max={365}
                  defaultValue={lt.escalateAboveDays ?? ""}
                  placeholder="none"
                  disabled={savingId === lt.id}
                  onBlur={(e) => {
                    const v = e.target.value;
                    const current = lt.escalateAboveDays ?? "";
                    if (String(v) === String(current)) return;
                    saveConfig(
                      lt.id,
                      v ? { escalateAboveDays: Number(v) } : { clearEscalation: true }
                    );
                  }}
                  style={{ ...inputStyle, fontSize: 13, padding: "6px 8px", fontFamily: FONTS.mono }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginTop: 16, maxWidth: 620 }}>
        <Check size={12} style={{ display: "inline", marginRight: 5, verticalAlign: -1 }} />
        Changes apply to requests submitted from now on. Approval chains are frozen
        when a request is raised, so raising the tier count never reopens a request
        that has already been decided.
      </div>
    </div>
  );
}
