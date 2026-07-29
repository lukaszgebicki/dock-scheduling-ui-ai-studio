# Verified current state

Verified on 2026-07-29 at
`85bddbdd81c22cceb7f27f257c731b28327ced82`.

## Repository and delivery state

- Repository: `lukaszgebicki/dock-scheduling-ui-ai-studio`.
- Visibility: public.
- The verified `origin/main` baseline is
  `85bddbdd81c22cceb7f27f257c731b28327ced82`, after human merge of
  the role and demo-domain foundation pull request #37.

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

## Routes

| Route | Current behavior |
| --- | --- |
| `/` | Protected role-aware redirect to `/users` or `/appointments` |
| `/users` | Role-guarded and scope-filtered users and access overview |
| `/users/invite` | Role-guarded local-only invitation preparation |
| `/warehouses` | Role-guarded and scope-filtered warehouse overview |
| `/warehouses/new` | System Administrator-only local preparation |
| `/supplier-organizations` | Role-guarded and scope-filtered supplier-organization overview |
| `/supplier-organizations/new` | System Administrator-only local preparation |
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

Commands were run in the authorized external worktree on 2026-07-29.

| Check | Verified result |
| --- | --- |
| `npm ci` | PASS; 199 packages added, 200 audited, 0 vulnerabilities |
| Focused issue #36 tests | PASS; 7 files, 72 tests |
| `npm run typecheck` | PASS |
| `npm test -- --reporter=verbose` | PASS; 19 files, 302 tests, 0 failed, 0 skipped |
| `npm run build` | PASS; 1,686 modules transformed |
| `npm audit` | PASS; 0 vulnerabilities |
| `npm audit --omit=dev` | PASS; 0 vulnerabilities |
| GitHub `Typecheck, test and build` | PASS on PR #37 |
| Node.js | 24.14.0 |
| npm | 12.0.1; compatibility warning because this npm declares Node.js >=24.15.0 |
| Vite | 6.4.3 |
| Modules transformed | 1,686 |
| HTML | 0.41 kB; 0.28 kB gzip |
| CSS | 31.91 kB; 6.69 kB gzip |
| JavaScript | 442.98 kB; 123.46 kB gzip |

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

## Next controlled task

`UI-MVP-FOUNDATION-1` is `DONE`; PR #37 was human-merged. The six-role
UI-only foundation, stable typed demo-domain identities and assignments,
role-aware navigation, route and action guards, and existing-data scope
filters are present on `main`. Existing demo authentication remains
unchanged, and the active demonstration context does not imply real
authentication or authorization.

`UI-MVP-ADMIN-CONFIG-1` is the next controlled candidate in the approved
[UI MVP implementation plan](UI_MVP_IMPLEMENTATION_PLAN.md), but it is not
`READY` and has no active implementation contract. A separate activation
and machine-readable contract bound to the then-current exact `main` SHA
are required before implementation. No product, governance, security, or
infrastructure task is currently approved as `READY` or active.
