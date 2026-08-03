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
| UI-MVP-TRANSPORT-RULES-1-ACTIVATE — activate transport contract foundation | DONE; PR #60 merged at `ecf78e26203a318c95ea4d69b8b4571e49a5c22d` |
| UI-MVP-TRANSPORT-RULES-1 — transport contract and readiness | DONE; PR #62 squash-merged at `279d33f6fbbefd7b4a8527822eff5e6ade289ea6` |
| UI-MVP-BOOKING-1-ACTIVATE — activate restricted Supplier reservation | DONE; PR #64 squash-merged at `14c81304e1ad362a9165848a4c75ce21fe5e1ea6` |
| UI-MVP-BOOKING-1 — restricted Supplier reservation | DONE; PR #66 squash-merged at `e6eab51f51d03c9133ec604e9df1b70b36d78a1e` |
| UI-MVP-CALENDAR-CAPACITY-1-ACTIVATE — activate PO planning calendar | DONE; PR #68 squash-merged at `ba4164da5ae2dfdd4bf450a2d58aa9e3892a7ba9` |
| UI-MVP-CALENDAR-CAPACITY-1 — PO planning calendar and capacity | DONE; PR #70 squash-merged at `327506b08462d498b387d50b6402650a600b7def` |
| UI-MVP-ADMIN-IMPORT-1-ACTIVATE — activate local Friday PO import | DONE; PR #73 squash-merged at `6b18bdeecb0f6d725a26b457cce5e4e87e04df09` |
| UI-MVP-ADMIN-IMPORT-1 — local Friday PO import preview | DONE; PR #75 squash-merged at `c492ba9f28c764f0432dffc46b89fdf207f02c37` |
| UI-MVP-WEEKLY-PLANNING-1-ACTIVATE — activate exact enrichment and planning queue | DONE; PR #77 squash-merged at `e75364948958b5e9b9b6b054246987caaece0053` |
| UI-MVP-WEEKLY-PLANNING-1 — exact enrichment and planning queue | DONE; PR #79 squash-merged at `c8e9e5af3d891ea7438afc1e69637e4b5f18cf59` |
| UI-MVP-LIFECYCLE-1-ACTIVATE — activate capability-routed lifecycle consumer | DONE; PR #81 squash-merged at `56385131cfa88976f7e19eb3f763a73aa8121951` |
| UI-MVP-LIFECYCLE-1 — capability-routed lifecycle transitions | DONE; PR #83 squash-merged at `3b0552a6a095da1cd2248f7d6b6e60850a6261d0` |
| UI-MVP-GATE-OPS-1-ACTIVATE — activate operator and Security workflows | DONE after merge of this activation PR |

## Active and queued

### UI-MVP-GATE-OPS-1 — operator and Security workflows

- State: `READY`.
- Risk class: Class B.
- Objective: consume the existing capability routing, lifecycle evidence,
  configuration and calendar projection through constrained local gate and
  warehouse-operation workflows without introducing durable effects.
- Product authority: `BDP-OPS-001`, sections 13.1 through 13.5, operational
  transitions from the canonical status matrix, applicable `BDP-VAL-001`,
  scenarios `AC-WOP-001`, the operational portion of `AC-WOP-002`,
  `AC-SEC-001`, `AC-SEC-002`, `AC-FLOW-006` and `AC-FLOW-007`.
- Routing boundary: use exactly the existing capabilities and steps for
  `CHECK_IN`, `CHECK_OUT`, `ASSIGN_DOCK`, `CHANGE_DOCK`,
  `PROGRESS_OPERATION` and `CONFIRM_NO_SHOW`. Navigation, visible actions,
  direct routes and execution must share the same `RUN`, `DELEGATE` or `BLOCK`
  decision and selected actor.
- Actor boundary: Security Officer is primary for gate check-in/out and sees
  only the approved warehouse horizon and limited gate data. Warehouse Operator
  is primary for docks, operational progression and confirmed No Show.
  Warehouse Administrator may act only when selected as the existing fallback.
  No additional fallback identity may be invented.
- Status boundary: operational status remains independent from lifecycle,
  planning and change status. Gate actions cannot approve, reject, reschedule,
  cancel, restore or otherwise repair lifecycle state.
- Transition boundary: check-out before check-in, Completed before Unloading and
  every operational status jump outside the canonical sequence fail closed and
  create no success history.
- Arrival boundary: scoped search uses approved identifiers; an eligible check-in
  records Early, On Time or Late arrival evidence without moving the slot.
  Early arrival may enter waiting but early service remains an Operator decision.
- Dock boundary: assignment and change require a currently active compatible
  dock and explicit before/after evidence. Existing configuration, blocks and
  scope remain authoritative; no automatic move or hidden override is implied.
- No-show boundary: a potential No Show is only an alert/evidence state until an
  authorized human confirms it. Confirmation releases local projected capacity,
  remains visible and must not physically delete the record.
- Unannounced boundary: a gate user may create only a local demonstrational
  unannounced-visit record containing required gate fields and route it for
  decision. It must not silently become CONFIRMED, receive a dock/capacity,
  bypass approval or masquerade as a Supplier booking.
- Evidence boundary: registration correction, gate notes, dock changes and all
  material gate actions require explicit actor, reason and immutable in-memory
  before/after evidence. Supplier-origin transport values and reconciliation
  evidence must not be silently erased.
- Implementation boundary: implement typed provider/component memory,
  capability-controlled gate consumers, scoped search, operational progression,
  arrival classification, dock/no-show consequences, unannounced decision
  records and accessible focused UI/tests. Do not implement lifecycle approval
  or change actions, notifications, OCR/ANPR, reporting, document storage,
  durable persistence, backend or integrations.
- Contract gate: execution requires a separate machine-readable Class B issue
  contract bound to the exact `main` SHA produced by merge of this activation
  PR, plus an external worktree, complete validation, independent review and
  controlled publication.
- Technical boundary: frontend-only local or in-memory scope; no localStorage,
  sessionStorage, IndexedDB, cookies, network APIs, deployment or production-
  repository access.

Extended `UI-MVP-LIST-DETAILS-1`, `UI-MVP-REPORTING-1` and all remaining source
tasks remain inactive and unauthorized. No other product, governance, security
or infrastructure task is `READY` or active.
