import React from "react";
import { UserCircle } from "lucide-react";
import { COLORS, FONTS } from "../theme/colors";
import { useSession } from "../context/SessionContext";

/**
 * Demo-only "log in as" control.
 *
 * Multi-tier approval needs different people at each tier, so being able to
 * move between them without restarting the dev server is the difference
 * between a demonstrable flow and an unusable one. Delete this once real
 * authentication exists.
 */
export default function IdentitySwitcher() {
  const { currentUserId, switchUser, people, loadingPeople } = useSession();

  if (loadingPeople) return null;

  return (
    <label
      title="No authentication yet — this is a demo affordance"
      style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer" }}
    >
      <UserCircle size={15} color={COLORS.inkSoft} />
      <span style={{ fontFamily: FONTS.body, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: COLORS.inkSoft }}>
        Acting as
      </span>
      <select
        value={currentUserId}
        onChange={(e) => switchUser(e.target.value)}
        style={{
          fontFamily: FONTS.body,
          fontSize: 13,
          fontWeight: 600,
          color: COLORS.ink,
          background: COLORS.paperDim,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 8,
          padding: "5px 8px",
          cursor: "pointer",
          maxWidth: 220,
        }}
      >
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.managerName ? ` — reports to ${p.managerName}` : " — no manager"}
          </option>
        ))}
      </select>
    </label>
  );
}
