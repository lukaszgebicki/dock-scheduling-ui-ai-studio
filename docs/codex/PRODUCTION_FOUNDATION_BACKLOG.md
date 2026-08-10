# Production Foundation Backlog

## Backlog identity

- Program: Production Foundation.
- Governance status date: 2026-08-10.
- Functional reference: UI MVP Product Review 2, result `PASS`.
- Governance repository: `lukaszgebicki/dock-scheduling-ui-ai-studio`.
- Governance baseline for this reconciliation: `27f15b6fed81e59e4ea8b38b1a99267c6c48b3c8`.
- Production repository: `lukaszgebicki/dock-scheduling-app-ai-studio1707`.
- Historical assessed production SHA: `c758e8403a4693fa7ba96081254072ad5d743aba`.
- Current production reference SHA: `dbe1127ae64c24e601828f38a0b88a749b79b858`.
- Current authorization: the production repository has Product Authority authorization for separately scoped exact-SHA assessment and implementation tasks. This governance task is read-only for the production repository and authorizes no production write.

## Canonical sources of truth

### Production repository

`lukaszgebicki/dock-scheduling-app-ai-studio1707` is canonical for:

- production code;
- schema and migrations;
- API behavior and contracts as implemented;
- security and RBAC implementation;
- automated tests and CI evidence;
- current technical implementation status;
- production-repository issues and Pull Requests.

### UI and governance repository

`lukaszgebicki/dock-scheduling-ui-ai-studio` is canonical for:

- the approved UI MVP as functional reference;
- Product Authority decisions;
- product documentation;
- program planning and governance;
- historical production-repository assessment material.

The UI repository is not the canonical source for current production code.

## Operating rules

- Only one implementation task may be `READY` at a time unless Product Authority explicitly approves parallel work.
- Every task requires an exact base SHA, named repository, allowed paths, protected paths, CI depth and review gate.
- Production-repository work requires a separately scoped exact-SHA task and explicit authorization.
- Architecture decisions must be reconciled with actual repository evidence before implementation.
- The UI MVP is a functional reference, not a production code-completeness or production-readiness claim.
- No task may weaken six-role scope, Supplier organization isolation, transactional capacity, approval safety, audit evidence or fail-closed validation.
- Production deployment, cloud resources, production data and secrets require separate explicit authorization.
- No new production task is activated by this backlog update.

## Phase overview

| Phase | Objective | Exit result |
| --- | --- | --- |
| P0 — Authorization and assessment | Understand the named production repository and reconcile the plan with reality. | Approved reuse/replace/retire map, risk register and implementation baseline. |
| P1 — Platform foundation | Establish deployable, secure, durable technical foundations. | Environments, API, database, migrations, CI/CD, auth skeleton and observability foundation. |
| P2 — Transactional vertical slice | Prove one secure end-to-end booking journey. | Supplier booking persists durably and cannot oversubscribe capacity. |
| P3 — Core operational workflows | Add approval, lifecycle, gate and operator workflows. | Core warehouse operation works against durable data. |
| P4 — Planning and delivery services | Add weekly planning/import, files, notifications and reporting. | Principal supporting workflows are durable, idempotent and observable. |
| P5 — Hardening and migration | Prove performance, security, recovery and data transition. | Production-readiness gates G4–G5 pass. |
| P6 — Pilot and release | Controlled launch with rollback and support. | Product Authority signs off production release. |

## Current status overlay

- P0 is `DONE` through issue #141 and merged PR #142.
- P1 is partial: security/API hardening, critical/high dependency remediation,
  PostgreSQL integration CI, scoped six-role RBAC, scope identities, privileged
  mutation audit, global System Administrator lifecycle, invitation
  issuance/acceptance, immutable per-user audit reads and the observability
  foundation are implemented in the production repository.
- P2 is `DONE` through Supplier booking PR #50 and capacity hardening PR #52.
- P3 is partial: the manual approval lifecycle is `DONE` through PR #54;
  Booking Configuration Administration, reschedule/cancel, Operator manual
  booking and Gate Ops remain.
- P4-P6 are incomplete.
- The implemented foundations do not make Dock Scheduling production-ready.
- `PROD-SEC-REACT-ROUTER-MIGRATION-1` / production issue #57 is the next
  planned security task.
- Final multi-instance rate limiting remains an open security-hardening concern within the approved P5 security work.
- Deployment and environment promotion remain open within the approved CI/CD, performance/reliability and release work.
- Booking Configuration Administration remains the next product direction
  after security; it is not activated by this reconciliation.
- Transactional outbox and workers remain open within the approved notification-delivery contract.
- Deployment/environment promotion, backup/restore, outbox delivery workers,
  release and the remaining P3-P6 scopes require separate tasks.

## P0 — Authorization and assessment

### PROD-REPO-ASSESSMENT-1 — read-only production repository assessment

**State:** `DONE`.

- Product Authority authorization is recorded in `PROD_REPO_ASSESSMENT_AUTHORIZATION.md`.
- Assessment was performed on production SHA `c758e8403a4693fa7ba96081254072ad5d743aba`.
- Issue #141 was completed by merged PR #142.
- Historical issue #140 is superseded and closed as not planned; its original text remains historical evidence of the pre-authorization blocker.
- Assessment conclusion: evolve the existing production repository and preserve the authentication/monorepo nucleus.
- Production repository writes during the assessment: none.

Approved assessment scope:

- repository topology, applications, packages and ownership;
- current architecture and runtime assumptions;
- dependency and security posture;
- authentication, authorization and persistence status;
- API, schema, migrations and data model;
- tests, CI/CD, deployment and environment configuration;
- existing UI MVP overlap and divergence;
- reusable, replaceable and removable components;
- operational, compliance and migration risks.

Completed deliverables:

- `PRODUCTION_REPOSITORY_ASSESSMENT.md`;
- source-to-target architecture comparison;
- reuse/replace/retire matrix;
- prioritized remediation list;
- recommended exact baseline for P1;
- ADR backlog updates.

Exit criteria result:

- zero production repository writes during assessment;
- evidence-backed recommendation approved by Product Authority;
- subsequent production work executed only through separately scoped issues and Pull Requests.

## Completed Production Foundation groups

The following groups are implemented in the production repository at current
reference SHA `dbe1127ae64c24e601828f38a0b88a749b79b858`:

| Foundation group | Implemented result | Boundary that remains |
| --- | --- | --- |
| Security/API baseline | Diagnostic error route removed; 5xx responses redacted; correlation IDs bounded; readiness fails closed in production; graceful shutdown and truthful environment documentation added. | Does not provide full observability, deployment or business functionality. |
| Dependency remediation | Critical/high runtime and complete-tree advisories remediated and blocking audit gates established; remaining moderate findings stay visible. | Future upgrades and accepted moderate risk still require normal dependency governance. |
| PostgreSQL integration CI | Disposable PostgreSQL, migration deployment and database integration/E2E tests are required in CI. | This is test infrastructure, not production database operations or backup/recovery. |
| Scoped six-role RBAC | Exactly six server roles, scoped authorization, persisted assignments, fail-closed guards and administrative mutation/read paths implemented. | Delegated administration and full business-endpoint policy coverage remain future work. |
| Scope identity persistence | Root organizations, Supplier organizations, warehouses and Supplier–warehouse participation persisted with active-state and integrity constraints. | Business configuration and booking/capacity entities remain open. |
| Privileged mutation audit | Role-assignment and user-status changes are atomic, idempotent and recorded in immutable audit ledgers with administrator-continuity protection. | Global audit search/export/retention and broader business audit remain open. |
| Global System Administrator user lifecycle | Protected user directory, assignment reads, inactive user provisioning and status administration implemented. | Delegated administration, UI integration and broader identity operations remain open. |
| Invitation lifecycle | One-time invitation issuance, atomic acceptance/activation and security cleanup implemented. | Notification delivery, reissue/revocation product workflows and UI remain open. |
| Immutable per-user audit reads | Protected reads for role, status, invitation issuance/acceptance and user-creation histories implemented. | Cross-user audit search/export/retention remains open. |
| Observability foundation | W3C trace propagation, redacted structured telemetry, bounded metrics and operational runbook delivered by PR #48. | Production exporters, approved SLO thresholds and deployment integration remain open. |
| Supplier booking vertical slice | Server-authoritative published configuration reads, idempotent durable booking, capacity-safe appointment creation, immutable history and transactional outbox intent delivered by PR #50. | Configuration administration and later operational lifecycles remain open. |
| Capacity transaction hardening | Immutable reservation ownership and database reconciliation prevent committed counter/ledger/appointment drift through PR #52. | Release/reschedule lifecycle beyond the delivered approval rejection path remains open. |
| Green production baseline | PR #61 resolved the Nano ID HIGH blocker and deterministic invitation-expiry fixture without masking React Router debt. | Production issue #57 remains planned security debt. |
| Manual approval lifecycle | PR #54 delivered approve, reject, request-information and respond-information with versioning, authorization, atomic history/outbox and exact-once rejection release. | Reschedule/cancel, Operator manual booking and Gate Ops remain open P3 work. |

The repository was developed in place; it was not replaced. These completed
foundation groups do not establish complete production readiness.

## P1 — Platform foundation

Sequence may change after P0 evidence.

### PROD-ARCH-ADR-1 — architecture decision baseline

Create and approve the required ADR set for repository topology, identity, authorization, persistence, capacity, outbox/jobs, files, notifications, observability, hosting and migration.

Exit criteria:

- decisions reference actual repository evidence;
- rejected options and consequences are recorded;
- no unresolved high-risk architecture ambiguity blocks implementation.

### PROD-CI-CD-FOUNDATION-1 — controlled delivery pipeline

Scope:

- reproducible install/build/test;
- branch and PR checks;
- dependency, secret and static-analysis scanning;
- immutable artifacts;
- environment promotion and rollback;
- protected production deployment approval.

Exit criteria:

- clean ephemeral build from lockfile;
- required checks block merge;
- production deployment cannot occur from an unreviewed branch;
- release version is observable.

### PROD-DATA-FOUNDATION-1 — PostgreSQL schema and migrations

Scope:

- managed relational database contract;
- migration tooling and expand/contract policy;
- core tenant, warehouse, Supplier, user, configuration and audit entities;
- local/integration test database lifecycle;
- backup and point-in-time recovery configuration design.

Exit criteria:

- migrations run forward from empty database;
- rollback/forward-fix procedure documented;
- tenant and warehouse constraints are represented;
- audit records are append-only by contract.

### PROD-AUTH-RBAC-1 — production identity and server authorization

Scope:

- OIDC/session integration;
- user-to-identity mapping;
- six-role model;
- Supplier organization and warehouse grants;
- server authorization middleware/policies;
- inactive/revoked access;
- privileged-change audit.

Exit criteria:

- negative cross-organization and cross-warehouse tests pass;
- hidden UI controls are not relied upon;
- all protected endpoints require authenticated scope;
- privileged actions are audited.

### PROD-OBSERVABILITY-FOUNDATION-1 — logs, metrics and traces

**State:** `DONE` through production PR #48 at
`e5784e06b0500a1a50f0de8957742e25f75369e6`.

Scope:

- correlation IDs;
- structured redacted logs;
- request/job traces;
- API/database/queue baseline metrics;
- error monitoring;
- health/readiness endpoints;
- alert ownership and runbook template.

Exit criteria:

- one request is traceable through API, database and worker;
- sensitive values are absent from telemetry;
- alerts identify owner and actionable response.

## P2 — Transactional vertical slice

### PROD-BOOKING-VERTICAL-SLICE-1 — Supplier booking to durable appointment

**State:** `DONE` through production PR #50 at
`7f2a87708ff38adb984a2f792cc414d7ecf52378`.

Dependencies:

- architecture ADRs;
- CI/CD foundation;
- data foundation;
- auth/RBAC;
- observability foundation.

Scope:

- published warehouse/Supplier configuration reads;
- five-step standard Supplier booking API and web integration;
- server validation and duration calculation;
- transactional capacity reservation;
- idempotent booking command;
- approval outcome;
- durable appointment, history, audit and outbox event;
- list/details projection;
- integration and concurrency tests.

Exit criteria:

- two concurrent attempts for the last unit yield exactly one success;
- retry with the same idempotency key returns the original result;
- Supplier cannot access another organization’s record;
- database state, audit and response are consistent after failure injection;
- service-level telemetry exists.

### PROD-CAPACITY-TRANSACTION-1 — capacity model hardening

**State:** `DONE` through production PR #52 at
`592d86bf75337abf97268233d5a9caa9325da1c2`.

May be part of the vertical slice or a focused follow-up.

Scope:

- duration units/intervals;
- dock and capacity-pool constraints;
- blocks and working hours;
- reservation lifecycle and release;
- alternatives;
- reasoned authorized override;
- contention/performance tests.

Exit criteria:

- database constraints/locking prevent oversubscription;
- deadlock/retry behavior is bounded and observable;
- override is audited and alerted;
- representative load meets approved latency targets.

## P3 — Core operational workflows

### PROD-APPROVAL-LIFECYCLE-1

**State:** manual approve/reject/request-information/respond-information scope
is `DONE` through production issue #53 and PR #54 at
`dbe1127ae64c24e601828f38a0b88a749b79b858`.

Reschedule/cancel was not delivered by that task and remains separate P3 scope.

Scope:

- auto/manual/rule approval;
- routed authorized work queues;
- request data, approve and reject;
- reschedule/cancel with cut-offs and capacity revalidation;
- independent planning/change/operational states;
- immutable history and notifications intent.

Exit criteria:

- transition matrix tests pass server-side;
- missing actor/rule/configuration fails closed;
- concurrent updates use expected version and reject lost writes.

### PROD-OPERATOR-MANUAL-BOOKING-1

Scope:

- Warehouse Operator creates for assigned active Supplier;
- same configuration, validation, capacity and approval services as Supplier booking;
- actor-on-behalf-of evidence;
- durable `ADMIN_ADDED` origin.

Exit criteria:

- no duplicate booking engine or weakened scope;
- all actions are attributable to the Operator and Supplier context.

### PROD-GATE-OPS-1

Scope:

- scoped search;
- arrival/driver evidence;
- check-in/out;
- waiting, dock, unloading and completion;
- registration correction;
- No Show;
- unannounced visit;
- degraded/offline operating decision.

Exit criteria:

- role and warehouse scope enforced by API;
- dock/capacity compatibility preserved;
- all transitions and corrections are audited.

## P4 — Planning and delivery services

### PROD-WEEKLY-PLANNING-IMPORT-1

Scope:

- weekly reservation persistence;
- exact Friday CSV preview and apply;
- import batch/group storage;
- fingerprints and idempotency;
- unmatched and ambiguous workflow;
- transport reconciliation;
- file quarantine and audit.

Exit criteria:

- duplicate file/group application has no duplicate effect;
- preview and apply remain separate;
- exact identity and Supplier transport authority are preserved.

### PROD-FILES-1

Scope:

- object storage;
- signed upload/download;
- metadata, checksums and authorization;
- scan/quarantine;
- retention and deletion.

Exit criteria:

- unauthorized access fails;
- unsafe/unscanned files are unavailable;
- signed URLs are short-lived and not logged.

### PROD-NOTIFICATIONS-1

Scope:

- transactional outbox;
- worker and provider adapter;
- recipient resolution and preferences;
- retries/dead letter;
- delivery evidence;
- templates and localization decision.

Exit criteria:

- domain commit is independent from provider availability;
- retries cannot duplicate user-visible notification beyond defined semantics;
- failure is observable and replayable.

### PROD-REPORTING-DASHBOARD-1

Scope:

- scoped server queries;
- durable KPI denominators/timestamps;
- asynchronous large exports;
- expiring download artifacts;
- audit of export request and scope.

Exit criteria:

- report totals reconcile to source records;
- no cross-tenant export leakage;
- unavailable metrics are not fabricated.

## P5 — Hardening and migration

### PROD-SECURITY-HARDENING-1

Scope:

- threat model;
- secure configuration review;
- SAST/dependency/container/IaC scans;
- rate and abuse protection;
- privileged access review;
- penetration test or independent security review;
- remediation.

Exit criteria:

- zero unresolved critical/high findings;
- accepted residual risks have owner and expiry.

### PROD-PERFORMANCE-RELIABILITY-1

Scope:

- load and contention tests;
- database indexes and query plans;
- worker throughput;
- provider outage tests;
- deployment rollback;
- graceful degradation.

Exit criteria:

- approved p95 and throughput targets pass;
- capacity correctness survives contention;
- alerts and runbooks are verified.

### PROD-BACKUP-DR-1

Scope:

- backup policy;
- point-in-time recovery;
- object recovery;
- restore rehearsal;
- RPO/RTO measurement;
- disaster runbook.

Exit criteria:

- restore succeeds in a clean environment;
- measured RPO/RTO meet approved targets;
- evidence is retained.

### PROD-DATA-MIGRATION-1

Scope depends on assessment and data sources.

Required pattern:

- source inventory and classification;
- mapping and transform rules;
- dry-run;
- reconciliation counts/checksums;
- exception handling;
- rollback/source snapshot;
- approval before cutover.

Exit criteria:

- representative rehearsal reconciles completely or approved exceptions are documented;
- no source is destroyed before acceptance and retention approval.

## P6 — Pilot and release

### PROD-UAT-PILOT-1

Scope:

- representative users for all required roles;
- limited warehouse/Supplier cohort;
- production-like environment and support;
- success metrics, stop conditions and feedback triage;
- migration and rollback rehearsal.

Exit criteria:

- UAT scenarios pass;
- operational owners accept dashboards/runbooks;
- Product Authority approves pilot result.

### PROD-RELEASE-1

Scope:

- production change approval;
- final security and operational review;
- migration/cutover;
- monitoring and hypercare;
- rollback decision window;
- post-release reconciliation.

Exit criteria:

- Gates G0–G7 pass;
- no unresolved critical finding;
- Product Authority, engineering, security and operations sign off.

## Dependency chain

```text
PROD-REPO-ASSESSMENT-1
  -> PROD-ARCH-ADR-1
  -> PROD-CI-CD-FOUNDATION-1
  -> PROD-DATA-FOUNDATION-1
  -> PROD-AUTH-RBAC-1
  -> PROD-OBSERVABILITY-FOUNDATION-1
  -> PROD-BOOKING-VERTICAL-SLICE-1
  -> core operational workflows
  -> planning/delivery services
  -> security/performance/recovery/migration
  -> UAT pilot
  -> production release
```

Some P1 tasks may run in controlled parallel after assessment, but the booking vertical slice cannot start until identity, authorization, persistence, delivery and observability foundations are usable.

## Current program state

- `PROD-REPO-ASSESSMENT-1`: `DONE` through issue #141 and merged PR #142.
- Historical issue #140: superseded and closed as not planned.
- `PROD-GOVERNANCE-SYNC-1`: `DONE` through issue #143 and PR #144.
- Current production reference SHA: `dbe1127ae64c24e601828f38a0b88a749b79b858`.
- P2 is `DONE`; P3 is partially implemented through the manual approval
  lifecycle. P4-P6 and deployment/release remain incomplete.
- Production issue #57 is `PLANNED / SECURITY NEXT`.
- `PROD-BOOKING-CONFIG-ADMIN-1` is the recommended product direction after
  security and is not activated for implementation.
