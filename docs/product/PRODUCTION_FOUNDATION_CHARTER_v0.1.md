# Production Foundation Charter v0.1

## Document control

- Product: Dock Appointment Scheduling Platform.
- Program: Production Foundation.
- Date: 2026-08-04.
- Product Authority: Łukasz Gębicki.
- Functional reference: UI MVP closed as `PASS` by Product Review 2.
- Canonical planning repository: `lukaszgebicki/dock-scheduling-ui-ai-studio`.
- Named production repository: `lukaszgebicki/dock-scheduling-app-ai-studio1707`.
- Production repository status: not inspected and not authorized for access by this charter task.

## Purpose

The frontend-only demonstrational UI MVP proves the agreed user journeys, role scope and core business behavior. It does not provide production authentication, durable persistence, transactional multi-session booking, real integrations, deployment, monitoring or operational controls.

Production Foundation is the separate program that will convert the approved functional reference into a secure, durable and operable production system. The program must preserve the validated product behavior while replacing demo-local effects with explicit service, data and operational contracts.

## Program outcome

The program is complete only when an approved production implementation can:

1. authenticate real users and enforce authorization on the server;
2. persist configuration, appointments, capacity, status history and audit evidence durably;
3. prevent capacity oversubscription under concurrent multi-session use;
4. execute lifecycle, gate, import, notification, file and reporting operations with idempotency and traceability;
5. be deployed, observed, backed up, restored and supported under agreed service levels;
6. pass security, privacy, accessibility, performance and operational-readiness gates;
7. support a controlled pilot and rollback without relying on the UI demo as a system of record.

## Guiding principles

- **Business behavior first.** Product Review 2 and the approved BDP remain the functional reference.
- **Server authority.** UI visibility is not authorization. Every protected read and mutation is enforced by the server.
- **One source of truth.** Durable domain records and audit evidence have explicit owners.
- **Transactional capacity.** Booking correctness takes priority over optimistic presentation speed.
- **Fail closed.** Missing scope, identity, configuration, rule or integration evidence blocks rather than guesses.
- **Idempotent effects.** Retries must not duplicate appointments, imports, notifications, documents or integration messages.
- **Observable by design.** Logs, metrics, traces and business events are designed with the workflow, not added after release.
- **Incremental delivery.** The first production vertical slice proves one complete secure journey before broad migration.
- **No silent scope expansion.** Deferred and excluded UI MVP capabilities need separate Product Authority decisions.
- **Repository boundaries are explicit.** No production repository access occurs without a named authorization issue.

## In scope

### Product and domain foundation

- production identity and six-role authorization;
- organization and warehouse isolation;
- warehouse, dock, schedule, block, capacity and Supplier configuration;
- standard and weekly Supplier booking;
- Warehouse Operator manual booking;
- transactional duration-aware capacity reservation and revalidation;
- approval, lifecycle, gate and No Show workflows;
- appointment list, details, calendar and reporting projections;
- exact Friday import reconciliation;
- immutable audit and business-event history;
- document metadata and production file-delivery contract;
- in-app and e-mail notification delivery contract;
- standing-series production decision and implementation only through a later approved scope;
- operational and administrative dashboards backed by durable evidence.

### Technical and operational foundation

- API and data ownership boundaries;
- database schema and migrations;
- transaction, locking and idempotency strategy;
- background jobs and reliable event delivery;
- object storage and malware-safe file flow;
- secrets and environment configuration;
- infrastructure as code and environment promotion;
- continuous integration and controlled delivery;
- logging, metrics, tracing, alerting and business monitoring;
- backup, restore, disaster recovery and retention;
- security testing, privacy review and access reviews;
- runbooks, ownership, incident response and support model.

## Out of scope until separately authorized

- reading or modifying `lukaszgebicki/dock-scheduling-app-ai-studio1707`;
- production implementation in any repository;
- live cloud resources, domains, certificates or secrets;
- ERP/WMS/SAP integration build;
- real e-mail, SMS or file delivery;
- production data migration;
- standing-series durable holds and recurrence scheduling;
- native mobile application, OCR, LPR, geofencing, ETA, yard map or AI optimization;
- commercial rollout, support staffing or contractual SLA commitment.

## Stakeholders and decision rights

| Role | Decision responsibility |
| --- | --- |
| Product Authority — Łukasz Gębicki | Product scope, business priority, repository authorization, pilot and release decision. |
| Project Lead / Architecture Lead | Sequencing, architecture coherence, risk control, quality gates and review. |
| Business process owners | Warehouse, Supplier, gate, planning and reporting acceptance. |
| Engineering owner | Implementation quality, maintainability, delivery and technical operations. |
| Security and privacy owner | Threat model, control acceptance, data protection and access review. |
| Operations owner | Monitoring, incident response, backup/restore, support and runbooks. |

Named engineering, security and operations owners must be assigned before implementation leaves foundation stage.

## Proposed service objectives to confirm

These are planning baselines, not contractual SLAs:

- zero accepted capacity oversubscription in concurrency tests and production monitoring;
- 100% of protected mutations linked to authenticated actor, tenant scope and audit event;
- API availability target: 99.9% monthly after pilot stabilization;
- interactive API target: p95 below 500 ms for standard reads and below 1 second for standard writes, excluding file transfer and external integrations;
- RPO target: 15 minutes or better;
- RTO target: 4 hours or better;
- zero open critical or high runtime vulnerabilities at release;
- WCAG 2.2 AA for production user journeys;
- tested restore procedure before pilot and at least quarterly thereafter;
- no production release without dashboards, alerts, runbooks and named on-call ownership.

Final service levels require Product Authority and operational-owner approval.

## Production readiness gates

### Gate G0 — repository authorization

- Explicit Product Authority authorization names the repository and allowed read/write scope.
- Exact baseline SHA is recorded.
- Production repository assessment is read-only unless separate write authority is granted.

### Gate G1 — assessed foundation

- Current production repository structure, dependencies, security posture and deployability are documented.
- Reuse, replace and retire decisions are recorded.
- Target architecture and implementation backlog are reconciled with actual code.

### Gate G2 — secure platform foundation

- Environment configuration, database migrations, authentication, server authorization, audit and CI/CD foundations pass review.
- Secrets do not exist in source or logs.
- Development, test and production boundaries are explicit.

### Gate G3 — transactional vertical slice

- One end-to-end booking journey persists durably.
- Concurrent attempts cannot oversubscribe capacity.
- Idempotent retry, audit, failure recovery and role isolation are proven by integration tests.

### Gate G4 — operational workflow completeness

- Required approval, lifecycle, gate, import, notification, document and reporting flows use durable contracts.
- Background processing is retry-safe and observable.

### Gate G5 — hardening and recovery

- Threat model, penetration/security tests, performance tests, backup restore and disaster-recovery exercise pass.
- Alerts, runbooks, ownership and data-retention controls are approved.

### Gate G6 — pilot readiness

- UAT passes with representative roles and warehouses.
- Migration/reconciliation, rollback and support plans are approved.
- Pilot scope, success criteria and stop conditions are explicit.

### Gate G7 — production release

- Product Authority, engineering, security and operations owners sign off.
- No unresolved critical finding exists.
- Release and rollback are executed through controlled automation.

## Delivery strategy

1. **Assess before editing.** Inspect the named production repository only after authorization.
2. **Reconcile architecture.** Convert this logical target into ADRs based on actual repository evidence.
3. **Build the platform foundation.** Identity, authorization, persistence, audit, migrations and delivery pipeline.
4. **Prove a vertical slice.** Standard Supplier booking through durable capacity and approval.
5. **Expand by workflow.** Lifecycle/gate, weekly planning/import, reporting/files/notifications and administration.
6. **Harden.** Performance, security, recovery, observability and operating model.
7. **Pilot and release.** Controlled scope, measurable outcomes, reconciliation and rollback.

## Primary risks

| Risk | Treatment |
| --- | --- |
| Demo-local behavior is copied without server authority | Treat UI as functional reference only; define API authorization and data ownership first. |
| Concurrent bookings oversubscribe capacity | Use transactional reservation, database constraints/locking and deterministic concurrency tests. |
| Existing production repository architecture conflicts with this plan | Perform read-only assessment and issue ADRs before implementation. |
| Broad feature migration delays first value | Deliver one secure vertical slice before breadth. |
| Audit, notifications or integrations duplicate on retry | Require idempotency keys, outbox/event identity and consumer deduplication. |
| Sensitive data leaks through logs or Supplier projections | Classify data, enforce tenant scope, redact telemetry and test negative access. |
| Operational ownership is undefined | Block pilot until named owners, alerts and runbooks exist. |
| Unverified migration corrupts operational records | Use rehearsal, reconciliation, immutable source snapshots and rollback gates. |

## Immediate next decision

After this planning task is merged, `PROD-REPO-ASSESSMENT-1` remains `BLOCKED`.

To unblock it, Product Authority must explicitly authorize read-only access to:

`lukaszgebicki/dock-scheduling-app-ai-studio1707`

The authorization must state the exact baseline or base branch, allowed paths/actions, whether security scanning is allowed, and whether any branch or PR creation is permitted. Until then, no connector, clone, fetch, search, comparison or write against that repository is allowed.
