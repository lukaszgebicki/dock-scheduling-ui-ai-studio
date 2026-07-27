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

## Active and queued

### DEV-SEC-001-REMEDIATE — development toolchain remediation

- State: `READY`.
- Risk class: Class C.
- Objective: remove the current development-only Vite, Vitest,
  Vite-node, and esbuild audit findings while preserving the verified
  runtime and application behavior.
- Authorized paths: `package.json` and `package-lock.json`.
- Protected paths: source code, tests, Vite/Vitest configuration,
  workflows, repository configuration, and all other files.
- Class C authorization: Łukasz explicitly approved dependency and
  lockfile changes for this remediation on 2026-07-27.
- Delivery: E4, `build_high`, separate `review_high` Reviewer, complete
  validation, `publish_feature`, and mandatory stop before merge.
- Contract gate: after this activation change is human-merged, create a
  machine-readable GitHub issue contract bound to the resulting exact
  `main` SHA before implementation.
- Acceptance: `npm audit` and `npm audit --omit=dev` report zero
  vulnerabilities; locked install, typecheck, all 17 test files and 287
  tests, and build pass; no test is weakened; no configuration,
  workflow, source, or runtime behavior changes.
- Prohibited shortcuts: no `npm audit fix`, `npm audit fix --force`,
  overrides, audit suppression, force push, direct `main` write, or
  autonomous merge.

No other product, governance, security, or infrastructure
implementation task is currently approved as `READY` or active.
