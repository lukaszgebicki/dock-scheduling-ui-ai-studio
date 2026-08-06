# Production Foundation Backlog

## Backlog identity

- Program: Production Foundation.
- Governance status date: 2026-08-06.
- Functional reference: UI MVP Product Review 2, result `PASS`.
- Governance repository: `lukaszgebicki/dock-scheduling-ui-ai-studio`.
- Governance baseline for this synchronization: `03c8561795ffdcc72eaea0469a1d43f3a11d4b14`.
- Production repository: `lukaszgebicki/dock-scheduling-app-ai-studio1707`.
- Historical assessed production SHA: `c758e8403a4693fa7ba96081254072ad5d743aba`.
- Current production reference SHA: `11c253ef08708cc8095c5218e3b4e3a447013be1`.
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
- Every implementation task requires a separate exact production base SHA, named repository, allowed and protected paths, validation depth and review gate.
- The UI MVP is a functional reference, not a production code-completeness or production-readiness claim.
- Architecture and planning must be reconciled with current production-repository evidence before implementation.
- No task may weaken six-role scope, Supplier organization isolation, transactional capacity, approval safety, immutable audit evidence or fail-closed validation.
- Production deployment, cloud resources, production data and secrets require separate explicit authorization.
- No new production task is activated by this backlog update.

## Phase overview

| Phase | Current state | Exit result |
| --- | --- | --- |
| P0 — Authorization and assessment | `DONE` through issue #141 and merged PR #142. | Approved evolve-not-replace decision, evidence, risk register and implementation baseline. |
| P1 — Platform foundation | `PARTIAL`; major security, CI, identity, RBAC and administration foundations completed; operational platform foundations remain. | Deployable, secure and observable platform with controlled delivery and recovery. |
| P2 — Transactional vertical slice | `NOT_ACTIVATED`. | Durable Supplier booking that cannot oversubscribe capacity. |
| P3 — Core operational workflows | `NOT_ACTIVATED`. | Core warehouse operation works against durable data. |
| P4 — Planning and delivery services | `NOT_ACTIVATED`. | Supporting workflows are durable, idempotent and observable. |
| P5 — Hardening and migration | `NOT_ACTIVATED`. | Production-readiness gates, recovery and migration evidence pass. |
| P6 — Pilot and release | `NOT_ACTIVATED`. | Product Authority signs off controlled release. |

## P0 — Authorization and assessment

### PROD-REPO-ASSESSMENT-1 — production repository assessment

**State:** `DONE`.

- Product Authority authorization is recorded in `PROD_REPO_ASSESSMENT_AUTHORIZATION.md`.
- Assessment was performed on production SHA `c758e8403a4693fa7ba96081254072ad5d743aba`.
- Issue #141 was completed by merged PR #142.
- Historical issue #140 is superseded and closed as not planned; its original text remains historical evidence of the pre-authorization blocker.
- Assessment conclusion: evolve the existing production repository and preserve the authentication/monorepo nucleus.
- The first recommended remediations were executed in the production repository through separately scoped issues and Pull Requests.

## Completed Production Foundation groups

The following groups are implemented in the production repository at current
reference SHA `11c253ef08708cc8095c5218e3b4e3a447013be1`:

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

The repository was developed in place; it was not replaced. These completed
foundation groups do not establish complete production readiness.

## Open platform foundations

### PROD-OBSERVABILITY-FOUNDATION-1 — logs, metrics, traces and operations

**State:** `RECOMMENDED_NOT_ACTIVATED`.

Open scope:

- structured redacted logs across API, database and future workers;
- metrics and traces;
- error monitoring;
- service-level objectives and alert ownership;
- health/readiness operational integration;
- actionable runbook templates.

### PROD-RATE-LIMITING-FINAL-1 — final multi-instance abuse protection

**State:** `PLANNED_NOT_ACTIVATED`.

The current in-process limiter and security controls are not the final
multi-instance production control. The final design must define trusted proxy
topology and a shared edge or distributed limiter without secret-bearing keys.

### PROD-DELIVERY-ENVIRONMENT-1 — deployment and environment promotion

**State:** `PLANNED_NOT_ACTIVATED`.

Open scope includes immutable artifacts, environment configuration contracts,
promotion, protected production approval, rollback and release observability.

### PROD-BACKUP-DR-1 — backup, restore and runbooks

**State:** `PLANNED_NOT_ACTIVATED`.

Open scope includes backup policy, point-in-time recovery, restore rehearsal,
measured RPO/RTO and disaster runbooks.

### PROD-BUSINESS-CONFIG-1 — durable business configuration

**State:** `PLANNED_NOT_ACTIVATED`.

Open scope includes warehouse scheduling rules, Supplier participation,
capacity calendars, working hours, blocks and other approved configuration
needed by a booking vertical slice.

## P2 — Transactional vertical slice

### PROD-BOOKING-VERTICAL-SLICE-1 — Supplier booking to durable appointment

**State:** `RECOMMENDED_NOT_ACTIVATED`.

Dependencies remain:

- an approved architecture contract for the slice;
- usable observability;
- final decisions for business configuration and capacity persistence;
- exact production base SHA and separate Product Authority activation.

Planned scope:

- published warehouse/Supplier configuration reads;
- five-step standard Supplier booking API and web integration;
- server validation and duration calculation;
- transactional capacity reservation;
- idempotent booking command;
- approval outcome;
- durable appointment, history, audit and outbox event;
- list/details projection;
- integration and concurrency tests.

Exit evidence must prove exactly one success for concurrent attempts at the last
capacity unit, deterministic idempotent replay, Supplier isolation, atomic
state/audit/outbox behavior and service-level telemetry.

### PROD-CAPACITY-TRANSACTION-1 — capacity model hardening

**State:** `PLANNED_NOT_ACTIVATED`.

May be part of the first vertical slice or a separately approved follow-up. It
must establish duration-aware constraints, reservation lifecycle, bounded
contention behavior and audited override without oversubscription.

## P3 — Core operational workflows

**State:** `PLANNED_NOT_ACTIVATED`.

Planned work remains:

- `PROD-APPROVAL-LIFECYCLE-1`;
- `PROD-OPERATOR-MANUAL-BOOKING-1`;
- `PROD-GATE-OPS-1`.

These tasks require durable booking/capacity foundations and separate Product
Authority activation.

## P4 — Planning and delivery services

**State:** `PLANNED_NOT_ACTIVATED`.

Planned work remains:

- weekly planning and idempotent import;
- files/object storage and quarantine;
- transactional outbox, workers and notification delivery;
- reporting, dashboards and controlled exports.

### PROD-OUTBOX-WORKERS-1 — transactional outbox and workers

**State:** `PLANNED_NOT_ACTIVATED`.

This foundation remains open and must precede reliable asynchronous
notifications and other background delivery workflows.

## P5 — Hardening and migration

**State:** `PLANNED_NOT_ACTIVATED`.

Remaining work includes threat modeling, independent security review,
performance/contention tests, operational resilience, backup/restore proof and
any required data migration rehearsal.

## P6 — Pilot and release

**State:** `PLANNED_NOT_ACTIVATED`.

Pilot and release require production-like environment evidence, representative
UAT, support ownership, rollback proof and explicit Product Authority sign-off.

## Current program state

- `PROD-REPO-ASSESSMENT-1`: `DONE` through issue #141 and PR #142.
- `PROD-GOVERNANCE-SYNC-1`: `IN_PROGRESS` in issue #143.
- Current production reference SHA: `11c253ef08708cc8095c5218e3b4e3a447013be1`.
- No production implementation task is `READY`.
- `PROD-OBSERVABILITY-FOUNDATION-1` and the first transactional booking vertical slice are recommendations only.
- The next implementation direction requires a separate Product Authority decision and exact-SHA task contract.
