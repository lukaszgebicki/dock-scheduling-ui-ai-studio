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
| UI-MVP-WEEKLY-PLANNING-SPEC-1-ACTIVATE — activate specification onboarding | DONE after human merge of this activation PR |

## Active and queued

This transition is effective only after human merge of the activation PR.

### UI-MVP-WEEKLY-PLANNING-SPEC-1 — onboard weekly-planning specification

- State: `READY`.
- Risk class: Class C.
- Objective: create canonical Business Decision Pack v0.3 and reconcile
  traceability, implementation sequencing, decision authority and
  governance for the approved weekly-planning model without changing
  application behavior.
- Approved authority: the external weekly-planning v0.2 package is
  approved input, not canonical repository authority. `BDR-TRN-001` in
  [CURRENT_STATE.md](CURRENT_STATE.md) requires both transport fields in
  the Supplier reservation contract, permits explicit and auditable
  Administrator changes at any time, and prohibits silent import
  overwrite.
- Onboarding scope: reconcile only the approved weekly-planning inputs and
  `BDR-TRN-001` identified by issue #45 across canonical BDP v0.3,
  traceability, implementation sequencing, decision authority and
  governance. Those inputs remain non-canonical until the onboarding task
  is separately contracted, completed, reviewed and human-merged; this
  activation does not make them repository requirements or authorize
  implementation.
- Contract gate: after this activation is human-merged, create a separate
  machine-readable Class C issue contract bound to the resulting exact
  `main` SHA. That contract must enumerate the exact documentation paths
  authorized for onboarding.
- Historical and source boundary: BDP v0.2 remains historical evidence,
  section 24 remains excluded, and `UI-MVP-BOOKING-1` plus every source
  implementation task remain inactive and unauthorized.
- Technical boundary: frontend-only local or in-memory scope; no backend,
  persistence, ERP/WMS/SAP integration, deployment or production-
  repository access.
- Delivery boundary: documentation-only onboarding with complete
  validation, separate independent review and mandatory stop before human
  merge.

No other product, governance, security, infrastructure or source
implementation task is currently approved as `READY` or active.
