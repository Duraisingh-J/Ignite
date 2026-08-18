import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, AlertCircle } from "lucide-react";
import { COLORS, FONTS, inputStyle } from "../../theme/colors";
import { calcLeaveBreakdown, fmtDateFull } from "../../utils/dateHelpers";
import { useLeave } from "../../context/LeaveContext";
import Card from "../../components/Card";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import SectionLabel from "../../components/SectionLabel";
import FieldLabel from "../../components/FieldLabel";

export default function ApplyLeave() {
  const { employee, leaveTypes, holidays, addRequest, loading, error: loadError } = useLeave();
  const location = useLocation();
  const preselect = location.state?.preselect; // set when arriving from "Eligible Leave Types"

  const [typeId, setTypeId] = useState(preselect ?? "");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Default to the first type once the region's types have loaded.
  useEffect(() => {
    if (!typeId && leaveTypes.length > 0) setTypeId(leaveTypes[0].id);
  }, [leaveTypes, typeId]);

  const breakdown = useMemo(
    () => calcLeaveBreakdown(start, end, holidays, employee?.regionWorkDays),
    [start, end, holidays, employee]
  );

  async function handleSubmit() {
    setError("");
    if (!typeId) return setError("Pick a leave type.");
    if (!start || !end) return setError("Pick both a start and end date.");
    if (end < start) return setError("End date can't be before the start date.");
    if (!reason.trim()) return setError("Add a short reason before submitting.");

    setBusy(true);
    try {
      const created = await addRequest({
        leaveTypeId: typeId,
        startDate: start,
        endDate: end,
        reason: reason.trim(),
      });
      setSubmitted(created);
    } catch (e) {
      // Server-side rules (overlap, all-weekend range, wrong region) land here.
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div style={{ fontFamily: FONTS.body, color: COLORS.inkSoft }}>Loading…</div>;
  }

  if (loadError) {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: COLORS.claySoft, borderRadius: 8, padding: "12px 14px", maxWidth: 480 }}>
        <AlertCircle size={15} color={COLORS.clay} style={{ flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.clay }}>
          {loadError.message}
        </span>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ maxWidth: 480 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <div style={{ background: COLORS.tealSoft, borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={16} color={COLORS.teal} strokeWidth={3} />
          </div>
          <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: 20, color: COLORS.ink }}>
            Leave request submitted
          </div>
        </div>

        <Card style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
            <div style={{ fontFamily: FONTS.body, fontWeight: 600, fontSize: 15 }}>{submitted.type}</div>
            <Badge status={submitted.status} />
          </div>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.inkSoft }}>
            {fmtDateFull(submitted.start)} – {fmtDateFull(submitted.end)} · {submitted.days} working day{submitted.days !== 1 ? "s" : ""}
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.inkSoft, marginTop: 10 }}>
            Request ID: {submitted.id}
          </div>
        </Card>

        <Button
          variant="ghost"
          onClick={() => {
            setSubmitted(null);
            setReason("");
            setStart("");
            setEnd("");
          }}
        >
          Apply for another
        </Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <SectionLabel eyebrow="New request">Apply for leave</SectionLabel>

      <div style={{ marginBottom: 16 }}>
        <FieldLabel>Leave type</FieldLabel>
        <select value={typeId} onChange={(e) => setTypeId(e.target.value)} style={inputStyle}>
          {leaveTypes.map((lt) => (
            <option key={lt.id} value={lt.id}>{lt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <FieldLabel>Start date</FieldLabel>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <FieldLabel>End date</FieldLabel>
          <input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <FieldLabel>Reason</FieldLabel>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What's this leave for?"
          rows={3}
          style={{ ...inputStyle, resize: "vertical", fontFamily: FONTS.body }}
        />
      </div>

      {breakdown && (
        <Card style={{ background: COLORS.paperDim, border: "none", marginBottom: 20 }}>
          <div style={{ fontFamily: FONTS.body, fontWeight: 700, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: COLORS.inkSoft, marginBottom: 12 }}>
            System calculation
          </div>
          {[
            ["Selected days", breakdown.calendarDays],
            ["Weekend days", breakdown.weekend],
            ["Holidays", breakdown.holiday],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontFamily: FONTS.body, fontSize: 13, padding: "4px 0" }}>
              <span style={{ color: COLORS.inkSoft }}>{label}</span>
              <span style={{ fontFamily: FONTS.mono, fontWeight: 600, color: COLORS.ink }}>{val}</span>
            </div>
          ))}
          <div style={{ height: 1, background: COLORS.line, margin: "8px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONTS.body, fontSize: 13, fontWeight: 700 }}>
            <span style={{ color: COLORS.ink }}>Chargeable leave</span>
            <span style={{ fontFamily: FONTS.mono, color: breakdown.chargeable <= 0 ? COLORS.clay : COLORS.navy }}>
              {breakdown.chargeable}
            </span>
          </div>
        </Card>
      )}

      {error && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: COLORS.claySoft, borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
          <AlertCircle size={15} color={COLORS.clay} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.clay }}>{error}</span>
        </div>
      )}

      <Button onClick={handleSubmit} disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
        {busy ? "Submitting…" : "Submit Request"}
      </Button>
    </div>
  );
}
