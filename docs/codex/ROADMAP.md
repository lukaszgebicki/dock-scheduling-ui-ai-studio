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
| UI-MVP-FOUNDATION-1 — role and demo-domain foundation | DONE; PR #37 human-merged |

## Active and queued

### UI-MVP-ADMIN-CONFIG-1 — warehouse and rule configuration

- State: `READY`.
- Risk class: Class B.
- Objective: extend current warehouse and supplier administration into
  one coherent demonstrational configuration model whose typed
  local-state changes produce deterministic contracts for later booking,
  calendar and lifecycle consumers.
- Approved coverage: `BDP-CFG-001` levels 1–3, the configuration portion
  of `BDP-BLOCK-001`, `BDP-WH-001`, the configuration portion of
  `BDP-SUP-001`, the relevant assignment portion of `BDP-USR-001`, the
  approval-configuration portion of `BDP-APR-001`, `AC-SYS-001`,
  `AC-WAD-001`, `AC-WAD-002` and `AC-WAD-003`.
- Minimum demonstrational consequences: working hours, active docks,
  flow availability, capacity, required form fields, approval mode,
  cut-off and supplier assignment are represented in typed local state.
  Configuration changes are proven through focused consumers or explicit
  contract fixtures. Every exception requires a reason and history entry.
- Repository fit: extend the existing role-aware demo domain plus current
  warehouse, supplier-organization and user-assignment administration.
  Configuration outputs must be typed shared contracts rather than
  isolated form-success mockups.
- Future implementation paths: `src/app/AppRoutes.tsx`,
  `src/app/AppRouter.test.tsx`, `src/app/AuthenticatedShell.tsx`,
  `src/app/AuthenticatedShell.test.tsx`, files under `src/demoDomain/**`,
  files under `src/warehouses/**`, files under
  `src/supplierOrganizations/**`, `src/users/demoAccessScope.ts`,
  `src/users/demoUsers.ts`, `src/users/InviteUserPage.tsx`,
  `src/users/InviteUserPage.test.tsx`, `src/users/inviteUserSchema.ts`,
  `src/users/UsersAccessPage.tsx`, `src/users/UsersAccessPage.test.tsx`,
  `docs/codex/CURRENT_STATE.md` and `docs/codex/ROADMAP.md` only. The
  exact implementation contract may narrow but must not expand this
  boundary without separate approval.
- Delivery: E4, `build_high`, separate `review_high` Reviewer, extended
  context, quality-first token posture, complete validation,
  `publish_feature`, and mandatory stop before merge.
- Contract gate: after this activation is human-merged, create a
  machine-readable issue contract bound to the resulting exact `main`
  SHA before implementation.
- Exit gate: configuration changes are proven through focused consumers
  or explicit contract fixtures; they are not isolated form-success
  mockups. Exceptions require a reason and history entry.
- Cross-task boundary: this task may define and prove configuration
  outputs, but it may not implement the Supplier booking wizard, calendar
  or capacity UI, reservation engine, approval lifecycle actions,
  appointment details, gate operations, notifications, dashboards/mobile
  completion or standing appointments.
- Authorization boundary: no authentication, backend, persistence, real
  authorization, integration, dependency, CI, runner, deployment,
  production-repository or section 24 work.

No product, governance, security, or infrastructure task is currently
approved as `READY` or active beyond `UI-MVP-ADMIN-CONFIG-1`.
