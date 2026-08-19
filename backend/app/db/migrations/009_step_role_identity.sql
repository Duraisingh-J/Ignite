-- =============================================================
-- 009 · A role step remembers WHICH role it was
--
-- build_chain() recorded role-based steps as approver_role = 'ROLE' and
-- nothing else. The literal string is all the read side had, so the timeline
-- rendered "Suresh · ROLE" — the raw enum — instead of naming the role the
-- person actually holds. Worse, there was no way to recover it: the step knew
-- an approver and a kind, never which role produced them.
--
-- Reading it back off leave_type.final_approver_role_id at display time would
-- have been cheaper and wrong. The chain is FROZEN at submit; if an admin
-- repoints a leave type from HR to Finance next month, a request approved by
-- HR last month must still say HR.
--
-- Additive and idempotent.
-- =============================================================

ALTER TABLE leave_request_approval
    ADD COLUMN IF NOT EXISTS approver_role_id UUID REFERENCES role(id) ON DELETE SET NULL;

-- Backfill history. For steps already written we only have the leave type's
-- current role, which is the best available evidence — and correct for every
-- request whose type has not been repointed since. Steps created from now on
-- record it at build time and never need this.
UPDATE leave_request_approval a
   SET approver_role_id = lt.final_approver_role_id
  FROM leave_request lr
  JOIN leave_type lt ON lt.id = lr.leave_type_id
 WHERE a.leave_request_id = lr.id
   AND a.approver_role = 'ROLE'
   AND a.approver_role_id IS NULL
   AND lt.final_approver_role_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_approval_role
    ON leave_request_approval (approver_role_id)
    WHERE approver_role_id IS NOT NULL;
