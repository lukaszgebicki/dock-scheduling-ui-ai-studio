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
