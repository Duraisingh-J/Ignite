# Ignite — Build Documentation

> **Dynamic PTO & Leave Management System** — a leave engine handling multi-tier
> approval workflows, calendars, holidays, and region-specific rules.

Built in vertical slices against a live PostgreSQL database. Every screen reads
and writes real data; there is no mock data anywhere in the application.

---

## 1. Status at a glance

| Capability | State |
| --- | --- |
| Employee leave request (apply, view, breakdown) | ✅ Live |
| Working-day engine (weekends + holidays) | ✅ Live |
| Recurring holidays (repeat every year) | ✅ Live |
| Multi-region with per-region working weeks | ✅ Live |
| Manager assignment & reassignment | ✅ Live |
| **Multi-tier approval chains** | ✅ Live |
| Manager & Admin consoles | ✅ Live |
| Balances / accrual engine | ⛔ Not built |
| Authentication | ⛔ Not built |

**Scale of the build:** 22 API endpoints · 7 tables · 10 commits.

---

## 2. Architecture

```
Browser (React + Vite, :5174)
   │  calls /api/v1/... same-origin
   ▼
Vite dev proxy ──────────────► FastAPI (:4000)
                                  │  routers  → validation (Pydantic in + out)
                                  │  services → business rules, engines
                                  │  repositories → SQL only
                                  ▼
                               PostgreSQL (:5432)
```

**Layering rule:** routers never touch SQL, repositories never contain business
rules. Every rule that matters lives in a service, so a crafted `curl` cannot
bypass it.

| Layer | Stack |
| --- | --- |
| Backend | Python 3.12 · FastAPI · psycopg3 (async pool) · Pydantic v2 |
| Database | PostgreSQL 18 |
| Frontend | React 18 · Vite 6 · React Router 7 |

---

## 3. Data model — 7 tables

```
Tenant ─┬─< Region ─┬─< HolidayCalendar        (recurrence: NONE | ANNUAL)
        │           └─< LeaveType              (approvalLevels, escalateAboveDays)
        │
        ├─< Employee ──< LeaveRequest ──< LeaveRequestApproval
        │      └── reports_to (self, optional, may cross regions)
        └─< LeaveRequest
```

Live row counts: `employee 17` · `leave_type 12` · `region 5` ·
`holiday_calendar 9` · `leave_request 15` · `leave_request_approval 17`.

The class diagram is kept in step with the schema in
`simple_leave_submission_model (6).mermaid`.

---

## 4. The three engines

### 4.1 Working days

`app/services/working_days.py` — a pure function over `datetime.date`, which
carries no timezone, so weekend detection cannot drift.

It excludes **non-working days for that region** (not hard-coded Sat/Sun) and
**that region's holidays**. A holiday landing on a non-working day is counted
once, never twice.

```
Same 7 days (1–7 Mar 2026), two regions:
  India  Mon–Fri  → 5 chargeable, excludes Sun 1 + Sat 7
  UAE    Sun–Thu  → 5 chargeable, excludes Fri 6 + Sat 7
```

### 4.2 Recurring holidays

A holiday is `ANNUAL` (month/day repeats every year; the stored year is only an
anchor) or `NONE` (that exact date only).

`ANNUAL` rows cannot be filtered by SQL `BETWEEN` — asking for August 2030 would
never match an anchor stored in 2026 — so they are fetched whole and expanded in
Python against the request's own range. Lunar festivals (Diwali, Eid) follow no
formula and are entered per year as `NONE`.

29 February in a non-leap year simply does not occur; observing it on the 28th
would be a policy decision, not a default.

### 4.3 Multi-tier approval

Two **independent** inputs decide a chain:

| Question | Source | Scope |
| --- | --- | --- |
| **WHO** approves | the employee's own reporting line | per employee |
| **HOW MANY** tiers | `leave_type.approval_levels` (+1 over `escalate_above_days`) | per region |

Depth lives on `leave_type` rather than a policy table because leave types are
**already region-scoped** — so approval depth becomes region-specific with no
scoping logic at all.

**The chain is frozen at submit.** Resolving approvers live would let an
org-chart change silently move an in-flight request to different hands, discard
an approval already given, and leave nobody able to answer who signed it off.

**Status is derived, never written:**

```
any step REJECTED  → REJECTED
any step PENDING   → PENDING
otherwise          → APPROVED
```

Writing `leave_request.status` by hand could leave a request reading `APPROVED`
while step 2 read `PENDING` — contradictory forever. The legacy
`PATCH /leave-requests/{id}` therefore routes through the current step.

**Enforced server-side:**

| Rule | Response |
| --- | --- |
| Step already decided | `409` with `decidedAt` |
| Caller is not that step's approver | `409` |
| An earlier tier still outstanding | `409` naming who it waits on |
| Reporting line shorter than required depth | step `SKIPPED`, request not blocked |
| Rejection at any tier | request `REJECTED`, later steps `SKIPPED` |

Earlier approvals **stay** `APPROVED` after a later rejection — the timeline
reads "approved by manager, overturned above", which is the information an audit
needs.

---

## 5. API — 22 endpoints

Success `{ "data": ... }` · Error `{ "error": { code, message, details } }`
(`GET /employees` also returns `meta` for pagination).

### Leave requests
| Method | Path |
| --- | --- |
| `POST` | `/api/v1/leave-requests` |
| `GET` | `/api/v1/leave-requests?employeeId=` |
| `GET` | `/api/v1/leave-requests/approvals?approverId=` |
| `GET` | `/api/v1/leave-requests/on-leave?managerId=` |
| `GET` | `/api/v1/leave-requests/{id}/approvals` |
| `PATCH` | `/api/v1/leave-requests/{id}/approvals/{stepId}` |
| `PATCH` | `/api/v1/leave-requests/{id}` |

### Employees
| Method | Path |
| --- | --- |
| `GET` | `/api/v1/employees?tenantId=&limit=&offset=` |
| `POST` | `/api/v1/employees` |
| `GET` | `/api/v1/employees/{id}` |
| `PATCH` | `/api/v1/employees/{id}` |
| `GET` | `/api/v1/employees/{id}/holidays` |
| `GET` | `/api/v1/employees/{id}/team?onDate=` |

### Configuration
| Method | Path |
| --- | --- |
| `GET` `POST` | `/api/v1/leave-types` |
| `PATCH` | `/api/v1/leave-types/{id}` |
| `GET` `POST` | `/api/v1/holidays` |
| `GET` `POST` | `/api/v1/regions` |
| `GET` | `/api/v1/stats?tenantId=` |
| `GET` | `/api/v1/health` |

### Error codes
| Code | HTTP | Trigger |
| --- | --- | --- |
| `BAD_REQUEST` | 400 | Validation or a broken domain rule |
| `NOT_FOUND` | 404 | Unknown id or route |
| `CONFLICT` | 409 | Duplicate, overlap, illegal transition, out-of-turn approval |
| `DATABASE_UNAVAILABLE` | 503 | Postgres unreachable (message names the fix) |

### Validation

Requests extend a **strict** base (`extra="forbid"`) — a misspelled field is a
400, not a silently ignored no-op. Responses extend a **lenient** base and are
validated by `response_model` on every route, so a repository returning an
unexpected shape fails loudly instead of reaching the browser.

Cross-entity checks run in services: region must belong to the tenant, manager
must share the tenant, leave type must match the employee's region, no
overlapping request, no reporting cycle.

---

## 6. UI map

| Section | Screens |
| --- | --- |
| **Employee** | Dashboard · Apply Leave · My Requests · Eligible Types · Holidays · Profile |
| **Manager** | Dashboard · Approvals · Team · Team Calendar |
| **Admin** | Dashboard · Employees · Leave Types · Policies · Regions · Holidays |

**Identity switcher.** There is no authentication, so a top-bar dropdown selects
who you are acting as, persisted to localStorage. On the Manager screens it is
filtered to people who actually have direct reports — and auto-selects one,
because landing there as a non-manager shows empty counters that look like a
bug. This is what makes multi-tier demonstrable: tier 1 and tier 2 are different
people.

**Client/server split.** Client-side checks are for responsiveness only. The
Apply Leave day preview mirrors the server's calculation so the form updates on
every keystroke, but the server recomputes authoritatively on submit and its
answer wins.

---

## 7. Running it

```bash
# Backend
cd backend
cp .env.example .env          # set PGPASSWORD
python -m venv venv
venv/Scripts/python.exe -m pip install -r requirements.txt
venv/Scripts/python.exe -m scripts.migrate_up   # additive, safe on live data
venv/Scripts/python.exe -m scripts.seed
venv/Scripts/python.exe run.py                  # :4000

# Frontend
cd ../leave-app
npm install && npm run dev                      # :5174
```

| | URL |
| --- | --- |
| App | http://localhost:5174 |
| API docs | http://127.0.0.1:4000/docs |

**Two operational cautions:**

- Use `scripts.migrate_up`, **not** `scripts.migrate` — the latter drops and
  recreates the schema and would destroy existing requests.
- `run.py`, not bare `uvicorn` — on Windows the default `ProactorEventLoop` is
  incompatible with psycopg's async mode, and uvicorn only switches loops when
  it spawns subprocesses. Bare uvicorn works in dev and fails in production.

`scripts/repair_chains.py` rebuilds approval chains for any request missing one.

---

## 8. Engineering log — bugs found and fixed

Each of these would have been painful to diagnose later.

| # | Bug | Why it mattered |
| --- | --- | --- |
| 1 | Weekend detection mixed local `getDay()` with UTC `toISOString()` | Misidentified weekends in any negative-offset timezone |
| 2 | Windows `ProactorEventLoop` incompatible with psycopg async | Worked in dev, failed in production — the worst failure mode |
| 3 | DSN not URL-encoded | A password containing `@` resolved to the wrong host |
| 4 | Pool served stale connections | Intermittent 503s on the first request after idle |
| 5 | DB config errors surfaced as 30s hangs then an opaque 500 | Now 5s + `503` naming the fix + startup probe |
| 6 | UI preview ignored recurring holidays outside the anchor year | Form said 3 days, confirmation said 2 |
| 7 | Read paths ignored recurrence while submit honoured it | A request changed size depending on where you looked |
| 8 | `management_chain()` had no `ORDER BY` | Tiers are assigned positionally — tier 1 could become the skip-level |
| 9 | `toUiLeaveType` dropped the new fields | Admin editor would render "undefined approvals" |
| 10 | One request had no approval chain | Unapprovable, `PENDING` forever, with no error anywhere |

**A recurring theme.** Bugs 6, 7 and 10 are the same defect class: `workingDays`
is *recomputed everywhere* rather than stored once, so every consumer must
independently get the rules right and any one can silently drift.

**Recommended next schema change:** snapshot the breakdown onto `leave_request`
at submit. It eliminates the whole class, and also fixes the related issue that
editing a holiday calendar today retroactively changes the day count of
already-approved requests.

---

## 9. Not built — and how the door was left open

| Missing | Notes |
| --- | --- |
| **Authentication** | The API trusts whatever id it is given. Any caller can act as anyone. **The blocker before any real deployment.** |
| **Balances / accrual** | No balance columns exist. Recommended design is an append-only ledger (`ACCRUAL`, `CARRYOVER`, `DEDUCTION`, `EXPIRY`) where a balance is the sum of entries up to a date — giving audit trail, retroactive correction and point-in-time balances for free. |
| Role-based approvers (HR, Finance) | HR is a *role*, not a rung — walking the reporting line can never produce it. Needs a `role` / `employee_role` table. |
| Parallel approvals ("any 2 of 3") | `step_order` already permits duplicates; add a `quorum` column. |
| SLA escalation / auto-approve | `decided_at` is already recorded; a scheduled job can read it. |
| Delegation while an approver is away | Resolution is one function — add a delegate lookup inside it. |
| Half-days | Day counts would move from `int` to `decimal`. |

Rather than fake these, the UI states plainly what is not modelled — the Admin
Policies screen says so directly instead of showing placeholder accrual rates.

---

## 10. Commit history

```
8f51c92  feat(approvals): multi-tier approval chains, frozen at submit
22ef866  feat(employees): manager assignment on create, and reassignment via PATCH
69d31de  feat(regions): multi-region support with per-region working weeks
d9680f3  fix(holidays): read paths ignored recurring rules, disagreeing with submit
9ba1fde  fix(ui): preview missed recurring holidays outside the anchor year
c346953  feat(holidays): recurring holidays that apply to any future year
86ca2e1  feat: back every screen with real APIs, harden request/response validation
6594050  chore(seed): add 10 employees to the demo dataset
1913f5e  feat: employee leave request slice — FastAPI + PostgreSQL + React
b9804bb  chore: initialise the project setup
```

Repository: <https://github.com/Duraisingh-J/Ignite>
