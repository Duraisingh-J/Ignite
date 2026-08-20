# Ignite — Dynamic PTO & Leave Management System

> **Problem statement:** Design a leave management engine that handles multi-tier
> approval workflows, calendars, dynamic accrual calculations, and holidays.

Built in **vertical slices**, running end-to-end against PostgreSQL. Every
screen reads and writes real data — there is no mock data in the application.

📘 **[Full build documentation →](docs/BUILD.md)**  ·  🔀 **[Multi-tier approval →](docs/multi-tier-approval.md)**  ·  📐 **[Accrual spec →](docs/ACCRUAL-SPEC.md)**  ·  🔔 **[Notifications →](docs/NOTIFICATIONS.md)**  ·  🗺️ **[Feature map →](docs/FEATURE-MAP.md)**  ·  🧩 **[Class model →](docs/meridian_class_model.mermaid)**

---

## Status

| Area | State |
| --- | --- |
| Employee leave request (apply + view own requests) | ✅ Live |
| Region-scoped leave types & holiday calendars | ✅ Live |
| Working-day engine (per-region working week + holidays) | ✅ Live |
| Recurring holidays (repeat every year) | ✅ Live |
| Multi-region (India, US, UK, UAE) | ✅ Live |
| Manager assignment & reassignment | ✅ Live |
| **Multi-tier approval workflow** | ✅ Live |
| Role-based approvers (HR outside the reporting line) | ✅ Live |
| Manager & Admin consoles | ✅ Live |
| **Dynamic accrual engine** (4 methods, tenure bands, ledger) | ✅ Live |
| Balances, reservation & the ledger behind them | ✅ Live |
| Admin-editable accrual policies with gap detection | ✅ Live |
| **Notifications** — Slack + email on every leave event | ✅ Live |
| **Authentication** — tenant admin, JWT, no bypass | ✅ Live |
| Year-end carryover / expiry run | ⛔ Paused — caps act as lifetime ceilings |
| Employee-level authentication | ⛔ Not built — one credential gates the app |
| Leave date bounds (earliest / latest / notice) | ⛔ Not built — a 2005 request is accepted |

**40 API endpoints · 12 tables · 10 migrations.** Live path: browser → Vite
proxy → FastAPI → PostgreSQL → back into the UI. Every route requires a signed
token except `POST /auth/login` and `GET /health`.

---

## Stack

| Layer | Choice |
| --- | --- |
| Backend | Python 3.12 · FastAPI · psycopg3 (async pool) · Pydantic v2 |
| Database | PostgreSQL 18 |
| Frontend | React 18 · Vite 6 · React Router 7 |
| API | REST, versioned at `/api/v1` |

---

## Repository layout

```
backend/                 FastAPI service
  run.py                 entry point (installs a psycopg-safe event loop on Windows)
  app/
    main.py              app factory, CORS, exception handlers, startup DB probe
    config.py            pydantic-settings env parsing, DSN builder
    db.py                async connection pool
    schemas.py           Pydantic models (camelCase aliases for the client)
    errors.py            ApiError + JSON error envelope
    db/schema.sql        base tables; db/migrations/ carries 010 onward
    db/seed.sql          demo tenant / region / employees / leave types / holidays
    auth/                tenant-admin JWT: passwords, tokens, guard (pluggable)
    notifications/       Slack + email on leave events (pluggable)
    repositories/        SQL only
    services/            business rules, incl. working_days calculator
    routers/v1/          versioned routers
  scripts/               migrate_up.py, seed.py, create_admin.py, repair_chains.py

leave-app/               PRIMARY UI — routed app (employee / manager / admin)
  src/api/               API client + adapters (API shape -> UI shape)
  src/context/           LeaveContext: loads employee, types, holidays, requests
  src/pages/employee/    ApplyLeave, MyRequests, Holidays, Profile (live)
  src/pages/manager/     Approvals, Team, Calendar (live)
  src/pages/admin/       Employees, Leave types, Regions, Roles, Accrual, Holidays (live)
  src/auth/              admin login: token storage, route guard, context

leave-management-app.jsx Original single-file prototype (design reference).
simple_leave_submission_model (6).mermaid   The v1 domain model this slice implements.
```

---

## Data model (v1)

Implemented exactly as specified in `simple_leave_submission_model (6).mermaid` —
six tables, no extras:

```
Tenant ─┬─< Region ─┬─< HolidayCalendar
        │           └─< LeaveType
        ├─< Employee ──< LeaveRequest >── LeaveType
        └─< LeaveRequest
```

`AdminDashboard` from the diagram is a **query service**, not a table, so it has
no schema representation.

### Deliberate deviations (2)

Both are guards, not features:

1. **Overlap check on submit** — returns `409 CONFLICT` if the employee already
   has a `PENDING`/`APPROVED` request covering those dates.
2. **`status` CHECK constraint** — pins the four values, since the model typed
   `status` as a bare `String`.

---

## Setup

### Prerequisites
Python 3.12+, Node 18+, PostgreSQL running locally.

### 1. Backend

```bash
cd backend
cp .env.example .env          # then set PGPASSWORD to your postgres password
python -m venv venv
venv/Scripts/python.exe -m pip install -r requirements.txt      # Windows
# source venv/bin/activate && pip install -r requirements.txt   # macOS/Linux

venv/Scripts/python.exe -m scripts.migrate   # creates DB + applies schema.sql
venv/Scripts/python.exe -m scripts.seed      # loads demo data
venv/Scripts/python.exe run.py               # http://127.0.0.1:4000
```

Interactive API docs: <http://127.0.0.1:4000/docs>

> **Use `run.py`, not bare `uvicorn app.main:app`.** On Windows the default
> `ProactorEventLoop` is incompatible with psycopg's async mode. uvicorn only
> switches to the selector loop when it spawns subprocesses (`--reload`), so a
> plain uvicorn invocation works in dev and fails in production. `run.py` sets
> the policy explicitly before uvicorn creates its loop.

### 2. Frontend

```bash
cd leave-app
cp .env.example .env
npm install
npm run dev                   # http://localhost:5174
```

Vite proxies `/api/*` → `http://127.0.0.1:4000`, so pages call `/api/v1/...`
same-origin (no CORS, no hardcoded host).

---

## API reference (v1)

All responses are enveloped: `{ "data": ... }` on success,
`{ "error": { code, message, details } }` on failure.

| Method | Path | Model method |
| --- | --- | --- |
| GET | `/api/v1/health` | — |
| GET | `/api/v1/employees/{id}` | bootstraps the UI (region + tenant) |
| GET | `/api/v1/employees/{id}/holidays` | region holiday calendar |
| GET | `/api/v1/leave-types?regionId=` | `LeaveType.getDropdownOptions(regionId)` |
| POST | `/api/v1/leave-requests` | `LeaveRequest.submit()` |
| GET | `/api/v1/leave-requests?employeeId=` | `getRequestsByEmployee(employeeId)` |

### Error codes

| Code | HTTP | Meaning |
| --- | --- | --- |
| `BAD_REQUEST` | 400 | Validation failure or a broken domain rule |
| `NOT_FOUND` | 404 | Unknown employee / route |
| `CONFLICT` | 409 | Overlapping leave request |
| `DATABASE_UNAVAILABLE` | 503 | Cannot reach PostgreSQL (message names the fix) |

### Example

```bash
curl -X POST http://127.0.0.1:4000/api/v1/leave-requests \
  -H 'Content-Type: application/json' \
  -d '{
    "employeeId": "33333333-3333-3333-3333-333333333333",
    "leaveTypeId": "44444444-4444-4444-4444-444444444401",
    "startDate": "2026-08-24",
    "endDate": "2026-08-26",
    "reason": "Personal work"
  }'
```

Response includes the computed breakdown:

```json
{"data": {
  "status": "PENDING", "workingDays": 3,
  "breakdown": {"calendarDays": 3, "weekendDays": 0,
                "holidayDays": 0, "chargeableDays": 3, "excludedDates": []}
}}
```

---

## The working-day engine

`backend/app/services/working_days.py` is a pure function over `datetime.date`.
It excludes Saturdays, Sundays, and the employee's **region** holidays —
implementing the model's `LeaveRequest ..> HolidayCalendar : excludes_dates_via_region`.

Verified behaviour:

| Range | Calendar days | Result |
| --- | --- | --- |
| Mon–Wed, no holidays | 3 | **3** chargeable |
| Fri–Mon spanning a weekend | 4 | **2** chargeable |
| A single Friday holiday | 1 | **0** — rejected with 400 |
| Sat–Sun only | 2 | **0** — rejected with 400 |

Day counts are **computed on read, not stored** — matching the v1 model, in
which `LeaveRequest` has no day column. Consequence: editing the holiday
calendar retroactively changes historical day counts. Persisting a snapshot is
the recommended fix when the model is next revised.

---

## Engineering notes

Bugs found and fixed while building — recorded because each would have been
painful to diagnose later:

1. **Timezone-dependent weekend detection.** The original prototype mixed local
   `getDay()`/`setDate()` with `toISOString()` (UTC). Weekends were
   misidentified in any negative-offset timezone. The backend now uses
   `datetime.date` (no timezone at all); the frontend preview iterates purely in UTC.
2. **Windows event loop.** See the `run.py` note above.
3. **DSN not URL-encoded.** A password containing `@` produced two `@` in the
   connection URI, so the parser picked the wrong host. `config.dsn()` now
   percent-encodes user and password.
4. **Stale pooled connections.** PostgreSQL closes idle connections; the pool
   was handing out dead ones, causing intermittent `503`s on the first request
   after a quiet period. Fixed with `check=AsyncConnectionPool.check_connection`
   and `max_idle=300`.
5. **Config errors looked like hangs.** A wrong password made requests sit for
   the pool's 30 s default and then return an opaque 500. Timeout is now 5 s,
   DB failures return `503 DATABASE_UNAVAILABLE` with an actionable message, and
   the app probes the DB at startup and logs the real reason.

---

## Roadmap

**Done since:** multi-tier approval (chains frozen at submit — see
[docs/multi-tier-approval.md](docs/multi-tier-approval.md)), recurring holidays,
multi-region with per-region working weeks, and manager assignment.

**Next — balances & accrual.** The recommended design is an **append-only
ledger** rather than a mutable `balance` column: every mutation is an entry
(`ACCRUAL`, `CARRYOVER`, `DEDUCTION`, `ADJUSTMENT`, `EXPIRY`), and a balance is
the sum of entries up to a date. That yields an audit trail, retroactive
correction, and point-in-time balances for free. Accrual policy should be stored
**as data** (rate, cadence, proration, caps, carryover expiry) so administrators
can change rules without a deploy — that is what makes accrual "dynamic".

**Then — snapshot the day breakdown onto `leave_request`.** `workingDays` is
currently recomputed on every read, so each consumer must independently get the
rules right; three separate bugs came from exactly that. It also means editing a
holiday calendar retroactively changes the day count of already-approved
requests. One column plus a JSONB fixes both.

**Blocker before production:** authentication. The API trusts whatever employee
id it is given, so any caller can act as anyone.
