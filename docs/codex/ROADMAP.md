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

## Active and queued

### UI-MVP-WEEKLY-PLANNING-SPEC-1-ACTIVATE — activate specification onboarding

- State: `READY`.
- Risk class: Class C.
- Objective: record approved Business Owner decision `BDR-TRN-001` and activate `UI-MVP-WEEKLY-PLANNING-SPEC-1` as the sole next documentation-onboarding task without creating BDP v0.3 or activating source implementation in this activation.
- Allowed later execution paths: `docs/codex/CURRENT_STATE.md` and `docs/codex/ROADMAP.md` only.
- Class C authorization: ChatGPT Project Lead explicitly authorizes issue #45 to update the two named governance paths for this activation only. The issue contract must use non-empty compatible `classCAuthorizations` and carry the `class-c-approved` label.
- Contract gate: issue #45 must be rebound to the exact `main` SHA produced by the human merge of the manual governance-bootstrap PR before runner execution resumes.
- Product boundary: the external weekly-planning v0.2 package remains approved input but is not canonical repository authority through this activation. `UI-MVP-WEEKLY-PLANNING-SPEC-1` performs the later controlled onboarding.
- Source boundary: `UI-MVP-BOOKING-1` and every source implementation task remain inactive and unauthorized.
- Exclusions: preserve BDP v0.2 as historical evidence, section 24 exclusions, frontend-only local/in-memory scope, no backend, persistence, ERP/WMS/SAP integration, deployment or production-repository access.
- Delivery boundary: one Class C documentation-only PR, complete validation and independent review, mandatory stop before merge. Human merge remains required.

`UI-MVP-WEEKLY-PLANNING-SPEC-1`, `UI-MVP-BOOKING-1` and every other
source implementation task remain inactive and unauthorized. No product,
security, infrastructure or source implementation task is currently
approved as `READY` or active.
