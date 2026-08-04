# Production Target Architecture v0.1

## Status and authority

- Status: proposed logical target for Production Foundation planning.
- Date: 2026-08-04.
- Functional authority: UI MVP Business Decision Pack, Scope Addendum v0.4 and Product Review 2.
- Implementation authority: none.
- Production repository inspection: not performed.
- Technology decisions in this document are recommended baselines to validate during an authorized repository assessment.

## Architectural objective

Create a secure, durable and operable appointment-scheduling platform that preserves the approved six-role product behavior while moving authority from browser-local demonstration state to authenticated server-side services and transactional data.

The preferred initial shape is a **modular monolith with clear domain boundaries**, a single transactional relational database and separate background workers. This minimizes distributed-system risk while preserving boundaries that can later be extracted if scale or ownership requires it.

## Recommended implementation baseline

Subject to repository assessment:

| Layer | Recommended baseline | Rationale |
| --- | --- | --- |
| Web | React + TypeScript; retain approved UI behavior; generated typed API client | Maximum reuse of validated presentation and tests without trusting browser state. |
| API | Node.js + TypeScript modular API, preferably Fastify | Strong fit with existing TypeScript domain knowledge, validation and lightweight service boundaries. |
| Persistence | PostgreSQL with versioned migrations; Prisma or equivalent typed data access | Transactional correctness, relational constraints, auditability and operational maturity. |
| Background work | Durable queue plus worker; transactional outbox in PostgreSQL | Reliable retry, deduplication and separation of user requests from delivery/integration effects. |
| Files | Managed object storage with signed access; metadata and authorization in PostgreSQL | Durable storage without exposing bucket authority to clients. |
| Identity | Standards-based OIDC provider; short-lived access tokens or secure server sessions | Externalized identity lifecycle with server authorization. |
| Delivery | Containerized workloads on a managed runtime; infrastructure as code | Repeatable environments, rollback and reduced platform operations. |
| Observability | OpenTelemetry-compatible traces/metrics, structured logs and error monitoring | End-to-end correlation across API, workers and integrations. |

Cloud provider, exact managed services and package choices remain decision records after repository and organizational constraints are known.

## Context diagram

```text
Supplier / Warehouse / Security users
                |
                v
        [ Web application ]
                |
          HTTPS / typed API
                |
                v
        [ Production API ] <------> [ OIDC identity provider ]
          |       |      \
          |       |       \-----> [ Object storage ]
          |       |
          |       +-------------> [ Transactional outbox ]
          v                             |
    [ PostgreSQL ]                      v
                                   [ Worker service ]
                                      |   |   |
                                      v   v   v
                                  E-mail Files Integrations

Telemetry from web, API and worker -> Logs / metrics / traces / alerts
```

## Trust boundaries

1. **Public browser boundary** — all browser input is untrusted; hidden controls are not authorization.
2. **Identity boundary** — identity provider proves authentication; application maps identity to active user, role, organization and warehouse grants.
3. **API authorization boundary** — every read and mutation checks role, tenant, warehouse and capability on the server.
4. **Database boundary** — only application services and controlled operational tooling access production data.
5. **Worker boundary** — jobs carry immutable actor/correlation context but re-authorize sensitive effects where required.
6. **File boundary** — object storage access is signed, short-lived and scoped; metadata is not proof of access.
7. **Integration boundary** — external payloads are validated, idempotent, observable and quarantined on invalid or ambiguous input.
8. **Operations boundary** — administrative access uses separate privileged identities, least privilege and audit.

## Logical components

### Web application

Responsibilities:

- render role-appropriate UI from server data;
- collect validated user intent;
- present safe errors and conflict alternatives;
- use server-provided capability decisions;
- preserve accessibility and responsive behavior;
- never decide tenant scope, final capacity or transition authority.

The browser may use short-lived caches for presentation but not as the system of record. Sensitive tokens must not be stored in insecure browser storage.

### API gateway / application API

Responsibilities:

- authenticate request identity;
- resolve active user, organization, warehouse grants and role;
- enforce capability and row-level scope;
- validate commands and queries;
- orchestrate domain services and transactions;
- create audit records and outbox events atomically;
- return stable error codes, conflict evidence and correlation IDs;
- expose health, readiness and version metadata without leaking secrets.

Initially this should be one deployable modular API unless assessment evidence justifies multiple services.

### Identity and access module

Core entities:

- `User`;
- `IdentityLink`;
- `RoleAssignment`;
- `WarehouseGrant`;
- `SupplierOrganizationMembership`;
- `AuthSession` or token-revocation evidence where applicable;
- `Invitation`, `PasswordReset` only when local credential flows are retained.

Rules:

- exactly the six approved product roles unless separately changed;
- Supplier users cannot cross organization boundaries;
- internal warehouse roles require explicit warehouse grants;
- inactive users and organizations fail closed;
- authorization decisions are centralized and testable;
- privileged changes require reason and audit.

### Configuration module

Owns:

- warehouses, timezone and working hours;
- docks, zones and allowed flows;
- capacity pools and concurrent limits;
- one-time and recurring blocks;
- Supplier assignments and restrictions;
- dynamic form requirements;
- approval and critical rules;
- cut-offs, reason dictionaries and notification policy as later approved.

Published configuration is versioned. Appointments should retain the configuration/rule version or decision evidence used at booking so later changes do not rewrite history.

### Appointment and planning module

Owns the appointment aggregate:

- stable internal ID and external/system references;
- Supplier, warehouse and flow;
- planned date/time/timezone and duration;
- PO header and zero-to-many SKU lines;
- Supplier-authoritative transport details;
- planning, change and operational state categories;
- assigned dock;
- comments, documents metadata and required actions;
- immutable status/change/audit history.

Commands must use optimistic versioning or explicit expected version to prevent lost updates.

### Capacity module

Owns authoritative availability and reservations.

Required production properties:

- 15-minute occupancy units or an equivalent interval model;
- duration-aware overlap;
- warehouse, compatible dock, zone/block and capacity-pool constraints;
- first-active composite limit behavior defined by product rules;
- reservation state tied to appointment lifecycle;
- release on cancellation/completion/no-show according to approved rules;
- controlled override with actor, reason, before/after evidence and alerting;
- alternatives calculated from the same authoritative model.

#### Transactional reservation pattern

Recommended baseline:

1. client sends booking command with an idempotency key;
2. API validates identity, scope, configuration and requested interval;
3. transaction acquires an advisory/row lock for warehouse and affected capacity units, or writes constrained reservation-unit rows;
4. capacity is recalculated inside the transaction;
5. appointment, reservations, audit and outbox event are committed atomically;
6. concurrent loser receives `RESERVATION_CONFLICT` and fresh alternatives;
7. retry with the same idempotency key returns the original result.

Database constraints must make oversubscription impossible even if application-level checks race. The exact model requires load and concurrency testing during the vertical slice.

### Approval and lifecycle module

Responsibilities:

- evaluate auto/manual/rule-based approval using versioned rule evidence;
- route work to authorized actors without fabricated identities;
- enforce closed transition matrices;
- require reasons where approved;
- support request-data, reject, approve, reschedule and cancel commands;
- schedule reminders, escalation or expiry only when separately approved;
- write immutable history and business events.

### Gate operations module

Responsibilities:

- exact scoped registration/reference search;
- arrival and driver evidence;
- registration correction with audit;
- check-in, waiting, dock assignment/change, unloading, completion and check-out;
- potential and confirmed No Show;
- unannounced visit in a pending-decision state;
- offline/degraded-operation policy to be decided before pilot.

### Import and reconciliation module

Responsibilities:

- accept approved file formats;
- validate file size, structure, headers and line values;
- store original file metadata and checksum where permitted;
- group by exact five-field identity;
- produce closed outcomes;
- prevent duplicate application through file/group fingerprints;
- separate preview from explicit apply;
- preserve Supplier transport authority and require reconciliation;
- quarantine invalid/ambiguous groups.

CSV is sufficient for the closed UI MVP. XLSX input requires a later product decision.

### Reporting and projections module

Recommended approach:

- operational queries use indexed relational projections;
- report exports are generated from scoped server queries;
- large exports run asynchronously with expiring signed download links;
- export requests, actor scope and generated artifacts are audited;
- dashboards use durable event timestamps and denominators, never fabricated UI constants.

A separate analytics warehouse is not needed for the first production release unless volume evidence requires it.

### Notification module

Use a reliable outbox-to-worker flow:

- domain transaction writes notification intent to outbox;
- worker resolves recipients and preferences;
- provider send uses idempotent message identity;
- delivery attempt, provider reference and final status are recorded;
- retries use backoff and dead-letter handling;
- critical notifications cannot be disabled contrary to policy;
- notification failure never silently rolls back an already committed appointment.

### Document module

Responsibilities:

- create upload intent after server authorization;
- issue short-lived signed upload/download URLs;
- store object key, checksum, size, content type, owner and appointment relation;
- scan/quarantine before availability;
- enforce download authorization on every request;
- define retention, deletion and legal-hold behavior;
- avoid logging document content or signed URLs.

### Integration module

Initial architecture uses adapters behind explicit contracts:

- inbound messages/files are validated and idempotent;
- outbound effects use outbox and retries;
- every message has correlation, source, schema version and idempotency identity;
- failures are visible and replayable through controlled operations;
- no integration can bypass domain authorization or transaction rules.

ERP/WMS/SAP specifics remain excluded until separately authorized.

### Worker service

Responsibilities:

- consume durable jobs/outbox messages;
- send notifications;
- process files and scans;
- execute approved reminders/expiry;
- perform integration delivery and reconciliation;
- generate large exports;
- emit metrics and traces;
- use bounded retries, dead-letter queues and idempotent handlers.

Workers must not depend on browser sessions and must carry a system actor plus originating actor/correlation evidence.

## Core data model boundaries

| Aggregate / record | System owner | Critical invariant |
| --- | --- | --- |
| User and grants | Identity/access | Active identity has only explicit roles, organization and warehouses. |
| Warehouse configuration version | Configuration | Published versions are immutable; changes create a new version/history. |
| Supplier configuration | Configuration | Supplier scope and allowed flows fail closed. |
| Appointment | Appointment | One stable appointment/PO identity; independent state categories. |
| Capacity reservation units | Capacity | No accepted reservation exceeds authoritative constraints. |
| SKU lines | Appointment/planning | Zero-to-many lines belong to one appointment and are not silently duplicated. |
| Audit event | Audit | Append-only actor, action, scope, reason, correlation and timestamp. |
| Outbox event | Reliability | Created atomically with domain change; delivered at least once and deduplicated. |
| File metadata | Document | Object access is authorized through metadata and state. |
| Notification delivery | Notification | Intent and each attempt have stable idempotent identity. |
| Import batch/group | Import | Preview and apply are separate; fingerprints prevent duplicate effects. |

## API design rules

- version public contracts deliberately;
- use stable command/query DTOs rather than exposing database models;
- return machine-readable error code, safe message and correlation ID;
- use idempotency keys for create/apply/send commands;
- use expected version / ETag for mutable aggregates;
- paginate and bound list/report queries;
- never expose internal authorization or matching diagnostics to Supplier roles;
- validate dates and times with explicit warehouse timezone semantics;
- treat file and integration inputs as hostile;
- generate and test an API contract for the web client.

## Audit and event model

Every protected mutation records:

- event ID and correlation ID;
- authenticated user and effective role;
- Supplier organization and warehouse scope;
- command/action;
- aggregate ID and version;
- before/after safe summary or transition;
- reason where required;
- source channel and request identity;
- timestamp in UTC;
- relevant configuration/rule version.

Audit history is append-only. Operational correction creates a compensating event rather than modifying history.

## Security architecture

Minimum controls:

- OIDC authentication with MFA policy for privileged roles where organization policy permits;
- server-side RBAC and tenant/warehouse filtering;
- least-privilege service identities and database roles;
- TLS in transit and managed encryption at rest;
- secrets manager, rotation and no secrets in source;
- secure headers, CSRF strategy appropriate to auth mode, rate limiting and input limits;
- dependency, container and infrastructure scanning;
- SAST and secret scanning in CI;
- audit of privileged access and configuration changes;
- data classification, retention and deletion policy;
- log redaction for personal, transport and document data;
- threat model reviewed before vertical-slice merge and before pilot;
- penetration test or equivalent independent security review before production release.

## Reliability and recovery

- managed PostgreSQL with point-in-time recovery;
- automated backups and documented retention;
- restore rehearsal before pilot;
- object-storage versioning/retention according to policy;
- health and readiness probes that distinguish dependency failure;
- deployment rollback without schema/data loss;
- expand/contract database migration pattern;
- queue dead-letter and replay controls;
- graceful handling of provider and integration outages;
- documented degraded-mode policy for gate operations;
- RPO/RTO tested against the charter targets.

## Observability

Every request and background job uses a correlation ID.

Required signals:

- request rate, latency, error and saturation;
- database connections, locks, slow queries and transaction retries;
- capacity conflicts and override counts;
- booking, approval and lifecycle outcome counts;
- queue depth, age, retries and dead letters;
- notification and integration delivery status;
- file scan/quarantine status;
- authentication and authorization denial patterns;
- deployment version and migration status;
- backup and restore evidence.

Alerts need an owner, severity, runbook and actionable threshold. Sensitive business values must not be used as metric labels.

## Environment and delivery model

Minimum environments:

- local development;
- automated test/ephemeral CI;
- shared non-production integration environment;
- UAT/pilot environment with production-like controls;
- production.

Promotion rules:

- immutable build artifact promoted between environments;
- infrastructure and schema changes are version-controlled;
- production deploy requires protected approval and successful gates;
- migrations are backward-compatible during rollout;
- rollback and forward-fix procedures are rehearsed;
- feature flags are server-governed, time-bounded and audited for high-risk features.

## Migration and coexistence

Because no production repository or live data has been assessed, the initial strategy is provisional:

1. inventory existing implementation and data after authorization;
2. map UI MVP domain behavior to production aggregates and API contracts;
3. choose reuse/replace/retire per component;
4. implement one vertical slice without migrating all demo features;
5. create migration tooling with dry-run and reconciliation reports;
6. run parallel validation or shadow comparison where practical;
7. pilot one warehouse/Supplier cohort;
8. retain rollback and source-data snapshots until acceptance.

The UI demonstration must never be treated as a durable migration source unless explicit real data exists and is separately classified.

## Architecture decision records required after assessment

- ADR-001 repository and monorepo/deployment topology;
- ADR-002 authentication/session model;
- ADR-003 server authorization and tenant isolation;
- ADR-004 PostgreSQL schema and migration tooling;
- ADR-005 transactional capacity reservation model;
- ADR-006 idempotency and outbox/worker design;
- ADR-007 file storage and scanning;
- ADR-008 notification provider and delivery semantics;
- ADR-009 observability platform and SLOs;
- ADR-010 hosting, network and infrastructure as code;
- ADR-011 migration/coexistence strategy;
- ADR-012 data retention, privacy and audit policy.

## First production vertical slice

Recommended first slice:

**Supplier standard booking → transactional capacity reservation → approval outcome → durable appointment details and audit.**

It should prove:

- real authentication and Supplier organization isolation;
- published configuration read from the database;
- five-step API-backed booking;
- duration-aware capacity transaction;
- first-success concurrent reservation with conflict alternatives;
- idempotent retry;
- durable appointment, history and outbox event;
- Administrator-scoped approval where required;
- web list/details projection;
- logs, metrics, traces and integration tests;
- backup/restore of the created data.

No other workflow should block this slice unless required for security or data integrity.

## Authorization boundary

This architecture does not authorize implementation or repository assessment.

`PROD-REPO-ASSESSMENT-1` remains blocked until Product Authority explicitly authorizes read-only access to `lukaszgebicki/dock-scheduling-app-ai-studio1707` and defines the exact branch/SHA and allowed actions.
