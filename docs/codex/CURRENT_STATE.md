# Verified current state

Verified on 2026-07-28 at
`079ddfe402a9537d5b4f4306b41bbf0d6d21f79c`.

## Repository and delivery state

- Repository: `lukaszgebicki/dock-scheduling-ui-ai-studio`.
- Visibility: public.
- The verified `origin/main` baseline is
  `079ddfe402a9537d5b4f4306b41bbf0d6d21f79c`, after human merge of
  the UI MVP specification activation pull request #29.

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

## Routes

| Route | Current behavior |
| --- | --- |
| `/` | Protected redirect to `/users` |
| `/users` | Users and access overview |
| `/users/invite` | Local-only invitation preparation |
| `/warehouses` | Warehouse overview |
| `/warehouses/new` | Local-only warehouse preparation |
| `/supplier-organizations` | Supplier-organization overview |
| `/supplier-organizations/new` | Local-only organization preparation |
| `/appointments` | Operational appointment overview |
| `/login` | Public-only demo sign-in |
| `/forgot-password` | Demo recovery request |
| `/reset-password` | Demo reset flow |
| `*` | Auth-aware redirect to `/users` or `/login` |

Protected administration routes render in `AuthenticatedShell`.
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
- `src/users/demoAccessScope.ts` centralizes the typed access-scope data
  used by newer flows. `src/users/demoUsers.ts` remains a legacy fixture
  with duplicated presentation labels and access text.
- Current enabled administration areas are users and access,
  invitations, warehouses, supplier organizations, and appointments.
  Dashboard and slot calendar remain visible only as disabled “Soon”
  navigation.
- The appointments overview contains eight UI-only demo appointments,
  search by reference, supplier, or warehouse, AND-combined status,
  warehouse, and supplier filters, responsive presentations, an exact
  result count, a clear-filters action, and an empty state.

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

Commands were run in the authorized external worktree on 2026-07-28.

| Check | Verified result |
| --- | --- |
| `npm ci` | PASS; 199 packages added; 200 packages audited; 0 vulnerabilities |
| `npm run typecheck` | PASS |
| `npm test -- --reporter=verbose` | PASS; 17 files, 287 tests, 0 failed, 0 skipped |
| `npm run build` | PASS; no warnings |
| `npm audit` | PASS; 0 vulnerabilities |
| `npm audit --omit=dev` | PASS; 0 vulnerabilities |
| Node.js | 24.14.0 |
| npm | 11.18.0 |
| Vite | 6.4.3 |
| Modules transformed | 1,682 |
| HTML | 0.41 kB; 0.28 kB gzip |
| CSS | 31.73 kB; 6.66 kB gzip |
| JavaScript | 438.50 kB; 122.09 kB gzip |

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

`UI-MVP-SPEC-1` remains the only approved `READY` task in
[ROADMAP.md](ROADMAP.md). GitHub issue #30 binds its Class A,
documentation-only onboarding contract to the exact verified `main` SHA
`079ddfe402a9537d5b4f4306b41bbf0d6d21f79c`.

The task may add only the approved Business Decision Pack UI MVP v0.2,
complete BDP and acceptance-scenario traceability, the controlled
implementation sequence, repository guidance, and verified governance
state. Section 24 remains excluded. No application implementation,
backend, persistence, dependency, CI, runner, or production-repository
work is authorized.
