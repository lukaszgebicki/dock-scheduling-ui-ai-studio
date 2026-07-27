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

- Status: `OPEN`; remediation task `DEV-SEC-001-REMEDIATE` is approved
  as `READY`, but implementation must wait for the activation change to
  be human-merged and the exact-SHA GitHub issue contract to be created.
- Audit command: `npm audit`.
- Aggregate result: 4 vulnerable packages — 2 moderate, 1 high, and 1
  critical.
- Direct advisory: `esbuild` 0.21.5 is within the affected
  `<=0.24.2` range for `GHSA-67mh-4wv8-2f99`, rated moderate. The issue
  allows a website to send requests to an exposed development server
  and read responses.
- Verified installed paths from
  `npm ls esbuild vite vite-node vitest @vitejs/plugin-react`:
  - root `vite@5.4.21 → esbuild@0.21.5`;
  - `vitest@1.6.1 → vite-node@1.6.1 → vite@5.4.21 → esbuild@0.21.5`;
  - `vitest@1.6.1 → vite@5.4.21 → esbuild@0.21.5`;
  - `@vitejs/plugin-react@4.7.0 → vite@5.4.21 → esbuild@0.21.5`;
  - `@tailwindcss/vite@4.3.3 → vite@5.4.21 → esbuild@0.21.5`.
  Shared Vite and esbuild nodes are deduplicated. npm propagates the
  four aggregate severities through these development-only paths; its
  report does not assign each propagated severity to an individual
  path node.
- Production/runtime exposure: none in the installed production tree;
  every affected node is marked development-only and
  `npm audit --omit=dev` reports 0 vulnerabilities. Development-server
  exposure still matters when the server is reachable by untrusted
  content.
- Approved remediation task: `DEV-SEC-001-REMEDIATE`, a dedicated Class
  C Vite/Vitest/esbuild toolchain upgrade limited to `package.json` and
  `package-lock.json`, with compatibility study, focused config review,
  complete validation, both audits, and independent review.
- Human authorization: Łukasz explicitly approved the dependency and
  lockfile scope on 2026-07-27. Source code, tests, Vite/Vitest
  configuration, workflows, and repository configuration remain
  protected.
- Prohibited shortcut: do not run `npm audit fix` or
  `npm audit fix --force`. The audit suggested a breaking Vite 8.1.5
  installation; no dependency was changed, overridden, or suppressed.
