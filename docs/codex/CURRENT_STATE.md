# Verified current state

Verified on 2026-08-09 at
`b94a123fb1bf3974e06f5c0526dc3b42878450a6`.

## Repository and delivery state

- Repository: `lukaszgebicki/dock-scheduling-ui-ai-studio`.
- Visibility: public.
- The verified `origin/main` baseline is
  `b94a123fb1bf3974e06f5c0526dc3b42878450a6`, the squash merge commit
  for the issue #147 state-update pull request #148.
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
- The completed foundations recorded by PR #144 do not establish complete
  production readiness. Observability, final multi-instance rate limiting,
  deployment and environment promotion, backup/restore and runbooks, business
  configuration, transactional booking/capacity and outbox/workers remain
  open program concerns.

### Canonical sources of truth

- `lukaszgebicki/dock-scheduling-app-ai-studio1707` is canonical for current
  production code, schema and migrations, API behavior, implemented security
  and RBAC, tests, technical implementation state, and production issues and
  pull requests.
- `lukaszgebicki/dock-scheduling-ui-ai-studio` is canonical for the approved
  UI MVP functional reference, Product Authority decisions, product/program
  governance and historical assessment material. It is not canonical for
  current production code.

This state update used only verified UI-repository evidence. It did not open,
fetch, clone, inspect or modify the production repository.

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

## DEV-SEC-002 read-only audit evidence

The development dependency preflight ran from a clean external worktree at the
exact verified `origin/main` baseline
`b94a123fb1bf3974e06f5c0526dc3b42878450a6` on Node.js 24.14.0 and npm
11.16.0. No manifest, lockfile, source, configuration, workflow, test or
production-repository file was changed.

| Command | Verified result |
| --- | --- |
| `npm ci` | PASS; 199 packages added, 200 packages audited; full graph reported 2 vulnerabilities |
| `npm audit` | Expected non-zero exit 1; 1 moderate and 1 high vulnerability |
| `npm audit --json` | Expected non-zero exit 1; exactly `postcss` and `nanoid`, both indirect |
| `npm audit --omit=dev` | PASS; 0 vulnerabilities |

The installed development-only path is root `devDependency` `vite@6.4.3` to
`postcss@8.5.21` to `nanoid@3.3.16`. The audit identifies:

- `postcss`: `GHSA-fxqj-rqcc-2cmp` / `CVE-2026-69153`, moderate in npm audit,
  affected through 8.5.22 and first patched in 8.5.23;
- `nanoid`: `GHSA-2v37-7h3g-55p8` / `CVE-2026-67213`, high, affected below
  3.3.17 and first patched in 3.3.17 for the installed major line.

The existing transitive ranges already permit patched releases. A read-only
targeted dry-run selected `postcss@8.5.26` and `nanoid@3.3.18` without a broad
toolchain upgrade. This supports a `package-lock.json`-only implementation
contract, but the implementation must stop if an actual targeted update changes
`package.json` or any other protected path.

## Main branch governance

- Active ruleset `Protect main` (ID `19850347`) targets `refs/heads/main`.
- All changes to `main` require a pull request.
- `Typecheck, test and build` is the required check.
- Force pushes and deletion of `main` are blocked.
- Automated PASS never replaces human merge authorization.

## Next controlled task

After human merge of the `DEV-SEC-002-ACTIVATE` pull request,
`DEV-SEC-002-REMEDIATE` is the only `READY` task. It is a Class C remediation
limited to `package-lock.json`; `package.json` and every other path remain
protected. Implementation requires a new machine-readable contract bound to
the resulting exact `main` SHA, E4 with `build_high`, a separate `review_high`
Reviewer, complete validation, `publish_feature`, and a mandatory stop before
merge.

No dependency update is authorized by the activation pull request itself. The
production `PROD-APPROVAL-LIFECYCLE-1` pull request #54 remains a separate
project critical path supplied by Product Authority and is outside this task's
repository and scope; it was not opened, fetched or inspected for this update.
