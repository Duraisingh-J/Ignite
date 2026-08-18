import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  FieldLabel,
  Input,
  SectionLabel,
  Select,
  Textarea,
} from "../components/primitives.jsx";
import { fmtDateFull } from "../format.js";
import { api } from "../api.js";

// Live preview of the working-day breakdown. The server recomputes this
// authoritatively on submit; this only keeps the form responsive.
function previewBreakdown(startStr, endStr, holidayDates) {
  if (!startStr || !endStr) return null;
  const [ys, ms, ds] = startStr.split("-").map(Number);
  const [ye, me, de] = endStr.split("-").map(Number);
  const start = new Date(Date.UTC(ys, ms - 1, ds));
  const end = new Date(Date.UTC(ye, me - 1, de));
  if (end < start) return null;

  const holidays = new Set(holidayDates);
  let calendarDays = 0;
  let weekend = 0;
  let holiday = 0;
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    calendarDays += 1;
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) weekend += 1;
    else if (holidays.has(d.toISOString().slice(0, 10))) holiday += 1;
  }
  return { calendarDays, weekend, holiday, chargeable: calendarDays - weekend - holiday };
}

export default function ApplyLeave({ employee, leaveTypes, holidays, onSubmitted }) {
  const [typeId, setTypeId] = useState(leaveTypes[0]?.id ?? "");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!typeId && leaveTypes[0]) setTypeId(leaveTypes[0].id);
  }, [leaveTypes, typeId]);

  const holidayDates = useMemo(() => holidays.map((h) => h.date), [holidays]);
  const breakdown = useMemo(
    () => previewBreakdown(start, end, holidayDates),
    [start, end, holidayDates]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!typeId) return setError("Pick a leave type.");
    if (!start || !end) return setError("Pick both a start and end date.");
    if (end < start) return setError("End date can't be before the start date.");
    if (!reason.trim()) return setError("Add a short reason before submitting.");

    setBusy(true);
    try {
      const created = await api.submitRequest({
        employeeId: employee.id,
        leaveTypeId: typeId,
        startDate: start,
        endDate: end,
        reason: reason.trim(),
      });
      setSubmitted(created);
      onSubmitted?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg">
        <div className="mb-5 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-soft">
            <Check size={16} className="text-teal" strokeWidth={3} />
          </span>
          <h2 className="font-display text-xl font-semibold text-ink">
            Leave request submitted
          </h2>
        </div>

        <Card className="mb-5">
          <div className="mb-2 flex items-start justify-between gap-3">
            <span className="text-[15px] font-semibold text-ink">
              {submitted.leaveTypeName}
            </span>
            <Badge status={submitted.status} />
          </div>
          <p className="text-sm text-ink-soft">
            {fmtDateFull(submitted.startDate)} – {fmtDateFull(submitted.endDate)} ·{" "}
            {submitted.workingDays} working day{submitted.workingDays !== 1 ? "s" : ""}
          </p>
          <p className="mt-2.5 font-mono text-xs text-ink-soft">
            Request ID: {submitted.id}
          </p>
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
    <form onSubmit={handleSubmit} className="max-w-lg">
      <SectionLabel eyebrow="New request">Apply for leave</SectionLabel>

      <div className="mb-4">
        <FieldLabel htmlFor="leaveType">Leave type</FieldLabel>
        <Select id="leaveType" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
          {leaveTypes.map((lt) => (
            <option key={lt.id} value={lt.id}>
              {lt.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="mb-4 flex gap-3">
        <div className="flex-1">
          <FieldLabel htmlFor="start">Start date</FieldLabel>
          <Input
            id="start"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <FieldLabel htmlFor="end">End date</FieldLabel>
          <Input
            id="end"
            type="date"
            value={end}
            min={start || undefined}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-5">
        <FieldLabel htmlFor="reason">Reason</FieldLabel>
        <Textarea
          id="reason"
          rows={3}
          value={reason}
          placeholder="What's this leave for?"
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      {breakdown && (
        <div className="mb-5 rounded-2xl bg-paper-dim p-5">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-soft">
            System calculation
          </div>
          {[
            ["Selected days", breakdown.calendarDays],
            ["Weekend days", breakdown.weekend],
            ["Holidays", breakdown.holiday],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between py-1 text-sm">
              <span className="text-ink-soft">{label}</span>
              <span className="font-mono font-semibold text-ink">{val}</span>
            </div>
          ))}
          <div className="my-2 h-px bg-line" />
          <div className="flex justify-between text-sm font-bold">
            <span className="text-ink">Chargeable leave</span>
            <span
              className={`font-mono ${breakdown.chargeable <= 0 ? "text-clay" : "text-navy"}`}
            >
              {breakdown.chargeable}
            </span>
          </div>
        </div>
      )}

      {error && (
        <Alert>
          <AlertCircle size={15} className="mt-px shrink-0" />
          <span>{error}</span>
        </Alert>
      )}

      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Submitting…" : "Submit Request"}
      </Button>
    </form>
  );
}
