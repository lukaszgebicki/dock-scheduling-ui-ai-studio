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
| UI-MVP-WEEKLY-PLANNING-1-ACTIVATE — activate exact enrichment and planning queue | DONE after merge of this activation PR |

## Active and queued

### UI-MVP-WEEKLY-PLANNING-1 — exact enrichment and planning queue

- State: `READY`.
- Risk class: Class B.
- Objective: connect the approved Supplier reservation, Friday import preview,
  PO/SKU calendar and capacity contracts through deterministic local planning
  state without introducing appointment lifecycle execution or persistence.
- Product authority: `BDP-WPL-001`, `BDP-DATA-001`, `BDP-MATCH-001`, applicable
  `BDP-CAP-001` and `BDP-VAL-001`, scenarios `AC-ADM-002`, `AC-ADM-004` through
  `AC-ADM-007`, and integrated Supplier/calendar scenarios.
- Exact-enrichment boundary: only an exact five-field match may attach imported
  zero-to-many SKU lines to the matching PO header. Slot, booking origin,
  Supplier transport values and appointment lifecycle status remain unchanged.
- Queue boundary: `NO_MATCH` creates local unscheduled planning evidence only,
  with no fabricated slot or capacity. An `ADMIN_ADDED` appointment requires a
  separately authorized `SCHEDULE_UNRESERVED_DELIVERY` action and a compatible
  free slot.
- Conflict boundary: ambiguous matches and enrichment/capacity conflicts remain
  blocked until an authorized `RESOLVE_PLANNING_CONFLICT` action records an
  explicit resolution. No silent attachment, replacement, transport overwrite,
  move, cancellation, approval or override is permitted.
- Status boundary: planning state is explicit and independent of appointment
  lifecycle status. Readiness cannot authorize lifecycle or gate execution.
- Scope boundary: System Administrator acts globally; assigned Warehouse
  Administrator acts only in assigned warehouse scope. Supplier, Operator and
  Security actors receive no import diagnostics or planning-resolution actions.
- Implementation boundary: implement only typed provider/component memory,
  exact local enrichment, unmatched queue, compatible-slot scheduling for an
  authorized Admin path, explicit conflict resolution and focused consumers.
  Do not implement notifications, lifecycle/gate transitions, reporting,
  durable persistence, backend or integrations.
- Contract gate: execution requires a separate machine-readable Class B issue
  contract bound to the exact `main` SHA produced by merge of this activation
  PR, plus an external worktree, complete validation, independent review and
  controlled publication.
- Technical boundary: frontend-only local or in-memory scope; no localStorage,
  sessionStorage, IndexedDB, cookies, network APIs, deployment or production-
  repository access.

Lifecycle and gate consumers, `UI-MVP-LIST-DETAILS-1`,
`UI-MVP-REPORTING-1` and all remaining source tasks remain inactive and
unauthorized. No other product, governance, security or infrastructure task is
`READY` or active.
