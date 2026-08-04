# PROD-SEC-CI-BASELINE-1 Contract

## Status

`QUEUED_AFTER_ASSESSMENT` — production source remediation authorized by Product Authority, but implementation must use a separate production-repository issue and branch.

## Exact production baseline

- Repository: `lukaszgebicki/dock-scheduling-app-ai-studio1707`
- Base branch: `main`
- Base SHA: `c758e8403a4693fa7ba96081254072ad5d743aba`
- Proposed branch: `chore/prod-sec-ci-baseline-1`

## Objective

Remove immediate API information-leak/debug surfaces, make readiness and lifecycle behavior production-honest, repair environment/developer documentation and improve CI security evidence without adding Dock Scheduling business features.

## Proposed scope

- `apps/api/src/app.ts`
- `apps/api/src/app.test.ts`
- `apps/api/src/server.ts`
- `apps/api/src/db.ts`
- focused new lifecycle/error tests under `apps/api/src/**`
- `.env.example`
- `README.md`
- `.github/workflows/ci.yml` only for evidence-producing dependency/security checks that are reconciled during the PR

## Acceptance criteria

1. No production route intentionally throws a diagnostic error.
2. Unhandled 5xx responses never return raw exception messages, stack data or secrets.
3. Client-supplied correlation IDs are bounded and validated; invalid values are replaced.
4. Production readiness returns failure when the required database is absent/unavailable and does not create an unbounded new pool per request.
5. Server shutdown closes Fastify and database resources with bounded, tested lifecycle behavior.
6. README and `.env.example` describe the real monorepo, required variables, database/migration workflow, tests and current product boundary.
7. CI exposes the exact dependency vulnerability posture; any permanent audit gate is based on observed runtime results rather than assumption.
8. Existing typecheck, lint, unit tests and build pass; focused security tests pass.
9. No business schema, UI MVP feature migration, cloud deployment or live environment change.
10. Fresh review is at least 8/10 with zero unresolved high-severity findings before merge.
