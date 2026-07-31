# Verified current state

Verified on 2026-07-31 at
`5ae722ddb519cf62f157b7c710aed5994176dd10`.

## Repository and delivery state

- Repository: `lukaszgebicki/dock-scheduling-ui-ai-studio`.
- Visibility: public.
- The verified `origin/main` baseline is
  `5ae722ddb519cf62f157b7c710aed5994176dd10`, after human merge of
  the weekly-planning activation governance-bootstrap pull request #47
  for issue #46.

## Merged milestones

| Milestone | Evidence |
| --- | --- |
| Demo authentication | PR #1, merged |
| CI foundation | PR #2, merged |
| SPR-2A — Users and access overview | PR #3, merged |
| SPR-2B — Invite user and centralized access scope | PR #4, merged |
| SPR-2C — Warehouses administration | PR #5, merged |
| SPR-SEC-1 — React Router security migration | PR #7, merged |
| SPR-2D — Supplier organizations administration | PR #6, merged |
| AUTONOMY-FOUNDATION-1 — repository governance foundation | PR #8, merged |
| SPR-SEC-2 — React Router 8.3 security migration | PR #9, human-merged |
| AUTONOMY-GOV-1 — local autonomy runner MVP | PR #10, human-merged |
| AUTONOMY-STATE-1 — runner readiness state update | PR #11, human-merged |
| AUTONOMY-RUNNER-COMPAT-1 — Codex CLI compatibility | PR #12, human-merged |
| AUTONOMY-PILOT-1 — Soon navigation accessibility pilot | PR #13, human-merged |
| SPR-2E — appointments operational overview | PR #14, human-merged |
| SPR-2E-CI-REPAIR-2 — appointments CI stabilization | PR #15, human-merged |
| STATE-UPDATE-2 — post-appointments state update | PR #16, human-merged |
| MAIN-BRANCH-GOVERNANCE-1 — protect `main` | PR #17, human-merged; state recorded in PR #18 |
| DEV-SEC-001-REMEDIATE — development-toolchain remediation | PR #19 activation; PR #21 human-merged |
| DEV-SEC-001-STATE — post-remediation state update | PR #23, human-merged |
| UI-MVP-SPEC-1-ACTIVATE — approve and ready UI MVP specification onboarding | PR #29, human-merged |
| UI-MVP-SPEC-1 — onboard approved UI MVP specification | PR #31, human-merged |
| UI-MVP-SPEC-1-STATE — post-onboarding state update | PR #33, human-merged |
| UI-MVP-FOUNDATION-1 — role and demo-domain foundation | PR #37, human-merged |
| UI-MVP-FOUNDATION-1-STATE — post-foundation state update | PR #38, human-merged |
| UI-MVP-ADMIN-CONFIG-1 — warehouse and rule configuration | PR #42, human-merged at `e4168c3b4a6644ca483d0f3d6576e6d1ef73b534` |
| Weekly-planning activation governance bootstrap | PR #47 / issue #46, human-merged at `5ae722ddb519cf62f157b7c710aed5994176dd10` |

## Routes

| Route | Current behavior |
| --- | --- |
| `/` | Protected role-aware redirect to `/users` or `/appointments` |
| `/users` | Role-guarded and scope-filtered users and access overview |
| `/users/invite` | Role-guarded local-only invitation preparation |
| `/warehouses` | Role-guarded and scope-filtered warehouse overview |
| `/warehouses/new` | System Administrator-only local preparation |
| `/warehouses/:warehouseId/configuration` | Role-guarded local-only warehouse configuration |
| `/supplier-organizations` | Role-guarded and scope-filtered supplier-organization overview |
| `/supplier-organizations/new` | System Administrator-only local preparation |
| `/supplier-organizations/:supplierOrganizationId/configuration` | Role-guarded local-only Supplier configuration |
| `/appointments` | Role-visible, scope-filtered operational appointment overview |
| `/login` | Public-only demo sign-in |
| `/forgot-password` | Demo recovery request |
| `/reset-password` | Demo reset flow |
| `*` | Auth-aware redirect to the role-aware default route or `/login` |

Protected administration routes render in `AuthenticatedShell` and reject
roles without the corresponding demonstrational route or action permission.
Forgot- and reset-password routes remain available regardless of current
authentication state.

## Architecture and features

- React and React DOM 19.2.7, React Router 8.3.0, and Lucide React
  0.397.0. React Router DOM is no longer installed.
- Vite 6.4.3, Vitest 3.2.7, Vite-node 3.2.4, esbuild 0.25.12,
  TypeScript 5.9.3, React Hook Form 7.82.0, and Zod 4.4.3 are resolved
  in the lockfile. `@vitejs/plugin-react` resolves to 4.7.0.
- Frontend-only, demo-injected authentication; no production persistence
  or backend integration.
- `src/demoDomain/demoDomain.ts` is the canonical typed source for six
  demonstration roles, actors, users, warehouses, supplier organizations,
  stable identifiers, assignments, route access, action visibility, and
  existing-data scope rules.
- `src/demoDomain/configuration.ts` is the canonical typed local-only
  configuration source for warehouse working hours, docks, capacity,
  flows, required fields, approval rules, cut-offs, blocks, exceptions,
  history, Supplier assignments, and Supplier approval restrictions.
- Warehouse and Supplier configuration routes consume the active
  role and assignment scope. Configuration changes remain in mounted
  browser memory, record typed local history, and do not imply backend
  persistence or production authorization.
- The authenticated shell exposes a visibly demonstrational active-context
  selector. It changes only UI routing, navigation, actions, and local data
  visibility; it does not change authentication or imply real authorization.
- Enabled administration routes and actions vary by the active role.
  Dashboard and slot calendar remain visible only as disabled “Soon”
  navigation.
- The appointments overview contains eight UI-only demo appointments,
  search by reference, supplier, or warehouse, AND-combined status,
  warehouse, and supplier filters, responsive presentations, an exact
  result count, a clear-filters action, and an empty state. Users,
  warehouses, supplier organizations, and appointments are filtered to
  the active actor's approved organization and warehouse scope.

## Main branch governance

- Active repository ruleset `Protect main` (ID `19850347`) targets only
  `refs/heads/main`.
- All changes to `main` require a pull request.
- The `Typecheck, test and build` check is required and must run against
  the latest `main` before merge.
- Force pushes and deletion of `main` are blocked.
- The ruleset has no bypass actors. GitHub reports `main` as protected.
- The pull-request rule requires no approving reviews; human merge
  authorization remains a repository-process gate.

## Validation baseline

PR #42 recorded the following validation evidence for head
`2eee167c7c870d8a9e3e0d0e0ca15faac03bb727` before human merge.

| Check | Verified result |
| --- | --- |
| Focused Supplier-configuration regression tests | PASS; 1 file, 5 tests |
| `npm run typecheck` | PASS |
| `npm test -- --reporter=verbose` | PASS; 22 files, 352 tests |
| `npm run build` | PASS; 1,689 modules transformed |
| `npm audit` | PASS; 0 vulnerabilities |
| `npm audit --omit=dev` | PASS; 0 vulnerabilities |
| `git diff --check` | PASS |
| UTF-8, BOM, final-newline, conflict-marker, generated-artifact and exact allowed-path inventory checks | PASS; 26 files |
| Independent read-only Codex Reviewer | PASS; no actionable findings |
| Engineering Quality Score | 10/10 |

GHSA-qwww-vcr4-c8h2 affected the prior React Router 7.18.0 runtime
dependency. `SPR-SEC-2` resolved the runtime dependency to React Router
8.3.0; its runtime audit reported zero vulnerabilities.

## Local runner status

`AUTONOMY-GOV-1` is DONE and human-merged through PR #10. PR #11
recorded runner readiness, and PR #12 resolved the Codex CLI
compatibility findings discovered during pilot execution. The governed
local runner and Dock AI Playbook v2 remain available on `main`.

`AUTONOMY-PILOT-1` is DONE and human-merged through PR #13. The pilot
delivered the approved accessibility correction through a verified
open PR and preserved the human merge gate. The fixed profiles remain
`scan_low`, `mechanical_low`, `build_medium`, `repair_medium`,
`build_high`, and `review_high`; E0–E4 separately control execution
autonomy, and no profile permits merge.

## Approved weekly-planning decision

The following complete `BDR-TRN-001` decision was approved by Łukasz
Gębicki on 2026-07-31:

- Supplier provides both `tractorRegistration` and
  `trailerOrContainerRegistration` when reserving an appointment.
- Both values are part of the Supplier reservation contract and are
  required to complete the reservation.
- An authorized Administrator may create, correct or update either value
  at any time.
- Administrator changes must be explicit and auditable.
- Friday SKU import must not silently overwrite transport values entered
  during reservation; any difference requires explicit Administrator
  reconciliation.
- This decision supersedes any earlier weekly-planning assumption that
  exact transport-field mandatory status is deferred until Friday SKU
  enrichment.
- The `warehouse + loadCarrierType + goodsCategory` matrix may still be
  used for downstream validation and Administrator-added or imported
  deliveries, but it does not remove the two transport fields from the
  Supplier reservation step.

## Next controlled task

`UI-MVP-ADMIN-CONFIG-1` is `DONE`; PR #42 was human-merged at exact
`main` SHA `e4168c3b4a6644ca483d0f3d6576e6d1ef73b534`. The typed
local-only warehouse, Supplier and rule-configuration model, scoped
configuration routes, deterministic consumer contracts, exception
reasons and local history are present on `main`.

After human merge of this activation,
`UI-MVP-WEEKLY-PLANNING-SPEC-1-ACTIVATE` is complete and
`UI-MVP-WEEKLY-PLANNING-SPEC-1` is the sole next `READY` task documented
in [ROADMAP.md](ROADMAP.md). Its documentation-only purpose is to create
canonical Business Decision Pack v0.3 and reconcile traceability,
implementation sequencing, decision authority and governance with the
approved weekly-planning model and `BDR-TRN-001`.

The external weekly-planning v0.2 package remains approved input, not
canonical repository authority. The onboarding task requires a separate
Class C issue contract bound to the exact `main` SHA produced by human
merge of this activation. BDP v0.2 remains historical evidence, section
24 remains excluded, and all work remains frontend-only and local or
in-memory with no backend, persistence, ERP/WMS/SAP integration,
deployment or production-repository access. `UI-MVP-BOOKING-1` and every
source implementation task remain inactive and unauthorized.
