# Verified current state

Verified on 2026-07-24 at
`44a6dd26ad49eb4056d890d86bcdb25c1640bcd6`.

## Repository and delivery state

- Repository: `lukaszgebicki/dock-scheduling-ui-ai-studio`.
- `main`, `origin/main`, the canonical `HEAD`, and the foundation merge
  base are all `44a6dd26ad49eb4056d890d86bcdb25c1640bcd6`.
- The canonical `main` worktree is clean and unstaged.
- Current registered worktrees: canonical `main` plus the authorized
  external `chore/codex-autonomy-foundation` worktree.
- Current local branches: `main` and
  `chore/codex-autonomy-foundation`.
- Current relevant remote branch: `origin/main`; no remote foundation
  branch exists.
- GitHub inspection found no open pull requests.

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

- React 18.3.1 and React Router DOM 7.18.0; the transitive
  `react-router` package is also 7.18.0.
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

Commands were run in the authorized external worktree on 2026-07-24.

| Check | Verified result |
| --- | --- |
| `npm ci` | PASS; 229 packages added |
| `npm run typecheck` | PASS |
| `npm test -- --reporter=verbose` | PASS; 16 files, 280 tests, 0 failed, 0 skipped |
| `npm run build` | PASS; no warnings |
| `npm audit --omit=dev` | PASS; 0 vulnerabilities |
| Node.js | 24.14.0 |
| npm | 11.18.0 |
| Vite | 5.4.21 |
| Modules transformed | 1,631 |
| HTML | 0.41 kB; 0.28 kB gzip |
| CSS | 30.68 kB; 6.48 kB gzip |
| JavaScript | 374.47 kB; 105.47 kB gzip |

The full development-tree audit reports four findings across the
Vite/esbuild and Vitest/vite-node development paths: 2 moderate, 1 high,
and 1 critical. They are development-only and tracked in
[TECH_DEBT.md](TECH_DEBT.md); the runtime tree remains clean.

## Next controlled task

`AUTONOMY-FOUNDATION-1` remains `IN_PROGRESS` until independent review.
The next queued governance task is `AUTONOMY-GOV-1`; its Class C
repository-governance changes require a separate explicitly authorized
task contract.
