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

- Status: `OPEN`; remediation task `DEV-SEC-002-REMEDIATE` becomes the only
  `READY` task after the activation pull request is human-merged. Implementation
  must wait for a new exact-SHA GitHub issue contract.
- Baseline: clean `origin/main` at
  `b94a123fb1bf3974e06f5c0526dc3b42878450a6`, verified on 2026-08-09 with
  Node.js 24.14.0 and npm 11.16.0.
- Full audit: `npm audit` and `npm audit --json` exit 1 with exactly 2 indirect
  vulnerabilities: 1 moderate and 1 high. The JSON inventory reports 13
  production, 263 development, 81 optional and 275 total dependencies.
- Runtime audit: `npm audit --omit=dev` exits 0 with 0 vulnerabilities. Both
  findings are confined to the development dependency graph.
- Dependency path: root `devDependency` `vite@6.4.3` resolves
  `postcss@8.5.21`, which resolves `nanoid@3.3.16`.
- `postcss@8.5.21`: `GHSA-fxqj-rqcc-2cmp` / `CVE-2026-69153`; npm severity
  moderate; vulnerable through 8.5.22; first patched version 8.5.23.
- `nanoid@3.3.16`: `GHSA-2v37-7h3g-55p8` / `CVE-2026-67213`; severity high;
  vulnerable below 3.3.17 on the installed major line; first patched version
  3.3.17.
- Lockfile-only evidence: Vite's existing `postcss` range is `^8.5.3`, and
  PostCSS's existing `nanoid` range is `^3.3.16`. A read-only
  `npm update postcss nanoid --dry-run --json` selected only
  `postcss@8.5.26` and `nanoid@3.3.18`. The minimum security boundaries are
  8.5.23 and 3.3.17; the higher dry-run selections are current compatible
  patches, not pre-assumed security minima.
- Authorized remediation shape: targeted `package-lock.json` update only,
  complete validation, Simplification Pass, exact inventory and independent
  read-only review. If any other tracked file must change, stop for a new Class
  C contract.
- Prohibited shortcuts: no `npm audit fix`, `npm audit fix --force`, dependency
  override, audit suppression, broad upgrade, force push, direct `main` write
  or autonomous merge.
