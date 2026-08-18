# Multi-Tier Approval

> Status: **code complete, not yet migrated or tested.** Bash tooling was
> unavailable when this was written — see *Running it* below.

## What it does

A leave request can require more than one approval. How many, and from whom, is
decided per request rather than hardcoded.

```
Ravi requests 3 days Casual   ->  Priya                    (1 tier)
Ravi requests 5 days Casual   ->  Priya -> Aarti           (2 tiers, escalated)
Ravi requests 4 days Annual   ->  Priya -> Aarti           (2 tiers, always)
Layla requests 3 days Annual  ->  Omar  -> ...             (UAE rules)
```

## Two independent inputs

This is the core idea, and the thing most often tangled together:

| Question | Answer comes from | Scope |
| --- | --- | --- |
| **WHO** approves | The employee's own reporting line | per employee |
| **HOW MANY** tiers | `leave_type.approval_levels` (+1 over `escalate_above_days`) | per region |

Depth lives on `leave_type` rather than a separate policy table. Leave types are
**already region-scoped**, so this makes approval depth region-specific for free:
India's *Annual Leave* can require two approvals while the UAE's requires one,
with no scoping logic anywhere.

## The chain is frozen at submit

When a request is created, the approvers are resolved and written as rows.

**Why not resolve them live on every page load?** If the org chart changes while
a request is in review — someone gets reassigned, an employee moves region — a
live chain would silently change hands. An earlier approval would evaporate, a
new approver would be asked to re-approve, and nobody could answer *who actually
signed this off*. Freezing means a request completes under the org chart that
existed when it was raised.

## Status is derived, never set

`leave_request.status` is a **cache** of the chain's state:

| Chain state | Request status |
| --- | --- |
| Any step `REJECTED` | `REJECTED` |
| Any step `PENDING` | `PENDING` |
| All decided, none rejected | `APPROVED` |

Writing `leave_request.status` directly would let a request read `APPROVED`
while step 2 still reads `PENDING` — permanently contradictory. The legacy
`PATCH /leave-requests/{id}` therefore no longer writes the status for
approve/reject; it routes through the current step and lets the derivation run.

## Rules enforced server-side

| Rule | Response |
| --- | --- |
| Step already decided | `409` with `decidedAt` |
| Caller is not that step's approver | `409` |
| An earlier tier is still outstanding | `409` with who it is waiting on |
| Reporting line shorter than required depth | Step recorded `SKIPPED`, request not blocked |
| Rejection at any tier | Request `REJECTED`, remaining steps `SKIPPED` |

The skip behaviour matters: an employee with no manager would otherwise sit
`PENDING` forever in a queue nobody owns.

Earlier approvals **stay** `APPROVED` after a later rejection. The history reads
"approved by the manager, overturned above" — collapsing that to a single
`REJECTED` would destroy the interesting information.

## Schema

```sql
ALTER TABLE leave_type
  ADD approval_levels     SMALLINT NOT NULL DEFAULT 1,  -- 1..3
  ADD escalate_above_days SMALLINT NULL;                -- NULL = duration irrelevant

CREATE TABLE leave_request_approval (
  id, leave_request_id,
  step_order    SMALLINT,   -- 1-based; duplicates allowed (future parallel tiers)
  approver_id   UUID NULL,  -- NULL = line ran out -> SKIPPED
  approver_role TEXT,       -- MANAGER | SKIP_LEVEL | DEPT_HEAD
  status        TEXT,       -- PENDING | APPROVED | REJECTED | SKIPPED
  comment       TEXT,
  decided_at    TIMESTAMPTZ,
  UNIQUE (leave_request_id, step_order)
);
```

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/leave-requests/{id}/approvals` | The frozen chain — drives the Stepper |
| `PATCH` | `/api/v1/leave-requests/{id}/approvals/{stepId}` | Approve/reject one tier |
| `GET` | `/api/v1/leave-requests/approvals?approverId=` | What is waiting on me, **any tier** |
| `PATCH` | `/api/v1/leave-types/{id}` | Change approval depth |

`approverId` replaces `managerId` for the queue. A tier-2 approver is **not**
the direct manager of the requests they must sign off, so a `manager_id` lookup
would never surface them. `managerId` still works for the older direct-reports
view.

## Files

```
backend/
  app/db/migrations/002_multi_tier_approval.sql   schema + backfill of existing requests
  app/db/migrations/003_approval_seed.sql         Aarti above Priya; per-type depth
  app/repositories/approval_repository.py         step CRUD, actionable-step query
  app/services/approval_service.py                resolution + state machine
  scripts/migrate_up.py                           ordered, once-only migration runner
leave-app/
  src/components/Stepper.jsx                      now renders APPROVED/REJECTED/SKIPPED
  src/pages/manager/Approvals.jsx                 tier-aware, with comments
  src/pages/employee/MyRequests.jsx               approval timeline
  src/pages/admin/LeaveTypes.jsx                  edit depth per type
```

## Running it

```bash
cd backend
venv/Scripts/python.exe -m scripts.migrate_up    # additive, safe on live data
venv/Scripts/python.exe run.py

cd ../leave-app && npm run dev
```

`migrate_up.py` records applied filenames in `schema_migrations`, so re-running
is a no-op. It is **not** `scripts.migrate`, which drops and recreates the
schema and would destroy existing requests.

The backfill in `002` gives every pre-existing request a single step matching
its current status, so old requests render a timeline instead of a blank one and
`PENDING` ones stay actionable.

## Demo script

1. **3 days Casual** → one approval → Priya approves → done.
2. **5 days Casual** → escalation threshold is 3 → **two** approvals. Priya
   approves; request stays `PENDING`, now waiting on Aarti. Aarti approves →
   `APPROVED`.
3. **Admin → Leave Types**: change Sick Leave to 2 approvals. Submit a new sick
   request → now needs two. **No deploy.**
4. **Reject at tier 2**: Priya's approval remains `APPROVED`, request is
   `REJECTED`. Real audit trail.

Step 3 is the one that demonstrates "dynamic" rather than "hardcoded".

## Deliberately not built

| Deferred | How the door was left open |
| --- | --- |
| Role-based approvers (HR, Finance) | HR is a *role*, not a rung — walking the line can never produce it. Needs a `role` / `employee_role` table. |
| Parallel approvals ("any 2 of 3") | `step_order` already permits duplicates; add a `quorum` column. |
| SLA escalation / auto-approve | `decided_at` is already recorded; a scheduled job can read it. |
| Delegation while an approver is away | Resolution is one function — add a delegate lookup inside it. |
| Conditional branching | Needs a real workflow engine. Out of scope. |

`leave_request_approval` is unchanged by any of these, which is deliberate — it
is the expensive table to get wrong.
