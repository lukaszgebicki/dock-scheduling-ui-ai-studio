# Verified current state

Verified on 2026-08-12 from governance `main`
`575f9a42b9ef13e306a1db582b0950646df5d777` and production `main`
`d3824404113052c33b9feddf37a30aa4daa9d9b4`.

## Repository and source-of-truth split

- Governance / functional-reference repository:
  `lukaszgebicki/dock-scheduling-ui-ai-studio`.
- Production repository:
  `lukaszgebicki/dock-scheduling-app-ai-studio1707`.
- The governance repository remains the canonical source for Product Authority
  decisions, roadmap/program governance, approved UI MVP reference material and
  historical production assessment evidence.
- The production repository is canonical for current production code, schema,
  migrations, API behavior, implemented RBAC/security, tests, CI evidence and
  current technical implementation status.
- The UI repository is still a frontend-only demonstrational reference. Its
  historical behavior is not automatically a production authorization rule.

## Historical governance baseline

- `PROD-REPO-ASSESSMENT-1` is `DONE` through issue #141 / PR #142.
- Historical assessed production SHA remains
  `c758e8403a4693fa7ba96081254072ad5d743aba`; it is historical evidence, not the
  current implementation reference.
- `PROD-GOVERNANCE-RECONCILE-2` is `DONE` through issue #152 / PR #153 at
  governance merge `575f9a42b9ef13e306a1db582b0950646df5d777`.
- `DEV-SEC-002-REMEDIATE` remains `DONE`; the governance repository dependency
  audits were clean at its completion.

## Historical UI MVP reference

- [UI MVP Product Completion Review v2](UI_MVP_PRODUCT_COMPLETION_REVIEW_V2.md)
  remains the canonical `PASS` record for the agreed frontend-only
  demonstrational scope.
- [Business Decision Pack UI MVP v0.3](../product/UI_MVP_BUSINESS_DECISION_PACK_v0.3.md),
  [UI MVP traceability](../product/UI_MVP_TRACEABILITY.md) and
  [Scope Addendum v0.4](../product/UI_MVP_SCOPE_ADDENDUM_v0.4.md) remain
  historical functional/product reference material.
- That historical closure is not a claim of production readiness and does not
  override later Product Authority decisions for production authorization.

## Current production main

The verified production `main` is:

`d3824404113052c33b9feddf37a30aa4daa9d9b4`

This is the squash merge of production PR #72 implementing
`PROD-NOTIFICATIONS-1`.

## Production delivery milestones

| Production task | Result |
| --- | --- |
| `PROD-OBSERVABILITY-FOUNDATION-1` | DONE — PR #48, merge `e5784e06b0500a1a50f0de8957742e25f75369e6` |
| `PROD-BOOKING-VERTICAL-SLICE-1` | DONE — PR #50, merge `7f2a87708ff38adb984a2f792cc414d7ecf52378` |
| `PROD-CAPACITY-TRANSACTION-1` | DONE — PR #52, merge `592d86bf75337abf97268233d5a9caa9325da1c2` |
| `PROD-BASELINE-CI-UNBLOCK-1` | DONE — PR #61, merge `5c60fa0b960d83b56a8cf17cc061510f8a2ed744` |
| `PROD-APPROVAL-LIFECYCLE-1` | DONE — issue #53 / PR #54, merge `dbe1127ae64c24e601828f38a0b88a749b79b858` |
| `PROD-SEC-REACT-ROUTER-MIGRATION-1` | DONE — issue #57 / PR #62, merge `f0d98f3cb97e8b2f1fa072c1eb49301f62e7dab6`; React Router 7.18.2, audits clean |
| `PROD-BOOKING-CONFIG-ADMIN-1` | DONE — issue #63 / PR #64, merge `5e3533f36e54f2430257b08dbf6be76930def9d5` |
| `PROD-APPOINTMENT-CHANGE-LIFECYCLE-1` | DONE — issue #65 / PR #66, merge `ea30def3ad266729a6fdd4815696c029cb2041cb` |
| `PROD-WAREHOUSE-OPERATIONS-1` | DONE — issue #67 / PR #68, merge `9ba68b8725271b847e351883434e3b022bdd3758` |
| `PROD-WAREHOUSE-ADMIN-BOOKING-DESK-1` | DONE — issue #69 / PR #70, merge `d27f6b9d8c46ca7ad054232d12a55011cdef78a7` |
| `PROD-NOTIFICATIONS-1` | DONE — issue #71 / PR #72, merge `d3824404113052c33b9feddf37a30aa4daa9d9b4` |

## Current production capability

The production application now has an evidence-backed transactional path for:

- scoped six-role server authorization and persisted access assignments;
- secure Supplier booking against published Warehouse configuration;
- pallet-based capacity with a hard system ceiling of 33 pallets per slot and
  configurable actual slot capacity from 1 to 33;
- durable capacity reservation/release lineage and bounded SERIALIZABLE
  contention handling;
- manual approval / rejection / information-request lifecycle;
- transactional reschedule and cancellation with capacity swap/release safety;
- Warehouse booking-configuration draft/publish/audit administration;
- Warehouse Administrator assisted booking and planning using the same booking
  engine as Supplier self-service;
- Warehouse floor unloading execution with `START_UNLOADING` and
  `COMPLETE_UNLOADING`;
- immutable history, transactional outbox evidence and production notification
  projection;
- authenticated in-app notifications;
- provider-neutral SMTP delivery code with mandatory encrypted transport,
  bounded retry, leasing, crash recovery, recipient revalidation and
  dead-letter administration.

The notification implementation does not mean real SMTP credentials or a
production environment have been configured or deployed.

## Product Authority role correction

Production authorization supersedes the historical demonstrational UI MVP where
there is a conflict.

- Business term **Warehouse Manager** maps to the existing canonical role
  `WAREHOUSE_ADMINISTRATOR`.
- No `WAREHOUSE_MANAGER` role exists or is planned by this reconciliation.
- `WAREHOUSE_OPERATOR` is a floor-operations role only.
- `WAREHOUSE_OPERATOR` may read authorized Warehouse appointments and perform
  `START_UNLOADING` / `COMPLETE_UNLOADING`.
- `WAREHOUSE_OPERATOR` may not create bookings, approve, reject, request
  information, reschedule, cancel or mutate booking configuration.
- Assisted booking is authorized to `WAREHOUSE_ADMINISTRATOR` and
  `SYSTEM_ADMINISTRATOR`, subject to their normal scope rules.

The old UI MVP task named `UI-MVP-OPERATOR-MANUAL-BOOKING-1` remains historical
proof of the demonstrational scope completed at that time. It must not be used
as authorization evidence for the production system.

## Phase status

- P0 — authorization/assessment: `DONE`.
- P1 — platform foundation: substantially implemented for application-level
  security, persistence, CI and observability, but deployment/environment,
  backup/recovery and release infrastructure remain incomplete.
- P2 — transactional booking vertical slice: `DONE`.
- P3 — core operational workflows: approved booking/approval/change,
  configuration, Warehouse Administrator assisted booking and unloading
  execution scope is delivered. Broad Gate/Yard/driver/check-in workflows are
  not implemented and remain outside the currently approved production scope.
- P4 — planning/delivery services: `PARTIAL`; production notifications are
  `DONE`, while weekly planning/import, files/attachments and production
  reporting remain open.
- P5 — hardening/migration: incomplete.
- P6 — pilot/release: incomplete.

These milestones do **not** establish production readiness or authorize a
production deployment.

## Remaining major program areas

Still incomplete or requiring separate Product Authority contracts:

- controlled environment promotion / deployment and rollback;
- multi-instance rate/abuse hardening and final security review;
- performance/load/reliability qualification;
- backup, point-in-time recovery and restore rehearsal;
- files/attachments and safe object-storage lifecycle;
- weekly planning/import and reconciliation workflows;
- production reporting / KPI and export services;
- any required source-data migration;
- production-like UAT/pilot;
- final production release and hypercare.

Broad Gate/Yard/driver/check-in functionality is not treated as an implicit next
requirement; it needs an explicit Product Authority scope decision before work.

## Next controlled direction — not activated

No implementation task is activated by this reconciliation.

The recommended next major product direction is `PROD-FILES-1`, because safe
attachment/object-storage capability is a reusable dependency for later import,
operational evidence and export workflows. `PROD-WEEKLY-PLANNING-IMPORT-1` and
`PROD-REPORTING-DASHBOARD-1` remain subsequent P4 candidates.

Deployment/reliability hardening may be prioritized ahead of those product
features by a separate Product Authority decision.

## Main branch governance

- Active ruleset `Protect main` (ID `19850347`) targets `refs/heads/main` in the
  governance repository.
- Governance changes to `main` require a pull request and the required
  `Typecheck, test and build` check.
- Force pushes and deletion of `main` are blocked.
- Automated PASS does not replace Product Authority merge authorization where
  the task contract reserves that gate.

## Reconciliation boundary

This status reconciliation reads production evidence but changes only the four
approved governance documents in the UI/governance repository. It performs no
production-code, dependency, workflow, deployment, cloud, data or secret
change.
