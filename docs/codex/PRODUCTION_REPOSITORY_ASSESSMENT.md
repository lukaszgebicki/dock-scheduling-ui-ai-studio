# Production Repository Assessment

## Assessment identity

- Task: `PROD-REPO-ASSESSMENT-1`.
- Assessment date: 2026-08-04.
- Product Authority authorization: `docs/codex/PROD_REPO_ASSESSMENT_AUTHORIZATION.md`.
- Production repository: `lukaszgebicki/dock-scheduling-app-ai-studio1707`.
- Assessed branch: `main`.
- Exact assessed SHA: `c758e8403a4693fa7ba96081254072ad5d743aba`.
- Canonical planning repository baseline: `6d3f7a1cc880b22ca7bc721c9809e543c7f4c603`.
- Assessment method: repository metadata, source/configuration inspection, package-lock review, PR history and the latest successful GitHub Actions job logs.
- Live cloud, production data and secrets: not accessed.

## Executive conclusion

**Assessment result: usable authentication prototype, not a production application foundation yet.**

The repository has a credible technical nucleus aligned with the Production Foundation target: npm workspaces, React/TypeScript, Fastify, PostgreSQL/Prisma, repository/use-case separation, short-lived access tokens, rotating refresh tokens, password recovery, security-focused tests and a basic CI pipeline.

The repository does not contain the Dock Scheduling product beyond authentication. The authenticated route renders only a placeholder shell. The database contains only `User`, `AuthSession`, `RefreshToken` and `PasswordResetToken`; there are no roles, organizations, warehouses, configuration, appointments, capacity reservations, approval, audit, outbox, gate, import, reporting or notification delivery records.

Before implementing business features, the repository needs a controlled foundation pass. The highest immediate risks are:

1. dependency installation reports **15 vulnerabilities: 5 moderate, 7 high and 3 critical**;
2. CI skips all 28 database integration/E2E tests and has no audit gate;
3. the global API error handler can return internal exception messages to clients;
4. a deliberate `/api/error` diagnostic endpoint is registered in the application;
5. readiness can report success while the database is not configured and auth routes are absent;
6. rate limiting is process-local and production proxy/IP behavior is undefined;
7. operational shutdown, deployment, observability, backup and recovery foundations are absent;
8. repository documentation and `.env.example` are materially inaccurate.

The recommended first implementation task is **`PROD-SEC-CI-BASELINE-1`**, a narrow production-repository PR that removes immediate API leakage/debug surfaces, makes readiness honest, repairs environment documentation and exposes dependency and integration-test risk in CI. Dependency remediation should then use exact advisory evidence rather than a blind bulk upgrade.

## Repository topology

```text
apps/
  api/       Fastify API and authentication implementation
  web/       React/Vite authentication UI and placeholder protected shell
packages/
  config/    database URL resolution
  contracts/ minimal API contracts
  domain/    authentication entities, ports and crypto helpers
  ui/        minimal shared React package
prisma/
  schema.prisma  authentication-only PostgreSQL schema
.github/workflows/ci.yml
```

### Execution model

- npm workspaces orchestrate API, web and shared packages.
- API serves the built web application in production and proxies Vite in development.
- PostgreSQL is accessed through Prisma 7 and `@prisma/adapter-pg`.
- Authentication routes are registered only when a Prisma client is configured.
- Access tokens use HS256 JWT, 15-minute expiry, issuer/audience and session ID.
- Refresh tokens are opaque, cookie-based and represented by hashed durable records.
- Browser access token is kept in memory rather than local/session storage.

## Current capability assessment

| Area | Status | Evidence-backed conclusion |
| --- | --- | --- |
| Repository structure | `REUSE` | npm workspaces and `apps/api`, `apps/web`, `packages/*` are a suitable modular-monolith starting point. |
| Web foundation | `REUSE_WITH_CHANGE` | React/Vite, API client, accessible login/recovery and in-memory access token are useful. Authenticated product UI is only a placeholder. |
| API foundation | `REUSE_WITH_CHANGE` | Fastify, DI seams, typed contracts and repository/use-case separation are good. App composition is auth-centric and needs safer global middleware, modular registration and lifecycle control. |
| PostgreSQL/Prisma | `REUSE_WITH_CHANGE` | Correct relational direction and auth migrations/schema foundation. Business schema, audit, idempotency, outbox and capacity constraints are absent. |
| Authentication | `REUSE_WITH_CHANGE` | Password hashing, rotating refresh tokens, recovery and security tests are substantial. Production identity/RBAC, shared rate limiting, proxy configuration and protected API middleware are missing. |
| Authorization | `REPLACE/BUILD` | No six-role model, organization isolation, warehouse grants or server capability policies exist. |
| Product domain | `BUILD` | No booking, capacity, appointment, configuration, planning, lifecycle, gate, reporting or notification domain exists. |
| CI | `REUSE_WITH_CHANGE` | Deterministic install, Prisma validation, typecheck, lint, unit tests and build pass. Integration tests and security gates are absent. |
| Deployment | `BUILD` | No container/runtime manifest, infrastructure as code, environment promotion or rollback evidence found. |
| Observability | `BUILD_ON_NUCLEUS` | Pino logging and correlation header exist. No metrics, traces, alerting, SLOs or business telemetry. |
| Documentation | `REPLACE` | README remains AI Studio/Gemini boilerplate and `.env.example` is malformed/incomplete. |

## Strengths to preserve

### Authentication and token hygiene

- Passwords use Argon2id through a domain abstraction.
- Access tokens are short-lived and include subject, issuer, audience and session ID.
- Refresh tokens use an HttpOnly cookie and database-backed rotation/reuse detection.
- Password reset tokens are opaque and hashed at rest.
- Reset-password UI removes the token from the URL and does not write it to browser storage.
- Forgot-password behavior is neutral against account enumeration.
- Logging redacts credentials, tokens, e-mail and database secrets.

### Testability

- API construction accepts injected Prisma and infrastructure ports.
- Authentication use cases are separated from Fastify presentation.
- Security-specific tests cover rate-limit boundaries and token/log hygiene.
- Latest successful PR CI executed 248 passing tests with typecheck, lint and build.

### Technology alignment

The existing React, TypeScript, Fastify, PostgreSQL and Prisma choices are compatible with the target modular-monolith architecture. A rewrite or premature microservice split is not justified.

## Critical and high-priority findings

### F-01 — dependency vulnerabilities are not gated

**Severity: Critical program risk.**

The latest successful CI `npm ci` output reports:

- 3 critical vulnerabilities;
- 7 high vulnerabilities;
- 5 moderate vulnerabilities.

CI still passes because it never runs a failing `npm audit` step. The same logs warn about a deprecated `glob@10.5.0` line with publicly known security issues. The exact transitive paths and runtime/dev split must be captured by an explicit audit report before remediation.

Required response:

1. add an evidence-producing audit step on a remediation branch;
2. distinguish runtime from development/toolchain advisories;
3. remediate critical/high runtime findings first;
4. update lockfile only through tested targeted upgrades;
5. keep a runtime audit merge gate and track accepted development-toolchain risk separately with owner and expiry.

### F-02 — all database integration tests are skipped in CI

**Severity: High.**

Latest CI result:

- 248 tests passed;
- 28 tests skipped;
- skipped suites cover login persistence, repositories, password-reset transaction and password recovery E2E.

The workflow does not provision PostgreSQL or run `RUN_DB_INTEGRATION_TESTS=true`. Authentication correctness therefore depends heavily on mocks despite transactional claims.

Required response:

- add a PostgreSQL service to CI;
- run migrations against a clean database;
- execute integration tests as a separate required job;
- ensure tests use isolated schema/data and fail on migration drift.

### F-03 — global API error responses can disclose internals

**Severity: High.**

The global Fastify error handler returns `error.message` to the client for all errors, including status 500. Authentication routes often provide their own neutral errors, but any unhandled current or future business error can expose internal messages.

Required response:

- return a fixed generic message for 5xx;
- allow only explicitly classified safe 4xx messages;
- log structured event code, safe error type, correlation ID and status;
- add regression tests proving secrets/internal messages are not returned.

### F-04 — diagnostic `/api/error` route is registered

**Severity: High before production exposure.**

The application exposes a deliberate endpoint that throws a typed error. It has no product purpose and should not exist in a production build.

Required response: remove it or compile/register it only inside an explicit test harness. Prefer removal from application composition.

### F-05 — readiness is not an honest production gate

**Severity: High operational risk.**

Current readiness behavior:

- can return `200 ready / database:not_configured`;
- uses string heuristics for mock/localhost URLs;
- creates a new pool and Prisma client for each check;
- auth routes are not registered when Prisma is absent.

A deployment can therefore be considered ready while its principal authenticated functionality is unavailable.

Required response:

- in production, missing database configuration must return 503;
- probe the shared application connection rather than create a pool per request;
- report only bounded safe status information;
- test configured, unavailable and intentionally database-free test modes.

### F-06 — process-local rate limiting cannot protect multiple instances

**Severity: High at horizontal scale.**

The authentication limiter is a shared in-memory `Map`. Counters reset on process restart and are independent per instance. In addition, Fastify proxy trust is not explicitly configured, while limits rely on `request.ip`.

Required response:

- define trusted proxy topology;
- use a shared production limiter or edge/gateway policy with application fallback;
- keep raw e-mail/token values out of keys;
- test behavior across simulated instances and spoofed forwarding headers.

### F-07 — no graceful shutdown or database lifecycle integration

**Severity: Medium-high.**

`closeDb()` exists but `server.ts` does not bind signal handling or application close hooks. Rolling deployment or termination may abandon connections and in-flight work.

Required response:

- close Fastify and database pool on SIGTERM/SIGINT;
- reject new traffic through readiness during drain;
- bound shutdown duration;
- test lifecycle hooks.

### F-08 — repository setup documentation is incorrect

**Severity: Medium, immediate developer risk.**

- README instructs users to configure `GEMINI_API_KEY`, which the application does not use.
- `.env.example` concatenates `CORS_ORIGINS=AUTH_JWT_SECRET=` on one line.
- database variables, test integration mode and production limitations are not documented.
- no clear local PostgreSQL/migration/start sequence exists.

Required response: replace README and `.env.example` with truthful setup, architecture, commands, environment contract and current product boundary.

## Product and architecture gaps

These are expected program work, not defects in the authentication sprint:

- no real user role assignment or profile endpoint;
- no Supplier organization or warehouse grant;
- no warehouse/Supplier/configuration models;
- no appointment or SKU aggregate;
- no duration-aware capacity reservation or transactional concurrency;
- no approval/workflow routing;
- no append-only business audit model;
- no idempotency-key persistence;
- no transactional outbox or worker;
- no document/object storage;
- no real notification provider;
- no import batch/reconciliation persistence;
- no gate/lifecycle/reporting product APIs;
- no deployment/IaC/backup/DR/operations foundation.

The UI MVP must be integrated incrementally through API-backed vertical slices, not copied wholesale as browser-local state.

## Source-to-target comparison

| Target architecture expectation | Current state | Decision |
| --- | --- | --- |
| Modular monolith | npm monorepo with API/web/packages | `REUSE`, formalize module boundaries. |
| React production web | Auth-only React application | `REUSE_WITH_CHANGE`, later integrate validated UI by vertical slice. |
| Fastify application API | Auth-only Fastify app | `REUSE_WITH_CHANGE`. |
| PostgreSQL durable system of record | Auth tables only | `EXTEND` with versioned migrations. |
| Server RBAC and tenant isolation | Absent | `BUILD_FIRST`. |
| Transactional capacity | Absent | `BUILD` after data/auth foundation. |
| Idempotency/outbox/workers | Absent | `BUILD`. |
| Object storage/files | Absent | `BUILD_LATER`. |
| Notifications | No-op password reset notifier | `REPLACE` with reliable provider adapter/outbox. |
| Observability | Pino + correlation ID | `EXTEND` with safe correlation, metrics/traces/alerts. |
| CI/CD | Unit/build CI only | `HARDEN` with DB integration, audit and delivery. |
| Deployment and recovery | Absent | `BUILD`. |

## Reuse / replace / retire matrix

### Reuse

- workspace topology;
- TypeScript build and lint foundation;
- Fastify application factory and injection seams;
- Prisma/PostgreSQL direction;
- auth domain entities/ports and repositories;
- password hashing and opaque-token helpers;
- refresh rotation/password reset transaction patterns;
- web `ApiClient`, `AuthProvider`, accessible auth pages;
- structured Pino logger and redaction tests;
- basic CI install/typecheck/lint/test/build sequence.

### Reuse with change

- `app.ts`: split composition, safe error handling, real readiness and modular routes;
- JWT service: retain short access tokens but reconcile with production identity/RBAC decision;
- refresh cookie/session model: retain, add production policy, device/session management and proxy/security review;
- rate limiter: keep port/tests, replace in-memory production implementation;
- database resolver: retain concept, formalize environment contract and secret delivery;
- web API client: add generated contracts, auth retry policy and protected business calls;
- logger correlation: validate untrusted client values and add trace integration.

### Replace or retire

- stale AI Studio README;
- malformed `.env.example`;
- `/api/error` debug endpoint;
- production-success readiness without database;
- placeholder `AuthenticatedShell` as the product application;
- no-op password reset notifier in any production environment;
- process-local limiter as the final production control;
- test-only static-root warnings and debug stdout logging;
- the assumption that green unit CI equals production readiness.

## Recommended implementation sequence

### Immediate — PROD-SEC-CI-BASELINE-1

Narrow first production PR based on `c758e8403a4693fa7ba96081254072ad5d743aba`:

- remove `/api/error`;
- make global 5xx responses generic;
- validate/limit inbound correlation IDs;
- make production readiness fail when DB is missing and reuse shared DB lifecycle;
- add graceful shutdown hooks;
- repair README and `.env.example`;
- add explicit audit reporting and a runtime vulnerability gate where current results allow;
- add tests for each security/operational change.

### Next — PROD-DEPENDENCY-REMEDIATE-1

- capture exact audit JSON in CI;
- remediate all critical/high runtime findings;
- update old Fastify/Vite/Vitest/toolchain dependencies in controlled groups;
- remove deprecated vulnerable transitive packages where possible;
- preserve passing typecheck, lint, tests and build.

### Next — PROD-DB-INTEGRATION-CI-1

- PostgreSQL CI service;
- migrations from empty database;
- run all 28 currently skipped integration/E2E tests;
- add migration/schema drift checks;
- make job required.

### Foundation — PROD-AUTH-RBAC-1

- production identity decision;
- six roles, organization membership and warehouse grants;
- server auth middleware and negative-scope tests;
- authenticated profile/capability endpoint;
- append-only privileged-change audit.

### Vertical slice — PROD-BOOKING-VERTICAL-SLICE-1

Follow the approved Production Foundation backlog: standard Supplier booking through durable configuration, transactional capacity, approval, appointment details, audit and outbox.

## Recommended first production baseline

- Repository: `lukaszgebicki/dock-scheduling-app-ai-studio1707`.
- Base branch: `main`.
- Exact SHA: `c758e8403a4693fa7ba96081254072ad5d743aba`.
- First branch: `chore/prod-sec-ci-baseline-1`.
- Risk class: Class C security/operational source change.
- Merge strategy: controlled squash merge after full existing CI, new focused tests, dependency evidence and fresh review.

## Final decision

The repository should be **evolved, not replaced**. Its authentication and monorepo foundations are reusable, but it should not yet be called the production Dock Scheduling application.

The first source PR must stabilize security, readiness, documentation and CI evidence. The first business implementation must then establish server RBAC/data ownership before the transactional booking vertical slice.
