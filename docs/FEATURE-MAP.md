# Feature Map

Which feature is documented where, and which are not documented at all.

Read this first when you need to find something. The short version: **five of
fourteen features have a dedicated document, three of those five are out of
date, and the six newest features have no document but carry their reasoning in
module docstrings instead.**

---

## The documents

| Document | Covers | Status |
| --- | --- | --- |
| [README.md](../README.md) | Overview, setup, repository layout | ⚠️ **Stale prose.** Layout tree is correct; the body still describes the v1 slice. |
| [BUILD.md](BUILD.md) | Architecture, data model, API, engineering log | ⚠️ **Stale counts.** Says *7 tables* and *22 endpoints*; there are now **12** and **40**. |
| [multi-tier-approval.md](multi-tier-approval.md) | Chain resolution, freezing, derived status | ⚠️ **Stale status line.** Says *"not yet migrated or tested"*; it has been live for some time. |
| [ACCRUAL-SPEC.md](ACCRUAL-SPEC.md) | Accrual methods, ledger, reservation lifecycle | ✅ Current — but it is a **specification**, so read it as intent, not as a record of what shipped. |
| [NOTIFICATIONS.md](NOTIFICATIONS.md) | Events, channels, dispatch, configuration | ✅ Current, with verified links into the code. |
| [meridian_class_model.mermaid](meridian_class_model.mermaid) | **Final class model — all 12 tables, derived fields, invariants** | ✅ Current. |
| [simple_leave_submission_model.mermaid](simple_leave_submission_model%20(6).mermaid) | The v1 domain model (first slice only) | ⚠️ **Superseded** by the class model above; kept as a record of the original scope. |
| [accrual_model.mermaid](../accrual_model.mermaid) | Accrual flow diagram | ✅ Current. |
| Meridian Leave Engine *(published artifact)* | Everything, at reference depth | ✅ Current — generated from the running system. |

---

## Feature → document → code

### Documented

| Feature | Document | Primary code |
| --- | --- | --- |
| **Multi-tier approval** | [multi-tier-approval.md](multi-tier-approval.md) | [`approval_service.py`](../backend/app/services/approval_service.py) · [`approval_repository.py`](../backend/app/repositories/approval_repository.py) |
| **Dynamic accrual** | [ACCRUAL-SPEC.md](ACCRUAL-SPEC.md) · [accrual_model.mermaid](../accrual_model.mermaid) | [`accrual_service.py`](../backend/app/services/accrual_service.py) · [`accrual_policy_service.py`](../backend/app/services/accrual_policy_service.py) |
| **Ledger & balances** | [ACCRUAL-SPEC.md §3.5–3.6](ACCRUAL-SPEC.md) | [`ledger_repository.py`](../backend/app/repositories/ledger_repository.py) · [`reservation_service.py`](../backend/app/services/reservation_service.py) |
| **Notifications** | [NOTIFICATIONS.md](NOTIFICATIONS.md) | [`app/notifications/`](../backend/app/notifications/) |
| **Domain model / v1 slice** | [simple_leave_submission_model.mermaid](simple_leave_submission_model%20(6).mermaid) · [BUILD.md](BUILD.md) | [`schema.sql`](../backend/app/db/schema.sql) |

### Not documented — reasoning lives in the code

These carry their *why* in module and migration docstrings. That is deliberate
for the small ones and a genuine gap for the large ones.

| Feature | Where the reasoning is | Gap severity |
| --- | --- | --- |
| **Authentication** | [`auth/dependencies.py`](../backend/app/auth/dependencies.py) docstring — why the bypass was deleted · [`010_tenant_admin.sql`](../backend/app/db/migrations/010_tenant_admin.sql) — why admin-only · [`passwords.py`](../backend/app/auth/passwords.py) — why PBKDF2 over bcrypt | **High.** Security decisions belong in a document someone can review without reading source. |
| **Role-based approvers (HR)** | [`004_approver_roles.sql`](../backend/app/db/migrations/004_approver_roles.sql) — the hierarchy-cannot-reach-HR argument · [`009_step_role_identity.sql`](../backend/app/db/migrations/009_step_role_identity.sql) — why the role id is frozen | **Medium.** `multi-tier-approval.md` predates it and does not mention role steps at all. |
| **Regions & working weeks** | [`working_days.py`](../backend/app/services/working_days.py) docstring | Low — the design is one field (`work_days`) and one function. |
| **Holidays & recurrence** | [`holiday_expansion.py`](../backend/app/services/holiday_expansion.py) docstring · [`schema.sql`](../backend/app/db/schema.sql) `holiday_calendar` comments | Low. |
| **Admin console** | Per-screen comments in [`pages/admin/`](../leave-app/src/pages/admin/) | Low — it is CRUD over documented models. |
| **Identity switching** | [`SessionContext.jsx`](../leave-app/src/context/SessionContext.jsx) docstring | Low — a demo affordance, marked for deletion when real auth covers employees. |

---

## By subsystem

### Leave request lifecycle

| Layer | File |
| --- | --- |
| Route | [`routers/v1/leave_requests.py`](../backend/app/routers/v1/leave_requests.py) |
| Rules | [`services/leave_request_service.py`](../backend/app/services/leave_request_service.py) |
| Day maths | [`services/working_days.py`](../backend/app/services/working_days.py) |
| Holiday expansion | [`services/holiday_expansion.py`](../backend/app/services/holiday_expansion.py) |
| SQL | [`repositories/leave_request_repository.py`](../backend/app/repositories/leave_request_repository.py) |
| UI | [`pages/employee/ApplyLeave.jsx`](../leave-app/src/pages/employee/ApplyLeave.jsx) · [`MyRequests.jsx`](../leave-app/src/pages/employee/MyRequests.jsx) |

### Approval

| Layer | File |
| --- | --- |
| Rules | [`services/approval_service.py`](../backend/app/services/approval_service.py) |
| SQL | [`repositories/approval_repository.py`](../backend/app/repositories/approval_repository.py) |
| Reporting line | [`repositories/employee_repository.py`](../backend/app/repositories/employee_repository.py) — `management_chain()` |
| Role holders | [`repositories/role_repository.py`](../backend/app/repositories/role_repository.py) |
| UI | [`pages/manager/Approvals.jsx`](../leave-app/src/pages/manager/Approvals.jsx) · [`components/Stepper.jsx`](../leave-app/src/components/Stepper.jsx) |
| Migrations | `002`, `003`, `004`, `005`, `006`, `009` |

### Accrual

| Layer | File |
| --- | --- |
| Engine | [`services/accrual_service.py`](../backend/app/services/accrual_service.py) |
| Admin rules | [`services/accrual_policy_service.py`](../backend/app/services/accrual_policy_service.py) |
| Ledger | [`repositories/ledger_repository.py`](../backend/app/repositories/ledger_repository.py) |
| Reservation | [`services/reservation_service.py`](../backend/app/services/reservation_service.py) |
| UI | [`pages/employee/Balance.jsx`](../leave-app/src/pages/employee/Balance.jsx) · [`pages/admin/AccrualPolicies.jsx`](../leave-app/src/pages/admin/AccrualPolicies.jsx) |
| Migrations | `007`, `008` |

### Authentication

| Layer | File |
| --- | --- |
| Guard | [`auth/dependencies.py`](../backend/app/auth/dependencies.py) |
| Login | [`auth/service.py`](../backend/app/auth/service.py) |
| Hashing | [`auth/passwords.py`](../backend/app/auth/passwords.py) |
| Tokens | [`auth/tokens.py`](../backend/app/auth/tokens.py) |
| Routes | [`auth/router.py`](../backend/app/auth/router.py) |
| Provisioning | [`scripts/create_admin.py`](../backend/scripts/create_admin.py) |
| UI | [`pages/Login.jsx`](../leave-app/src/pages/Login.jsx) · [`auth/`](../leave-app/src/auth/) |
| Migration | `010` |

### Notifications

Fully mapped in [NOTIFICATIONS.md § Code map](NOTIFICATIONS.md#code-map) — trigger
sites, pipeline stages, templates and channels, each linked to its line.

---

## Migration → feature

| Migration | Feature |
| --- | --- |
| `schema.sql` | Base v1 model — tenant, region, holidays, employees, leave types, requests |
| `002_multi_tier_approval` | Approval chain table |
| `003_approval_seed` | Demo reporting line |
| `004_approver_roles` | Role-based approvers — the HR gap |
| `005_hr_seed` | HR role + holder |
| `006_role_holder_uniqueness` | Partial indexes (`NULL ≠ NULL` fix) |
| `007_accrual_engine` | Accrual policies + ledger |
| `008_accrual_seed` | Regional accrual policies |
| `009_step_role_identity` | A role step remembers *which* role |
| `010_tenant_admin` | Administrator accounts |

---

## What to write next

In the order the gaps actually hurt:

1. **`AUTHENTICATION.md`** — the highest-value missing document. Threat model,
   why admin-only, why no bypass, why PBKDF2, and the two known gaps (tenant
   scoping from a query parameter; no employee-level identity).
2. **Refresh `BUILD.md`** — its counts are wrong, which makes every other number
   in it suspect.
3. **Fold role approvers into `multi-tier-approval.md`** — the document describes
   a hierarchy walk and stops there, so the HR step reads as undocumented
   behaviour.
4. **Fix the status line on `multi-tier-approval.md`** — one line, and it
   currently tells a reader the feature is untested.
