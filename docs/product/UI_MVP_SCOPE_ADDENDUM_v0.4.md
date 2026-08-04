# UI MVP Scope Addendum v0.4

## Decision identity

- Product: Dock Appointment Scheduling Platform — demonstrational UI MVP.
- Base product authority: `UI_MVP_BUSINESS_DECISION_PACK_v0.3.md`.
- Decision date: 2026-08-04.
- Product Authority: Łukasz Gębicki.
- Implementation baseline for closure review: `fe540c63212411378e2eb8e71b1ee56e65cd1192`.
- Repository: `lukaszgebicki/dock-scheduling-ui-ai-studio`.
- Production repository access: not authorized and not performed.

## Purpose

This addendum defines the closure boundary for the frontend-only demonstrational UI MVP. It does not rewrite or invalidate Business Decision Pack v0.3. It identifies which capabilities are mandatory for UI MVP completion and which broader capabilities are deliberately deferred to a later product or Production Foundation phase.

A deferred item is not implemented merely by being named here. It remains future scope and requires a separate product decision, exact-SHA issue, implementation contract and review.

## Completion definition

The UI MVP may receive `PASS` only when:

1. every in-scope Business Decision Pack identifier and acceptance scenario is implemented and evidence-backed;
2. role and organization scope, booking, capacity, deterministic concurrency, approval safety, lifecycle, gate operations, calendar, PO/SKU identity, reporting, transport authority, accessibility and fail-closed behavior remain intact;
3. every remaining broader item is explicitly classified `DEFERRED` or already `EXCLUDED`;
4. no statement implies backend, integration, persistence, deployment or production readiness.

`PASS` under this addendum means **complete for the agreed demonstrational UI MVP scope only**.

## Mandatory UI MVP capabilities

The following capabilities remain mandatory and cannot be deferred by this addendum:

- exactly six roles with centralized route, action, warehouse and Supplier-organization scope;
- Supplier weekly reservation and standard five-step non-weekly booking;
- Warehouse Operator manual booking on behalf of an assigned Supplier;
- dynamic configured required fields in standard and Operator booking;
- duration-aware 15-minute composite capacity checks, configured blocks, compatible docks and controlled reasoned override;
- deterministic final-capacity competition in which the first local attempt wins and the second receives a conflict plus compatible alternatives;
- approval evaluation that fails closed when scope, rules or authorized actors are unavailable;
- lifecycle, reschedule, cancellation, operational and gate transitions with required evidence and immutable local history;
- exact Friday reconciliation identity, explicit unmatched/ambiguous/conflict handling and no silent transport overwrite;
- one appointment / one PO header / zero-to-many SKU lines and independent planning, lifecycle and operational states;
- six role-scoped calendar views from one visible workspace source;
- role-safe appointment list, details, dashboards, notifications and local reports/exports;
- responsive Supplier, Operator, Security and Administrator presentation with accessible native controls;
- local-only behavior without network, browser persistence, backend, database, e-mail, ERP/WMS/SAP or production effects.

## Approved deferrals

### `DEF-IMP-001` — XLSX import input

- UI MVP contract: Friday planning input is local CSV only.
- Deferred: XLSX input parsing.
- Not deferred: exact five-field matching, grouping, duplicate protection, validation, explicit outcomes and transport reconciliation.
- Reporting may continue to generate local XLSX output; that does not imply XLSX import support.

### `DEF-STANDING-001` — capacity-backed standing series

- UI MVP contract: standing appointment series is a local inspection/configuration preview.
- Deferred: durable capacity holds, automatic hold expiry/release, recurrence scheduler, background jobs and creation of durable future appointments.
- The preview must continue to state that capacity is not reserved and no timer or scheduler is running.

### `DEF-DASH-001` — production-derived Administrator KPIs

- UI MVP contract: dashboards display metrics derivable from current local evidence and explicitly mark unavailable metrics as unavailable.
- Deferred: utilization, waiting time, service time and similar KPIs that require durable event timestamps, production denominators or historical persistence.
- Fabricated or inferred values are prohibited.

### `DEF-ADMIN-001` — extended administration breadth

Deferred administrative breadth includes:

- complete legal, tax, postal and multi-contact Supplier profile;
- the full user lifecycle/action catalog such as unlock, resend, all grant/revoke and reassignment variants, and advanced last-administrator controls beyond current safe scope;
- per-event notification recipients, reminder hours, completeness and language administration;
- global dictionaries, theme, branding and broad multi-tenant customization;
- exhaustive Level 3 exception configuration not consumed by an implemented UI MVP flow.

Current warehouse, dock, schedule, block, capacity, Supplier assignment, rule, user and notification controls remain mandatory where consumed by implemented flows.

### `DEF-APPROVAL-001` — automated approval timing operations

- UI MVP contract: auto/manual/rule-based evaluation, authorized routing, approve/reject/request-data and fail-closed missing-actor behavior are mandatory.
- Deferred: durable decision timers, scheduled reminders, escalations, expiry jobs and background processing.
- A missing rule or actor may never silently approve.

### `DEF-UX-BREADTH-001` — exhaustive optional fields and dimensions

Deferred non-core presentation breadth includes:

- every optional pre-confirmation edit field when safe field editing and slot-affecting revalidation are already demonstrated;
- a configured cancellation-reason dictionary when a mandatory reason and late-cancellation evidence are enforced;
- every optional list column/filter dimension when actor-safe search, filters, saved views and core operational columns are present;
- dense mobile editing of complex warehouse configuration where basic access remains and a desktop recommendation is explicit.

This deferral cannot remove a required operational action or expose hidden data.

### `DEF-VALIDATION-001` — extended configurable format dictionaries

- UI MVP contract: required fields, positive booking measures, valid dates/times, configured scope, capacity, transport, duplicate and conflict checks fail closed in implemented creation and transition flows.
- Deferred: configurable PO/ASN regular-expression dictionaries and exhaustive cross-market format catalogs.
- Friday CSV SKU quantities use a local preview contract of **non-negative numeric values**. Zero may represent a planning placeholder in a non-applied preview group; negative, incomplete, nonnumeric or malformed rows remain invalid.
- This decision does not authorize automatic import application or creation of production records.

### `DEF-PRODUCTION-001` — Production Foundation

The following remain outside UI MVP completion and require a separate program:

- backend services and database persistence;
- production authentication and authorization enforcement;
- atomic multi-session reservation and transaction handling;
- real e-mail, document storage and notification delivery;
- deployment, secrets, monitoring, logging, backup, disaster recovery and operational support;
- security, privacy, retention and compliance controls;
- ERP/WMS/SAP or other enterprise integrations;
- production migration, cutover and service-level objectives.

## Existing section 24 exclusions

All exclusions in Business Decision Pack section 24 remain excluded unless a later Product Authority decision explicitly changes them. This includes advanced optimization/AI planning, penalties, gate hardware integration, OCR/LPR/QR, SMS, native mobile application, geofencing/ETA/yard map, Supplier priority, independent Carrier/Broker role and preferred-slot waitlist.

## Decision effect

For `UI-MVP-PRODUCT-REVIEW-2`:

- implemented mandatory behavior is assessed `PASS`;
- capabilities listed in this addendum may be assessed `DEFERRED` and do not block UI MVP closure;
- section 24 capabilities remain `EXCLUDED`;
- any unlisted missing mandatory behavior remains a `GAP` and blocks closure;
- the review must retain a separate Production Foundation boundary and may not describe the application as production-ready.
