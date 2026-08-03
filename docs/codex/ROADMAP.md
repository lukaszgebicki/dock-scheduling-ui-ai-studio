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
| UI-MVP-WEEKLY-PLANNING-SPEC-1 — onboard weekly-planning specification | DONE; PR #50 human-merged at `70d49fa76923cc06b9435c8ba5730d5e07304ade` |
| UI-MVP-FLOW-ROUTING-1-ACTIVATE — activate capability routing foundation | DONE; PR #52 human-merged at `cafae41d72be7946fc397ec787b7f938588f2854` |
| UI-MVP-FLOW-ROUTING-1 — capability and optional-role routing | DONE; PR #56 human-merged at `f7466ed05ed14debeeb2a68dab0769fdd00ddeb6` |
| AUTONOMY-RUNNER-TEST-FIXTURE-1 — isolate lifecycle tests from live roadmap | DONE; PR #58 merged at `090a2e99320d0acbcc1eada5d14e379fb8f1d133` |
| UI-MVP-TRANSPORT-RULES-1-ACTIVATE — activate transport contract foundation | DONE after merge of this activation PR |

## Active and queued

### UI-MVP-TRANSPORT-RULES-1 — transport contract and readiness

- State: `READY`.
- Risk class: Class B.
- Objective: define the typed local or in-memory transport contract and
  downstream readiness rules required before restricted Supplier booking is
  implemented.
- Product authority: Business Decision Pack v0.3 requirement `BDP-TRN-001`,
  controlling Business Owner decision `BDR-TRN-001`, and scenarios
  `AC-TRN-001` through `AC-TRN-003`.
- Supplier contract boundary: both `tractorRegistration` and
  `trailerOrContainerRegistration` remain required to complete every Supplier
  reservation. The later booking task may consume this contract but this task
  must not create booking UI or appointment records.
- Administrator and reconciliation boundary: an authorized Administrator may
  explicitly and auditably create, correct or update either transport value.
  Friday import never silently overwrites a Supplier-entered value; differences
  require an explicit reconciliation decision.
- Readiness boundary: the `warehouse + loadCarrierType + goodsCategory` matrix
  is a downstream readiness and validation rule and applies to
  Administrator-added or imported deliveries. It never removes either required
  Supplier reservation field and never fabricates completed business events.
- Implementation boundary: establish reusable typed domain rules, deterministic
  local decisions and focused tests only. Do not implement booking, calendar,
  file import, weekly planning, lifecycle or gate execution, list/details,
  reporting, notifications, persistence or integrations.
- Contract gate: execution requires a separate machine-readable Class B issue
  contract bound to the exact `main` SHA produced by merge of this activation
  PR, plus an external worktree, complete validation, independent review and
  controlled publication.
- Technical boundary: frontend-only local or in-memory scope; no backend,
  persistence, ERP/WMS/SAP integration, deployment or production-repository
  access.

The revised `UI-MVP-BOOKING-1`, extended
`UI-MVP-CALENDAR-CAPACITY-1`, `UI-MVP-ADMIN-IMPORT-1`,
`UI-MVP-WEEKLY-PLANNING-1`, lifecycle and gate consumers,
`UI-MVP-LIST-DETAILS-1`, `UI-MVP-REPORTING-1` and all remaining source tasks
remain inactive and unauthorized. No other product, governance, security or
infrastructure task is `READY` or active.
