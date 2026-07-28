# Roadmap

Allowed roadmap states are `READY`, `BLOCKED`, `IN_PROGRESS`, `REVIEW`,
`PR_OPEN`, and `DONE`. Execution phases in
[TASK_PROTOCOL.md](TASK_PROTOCOL.md) do not add roadmap states.

## Completed

| Task | State |
| --- | --- |
| DEMO-AUTH-1 — Demo authentication | DONE |
| CI-FOUNDATION-1 — CI foundation | DONE |
| SPR-2A — Users and access overview | DONE |
| SPR-2B — Invite user and centralized access scope | DONE |
| SPR-2C — Warehouses administration | DONE |
| SPR-2D — Supplier organizations administration | DONE |
| SPR-SEC-1 — React Router security migration | DONE |
| AUTONOMY-FOUNDATION-1 — repository governance foundation | DONE |
| SPR-SEC-2 — React Router 8.3 security migration | DONE; PR #9 human-merged |
| AUTONOMY-GOV-1 — local autonomy runner MVP | DONE; PR #10 human-merged |
| AUTONOMY-STATE-1 — runner readiness state update | DONE; PR #11 human-merged |
| AUTONOMY-RUNNER-COMPAT-1 — Codex CLI compatibility | DONE; PR #12 human-merged |
| AUTONOMY-PILOT-1 — Soon navigation accessibility pilot | DONE; PR #13 human-merged |
| SPR-2E — appointments operational overview | DONE; PR #14 human-merged; CI stabilized in PR #15 |
| STATE-UPDATE-2 — post-appointments state update | DONE; PR #16 human-merged |
| MAIN-BRANCH-GOVERNANCE-1 — protect `main` | DONE; PR #17 human-merged; ruleset `19850347` active |
| DEV-SEC-001-REMEDIATE — development-toolchain remediation | DONE; PR #21 human-merged; both dependency audits report 0 vulnerabilities |
| UI-MVP-SPEC-1 — onboard approved UI MVP specification | DONE; PR #31 human-merged |

## Active and queued

### UI-MVP-FOUNDATION-1 — role and demo-domain foundation

- State: `READY`.
- Risk class: Class B.
- Objective: create the minimum shared UI-only foundation required by
  later role-specific work: six approved roles, active demonstration
  identity and context, role-aware navigation, stable organization and
  warehouse assignments, and typed shared demo-domain records.
- Approved coverage: `BDP-CFG-001`, `BDP-RBAC-001`, `BDP-SUP-001`,
  `BDP-USR-001`, sections 3.1–3.7, 17.3, 18 and 19, and the foundation
  portion of `AC-SYS-001`.
- Repository fit: reuse `AuthenticatedShell`, existing demo
  authentication, `/users`, `/warehouses`, `/supplier-organizations`,
  `/appointments`, and `demoAccessScope.ts`. Resolve shared-domain
  duplication only where directly required.
- Future implementation paths: `src/app/AppRoutes.tsx`,
  `src/app/AppRouter.test.tsx`, `src/app/AuthenticatedShell.tsx`,
  `src/app/AuthenticatedShell.test.tsx`, `src/users/demoAccessScope.ts`,
  `src/users/demoUsers.ts`, `src/users/UsersAccessPage.tsx`,
  `src/users/UsersAccessPage.test.tsx`,
  `src/warehouses/WarehousesPage.tsx`,
  `src/warehouses/WarehousesPage.test.tsx`,
  `src/supplierOrganizations/SupplierOrganizationsPage.tsx`,
  `src/supplierOrganizations/SupplierOrganizationsPage.test.tsx`,
  `src/appointments/AppointmentsPage.tsx`,
  `src/appointments/AppointmentsPage.test.tsx`, new files under
  `src/demoDomain/**`, `docs/codex/CURRENT_STATE.md`, and
  `docs/codex/ROADMAP.md` only. The exact implementation contract may
  narrow but must not expand this boundary without separate approval.
- Delivery: E4, `build_high`, separate `review_high` Reviewer, extended
  context, quality-first token posture, complete validation,
  `publish_feature`, and mandatory stop before merge.
- Contract gate: after this activation is human-merged, create a
  machine-readable GitHub issue contract bound to the resulting exact
  `main` SHA before implementation.
- Exit gate: focused tests prove each role sees only approved existing
  routes, data scope and actions. Any identity selector is visibly
  demonstrational and cannot imply real authentication or authorization.
- Authorization boundary: no later-task booking, calendar/capacity,
  lifecycle, details, gate operations, notifications,
  dashboards/mobile completion, or standing-appointment behavior; no
  backend, persistence, real authorization, dependency, CI, runner,
  deployment, production repository, or section 24 work.

No product, governance, security, or infrastructure task is currently
approved as `READY` or active beyond `UI-MVP-FOUNDATION-1`.
