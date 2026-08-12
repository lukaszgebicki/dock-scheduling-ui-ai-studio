# Production Foundation Backlog

## Backlog identity

- Program: Production Foundation.
- Governance status date: 2026-08-12.
- Functional reference: UI MVP Product Review 2, result `PASS`.
- Governance repository: `lukaszgebicki/dock-scheduling-ui-ai-studio`.
- Governance baseline for this reconciliation: `575f9a42b9ef13e306a1db582b0950646df5d777`.
- Production repository: `lukaszgebicki/dock-scheduling-app-ai-studio1707`.
- Historical assessed production SHA: `c758e8403a4693fa7ba96081254072ad5d743aba`.
- Current production reference SHA: `d3824404113052c33b9feddf37a30aa4daa9d9b4`.
- Current authorization: the production repository has Product Authority authorization only through separately scoped exact-SHA implementation tasks. This reconciliation is read-only for production and authorizes no production write.

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

The UI repository is not the canonical source for current production code or for production authorization where later Product Authority decisions supersede demo behavior.

## Operating rules

- Only one implementation task may be `READY` at a time unless Product Authority explicitly approves parallel work.
- Every task requires an exact base SHA, named repository, allowed paths, protected paths, CI depth and review gate.
- Production-repository work requires a separately scoped exact-SHA task and explicit authorization.
- Architecture decisions must be reconciled with actual repository evidence before implementation.
- The UI MVP is a functional reference, not a production code-completeness or production-readiness claim.
- No task may weaken six-role scope, Supplier organization isolation, transactional pallet capacity, lifecycle safety, audit evidence or fail-closed validation.
- Production deployment, cloud resources, production data and secrets require separate explicit authorization.
- No new production task is activated by this backlog update.

## Product Authority role correction

The current production decision is controlling:

- business `Warehouse Manager` maps to the existing canonical role `WAREHOUSE_ADMINISTRATOR`;
- no seventh `WAREHOUSE_MANAGER` role is required;
- `WAREHOUSE_OPERATOR` is a floor-operations role only;
- Operator may read authorized Warehouse appointments and execute `START_UNLOADING` / `COMPLETE_UNLOADING`;
- Operator may not create bookings, approve, reject, request information, reschedule, cancel or mutate booking configuration;
- assisted booking belongs to `WAREHOUSE_ADMINISTRATOR` / `SYSTEM_ADMINISTRATOR` under their normal scope rules.

Historical `UI-MVP-OPERATOR-MANUAL-BOOKING-1` remains valid only as evidence of the demonstrational UI MVP completed at that time. It must not be reused as production authorization policy.

## Phase overview

| Phase | Objective | Exit result |
| --- | --- | --- |
| P0 — Authorization and assessment | Understand the named production repository and reconcile the plan with reality. | Approved reuse/replace/retire map, risk register and implementation baseline. |
| P1 — Platform foundation | Establish deployable, secure, durable technical foundations. | Environments, API, database, migrations, CI/CD, auth skeleton and observability foundation. |
| P2 — Transactional vertical slice | Prove one secure end-to-end booking journey. | Supplier booking persists durably and cannot oversubscribe pallet capacity. |
| P3 — Core operational workflows | Add approval, change, configuration, administrator and Warehouse execution workflows. | Approved core warehouse operation works against durable data. |
| P4 — Planning and delivery services | Add weekly planning/import, files, notifications and reporting. | Principal supporting workflows are durable, idempotent and observable. |
| P5 — Hardening and migration | Prove performance, security, recovery and data transition. | Production-readiness gates G4–G5 pass. |
| P6 — Pilot and release | Controlled launch with rollback and support. | Product Authority signs off production release. |

## Current status overlay

- P0 is `DONE` through issue #141 and merged PR #142.
- P1 is partial: security/API hardening, critical/high dependency remediation, PostgreSQL integration CI, scoped six-role RBAC, scope identities, privileged mutation audit, global System Administrator lifecycle, invitation issuance/acceptance, immutable per-user audit reads, observability and the supported React Router line are implemented. Environment promotion, backup/recovery and final release infrastructure remain open.
- P2 is `DONE` through Supplier booking PR #50 and capacity hardening PR #52; pallet semantics were later upgraded by PR #64 to durable pallet units with configurable slot capacity `1..33` and hard ceiling 33.
- P3 is substantially delivered for the approved production scope: manual approval, booking configuration, reschedule/cancel, Warehouse Administrator assisted booking/planning and unloading execution are `DONE`. Broad Gate/Yard/driver/check-in work is not implemented and requires a separate Product Authority decision.
- P4 is partial: `PROD-NOTIFICATIONS-1` is `DONE`; weekly planning/import, files and reporting remain open.
- P5-P6 are incomplete.
- The implemented foundations do not make Dock Scheduling production-ready.
- Final multi-instance rate limiting remains an open P5 security-hardening concern.
- Deployment and environment promotion remain open within CI/CD, performance/reliability and release work.
- Real SMTP/provider configuration was not deployed by `PROD-NOTIFICATIONS-1`; the application delivery pipeline is implemented but production activation remains release/configuration work.

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

The following groups are implemented in the production repository at current reference SHA `d3824404113052c33b9feddf37a30aa4daa9d9b4`:

| Foundation group | Implemented result | Boundary that remains |
| --- | --- | --- |
| Security/API baseline | Diagnostic error route removed; 5xx responses redacted; correlation IDs bounded; readiness fails closed in production; graceful shutdown and truthful environment documentation added. | Does not provide production deployment or complete release readiness. |
| Dependency remediation | Critical/high runtime and complete-tree advisories remediated and blocking audit gates established. React Router was migrated to supported 7.18.2 in PR #62. Final PR #72 audits were 0 vulnerabilities. | Future upgrades remain subject to normal dependency governance. |
| PostgreSQL integration CI | Disposable PostgreSQL, migration deployment and database integration/E2E tests are required in CI. | Test infrastructure is not production database operations or backup/recovery. |
| Scoped six-role RBAC | Exactly six server roles, scoped authorization, persisted assignments, fail-closed guards and administrative mutation/read paths implemented. | Every future endpoint still requires explicit policy coverage. |
| Scope identity persistence | Root organizations, Supplier organizations, warehouses and Supplier–warehouse participation persisted with active-state and integrity constraints. | External master-data integration remains future work. |
| Privileged mutation audit | Role-assignment and user-status changes are atomic, idempotent and recorded in immutable audit ledgers with administrator-continuity protection. | Global audit retention/export remains future work. |
| Global System Administrator user lifecycle | Protected user directory, assignment reads, inactive user provisioning and status administration implemented. | Broader identity lifecycle remains separately governed. |
| Invitation lifecycle | One-time invitation issuance, atomic acceptance/activation and security cleanup implemented. | Reissue/revocation product workflows remain separate. |
| Immutable per-user audit reads | Protected reads for role, status, invitation issuance/acceptance and user-creation histories implemented. | Cross-user audit search/export/retention remains open. |
| Observability foundation | W3C trace propagation, redacted structured telemetry, bounded metrics and operational runbook delivered by PR #48. | Production exporters, approved SLO thresholds and deployment integration remain open. |
| Supplier booking vertical slice | Server-authoritative published configuration reads, idempotent durable booking, capacity-safe appointment creation, immutable history and transactional outbox intent delivered by PR #50. | Supporting P4 services and release readiness remain open. |
| Capacity transaction hardening | Immutable reservation ownership and database reconciliation prevent committed counter/ledger/appointment drift through PR #52; PR #64 migrated capacity semantics to pallets. | Production load qualification remains P5. |
| Green production baseline | PR #61 resolved the Nano ID HIGH blocker and deterministic invitation-expiry fixture. | Normal dependency governance continues. |
| Manual approval lifecycle | PR #54 delivered approve, reject, request-information and respond-information with versioning, authorization, atomic history/outbox and exact-once rejection release. | DONE for its contract. |
| Booking configuration / pallet capacity | PR #64 delivered draft/publish/audit configuration, working hours/blocks, version-coherent slots and 1..33 pallet capacity with hard ceiling 33. | DONE for its contract; operational tuning remains product configuration. |
| Appointment change lifecycle | PR #66 delivered transactional reschedule/cancel and multi-allocation capacity lineage. | DONE for its contract. |
| Warehouse unloading operations | PR #68 delivered independent unloading lifecycle and Operator desk with corrected least-privilege role semantics. | Broad Gate/Yard scope is separate. |
| Warehouse Administrator assisted booking/planning | PR #70 delivered shared-engine assisted booking and planning desk with immutable origin. | DONE for its contract. |
| Transactional notifications | PR #72 delivered post-cutover projection, in-app inbox, SMTP adapter, authorization revalidation, leasing/retry/dead-letter and System Admin operations. | Real provider credentials/deployment are release configuration, not completed here. |

The repository was developed in place; it was not replaced. These completed foundation groups do not establish complete production readiness.

## P1 — Platform foundation

Sequence may change after P0 evidence.

### PROD-ARCH-ADR-1 — architecture decision baseline

Create and approve the required ADR set for repository topology, identity, authorization, persistence, capacity, outbox/jobs, files, notifications, observability, hosting and migration.

Exit criteria:

- decisions reference actual repository evidence;
- rejected options and consequences are recorded;
- no unresolved high-risk architecture ambiguity blocks implementation.

### PROD-CI-CD-FOUNDATION-1 — controlled delivery pipeline

**State:** `PARTIAL`.

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

Application PR validation is mature; environment promotion, production deployment and rollback evidence remain open.

### PROD-DATA-FOUNDATION-1 — PostgreSQL schema and migrations

**State:** `PARTIAL`.

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

Application schema/migrations and PostgreSQL integration are mature; managed production backup/PITR and restore evidence remain open.

### PROD-AUTH-RBAC-1 — production identity and server authorization

**State:** `SUBSTANTIALLY DELIVERED` for current production endpoints.

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

The canonical role set remains six roles. Warehouse Manager maps to `WAREHOUSE_ADMINISTRATOR`; Operator least privilege is controlling.

### PROD-OBSERVABILITY-FOUNDATION-1 — logs, metrics and traces

**State:** `DONE` through production PR #48 at `e5784e06b0500a1a50f0de8957742e25f75369e6`.

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

**State:** `DONE` through production PR #50 at `7f2a87708ff38adb984a2f792cc414d7ecf52378`.

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

- two concurrent attempts for the last capacity yield exactly one success where both cannot fit;
- retry with the same idempotency key returns the original result;
- Supplier cannot access another organization’s record;
- database state, audit and response are consistent after failure injection;
- service-level telemetry exists.

### PROD-CAPACITY-TRANSACTION-1 — capacity model hardening

**State:** `DONE` through production PR #52 at `592d86bf75337abf97268233d5a9caa9325da1c2`; pallet semantics subsequently upgraded by PR #64.

Scope:

- duration units/intervals;
- dock and capacity-pool constraints;
- blocks and working hours;
- reservation lifecycle and release;
- alternatives;
- contention/performance tests.

Current controlling semantics:

- capacity is measured in pallets;
- slot capacity is configurable `1..33` pallets;
- hard system ceiling is 33 pallets per slot;
- reservation/release lineage and counters use pallet units;
- committed state cannot oversubscribe configured pallet capacity.

## P3 — Core operational workflows

### PROD-APPROVAL-LIFECYCLE-1

**State:** `DONE` through production issue #53 and PR #54 at `dbe1127ae64c24e601828f38a0b88a749b79b858`.

Delivered scope:

- manual approval/rejection;
- request information / Supplier response;
- optimistic lifecycle versioning;
- authorization and active-entity revalidation;
- immutable history/outbox;
- exact rejection capacity release.

### PROD-BOOKING-CONFIG-ADMIN-1

**State:** `DONE` through production issue #63 and PR #64 at `5e3533f36e54f2430257b08dbf6be76930def9d5`.

Scope delivered:

- effective configuration plus one bounded draft per Warehouse;
- save/preview/publish with optimistic concurrency and idempotency;
- working hours, one-off blocks and explicit future slots;
- version-coherent Supplier admission;
- immutable configuration audit;
- pallet-based capacity and 33-pallet hard ceiling;
- grandfathering of existing appointments;
- bounded publication independent of accumulated retired-slot history.

### PROD-APPOINTMENT-CHANGE-LIFECYCLE-1

**State:** `DONE` through production issue #65 and PR #66 at `ea30def3ad266729a6fdd4815696c029cb2041cb`.

Scope delivered:

- transactional reschedule;
- terminal cancellation;
- multi-allocation capacity lineage;
- atomic old-allocation release / target allocation reservation;
- lifecycle-version concurrency and idempotency;
- rollback-safe history/outbox.

### PROD-WAREHOUSE-OPERATIONS-1

**State:** `DONE` through production issue #67 and PR #68 at `9ba68b8725271b847e351883434e3b022bdd3758`.

Approved physical execution scope:

- Warehouse operations desk;
- independent unloading state `NOT_STARTED -> IN_PROGRESS -> COMPLETED`;
- `START_UNLOADING` and `COMPLETE_UNLOADING`;
- immutable operational evidence and outbox;
- cross-lifecycle guards against reschedule/cancel after unloading starts;
- corrected Operator least privilege.

This does not implement truck arrival, driver identity, gate check-in, yard state, dock-door assignment, no-show or departure.

### PROD-WAREHOUSE-ADMIN-BOOKING-DESK-1

**State:** `DONE` through production issue #69 and PR #70 at `d27f6b9d8c46ca7ad054232d12a55011cdef78a7`.

Scope delivered:

- Warehouse Administrator planning desk;
- active assigned Supplier discovery;
- assisted booking on behalf of Supplier;
- same canonical booking/capacity engine as Supplier self-service;
- immutable booking origin/provenance;
- no admin capacity or approval bypass;
- `WAREHOUSE_OPERATOR` denied assisted booking.

### PROD-GATE-OPS-1

**State:** `NOT IMPLEMENTED / NOT ACTIVATED`.

Potential scope remains a separate Product Authority decision:

- scoped arrival/driver/vehicle evidence;
- check-in/out;
- waiting/yard/dock assignment;
- No Show / unannounced visit;
- degraded/offline operation.

The delivered unloading lifecycle does not implicitly activate this broader scope.

## P4 — Planning and delivery services

### PROD-WEEKLY-PLANNING-IMPORT-1

**State:** `OPEN / NOT ACTIVATED`.

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

**State:** `OPEN / NOT ACTIVATED`.

Scope:

- object storage;
- signed upload/download;
- metadata, checksums and authorization;
- scan/quarantine;
- retention and deletion;
- durable attachment linkage.

Exit criteria:

- unauthorized access fails;
- unsafe/unscanned files are unavailable;
- signed URLs are short-lived and not logged.

This is the recommended next major P4 product candidate, but this reconciliation does not activate it.

### PROD-NOTIFICATIONS-1

**State:** `DONE` through production issue #71 and PR #72 at `d3824404113052c33b9feddf37a30aa4daa9d9b4`.

Delivered scope:

- reuse of the existing transactional outbox;
- notification-specific post-cutover projection with no historical flood;
- logically idempotent per-recipient in-app notifications;
- authenticated inbox/unread/read flows;
- provider-neutral SMTP transport with required encrypted transport;
- current recipient authorization at projection and immediately before send;
- bounded multi-worker leasing/retry/backoff/dead-letter;
- deterministic Message-ID and explicit at-least-once external delivery semantics;
- immutable attempt evidence and System Administrator requeue operations;
- notification telemetry and graceful worker shutdown.

Exit criteria result:

- domain commit remains independent from SMTP/provider availability;
- duplicate projector/worker execution is bounded by durable idempotency/lease invariants;
- failure is observable and replayable;
- real SMTP credentials/provider activation were intentionally not deployed.

Notification preferences and marketing communication were explicitly outside v1 and remain separate Product Authority decisions.

### PROD-REPORTING-DASHBOARD-1

**State:** `OPEN / NOT ACTIVATED`.

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

**State:** `OPEN`.

Scope:

- current-surface threat model;
- secure configuration review;
- SAST/dependency/container/IaC scans where applicable;
- distributed rate and abuse protection;
- privileged access review;
- penetration test or independent security review;
- remediation.

Exit criteria:

- zero unresolved critical/high findings;
- accepted residual risks have owner and expiry.

The former React Router issue #57 is resolved and must not be treated as remaining security debt.

### PROD-PERFORMANCE-RELIABILITY-1

**State:** `OPEN`.

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

**State:** `OPEN`.

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

**State:** `OPEN / SOURCE-DEPENDENT`.

Scope depends on assessment and actual source systems.

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

**State:** `OPEN`.

Scope:

- representative users for all required roles;
- limited Warehouse/Supplier cohort;
- production-like environment and support;
- success metrics, stop conditions and feedback triage;
- migration and rollback rehearsal.

Exit criteria:

- UAT scenarios pass;
- operational owners accept dashboards/runbooks;
- Product Authority approves pilot result.

### PROD-RELEASE-1

**State:** `OPEN`.

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
  -> application platform foundations
  -> PROD-BOOKING-VERTICAL-SLICE-1 / capacity
  -> approval/configuration/change/admin-booking/unloading
  -> PROD-NOTIFICATIONS-1
  -> remaining P4 files / planning-import / reporting
  -> security/performance/recovery/migration
  -> UAT pilot
  -> production release
```

Deployment/reliability hardening may be prioritized before remaining P4 product work by a separate Product Authority decision.

## Current program state

- `PROD-REPO-ASSESSMENT-1`: `DONE` through issue #141 and merged PR #142.
- Historical issue #140: superseded and closed as not planned.
- Prior governance reconciliations remain historical evidence.
- Current production reference SHA: `d3824404113052c33b9feddf37a30aa4daa9d9b4`.
- P2 is `DONE`.
- P3 is substantially delivered for the approved booking/approval/configuration/change/assisted-booking/unloading scope. Broad Gate/Yard functionality remains a separate decision, not an implicit blocker.
- P4 is partial: `PROD-NOTIFICATIONS-1` is `DONE`; files, weekly planning/import and reporting remain open.
- P5-P6 and deployment/release remain incomplete.
- `PROD-FILES-1` is the recommended next major product candidate and is **not activated** by this reconciliation.
