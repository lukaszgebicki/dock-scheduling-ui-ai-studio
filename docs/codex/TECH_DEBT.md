# Technical debt

## SPR-SEC-1 — React Router runtime advisories

- Status: `RESOLVED`.
- Prior condition: the React Router 6 runtime tree reported
  `GHSA-wrjc-x8rr-h8h6` and `GHSA-337j-9hxr-rhxg`.
- Resolution: PR #7 migrated `react-router-dom` and transitive
  `react-router` to exactly 7.18.0.
- Current evidence: `npm audit --omit=dev` reports 0 vulnerabilities at
  the current baseline.
- Runtime exposure: none from these resolved advisories.

## DEMO-DATA-001 — legacy demo user access duplication

- Status: `OPEN`.
- Current evidence: `src/users/demoAccessScope.ts` centralizes typed
  stable warehouse IDs, supplier-organization IDs, and
  organization-to-warehouse mappings for newer access-scope and
  administration flows.
- Remaining debt: `src/users/demoUsers.ts` duplicates organization
  labels, warehouse labels, and supplier access presentation data, so
  the repository does not yet have one complete source of truth for all
  demo user and access presentation data.
- Direction: new access-scope and administration work should use
  `demoAccessScope`; existing source is unchanged by this governance
  task.
- Proposed follow-up: a dedicated future normalization task. Its design
  and acceptance criteria are intentionally not specified here.

## DEV-SEC-001 — development toolchain audit findings

- Status: `RESOLVED`.
- Prior condition: the development tree reported 4 vulnerable packages
  — 2 moderate, 1 high, and 1 critical — through the Vite, Vitest,
  Vite-node, and esbuild graph. The production-only audit remained at
  zero vulnerabilities.
- Resolution: PR #21 upgraded the approved development graph to
  `@vitejs/plugin-react@4.7.0`, `vite@6.4.3`, `vitest@3.2.7`,
  `vite-node@3.2.4`, and `esbuild@0.25.12`. The only test-file change
  migrated the existing `MockInstance` annotation to Vitest's
  function-signature generic form without changing assertions or
  runtime behavior.
- Current evidence at
  `1190c6dbd63a82843487d3d78326d3695c794320`: `npm audit` and
  `npm audit --omit=dev` both report 0 vulnerabilities; `npm ci`,
  typecheck, all 17 test files and 287 tests, and the production build
  pass.
- Installed graph: the root, `@tailwindcss/vite@4.3.3`,
  `@vitejs/plugin-react@4.7.0`, `vitest@3.2.7`,
  `@vitest/mocker@3.2.7`, and `vite-node@3.2.4` share one deduplicated
  `vite@6.4.3` node; Vite resolves `esbuild@0.25.12`.
- The remediation used no dependency overrides, audit suppression,
  `npm audit fix`, `npm audit fix --force`, force push, configuration
  change, CI change, or production behavior change.

## DEV-SEC-002 — renewed development dependency audit findings

- Status: `RESOLVED` through issue #150 and squash-merged PR #151 at
  `27f15b6fed81e59e4ea8b38b1a99267c6c48b3c8`.
- Resolution: the lockfile-only remediation moved `postcss 8.5.21 → 8.5.26`
  and `nanoid 3.3.16 → 3.3.18`, including matching registry metadata and the
  PostCSS dependency floor `^3.3.17`.
- Current evidence: full and runtime audits report 0 vulnerabilities;
  typecheck, 72 test files / 726 tests and production build pass.
- Scope evidence: only `package-lock.json` changed. No manifest, override,
  suppression, broad update, source, test, configuration or workflow change
  was used.

## PROD-BASELINE-CI-UNBLOCK-1 — production baseline blockers

- Status: `RESOLVED` through production PR #61 at
  `5c60fa0b960d83b56a8cf17cc061510f8a2ed744`.
- Resolution: `nanoid 3.3.16 → 3.3.17` removed the production HIGH audit
  blocker, and the invitation audit fixture received a deterministic future
  expiry date.
- Boundary: production auth/session behavior, constraints and migrations were
  unchanged. React Router advisories remained visible and unsuppressed.

## PROD-SEC-REACT-ROUTER-MIGRATION-1 — supported-line migration

- Status: `PLANNED / SECURITY NEXT` in production issue #57.
- Current evidence: production `apps/web` resolves `react-router-dom 6.30.4`
  and nested `react-router 6.30.4`; two moderate advisories remain visible.
- Required direction: migrate to a currently supported security-clean line
  under a dedicated Class C contract with route, redirect, authenticated-shell
  and complete web regression evidence.
- Prohibited shortcuts: no advisory suppression, audit ignore, backend auth
  change or unrelated dependency upgrade.
- Product direction after this security task is Booking Configuration
  Administration; that product feature is not activated here.
