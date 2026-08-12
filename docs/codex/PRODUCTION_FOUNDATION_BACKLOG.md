# Production Foundation Backlog

## Backlog identity

- Program: Production Foundation.
- Governance status date: 2026-08-12.
- Functional reference: UI MVP Product Review 2, result `PASS`.
- Governance repository: `lukaszgebicki/dock-scheduling-ui-ai-studio`.
- Governance baseline for this reconciliation:
  `575f9a42b9ef13e306a1db582b0950646df5d777`.
- Production repository: `lukaszgebicki/dock-scheduling-app-ai-studio1707`.
- Historical assessed production SHA:
  `c758e8403a4693fa7ba96081254072ad5d743aba`.
- Current production reference SHA:
  `d3824404113052c33b9feddf37a30aa4daa9d9b4`.
- This reconciliation is governance/docs-only and authorizes no production
  repository write, deployment, cloud resource, production data or secret
  change.

## Canonical sources of truth

### Production repository

`lukaszgebicki/dock-scheduling-app-ai-studio1707` is canonical for:

- production code;
- schema and migrations;
- API behavior and implemented contracts;
- security/RBAC implementation;
- automated tests and CI evidence;
- current technical implementation state;
- production issues and Pull Requests.

### UI and governance repository

`lukaszgebicki/dock-scheduling-ui-ai-studio` is canonical for:

- approved UI MVP functional-reference material;
- Product Authority decisions;
- product documentation;
- program planning/governance;
- historical production assessment evidence.

The UI repository is not canonical for production authorization when a later
Product Authority decision or production implementation supersedes a demo
assumption.

## Operating rules

- Only one implementation task should be `READY` at a time unless Product
  Authority explicitly approves parallel work.
- Every production task requires an exact base SHA, named repository, bounded
  scope, protected paths, validation depth and review/merge gate.
- Production deployment, cloud resources, production data and secrets require
  separate explicit authorization.
- No task may weaken six-role authorization, Supplier/Warehouse isolation,
  pallet-capacity correctness, lifecycle concurrency, immutable evidence or
  fail-closed validation.
- The UI MVP is a functional reference, not evidence of production readiness.
- No new production implementation is activated by this backlog reconciliation.

## Product Authority role model

The current production role decision is controlling:

- business `Warehouse Manager` = existing `WAREHOUSE_ADMINISTRATOR`;
- no seventh `WAREHOUSE_MANAGER` role is required;
- `WAREHOUSE_OPERATOR` is a floor-operations role only;
- Operator may read authorized appointments and execute
  `START_UNLOADING` / `COMPLETE_UNLOADING`;
- Operator may not create bookings, approve, reject, request information,
  reschedule, cancel or mutate booking configuration;
- assisted booking is an Administrator capability, not an Operator capability.

Historical UI MVP Operator-manual-booking evidence remains historical and does
not override this production decision.

## Phase overview

| Phase | Objective | Current state |
| --- | --- | --- |
| P0 — Authorization and assessment | Establish evidence-backed production baseline and reuse plan. | DONE |
| P1 — Platform foundation | Secure/durable app foundation, CI, auth/RBAC, observability and delivery controls. | PARTIAL — application foundation strong; deployment/DR incomplete |
| P2 — Transactional vertical slice | Secure Supplier booking with durable capacity correctness. | DONE |
| P3 — Core operational workflows | Approval/change/config/admin-booking/unloading workflows. | SUBSTANTIALLY DELIVERED for approved scope |
| P4 — Planning and delivery services | Notifications, files, planning/import and reporting. | PARTIAL — notifications DONE |
| P5 — Hardening and migration | Security/performance/recovery/data-transition readiness. | OPEN |
| P6 — Pilot and release | Production-like UAT, controlled release and hypercare. | OPEN |

## Current production milestone overlay

| Task | State / evidence |
| --- | --- |
| `PROD-OBSERVABILITY-FOUNDATION-1` | DONE — PR #48, `e5784e06b0500a1a50f0de8957742e25f75369e6` |
| `PROD-BOOKING-VERTICAL-SLICE-1` | DONE — PR #50, `7f2a87708ff38adb984a2f792cc414d7ecf52378` |
| `PROD-CAPACITY-TRANSACTION-1` | DONE — PR #52, `592d86bf75337abf97268233d5a9caa9325da1c2` |
| `PROD-BASELINE-CI-UNBLOCK-1` | DONE — PR #61, `5c60fa0b960d83b56a8cf17cc061510f8a2ed744` |
| `PROD-APPROVAL-LIFECYCLE-1` | DONE — issue #53 / PR #54, `dbe1127ae64c24e601828f38a0b88a749b79b858` |
| `PROD-SEC-REACT-ROUTER-MIGRATION-1` | DONE — issue #57 / PR #62, `f0d98f3cb97e8b2f1fa072c1eb49301f62e7dab6` |
| `PROD-BOOKING-CONFIG-ADMIN-1` | DONE — issue #63 / PR #64, `5e3533f36e54f2430257b08dbf6be76930def9d5` |
| `PROD-APPOINTMENT-CHANGE-LIFECYCLE-1` | DONE — issue #65 / PR #66, `ea30def3ad266729a6fdd4815696c029cb2041cb` |
| `PROD-WAREHOUSE-OPERATIONS-1` | DONE — issue #67 / PR #68, `9ba68b8725271b847e351883434e3b022bdd3758` |
| `PROD-WAREHOUSE-ADMIN-BOOKING-DESK-1` | DONE — issue #69 / PR #70, `d27f6b9d8c46ca7ad054232d12a55011cdef78a7` |
| `PROD-NOTIFICATIONS-1` | DONE — issue #71 / PR #72, `d3824404113052c33b9feddf37a30aa4daa9d9b4` |

## P0 — Authorization and assessment

### PROD-REPO-ASSESSMENT-1

**State:** `DONE` through issue #141 and merged PR #142.

- Assessment SHA: `c758e8403a4693fa7ba96081254072ad5d743aba`.
- Decision: evolve the existing production repository rather than replace it.
- The assessed SHA remains historical evidence and must not be confused with
  current production `main`.

## P1 — Platform foundation

### Application security, persistence, CI and observability

**State:** substantially implemented.

Completed capabilities include:

- production API hardening and redacted failure behavior;
- required PostgreSQL integration CI and migrations;
- canonical six-role server RBAC and scoped assignments;
- root Organization / Supplier Organization / Warehouse / participation
  persistence and active-state validation;
- privileged user/role/status/invitation lifecycle with immutable evidence;
- observability foundation with structured redacted telemetry;
- supported/security-clean React Router 7.18.2 production line;
- zero known dependency vulnerabilities at the final `PROD-NOTIFICATIONS-1`
  validation gate.

Still open in P1/P5/P6 boundary:

- controlled environment promotion/deployment and rollback;
- final production configuration/secrets operating model;
- backup/PITR/restore rehearsal;
- production exporter/alert/SLO activation where external infrastructure is
  required.

### PROD-CI-CD-FOUNDATION-1

**State:** partial.

PR validation/build/test is mature, but a complete environment promotion and
production deployment/rollback chain remains open and separately governed.

### PROD-DATA-FOUNDATION-1

**State:** partial.

Application schema/migrations and PostgreSQL integration are mature. Managed
production database operations, backup/recovery evidence and final release
procedures remain outside the completed application slices.

### PROD-AUTH-RBAC-1

**State:** substantially delivered for current product endpoints.

The canonical six-role model remains fixed. Any future endpoint must continue
server-side scope and active-entity validation.

### PROD-OBSERVABILITY-FOUNDATION-1

**State:** `DONE` through production PR #48 at
`e5784e06b0500a1a50f0de8957742e25f75369e6`.

## P2 — Transactional vertical slice

### PROD-BOOKING-VERTICAL-SLICE-1

**State:** `DONE` through PR #50 at
`7f2a87708ff38adb984a2f792cc414d7ecf52378`.

### PROD-CAPACITY-TRANSACTION-1

**State:** `DONE` through PR #52 at
`592d86bf75337abf97268233d5a9caa9325da1c2`.

Capacity semantics were later deliberately evolved by
`PROD-BOOKING-CONFIG-ADMIN-1`:

- capacity unit = pallets;
- each slot has configurable capacity `1..33` pallets;
- hard system ceiling = 33 pallets per slot;
- durable reservation/release ledgers and counters are pallet-based;
- concurrent admission must never oversubscribe committed slot capacity.

P2 is `DONE`.

## P3 — Core operational workflows

### PROD-APPROVAL-LIFECYCLE-1

**State:** `DONE` through issue #53 / PR #54.

Delivered:

- approve;
- reject;
- request information;
- Supplier information response;
- lifecycle versioning;
- immutable history/outbox;
- exact rejection capacity release.

### PROD-BOOKING-CONFIG-ADMIN-1

**State:** `DONE` through issue #63 / PR #64 at
`5e3533f36e54f2430257b08dbf6be76930def9d5`.

Delivered:

- Warehouse booking-configuration draft/save/preview/publish/audit;
- explicit working hours, one-off blocks and materialized slots;
- version-coherent Supplier admission;
- bounded publish reconciliation;
- configurable pallet capacity with hard 33-pallet ceiling;
- grandfathering of existing appointments.

### PROD-APPOINTMENT-CHANGE-LIFECYCLE-1

**State:** `DONE` through issue #65 / PR #66 at
`ea30def3ad266729a6fdd4815696c029cb2041cb`.

Delivered:

- transactional reschedule;
- cancellation terminal state;
- multi-allocation capacity lineage;
- atomic old-release/new-reservation swap;
- lifecycle concurrency/idempotency/failure rollback.

### PROD-WAREHOUSE-OPERATIONS-1

**State:** `DONE` through issue #67 / PR #68 at
`9ba68b8725271b847e351883434e3b022bdd3758`.

Delivered approved physical execution scope:

`NOT_STARTED -> IN_PROGRESS -> COMPLETED`

through `START_UNLOADING` and `COMPLETE_UNLOADING`.

This task also corrected production Operator authorization to floor operations
only. It did **not** implement Gate/Yard/driver/check-in workflows.

### PROD-WAREHOUSE-ADMIN-BOOKING-DESK-1

**State:** `DONE` through issue #69 / PR #70 at
`d27f6b9d8c46ca7ad054232d12a55011cdef78a7`.

Delivered:

- Warehouse Administrator planning desk;
- server-derived Supplier discovery;
- assisted booking on behalf of Supplier;
- shared canonical booking/capacity engine with Supplier self-service;
- immutable booking provenance;
- Operator assisted-booking denial.

### Broad Gate/Yard scope

**State:** not implemented and not automatically activated.

Potential concepts such as truck arrival, gate check-in, driver/vehicle data,
yard location, dock-door assignment, no-show and departure require a separate
Product Authority decision. They are not implied by the completed unloading
lifecycle.

## P4 — Planning and delivery services

### PROD-NOTIFICATIONS-1

**State:** `DONE` through issue #71 / PR #72 at
`d3824404113052c33b9feddf37a30aa4daa9d9b4`.

Delivered application capability:

- reuse of the transactional outbox;
- evidence-preserving post-cutover projection queue with no historical flood;
- per-user authenticated in-app notifications;
- provider-neutral SMTP transport;
- encrypted SMTP transport requirement;
- send-time recipient authorization revalidation;
- bounded worker leasing/retry/backoff/dead-letter;
- crash recovery and deterministic Message-ID;
- System Administrator delivery operations;
- explicit external guarantee: at-least-once network delivery.

Boundary:

- no real SMTP credentials, provider deployment or cloud resource was
  configured by the implementation task;
- notification preferences/marketing communication remain outside this v1
  transactional-notification contract.

### PROD-FILES-1

**State:** `OPEN / NOT ACTIVATED`.

Recommended next P4 product capability:

- object storage;
- signed upload/download;
- metadata/checksum and authorization;
- safe scan/quarantine contract;
- retention/deletion;
- durable attachment linkage.

This capability is a reusable dependency for later imports and operational
records.

### PROD-WEEKLY-PLANNING-IMPORT-1

**State:** `OPEN / NOT ACTIVATED`.

Expected scope remains durable weekly planning/import, idempotent batch
application, unmatched/ambiguous reconciliation and transport authority.

### PROD-REPORTING-DASHBOARD-1

**State:** `OPEN / NOT ACTIVATED`.

Expected scope remains scoped server-side KPI/reporting queries, durable metric
definitions and safe export lifecycle.

## P5 — Hardening and migration

### PROD-SECURITY-HARDENING-1

**State:** `OPEN`.

Remaining concerns include:

- threat-model refresh for the current large production surface;
- multi-instance rate/abuse protection;
- privileged-access review;
- final independent security/pentest evidence;
- container/IaC/security configuration checks when deployment assets exist.

The prior React Router issue #57 is resolved and must not be listed as open
security debt.

### PROD-PERFORMANCE-RELIABILITY-1

**State:** `OPEN`.

Requires production-like load/contention tests, query/index review, worker
throughput/outage tests, target p95/throughput decisions and validated runbooks.

### PROD-BACKUP-DR-1

**State:** `OPEN`.

Requires approved backup/PITR policy, restore rehearsal and measured RPO/RTO.

### PROD-DATA-MIGRATION-1

**State:** `OPEN / SOURCE-DEPENDENT`.

Requires actual source inventory, mapping, dry-run/reconciliation and explicit
cutover authorization before any production data work.

## P6 — Pilot and release

### PROD-UAT-PILOT-1

**State:** `OPEN`.

Requires representative role users, production-like environment, controlled
Warehouse/Supplier cohort, success/stop criteria, support ownership and
rollback rehearsal.

### PROD-RELEASE-1

**State:** `OPEN`.

Requires final production change approval, security/operational review,
monitoring/hypercare, rollback window and Product Authority sign-off.

## Dependency direction

```text
completed P0/P2 and application foundations
  -> completed approval/config/change/unloading/admin-booking workflows
  -> completed transactional notifications
  -> remaining P4 files / planning-import / reporting
  -> P5 security / performance / recovery / migration
  -> P6 UAT pilot
  -> production release
```

Deployment/reliability hardening may be pulled forward before remaining P4
product work by Product Authority.

## Current program state

- Current production reference:
  `d3824404113052c33b9feddf37a30aa4daa9d9b4`.
- P2: `DONE`.
- P3: approved booking/approval/configuration/change/assisted-booking/unloading
  scope delivered; broad Gate/Yard scope remains a separate decision.
- P4: partial; `PROD-NOTIFICATIONS-1` is `DONE`; files, weekly planning/import
  and reporting remain open.
- P5/P6 and deployment/release: incomplete.
- No new production task is activated by this reconciliation.
- Recommended next major product candidate: `PROD-FILES-1`, subject to a new
  Product Authority-approved exact-SHA task contract.
