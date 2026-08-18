import React, { useEffect, useMemo } from "react";
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
 *
 * @param {boolean} managersOnly  restrict the list to people who actually have
 *   direct reports. On the manager screens, offering employees who approve
 *   nothing just produces three zeros and looks broken.
 */
export default function IdentitySwitcher({ managersOnly = false }) {
  const { currentUserId, switchUser, people, loadingPeople } = useSession();

  // Anyone who is somebody's manager. Derived from the list already loaded, so
  // this needs no extra request. Includes skip-level approvers such as a
  // manager's own manager.
  const managers = useMemo(() => {
    const reportCounts = new Map();
    for (const p of people) {
      if (p.managerId) {
        reportCounts.set(p.managerId, (reportCounts.get(p.managerId) ?? 0) + 1);
      }
    }
    return people
      .filter((p) => reportCounts.has(p.id))
      .map((p) => ({ ...p, reports: reportCounts.get(p.id) }));
  }, [people]);

  const options = managersOnly ? managers : people;

  // Landing on the manager screens as someone who manages nobody shows empty
  // counters that look like a bug, so move to a real approver instead.
  useEffect(() => {
    if (!managersOnly || managers.length === 0) return;
    if (!managers.some((m) => m.id === currentUserId)) {
      switchUser(managers[0].id);
    }
  }, [managersOnly, managers, currentUserId, switchUser]);

  if (loadingPeople || options.length === 0) return null;

  return (
    <label
      title="No authentication yet — this is a demo affordance"
      style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer" }}
    >
      <UserCircle size={15} color={COLORS.inkSoft} />
      <span style={{ fontFamily: FONTS.body, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: COLORS.inkSoft }}>
        {managersOnly ? "Approver" : "Acting as"}
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
          maxWidth: 240,
        }}
      >
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {managersOnly
              ? `${p.name} — ${p.reports} report${p.reports === 1 ? "" : "s"}`
              : `${p.name}${p.managerName ? ` — reports to ${p.managerName}` : " — no manager"}`}
          </option>
        ))}
      </select>
    </label>
  );
}
