# Production Foundation Backlog

## Backlog identity

- Program: Production Foundation.
- Date: 2026-08-04.
- Functional reference: UI MVP Product Review 2, result `PASS`.
- Planning baseline: `cd293a11daf0bddd35ba5141c71f7ad6d8de6a98`.
- Production repository: `lukaszgebicki/dock-scheduling-app-ai-studio1707`.
- Current authorization: no read or write access to the production repository.

## Operating rules

- Only one implementation task may be `READY` at a time unless Product Authority explicitly approves parallel work.
- Every task requires an exact base SHA, named repository, allowed paths, protected paths, CI depth and review gate.
- Production-repository assessment is read-only unless a later issue explicitly grants write authority.
- Architecture decisions must be reconciled with actual repository evidence before implementation.
- The UI MVP is a functional reference, not a production code-completeness claim.
- No task may weaken six-role scope, Supplier organization isolation, transactional capacity, approval safety, audit evidence or fail-closed validation.

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

## P0 — Authorization and assessment

### PROD-REPO-ASSESSMENT-1 — read-only production repository assessment

**State:** `BLOCKED` — requires explicit Product Authority authorization.

Required authorization must name:

- repository `lukaszgebicki/dock-scheduling-app-ai-studio1707`;
- exact base branch or SHA;
- allowed read actions and paths;
- whether dependency/security scanning is allowed;
- whether local clone/worktree is allowed;
- whether issue, branch or PR creation is prohibited or permitted.

Assessment scope after authorization:

- repository topology, applications, packages and ownership;
- current architecture and runtime assumptions;
- dependency and security posture;
- authentication, authorization and persistence status;
- API, schema, migrations and data model;
- tests, CI/CD, deployment and environment configuration;
- existing UI MVP overlap and divergence;
- reusable, replaceable and removable components;
- operational, compliance and migration risks.

Deliverables:

- `PRODUCTION_REPOSITORY_ASSESSMENT.md`;
- source-to-target architecture comparison;
- reuse/replace/retire matrix;
- prioritized remediation list;
- recommended exact baseline for P1;
- ADR backlog updates.

Exit criteria:

- zero production repository writes unless separately authorized;
- evidence-backed recommendation approved by Product Authority;
- one P1 task activated with exact scope.

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

- `PROD-FOUNDATION-PLAN-1`: in execution until its PR merges.
- `PROD-REPO-ASSESSMENT-1`: `BLOCKED`.
- No production implementation task is `READY`.
- No access to `lukaszgebicki/dock-scheduling-app-ai-studio1707` is authorized.
