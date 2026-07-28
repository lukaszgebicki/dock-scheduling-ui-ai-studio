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

## Active and queued

### UI-MVP-SPEC-1 — onboard approved UI MVP specification

- State: `READY`.
- Risk class: Class A.
- Objective: add the approved Business Decision Pack UI MVP v0.2 as
  canonical Markdown, add traceability and the controlled implementation
  sequence, and update repository guidance without modifying application
  behavior.
- Future allowed paths: `AGENTS.md`,
  `docs/product/UI_MVP_BUSINESS_DECISION_PACK_v0.2.md`,
  `docs/product/UI_MVP_TRACEABILITY.md`,
  `docs/codex/UI_MVP_IMPLEMENTATION_PLAN.md`,
  `docs/codex/DECISION_LOG.md`, `docs/codex/ROADMAP.md`, and
  `docs/codex/CURRENT_STATE.md` only.
- Approved authority: [DCF-019 and DCF-020](DECISION_LOG.md) record
  Łukasz Gębicki's approval of version 0.2, all recommendation markers,
  and the continuing exclusion of section 24.
- Delivery: E4, `build_high`, separate `review_high` Reviewer, extended
  context, quality-first token posture, complete validation,
  `publish_feature`, and mandatory stop before merge.
- Contract gate: after this activation is human-merged, create a
  machine-readable GitHub issue contract bound to the resulting exact
  `main` SHA before implementation.
- Authorization boundary: no application code, backend, persistence,
  dependency, CI, runner, production repository, or implementation task
  is authorized.

No other product, governance, security, or infrastructure
implementation task is currently approved as `READY` or active.
