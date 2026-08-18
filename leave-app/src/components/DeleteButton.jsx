import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { COLORS, FONTS } from "../theme/colors";

/**
 * Small, quiet delete affordance with an inline confirm.
 *
 * Deliberately low-contrast until hovered: destructive actions should be
 * findable, not the first thing the eye lands on. The confirm is inline rather
 * than a browser dialog so the consequence text sits next to the thing being
 * removed.
 *
 * @param {string}   label     what is being deleted, shown in the confirm
 * @param {string}   warning   optional consequence, e.g. "also removes 3 leave types"
 * @param {boolean}  disabled  blocked by a dependency
 * @param {string}   disabledReason  tooltip explaining why
 * @param {Function} onConfirm async; errors are surfaced by the caller
 */
export default function DeleteButton({
  label,
  warning,
  disabled = false,
  disabledReason,
  onConfirm,
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (armed) {
    // Full width so it drops onto its own line rather than competing with a
    // card title for horizontal space — the name being deleted is already
    // visible right next to it, so the prompt does not need to repeat it.
    return (
      <span
        style={{
          display: "flex", width: "100%", flexWrap: "wrap", gap: 8,
          alignItems: "center", justifyContent: "flex-end",
          background: COLORS.claySoft, borderRadius: 8, padding: "8px 10px",
        }}
      >
        <span style={{ flex: "1 1 120px", fontFamily: FONTS.body, fontSize: 12, color: COLORS.clay, minWidth: 0 }}>
          Delete?
          {warning && (
            <span style={{ display: "block", color: COLORS.inkSoft, fontSize: 11.5, marginTop: 2 }}>
              {warning}
            </span>
          )}
        </span>
        <button
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
              setArmed(false);
            }
          }}
          disabled={busy}
          style={{
            fontFamily: FONTS.body, fontSize: 12, fontWeight: 600,
            padding: "4px 10px", borderRadius: 7, cursor: busy ? "wait" : "pointer",
            border: "none", background: COLORS.clay, color: "#fff",
          }}
        >
          {busy ? "Deleting…" : "Delete"}
        </button>
        <button
          onClick={() => setArmed(false)}
          disabled={busy}
          style={{
            fontFamily: FONTS.body, fontSize: 12, fontWeight: 600,
            padding: "4px 10px", borderRadius: 7, cursor: "pointer",
            border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.inkSoft,
          }}
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setArmed(true)}
      disabled={disabled}
      title={disabled ? disabledReason : `Delete ${label}`}
      aria-label={`Delete ${label}`}
      style={{
        display: "inline-grid", placeItems: "center",
        width: 28, height: 28, borderRadius: 7,
        border: "none", background: "transparent",
        color: disabled ? COLORS.line : COLORS.inkSoft,
        opacity: disabled ? 0.5 : 0.55,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "opacity .12s ease, color .12s ease, background .12s ease",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.opacity = "1";
        e.currentTarget.style.color = COLORS.clay;
        e.currentTarget.style.background = COLORS.claySoft;
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.opacity = "0.55";
        e.currentTarget.style.color = COLORS.inkSoft;
        e.currentTarget.style.background = "transparent";
      }}
    >
      <Trash2 size={15} />
    </button>
  );
}
