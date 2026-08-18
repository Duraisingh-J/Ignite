import React, { useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { COLORS, FONTS } from "../../theme/colors";
import { fmtDateFull } from "../../utils/dateHelpers";
import { fetchLedger, runAccrual } from "../../api/leaveApi";
import { useLeave } from "../../context/LeaveContext";
import { useSession } from "../../context/SessionContext";
import Card from "../../components/Card";
import Button from "../../components/Button";
import SectionLabel from "../../components/SectionLabel";

// Credits read positive, debits negative. Colour follows the sign so a column
// of numbers can be scanned without reading every label.
const ENTRY_LABEL = {
  OPENING: "Opening balance",
  ACCRUAL: "Accrued",
  CARRYOVER: "Carried over",
  DEDUCTION: "Leave taken",
  REVERSAL: "Returned",
  ADJUSTMENT: "Adjustment",
  EXPIRY: "Expired",
  ENCASHMENT: "Encashed",
};

export default function Balance() {
  const { balances, loading, reloadBalances } = useLeave();
  const { currentUserId } = useSession();
  const [selected, setSelected] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Default to the first type that actually has a policy behind it.
  useEffect(() => {
    if (!selected && balances.length) {
      const first = balances.find((b) => b.policyName) ?? balances[0];
      setSelected(first.leaveTypeId);
    }
  }, [balances, selected]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    fetchLedger(currentUserId, selected)
      .then((rows) => !cancelled && setLedger(rows))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [selected, currentUserId, balances]);

  async function handleRun() {
    setError("");
    setBusy(true);
    try {
      const res = await runAccrual(currentUserId);
      await reloadBalances();
      const rows = await fetchLedger(currentUserId, selected);
      setLedger(rows);
      if (res.entriesCreated === 0) {
        setError("Already up to date — nothing new to accrue.");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div style={{ fontFamily: FONTS.body, color: COLORS.inkSoft }}>Loading…</div>;
  }

  const current = balances.find((b) => b.leaveTypeId === selected);
  const th = {
    textAlign: "left", fontSize: 10.5, fontWeight: 700, letterSpacing: 0.08,
    textTransform: "uppercase", color: COLORS.inkSoft, padding: "10px 16px", whiteSpace: "nowrap",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <SectionLabel eyebrow="Balance">Leave balance</SectionLabel>
        <Button variant="ghost" onClick={handleRun} disabled={busy} style={{ fontSize: 13 }}>
          <RefreshCw size={13} /> {busy ? "Running…" : "Update accrual"}
        </Button>
      </div>

      {error && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: COLORS.paperDim, borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
          <AlertCircle size={15} color={COLORS.inkSoft} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.inkSoft }}>{error}</span>
        </div>
      )}

      {/* Type picker */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {balances.map((b) => (
          <button
            key={b.leaveTypeId}
            onClick={() => setSelected(b.leaveTypeId)}
            style={{
              fontFamily: FONTS.body, fontSize: 13, fontWeight: 600,
              padding: "7px 14px", borderRadius: 999, cursor: "pointer",
              border: `1px solid ${selected === b.leaveTypeId ? COLORS.navy : COLORS.line}`,
              background: selected === b.leaveTypeId ? COLORS.navy : "transparent",
              color: selected === b.leaveTypeId ? "#fff" : COLORS.inkSoft,
            }}
          >
            {b.leaveTypeName} · {b.displayBalance}
          </button>
        ))}
      </div>

      {current && (
        <>
          {/* The two figures that differ, and why */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 12 }}>
            {[
              ["Balance today", current.balance, COLORS.navy],
              ["Available to book", current.available, COLORS.teal],
              ["Awaiting approval", current.reserved, COLORS.gold],
              ["Taken", current.used, COLORS.inkSoft],
            ].map(([label, val, color]) => (
              <Card key={label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: FONTS.mono, fontWeight: 700, fontSize: 24, color }}>{val}</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginTop: 2 }}>{label}</div>
              </Card>
            ))}
          </div>

          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginBottom: 24, maxWidth: 640 }}>
            {Number(current.balance) !== Number(current.available)
              ? "These differ because leave booked for a future date is dated in the future — it is not yet gone from today's balance, but it cannot be booked twice."
              : "Nothing is currently held for a pending request, so both figures agree."}
            {current.policyName && <> Policy: <strong>{current.policyName}</strong>.</>}
          </div>

          <SectionLabel eyebrow="Every entry">How this balance was reached</SectionLabel>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {ledger.length === 0 ? (
              <div style={{ padding: 36, textAlign: "center", fontFamily: FONTS.body, color: COLORS.inkSoft, fontSize: 14 }}>
                No entries yet. Use <strong>Update accrual</strong> to bring this up to date.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONTS.body }}>
                  <thead>
                    <tr style={{ background: COLORS.paperDim }}>
                      <th style={th}>Date</th>
                      <th style={th}>Entry</th>
                      <th style={{ ...th, textAlign: "right" }}>Amount</th>
                      <th style={{ ...th, textAlign: "right" }}>Running</th>
                      <th style={th}>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((e, i) => {
                      const amount = Number(e.amount);
                      // The running total is what turns a list of entries into
                      // an explanation of the number at the top.
                      const running = ledger
                        .slice(0, i + 1)
                        .reduce((sum, x) => sum + Number(x.amount), 0);
                      return (
                        <tr key={e.id} style={{ borderTop: `1px solid ${COLORS.line}` }}>
                          <td style={{ padding: "9px 16px", fontFamily: FONTS.mono, fontSize: 12.5, color: COLORS.inkSoft, whiteSpace: "nowrap" }}>
                            {fmtDateFull(e.effectiveDate)}
                          </td>
                          <td style={{ padding: "9px 16px", fontSize: 13.5, color: COLORS.ink }}>
                            {ENTRY_LABEL[e.entryType] ?? e.entryType}
                          </td>
                          <td style={{ padding: "9px 16px", fontFamily: FONTS.mono, fontSize: 13, fontWeight: 600, textAlign: "right", whiteSpace: "nowrap", color: amount < 0 ? COLORS.clay : COLORS.teal }}>
                            {amount > 0 ? "+" : ""}{e.amount}
                          </td>
                          <td style={{ padding: "9px 16px", fontFamily: FONTS.mono, fontSize: 13, textAlign: "right", color: COLORS.ink }}>
                            {running.toFixed(2)}
                          </td>
                          <td style={{ padding: "9px 16px", fontSize: 12, color: COLORS.inkSoft }}>
                            {e.note || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.inkSoft, marginTop: 14, maxWidth: 640 }}>
            Entries are never edited or removed. A rejected request leaves both its
            deduction and the entry that returned the days, so the record shows the
            leave was asked for and refused rather than that it never happened.
          </div>
        </>
      )}
    </div>
  );
}
