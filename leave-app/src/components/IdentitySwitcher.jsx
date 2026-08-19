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
 * @param {boolean} managersOnly  restrict the list to people who can actually
 *   approve something. On the manager screens, offering employees who approve
 *   nothing just produces three zeros and looks broken.
 */
/** How this person comes to be an approver: by hierarchy, by role, or both. */
function describeApprover(p) {
  const parts = [];
  if (p.reports > 0) parts.push(`${p.reports} report${p.reports === 1 ? "" : "s"}`);
  if (p.roles.length > 0) parts.push(p.roles.join(", "));
  return parts.join(" · ") || "no reports";
}

export default function IdentitySwitcher({ managersOnly = false }) {
  const { currentUserId, switchUser, people, loadingPeople, roleHolders } = useSession();

  // Everyone who can approve — which is NOT the same as everyone who manages.
  // A role holder (HR, Finance) sits outside the reporting line entirely and
  // has no reports at all, so filtering on report count alone hid them from
  // this list and left their steps with no way to be actioned.
  const approvers = useMemo(() => {
    const reportCounts = new Map();
    for (const p of people) {
      if (p.managerId) {
        reportCounts.set(p.managerId, (reportCounts.get(p.managerId) ?? 0) + 1);
      }
    }
    return people
      .filter((p) => reportCounts.has(p.id) || roleHolders.has(p.id))
      .map((p) => ({
        ...p,
        reports: reportCounts.get(p.id) ?? 0,
        roles: roleHolders.get(p.id) ?? [],
      }));
  }, [people, roleHolders]);

  const options = managersOnly ? approvers : people;

  // Landing on the manager screens as someone who approves nothing shows empty
  // counters that look like a bug, so move to a real approver instead. This
  // must run off `approvers`, not the managers subset — bouncing away from a
  // role holder is exactly what stranded HR before.
  useEffect(() => {
    if (!managersOnly || approvers.length === 0) return;
    if (!approvers.some((m) => m.id === currentUserId)) {
      switchUser(approvers[0].id);
    }
  }, [managersOnly, approvers, currentUserId, switchUser]);

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
              ? `${p.name} — ${describeApprover(p)}`
              : `${p.name}${p.managerName ? ` — reports to ${p.managerName}` : " — no manager"}`}
          </option>
        ))}
      </select>
    </label>
  );
}
