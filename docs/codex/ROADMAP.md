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
| UI-MVP-NOTIFICATIONS-STATES-1-ACTIVATE — activate notifications and exceptional states | DONE; PR #97 squash-merged at `f356ebca056d4a46c480c765684cfbeb8a41c496` |
| UI-MVP-NOTIFICATIONS-STATES-1 — local notifications and exceptional states | DONE; PR #99 squash-merged at `02e7ac4eefcf87daccaeb393dfa0f9b6bb930a5c` |
| UI-MVP-DASH-MOBILE-1-ACTIVATE — activate dashboards and responsive role views | DONE; PR #101 squash-merged at `3e39d6d5057f60415c64cbeed3177e5e1a36fb6d` |
| UI-MVP-DASH-MOBILE-1 — role dashboards and responsive web views | DONE; PR #103 squash-merged at `06ea72d8e8f56d5d2004fd0fa06ab3de40c15ffc` |
| UI-MVP-STANDING-1-ACTIVATE — activate standing appointment series | DONE; PR #105 squash-merged at `efa64744c4a97e166ad6120617ec2aa8c0a31b06` |
| UI-MVP-STANDING-1 — local standing appointment series | DONE; PR #107 squash-merged at `5f507367a0c7a1cbcd1039f531c46b6891735458` |
| UI-MVP-PRODUCT-REVIEW-1-ACTIVATE — activate product-level completion review | DONE; PR #109 squash-merged at `e3afdd098f27ddae086f92346ddf581a7a228d6e` |
| UI-MVP-PRODUCT-REVIEW-1 — product-level completion review | DONE; PR #111 squash-merged at `0bf350e3cef0ec6e511bd344721af80f9a048b74` |
| UI-MVP-CAPACITY-COMPOSITE-1-ACTIVATE — activate composite capacity repair | DONE; PR #113 squash-merged at `731bd6a1adf5fb30dee4f62a7ced095f392e8ec3` |
| UI-MVP-CAPACITY-COMPOSITE-1 — composite capacity and deterministic concurrency | DONE; PR #115 squash-merged at `a040e72299255a45ddbb59125cfb93f7f58c5847` |
| UI-MVP-BOOKING-NONWEEKLY-1-ACTIVATE — activate standard Supplier booking | DONE; PR #117 squash-merged at `994e52658ff14aaf36369a69ca242b44703ececf` |
| UI-MVP-BOOKING-NONWEEKLY-1 — five-step standard Supplier booking | DONE; PR #119 squash-merged at `e5ba6b4d5ddb8861bfb07ea75a8476484d297386` |
| UI-MVP-OPERATOR-MANUAL-BOOKING-1-ACTIVATE — activate Operator manual booking | DONE; PR #121 squash-merged at `ea64365cc49bdb96ec090f0234183f6286dd9ba2` |
| UI-MVP-OPERATOR-MANUAL-BOOKING-1 — Operator creation on behalf of Supplier | DONE; PR #123 squash-merged at `ea1e436bc563d68aecf15e9417fd9f627c432abf` |
| UI-MVP-CALENDAR-VIEWS-1-ACTIVATE — activate complete calendar views | DONE; PR #125 squash-merged at `3311ee07c4fb508ddcec0fb09a4b9ea4a0f8ab38` |
| UI-MVP-CALENDAR-VIEWS-1 — complete six role-scoped calendar views | DONE; PR #127 squash-merged at `a9c6b04e9a4aaf70a0e3507e61b8091543d2a76f` |
| UI-MVP-RESPONSIVE-COMPLETION-1-ACTIVATE — activate responsive completion | DONE; PR #129 squash-merged at `0fe3a4e0acbb9dea5c731d534dd64d2be737f6c6` |
| UI-MVP-RESPONSIVE-COMPLETION-1 — complete responsive-web screen coverage | DONE; PR #131 squash-merged at `9211bc62590baa6fac5d4d8c642f8a4e26171b62` |
| UI-MVP-PRODUCT-REVIEW-2-ACTIVATE — activate final scoped completion review | DONE; PR #133 squash-merged at `fe540c63212411378e2eb8e71b1ee56e65cd1192` |
| UI-MVP-PRODUCT-REVIEW-2 — final scoped UI MVP completion review | DONE; PR #135 squash-merged at `4008906c4ce4640bbbae5e9d1deb8bafc224b7bc` |
| PROD-FOUNDATION-PLAN-1-ACTIVATE — activate production foundation planning | DONE; PR #137 squash-merged at `cd293a11daf0bddd35ba5141c71f7ad6d8de6a98` |
| PROD-FOUNDATION-PLAN-1 — production foundation charter and execution plan | DONE; PR #139 |
| PROD-REPO-ASSESSMENT-1 — authorized production repository assessment | DONE; issue #141 completed by merged PR #142; assessed production SHA `c758e8403a4693fa7ba96081254072ad5d743aba` |

## Active

### PROD-GOVERNANCE-SYNC-1 — reconcile production program governance

- State: `IN_PROGRESS`.
- Issue: #143.
- Repository: `lukaszgebicki/dock-scheduling-ui-ai-studio`.
- Exact UI base SHA: `03c8561795ffdcc72eaea0469a1d43f3a11d4b14`.
- Production repository is reference-only for this task.
- Exact production reference SHA: `11c253ef08708cc8095c5218e3b4e3a447013be1`.
- Objective: reconcile active planning and governance with the completed assessment and the verified implementation state of the production repository.
- Publication boundary: one Draft Pull Request; no merge without Product Authority approval.

No production implementation task is `READY`. Completion of this governance
synchronization does not activate implementation work.

## Production Foundation status

The authorized assessment concluded that the production repository should be
evolved rather than replaced. Since the historical assessed SHA, separately
scoped production work has completed these foundation groups:

- security and API baseline hardening;
- critical/high dependency remediation and blocking audit evidence;
- required PostgreSQL integration CI;
- scoped six-role server RBAC and persisted scope assignments;
- organization, Supplier organization, warehouse and participation identities;
- privileged role and user-status mutations with immutable audit evidence;
- global System Administrator user directory and lifecycle administration;
- one-time invitation issuance and atomic invitation acceptance;
- immutable per-user reads for role, status, invitation and creation audit history.

These completed groups are foundations, not a claim that Dock Scheduling is
production-ready. Observability, final multi-instance rate limiting,
deployment and environment promotion, backup/restore and runbooks, business
configuration, transactional booking and capacity, and outbox/workers remain
open.

## Recommended next directions — not activated

The following are planning recommendations only and require a separate Product
Authority decision, exact-SHA issue and task contract before they can become
`READY`:

1. `PROD-OBSERVABILITY-FOUNDATION-1` — complete logs, metrics, traces, alert ownership and operational runbooks.
2. The first transactional booking vertical slice — durable Supplier booking with server-side validation, idempotency and oversubscription-safe capacity.

## Canonical sources of truth

### Production implementation

`lukaszgebicki/dock-scheduling-app-ai-studio1707` is canonical for production
code, schema and migrations, API behavior, implemented security and RBAC,
tests, current technical implementation status, and production issues and Pull
Requests.

### Product and program governance

`lukaszgebicki/dock-scheduling-ui-ai-studio` remains canonical for the approved
UI MVP as functional reference, Product Authority decisions, product
documentation, program planning, governance and historical assessment
material. It is not the canonical source for current production code.
