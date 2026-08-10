# Verified current state

Verified on 2026-08-10 at
`27f15b6fed81e59e4ea8b38b1a99267c6c48b3c8`.

## Repository and delivery state

- Repository: `lukaszgebicki/dock-scheduling-ui-ai-studio`.
- Visibility: public.
- The verified `origin/main` baseline is
  `27f15b6fed81e59e4ea8b38b1a99267c6c48b3c8`, the squash merge commit
  for `DEV-SEC-002-REMEDIATE` pull request #151.
- This repository is the frontend-only Dock Scheduling UI sandbox and
  functional reference. It is not a production system and provides no
  production persistence or production authorization enforcement.

## Merged delivery milestones

| Milestone group | Evidence |
| --- | --- |
| Repository, security and autonomy foundations | Completed tasks through PR #23, exact merge evidence in [ROADMAP.md](ROADMAP.md) |
| UI MVP specification, shared role model and administration configuration | PRs #31, #37 and #42 |
| Weekly-planning specification and optional-role routing | PRs #50 and #56 |
| Scoped UI MVP delivery sequence | Task-specific activation and delivery PRs #62–#131, exact merge evidence in [ROADMAP.md](ROADMAP.md) |
| Final scoped UI MVP completion review | PR #135, result `PASS` |
| Production foundation charter and execution plan | PR #139 |
| Authorized production-repository assessment | issue #141 completed by merged PR #142 |
| Production program governance synchronization | issue #143 completed by squash-merged PR #144 at `8746888257a763f714a66c3948b53c4c1f636332` |
| Governance-state bootstrap | issue #145 completed by squash-merged PR #146 at `3ecbe8b0d54552fd2a1ab987fd6a24d8c83279a2` |
| Production governance synchronization state | issue #147 completed by squash-merged PR #148 at `b94a123fb1bf3974e06f5c0526dc3b42878450a6` |
| Development dependency remediation | issue #150 completed by squash-merged PR #151 at `27f15b6fed81e59e4ea8b38b1a99267c6c48b3c8` |

## Scoped UI MVP result

The [UI MVP Product Completion Review v2](UI_MVP_PRODUCT_COMPLETION_REVIEW_V2.md)
records `PASS` for the agreed frontend-only demonstrational scope. Its verified
closure covers 29 BDP identifiers and 43 acceptance scenarios, including:

- six role-scoped UI contexts and fail-closed route/action visibility;
- warehouse and Supplier configuration;
- weekly and standard Supplier booking plus Operator creation;
- duration-aware composite capacity and deterministic final-capacity conflict;
- approval, lifecycle, gate and optional-role routing through `RUN`, `SKIP`,
  `DELEGATE` and `BLOCK`;
- Friday import preview, exact PO/SKU enrichment, unmatched scheduling and
  explicit transport reconciliation;
- PO-level calendar views, SKU drill-down, reports and local exports;
- dashboards, notifications, responsive views and standing-series preview.

This completion result does not establish production readiness. The UI remains
local and demonstrational: no production backend persistence, transactions,
ERP/WMS/SAP integration, real notification delivery, attachment storage,
deployment architecture or operational controls are supplied by this
repository.

## Product authority

- [Business Decision Pack UI MVP v0.3](../product/UI_MVP_BUSINESS_DECISION_PACK_v0.3.md)
  is the canonical approved UI MVP business source.
- [UI MVP traceability](../product/UI_MVP_TRACEABILITY.md) and the
  [implementation plan](UI_MVP_IMPLEMENTATION_PLAN.md) retain the controlled
  requirement and delivery mapping.
- [Scope Addendum v0.4](../product/UI_MVP_SCOPE_ADDENDUM_v0.4.md) defines the
  final scoped closure, explicit deferrals and continuing exclusions.
- BDP v0.2 remains historical evidence. Section 24 remains excluded.
- `BDR-TRN-001` remains controlling: both Supplier transport registrations are
  required at reservation; Administrator reconciliation is explicit and
  auditable; Friday import never silently overwrites Supplier values.

## Production program governance

- `PROD-REPO-ASSESSMENT-1` is `DONE` through issue #141 and merged PR #142.
- The assessment conclusion recorded in the UI repository is to evolve the
  existing production repository rather than replace it.
- `PROD-GOVERNANCE-SYNC-1` is `DONE` through closed issue #143 and
  squash-merged PR #144 at
  `8746888257a763f714a66c3948b53c4c1f636332`.
- The historical assessed production SHA remains
  `c758e8403a4693fa7ba96081254072ad5d743aba`; it is not the current
  implementation reference.
- The verified current production `main` is
  `dbe1127ae64c24e601828f38a0b88a749b79b858`.
- Production observability, the Supplier booking vertical slice, capacity
  transaction hardening and the manual approval lifecycle are `DONE` through
  PRs #48, #50, #52 and #54 respectively.
- Baseline CI unblock PR #61 resolved the Nano ID HIGH blocker and the
  invitation-expiry fixture time bomb before PR #54 was integrated and merged.
- These completed foundations do not establish production readiness.
  Deployment/environment promotion, backup/restore, Booking Configuration
  Administration, reschedule/cancel, Operator manual booking, Gate Ops,
  outbox delivery workers and P4-P6 remain incomplete.

### Canonical sources of truth

- `lukaszgebicki/dock-scheduling-app-ai-studio1707` is canonical for current
  production code, schema and migrations, API behavior, implemented security
  and RBAC, tests, technical implementation state, and production issues and
  pull requests.
- `lukaszgebicki/dock-scheduling-ui-ai-studio` is canonical for the approved
  UI MVP functional reference, Product Authority decisions, product/program
  governance and historical assessment material. It is not canonical for
  current production code.

This reconciliation used Product Authority-authorized read-only production
repository evidence. It made no production repository write.

## PR #144 validation evidence

Issue #143 records the final current-merge-ref CI run #257 for PR #144:

| Check | Verified result |
| --- | --- |
| Checkout | PASS |
| Dependency installation | PASS |
| `npm run typecheck` | PASS |
| `npm test -- --reporter=verbose` | PASS; 72 files, 726 tests |
| `npm run build` | PASS |
| Runtime dependency audit | PASS; 0 vulnerabilities |

PR #144 changed exactly `docs/codex/ROADMAP.md`,
`docs/codex/PRODUCTION_FOUNDATION_BACKLOG.md` and
`docs/codex/PROD_REPO_ASSESSMENT_ACTIVATION_STATUS.md`. It made no application,
dependency, lockfile, workflow or production-repository change.

## DEV-SEC-002 remediation result

`DEV-SEC-002-REMEDIATE` is `DONE` through issue #150 and squash-merged PR #151
at `27f15b6fed81e59e4ea8b38b1a99267c6c48b3c8`.

- `postcss` moved from `8.5.21` to `8.5.26`.
- `nanoid` moved from `3.3.16` to `3.3.18`.
- The final diff changed only `package-lock.json`; no manifest, source, test,
  configuration, workflow or production behavior changed.
- Repeated local validation reported 72 test files and 726 passing tests;
  typecheck and production build passed.
- Full and runtime dependency audits report 0 vulnerabilities.
- Exact-head CI run #265 and independent `review_high` passed with no findings.

## Main branch governance

- Active ruleset `Protect main` (ID `19850347`) targets `refs/heads/main`.
- All changes to `main` require a pull request.
- `Typecheck, test and build` is the required check.
- Force pushes and deletion of `main` are blocked.
- Automated PASS never replaces human merge authorization.

## Next controlled direction

- Security next: production issue #57
  `PROD-SEC-REACT-ROUTER-MIGRATION-1`, currently `PLANNED` and requiring its
  dedicated Class C migration contract before implementation.
- Product direction after security: `PROD-BOOKING-CONFIG-ADMIN-1` — Booking
  Configuration Administration. It is not activated for implementation.
- P2 is `DONE`. P3 is partial: manual approval lifecycle is `DONE`, while
  Booking Configuration Administration, reschedule/cancel, Operator manual
  booking and Gate Ops remain.
- Deployment/release and P4-P6 remain incomplete.
