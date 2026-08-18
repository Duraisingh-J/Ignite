# Leave Management — page structure

Split into one file per screen so it drops into an existing React app instead
of living in a single component. The **employee leave-request flow is wired to
the live v1 API**; manager/admin screens are still on mock data.

## Run

The backend must be running first (see `../README.md`):

    cd ../backend && venv/Scripts/python.exe run.py     # :4000

Then:

    npm install
    npm run dev                                          # :5174

Vite proxies `/api/*` to `http://127.0.0.1:4000`, so pages call
`/api/v1/...` same-origin — no CORS, no hardcoded host.

Config lives in `.env`:

    VITE_API_BASE=/api/v1
    VITE_EMPLOYEE_ID=33333333-3333-3333-3333-333333333333   # demo employee, no auth yet

## Folder layout

    src/
      api/client.js            fetch wrapper; unwraps { data }, throws on { error }
      api/leaveApi.js          endpoints + adapters (API shape -> UI shape)
      theme/colors.js          design tokens (palette, fonts, shared input style)
      data/mockData.js         REMAINING mocks — manager/admin only
      utils/dateHelpers.js     working-day preview, date formatting
      context/LeaveContext.jsx loads employee/types/holidays/requests from the API
      components/              Badge, Card, Button, LeaveDial, Stepper, RequestsTable, ApprovalCard, Sidebar, Topbar
      layouts/                 EmployeeLayout, ManagerLayout, AdminLayout — sidebar + topbar + <Outlet/>
      pages/employee/          Dashboard, ApplyLeave, MyRequests, EligibleLeaveTypes, Holidays, Profile
      pages/manager/           Dashboard, Approvals, Team, Calendar
      pages/admin/             Dashboard, Employees, LeaveTypes, Policies, Holidays
      App.jsx                  routes (/employee/*, /manager/*, /admin/*)

## What's live vs. still mocked

| Page                        | Data source                                  |
| --------------------------- | -------------------------------------------- |
| employee/ApplyLeave         | **API** — POST `/leave-requests`             |
| employee/MyRequests         | **API** — GET `/leave-requests?employeeId=`  |
| employee/Holidays           | **API** — GET `/employees/{id}/holidays`     |
| employee/Profile            | **API** — GET `/employees/{id}`              |
| employee/Dashboard          | mock (needs balances — not in the v1 model)  |
| employee/EligibleLeaveTypes | mock (needs balances — not in the v1 model)  |
| manager/*, admin/*          | mock (no endpoints in this slice)            |

## The adapter boundary

The API speaks the persistence model (`leaveTypeName`, `startDate`,
`workingDays`, `status: "PENDING"`). These pages were written against a flatter
shape (`type`, `start`, `days`, `status: "Pending"`).

Rather than rewrite every component, `api/leaveApi.js` maps between them at the
boundary — so `RequestsTable`, `Badge`, and `employee/Dashboard` work unchanged
against live data.

## Notes on this slice

- **No balances.** The v1 model (`simple_leave_submission_model (6).mermaid`)
  has no balance or accrual concept, so `ApplyLeave` no longer shows "available
  balance" / "balance after leave" — there was nothing real behind those numbers.
- **No approval chain.** Multi-tier approval is out of scope, so the submitted
  view shows a status badge instead of a `Stepper`. `Stepper` is still used by
  the mock manager screens.
- **Server is the source of truth for day counts.** `calcLeaveBreakdown` in
  `utils/dateHelpers.js` is only a live preview while typing; the response from
  `POST /leave-requests` carries the authoritative `workingDays` and a
  `breakdown` explaining it (shown in the MyRequests detail view).
- `dateHelpers` now iterates in UTC throughout. The previous version mixed local
  `getDay()`/`setDate()` with `toISOString()`, which misidentifies weekends in
  any negative-offset timezone.
- The sidebar's "switch role" buttons are a demo convenience — delete that block
  in `components/Sidebar.jsx` once you have real auth/role routing.
- `LeaveContext.decideApproval` is still mock-only; there is no approval endpoint.
