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
| UI-MVP-REPORTING-1-ACTIVATE — activate PO/SKU reports and local exports | DONE; PR #93 squash-merged at `0af25155ade24489578015e6029b9175cd9c7555` |
| UI-MVP-REPORTING-1 — PO/SKU reports and local exports | DONE; PR #95 squash-merged at `607881b521f0846104bdf56432547b6f5a010585` |
| UI-MVP-NOTIFICATIONS-STATES-1-ACTIVATE — activate notifications and exceptional states | DONE after merge of this activation PR |

## Active and queued

### UI-MVP-NOTIFICATIONS-STATES-1 — notifications and exceptional states

- State: `READY`.
- Risk class: Class B.
- Objective: add actor-scoped, local demonstrational in-app notifications,
  e-mail-status simulation and reusable exceptional-state presentations with
  safe next actions.
- Product authority: `BDP-NOT-001`, BDP section 22 and the existing role,
  organization, warehouse, appointment, lifecycle, planning, gate and reporting
  boundaries.
- Event boundary: supported notification demonstrations may cover creation,
  submitted, pending approval, confirmed, rejected, changes requested, slot
  proposed, rescheduled, cancelled, reminder, missing data, late arrival,
  no-show and shared comment.
- Recipient boundary: local recipient previews may include author, Supplier
  primary contact, Supplier Administrator, Warehouse Operator, Warehouse
  Administrator, Security Officer and explicit additional addresses only when
  the active actor and event scope permit them.
- Preference boundary: critical cancellation, reschedule, rejection, required
  action and safety notifications cannot be disabled. Noncritical events may
  simulate immediate, hourly digest or daily digest frequency.
- Data boundary: every notification is derived from actor-visible records and
  approved event fields. Supplier actors never receive another organization’s
  records, Internal Notes, technical audit metadata, import diagnostics,
  source-row/batch lineage or Administrator-only reconciliation reasoning.
- Exceptional-state boundary: provide separate presentations for no
  appointments, no filter results, no slots, no assigned warehouses, no
  permission, unavailable appointment, reservation conflict, expired session,
  save error, connection loss, stale data, forbidden action, expired hold,
  upload error, unavailable configuration and blocked Supplier. Every state
  must identify a safe next action and must not fabricate success or durable
  recovery.
- Technical boundary: all notification and state behavior remains local and
  demonstrational. No real e-mail, SMS, backend, API, persistence, browser
  storage, scheduled job, external delivery, ERP/WMS/SAP integration,
  deployment or production-repository access is authorized.
- Mutation boundary: notification preferences and previews are local UI state
  only. They may not mutate appointment, planning, lifecycle/change,
  operational, transport, capacity, slot, dock, gate, approval, cancellation,
  reschedule or reporting data.
- Contract gate: execution requires a separate machine-readable Class B issue
  contract bound to the exact `main` SHA produced by merge of this activation
  PR, plus complete validation, Simplification Pass, independent review and
  controlled publication.

`UI-MVP-DASH-MOBILE-1`, `UI-MVP-STANDING-1` and every other remaining source
or product-review task remain inactive and unauthorized. No other product,
governance, security or infrastructure task is `READY` or active.
