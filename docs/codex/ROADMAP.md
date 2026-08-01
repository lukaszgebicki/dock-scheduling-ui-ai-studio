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
| UI-MVP-ADMIN-CONFIG-1 — warehouse and rule configuration | DONE; PR #42 human-merged at `e4168c3b4a6644ca483d0f3d6576e6d1ef73b534` |
| Weekly-planning activation governance bootstrap | DONE; PR #47 / issue #46 human-merged at `5ae722ddb519cf62f157b7c710aed5994176dd10` |
| UI-MVP-WEEKLY-PLANNING-SPEC-1-ACTIVATE — activate specification onboarding | DONE; PR #48 merged at `c994089bf87b820425949149c083e795288ad521` |
| UI-MVP-WEEKLY-PLANNING-SPEC-1 — onboard weekly-planning specification | DONE after human merge of this documentation PR |

## Active and queued

This transition is effective only after human merge of the issue #49
documentation PR. Until then, the pre-merge roadmap on `main` remains
authoritative and this branch does not mark its own work complete.

### UI-MVP-FLOW-ROUTING-1 — capability and optional-role routing

- State: candidate only; not `READY`.
- Risk class: expected Class B; a later activation contract must confirm it.
- Objective: define capability-based participation for the six existing
  global role types with explicit `RUN`, `SKIP`, `DELEGATE` and `BLOCK`
  outcomes before any weekly-planning consumer is implemented.
- Boundary: missing Supplier uses `SKIP` without a placeholder; missing
  mandatory participation uses authorized delegation or block. Routing may
  not invent roles, data access, lifecycle transitions, persistence or
  integration behavior.
- Activation gate: a separate human-approved activation and exact-SHA task
  contract must move this candidate to `READY` after issue #49 is merged.
- Dependency boundary: transport rules, revised booking, extended calendar,
  Admin import, weekly planning, lifecycle/gate consumers, list/details,
  reporting, notification, dashboard and standing tasks remain inactive.

No other product, governance, security, infrastructure or source
implementation task is currently approved as `READY` or active. After the
current documentation task is human-merged, no implementation task is
`READY` until a separate activation is approved.
