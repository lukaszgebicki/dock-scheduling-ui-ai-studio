# UI MVP traceability

## Authority

- Canonical product source: `UI_MVP_BUSINESS_DECISION_PACK_v0.2.md`.
- Source version: 0.2.
- Status: `APPROVED`.
- Approved by: Łukasz Gębicki.
- Approval date: 2026-07-28.
- Every source marker `REKOMENDACJA DO ZATWIERDZENIA` is interpreted as approved.
- Section 24 remains excluded from UI MVP unless superseded by a later accepted decision.

Codex may implement only the BDP identifiers, numbered subsections, and AC identifiers
explicitly named in an active task contract. A reference in this matrix is planning
traceability, not implementation authorization.

## Requirement-to-task matrix

| Requirement | Approved subject | Current repository fit | Planned task | Primary evidence |
| --- | --- | --- | --- | --- |
| BDP-CFG-001 | Three configuration levels | Partial administration routes; no unified configurable demo model | UI-MVP-FOUNDATION-1, UI-MVP-ADMIN-CONFIG-1 | Role-scoped configuration tests and configuration-impact tests |
| BDP-RBAC-001 | Six UI MVP roles and scopes | Users/access overview exists; no complete six-role runtime context | UI-MVP-FOUNDATION-1 | Navigation, action visibility, warehouse-scope and supplier-scope tests |
| BDP-BOOK-001 | Five-step appointment wizard | No complete supplier booking flow | UI-MVP-BOOKING-1 | Wizard order, validation, draft, summary and success tests |
| BDP-CAL-001 | Day/week/list/workflow/flow calendar views | Appointment list exists; calendar is disabled `Soon` navigation | UI-MVP-CALENDAR-CAPACITY-1 | Availability, privacy, alternate-slot and view-switch tests |
| BDP-CAP-001 | Hybrid and composite slot capacity | No shared capacity engine in demo state | UI-MVP-CALENDAR-CAPACITY-1 | Duration, concurrent-vehicle, composite-limit and override tests |
| BDP-BLOCK-001 | Warehouse, zone, dock and capacity blocks | Warehouse overview exists; no calendar-block consequences | UI-MVP-ADMIN-CONFIG-1, UI-MVP-CALENDAR-CAPACITY-1 | New-booking block and existing-conflict tests |
| BDP-STAT-001 | Planning, change and operational status categories | Appointment overview has simplified demo statuses | UI-MVP-LIFECYCLE-1 | Main-status and independent-flag tests |
| BDP-APR-001 | Auto, manual and rule-based approval | No complete approval workflow | UI-MVP-LIFECYCLE-1, UI-MVP-ADMIN-CONFIG-1 | Rule selection, approve, reject, request-data and proposed-slot tests |
| BDP-EDIT-001 | Field edit matrix and reschedule rules | No complete details/reschedule workflow | UI-MVP-LIFECYCLE-1 | Pre/post-confirmation edit and cut-off tests |
| BDP-CAN-001 | Cancellation rules | No complete cancellation workflow | UI-MVP-LIFECYCLE-1 | Reason, cut-off, released-capacity and immutable-history tests |
| BDP-OPS-001 | Gate check-in and operational arrival handling | No Security Officer route or gate flow | UI-MVP-GATE-OPS-1 | Search, check-in, check-out, early/late/no-show and dock tests |
| BDP-LIST-001 | Appointment columns, filters, search and saved views | `/appointments` provides a partial list, filters and empty state | UI-MVP-LIST-DETAILS-1 | Role-specific columns, global search and saved-view tests |
| BDP-DET-001 | Appointment detail hierarchy, history and comments | No complete details route | UI-MVP-LIST-DETAILS-1 | Action hierarchy, inline edit, shared/internal comment and history tests |
| BDP-DASH-001 | Role-specific dashboards and KPI drill-down | Dashboard is disabled `Soon` navigation | UI-MVP-DASH-MOBILE-1 | Role KPI and filtered drill-down tests |
| BDP-WH-001 | Warehouse configuration affects demo calendar | `/warehouses` and `/warehouses/new` exist with local-only behavior | UI-MVP-ADMIN-CONFIG-1 | Working-hours, dock, capacity, form and approval consequence tests |
| BDP-SUP-001 | Supplier profile, assignments and approval mode | Supplier-organization overview and creation preparation exist | UI-MVP-FOUNDATION-1, UI-MVP-ADMIN-CONFIG-1 | Assignment, block and approval-restriction tests |
| BDP-USR-001 | User fields, invitations, roles and assignments | `/users` and `/users/invite` exist | UI-MVP-FOUNDATION-1 | Role, organization, warehouse, invitation and last-admin constraints |
| BDP-NOT-001 | Demo e-mail and in-app notifications | No complete notification center or preference model | UI-MVP-NOTIFICATIONS-STATES-1 | Critical/noncritical preference and event-recipient tests |
| BDP-VAL-001 | Core validations and duplicate warning | Validation exists only in individual current forms | UI-MVP-BOOKING-1, UI-MVP-LIFECYCLE-1, UI-MVP-CALENDAR-CAPACITY-1 | Required-field, compatibility, temporal, duplicate and transition tests |
| BDP-MOB-001 | Mobile scope by role | Current pages are responsive but do not cover approved mobile workflows | UI-MVP-DASH-MOBILE-1 | Supplier list booking, operator agenda and Security phone/tablet tests |

## Acceptance-scenario matrix

| Scenario | Approved outcome | Planned task |
| --- | --- | --- |
| AC-SYS-001 | System Administrator creates a warehouse, assigns a Warehouse Administrator and publishes configuration | UI-MVP-FOUNDATION-1, UI-MVP-ADMIN-CONFIG-1 |
| AC-WAD-001 | Warehouse Administrator creates a dock, schedule and block; demonstrational availability changes | UI-MVP-ADMIN-CONFIG-1, UI-MVP-CALENDAR-CAPACITY-1 |
| AC-WAD-002 | Required Material Delivery fields affect the Supplier form | UI-MVP-ADMIN-CONFIG-1, UI-MVP-BOOKING-1 |
| AC-WAD-003 | ADR uses manual approval while standard delivery uses auto-approval | UI-MVP-ADMIN-CONFIG-1, UI-MVP-LIFECYCLE-1 |
| AC-WOP-001 | Warehouse Operator creates an appointment for a Supplier and assigns a dock | UI-MVP-GATE-OPS-1 |
| AC-WOP-002 | Warehouse Operator moves a visit from EXPECTED through COMPLETED | UI-MVP-GATE-OPS-1, UI-MVP-LIFECYCLE-1 |
| AC-SEC-001 | Security Officer finds an appointment by registration and checks it in | UI-MVP-GATE-OPS-1 |
| AC-SEC-002 | Security Officer records an unannounced visit and sends it for decision | UI-MVP-GATE-OPS-1 |
| AC-SUP-001 | Supplier User creates a standard appointment using only an available slot | UI-MVP-BOOKING-1, UI-MVP-CALENDAR-CAPACITY-1 |
| AC-SUP-002 | Supplier User adds vehicle data after appointment creation | UI-MVP-LIST-DETAILS-1 |
| AC-SUP-003 | Supplier User reschedules before cut-off | UI-MVP-LIFECYCLE-1 |
| AC-SUP-004 | Supplier User requests reschedule after cut-off | UI-MVP-LIFECYCLE-1 |
| AC-SUP-005 | Supplier User cancels and the slot becomes available again | UI-MVP-LIFECYCLE-1, UI-MVP-CALENDAR-CAPACITY-1 |
| AC-CONC-001 | Only one of two users obtains the final capacity; the other receives alternatives | UI-MVP-CALENDAR-CAPACITY-1 |

## Cross-cutting source sections

| Source section | Planning treatment |
| --- | --- |
| 3.7 Supplier–Carrier relationship | Preserve the approved 1:1 model; no independent Carrier/Broker login in UI MVP |
| 4.5 Standing appointments | Include only in a task that explicitly names section 4.5 |
| 6.1 Partial-slot reservation | Required by calendar/capacity task |
| 6.2 Capacity override | Requires reason, consequence preview, history and visual warning |
| 9 Status transition matrix | Canonical transition source; do not infer additional transitions |
| 11–12 Edit, reschedule and cancellation | Implement together with slot revalidation and immutable history |
| 20 Notifications | Demonstrational e-mail status and in-app behavior only; no real send |
| 22 Empty, error and exceptional states | Implement through UI-MVP-NOTIFICATIONS-STATES-1 and feature-specific tasks |
| 23 Mobile | Responsive web only; no native application |
| 24 Excluded scope | Hard exclusion boundary |
| 24.1 Localization | One complete language; localization-ready structure; PL/EN selector may remain demonstrational |
| 25 Screen inventory | Coverage checklist, not permission to implement all screens in one task |
| 26 Acceptance scenarios | End-to-end acceptance authority |
| 27 Definition of Done | Product-level completion checklist |
| 28 Final recommendation | Configuration must create visible downstream consequences in the demo model |

## Exclusion boundary

The following remain outside UI MVP: ERP, WMS and SAP integration; real e-mail;
real attachment storage; advanced dock optimization; charges and penalties;
gate-system integration; OCR and plate recognition; advanced reporting warehouse;
SMS; native mobile app; geofencing; ETA; yard map; AI planning; supplier
prioritization for constrained capacity; an independent multi-supplier
Carrier/Broker role; and waitlisting.

A task that needs any excluded item must stop and obtain a superseding accepted
decision and a separate authorized contract.
