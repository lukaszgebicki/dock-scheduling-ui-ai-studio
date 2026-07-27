# Verified current state

Verified on 2026-07-27 at
`6f8eead83090db4d28a4615556faa7bf6cec94db`.

## Repository and delivery state

- Repository: `lukaszgebicki/dock-scheduling-ui-ai-studio`.
- `main` and `origin/main` are
  `6f8eead83090db4d28a4615556faa7bf6cec94db` after human merge of
  `AUTONOMY-GOV-1` pull request #10.

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
- Vite 5.4.21, TypeScript 5.9.3, Vitest 1.6.1, React Hook Form 7.82.0,
  and Zod 4.4.3 are resolved in the lockfile.
- Frontend-only, demo-injected authentication; no production persistence
  or backend integration.
- `src/users/demoAccessScope.ts` centralizes the typed access-scope data
  used by newer flows. `src/users/demoUsers.ts` remains a legacy fixture
  with duplicated presentation labels and access text.
- Current enabled administration areas are users and access,
  invitations, warehouses, and supplier organizations. Dashboard,
  appointments, and slot calendar are visible only as disabled
  “Soon” navigation.

## Validation baseline

Commands were run in the authorized external worktree on 2026-07-27.

| Check | Verified result |
| --- | --- |
| `npm ci` | PASS; 225 packages added |
| `npm run typecheck` | PASS |
| `npm test -- --reporter=verbose` | PASS; 16 files, 280 tests, 0 failed, 0 skipped |
| `npm run build` | PASS; no warnings |
| `npm audit --omit=dev` | PASS; 0 vulnerabilities |
| Node.js | 24.14.0 |
| npm | 11.18.0 |
| Vite | 5.4.21 |
| Modules transformed | 1,685 |
| HTML | 0.41 kB; 0.28 kB gzip |
| CSS | 30.68 kB; 6.48 kB gzip |
| JavaScript | 426.71 kB; 119.49 kB gzip |

GHSA-qwww-vcr4-c8h2 affected the prior React Router 7.18.0 runtime
dependency. `SPR-SEC-2` resolved the runtime dependency to React Router
8.3.0; its runtime audit reported zero vulnerabilities.

## Local runner status

`AUTONOMY-GOV-1` is DONE and human-merged through PR #10. The governed
local runner and Dock AI Playbook v2 are available on `main`. The fixed
profiles are `scan_low`, `mechanical_low`, `build_medium`,
`repair_medium`, `build_high`, and `review_high`; E0–E4 separately
control execution autonomy, from read-only reporting through one
verified PR that always stops before merge.

Readiness verification on 2026-07-27 passed: autonomy doctor found all
six profiles available with workspace-write Builder and read-only
Reviewer boundaries, every profile prohibited merge, and the focused
runner suite passed 68/68. The runtime audit reported zero
vulnerabilities. The runner is ready only for a separately approved
controlled pilot; no autonomous pilot has run and no end-to-end
operational use is claimed.

## Next controlled task

`SPR-SEC-2` is `DONE`; PR #9 was human-merged. `AUTONOMY-GOV-1` is
`DONE`; PR #10 was human-merged. `AUTONOMY-PILOT-1` is ready only for a
separately approved complete task contract and controlled pilot. Its
exact product scope and contract remain subject to separate Project
Lead and Business Owner approval. `SPR-2E` remains blocked and
unscoped.
