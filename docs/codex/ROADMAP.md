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
| UI-MVP-GATE-OPS-1-ACTIVATE — activate operator and Security workflows | DONE; PR #85 squash-merged at `e98796157ecbf4d9e858a4e10b252ad7819f5b01` |
| UI-MVP-GATE-OPS-1 — operator and Security workflows | DONE; PR #87 squash-merged at `bc4b11325a4f894c4227ea75eefaa487cce22221` |
| UI-MVP-LIST-DETAILS-1-ACTIVATE — activate planning-aware appointment list and details | DONE; PR #89 squash-merged at `38d5365ef63eb9e1ebc307af4e261c79a04ee381` |
| UI-MVP-LIST-DETAILS-1 — planning-aware appointment list and details | DONE; PR #91 squash-merged at `ab47046a4b25e5f91e9b5aa9c36e0115c9833beb` |
| UI-MVP-REPORTING-1-ACTIVATE — activate PO/SKU reports and local exports | DONE after merge of this activation PR |

## Active and queued

### UI-MVP-REPORTING-1 — PO/SKU reports and local exports

- State: `READY`.
- Risk class: Class B.
- Objective: deliver role-scoped, local demonstrational weekly and monthly
  reporting consumers at PO and SKU levels, with filtered previews and local
  CSV/XLSX exports that preserve the active result definition.
- Product authority: `BDP-REP-001`, `BDP-DATA-001` and `AC-REP-001` through
  `AC-REP-004`.
- Scope boundary: System Administrator may report across all accessible data;
  Warehouse Administrator and Warehouse Operator remain limited to assigned
  warehouses. Supplier actors remain limited to their own organization and
  assigned warehouse scope if a Supplier report/export consumer is exposed.
  Security Officer has no reporting route or action.
- Date boundary: every report uses an inclusive planned-date range. Weekly
  all-delivery and monthly Slipsheet presets must resolve deterministic start
  and end dates without silently broadening the active range.
- Level boundary: `PO` produces exactly one row per distinct appointment/PO
  header. `SKU` produces one row per product line and does not fabricate rows
  for an appointment awaiting SKU details.
- Aggregation boundary: appointment count uses distinct appointment IDs.
  Units and pallets sum each SKU line exactly once. Derived totals must not be
  maintained as a second manual source of truth.
- Preview boundary: filters and role-permitted columns may cover warehouse,
  planned date/time, PO, SKU, descriptions, Supplier, units, pallets, load
  carrier, goods category, handling instruction, transport, booking origin,
  planning status, appointment status and import source where permitted.
- Export boundary: local CSV and XLSX-compatible workbook output must preserve
  the active date range, filters, level, selected columns, sorting, row order
  and actor scope. Export may use only the already scoped active result and may
  not silently include hidden columns or excluded rows.
- Supplier-safety boundary: Supplier actors never receive another
  organization’s records, Internal Notes, technical audit metadata, import
  diagnostics, source-row/batch lineage or Administrator-only reconciliation
  reasoning.
- Mutation boundary: reports and exports are read-only consumers. They may not
  mutate planning, lifecycle/change, operational, transport, capacity, slot,
  dock, gate, approval, cancellation or reschedule state.
- Technical boundary: generation and download remain local and demonstrational.
  No advanced reporting warehouse, scheduled export, e-mail, notification,
  localStorage, sessionStorage, IndexedDB, cookies, backend, API, persistence,
  integration, deployment or production-repository access is authorized.
- Contract gate: execution requires a separate machine-readable Class B issue
  contract bound to the exact `main` SHA produced by merge of this activation
  PR, plus an external worktree, complete validation, Simplification Pass,
  independent review and controlled publication.

`UI-MVP-NOTIFICATIONS-STATES-1`, `UI-MVP-DASH-MOBILE-1`,
`UI-MVP-STANDING-1` and every other remaining source task remain inactive and
unauthorized. No other product, governance, security or infrastructure task is
`READY` or active.
