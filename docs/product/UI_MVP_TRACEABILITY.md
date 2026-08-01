# UI MVP traceability

## Authority

- Canonical product source: `UI_MVP_BUSINESS_DECISION_PACK_v0.3.md`.
- Historical evidence: `UI_MVP_BUSINESS_DECISION_PACK_v0.2.md` remains unchanged.
- Source version: 0.3.
- Status: `APPROVED`.
- Approved by: Łukasz Gębicki.
- Approval date: 2026-07-31.
- Every source marker `REKOMENDACJA DO ZATWIERDZENIA` is interpreted as approved.
- Section 24 remains excluded from UI MVP unless superseded by a later accepted decision.
- Weekly-planning sections 29–30 and `BDR-TRN-001` supersede conflicting
  earlier assumptions. Both Supplier transport fields remain mandatory;
  the transport matrix applies only to downstream readiness and
  Administrator-added or imported deliveries.

Codex may implement only the BDP identifiers, numbered subsections, and AC identifiers
explicitly named in an active task contract. A reference in this matrix is planning
traceability, not implementation authorization.

## Requirement-to-task matrix

| Requirement | Approved subject | Current repository fit | Planned task | Primary evidence |
| --- | --- | --- | --- | --- |
| BDP-CFG-001 | Three configuration levels, including controlled transport and routing rules | Typed local warehouse/Supplier rule configuration exists after PR #42; transport/routing consumers remain absent | UI-MVP-FOUNDATION-1, UI-MVP-ADMIN-CONFIG-1, UI-MVP-FLOW-ROUTING-1, UI-MVP-TRANSPORT-RULES-1 | Role-scoped configuration, routing and downstream-impact tests |
| BDP-RBAC-001 | Six UI MVP roles with optional scoped workflow participation | Six-role typed demo context, route access and data scope exist; capability routing is absent | UI-MVP-FOUNDATION-1, UI-MVP-FLOW-ROUTING-1 | Navigation, action visibility, capability, warehouse-scope and supplier-scope tests |
| BDP-BOOK-001 | Five-step appointment wizard outside weekly planning when separately contracted | No complete supplier booking flow | UI-MVP-BOOKING-1 | Non-weekly wizard order, validation, draft, summary and success tests |
| BDP-CAL-001 | Day/week/list/workflow/flow calendar views extended by PO aggregation | Appointment list exists; calendar is disabled `Soon` navigation | UI-MVP-CALENDAR-CAPACITY-1 | Availability, privacy, PO aggregation, product drill-down and view-switch tests |
| BDP-CAP-001 | Hybrid/composite capacity with post-enrichment revalidation | No shared capacity engine in demo state | UI-MVP-CALENDAR-CAPACITY-1, UI-MVP-WEEKLY-PLANNING-1 | Duration, composite limit, enrichment conflict, unmatched-no-capacity and override tests |
| BDP-BLOCK-001 | Warehouse, zone, dock and capacity blocks | Typed reasoned block configuration and conflict projection exist; no calendar UI consumer | UI-MVP-ADMIN-CONFIG-1, UI-MVP-CALENDAR-CAPACITY-1 | New-booking block and existing-conflict tests |
| BDP-STAT-001 | Planning, change and operational status categories | Appointment overview has simplified demo statuses | UI-MVP-LIFECYCLE-1 | Main-status and independent-flag tests |
| BDP-APR-001 | Auto, manual and rule-based approval with explicit missing-actor routing | Typed approval configuration exists; no complete approval workflow or capability routing | UI-MVP-FLOW-ROUTING-1, UI-MVP-LIFECYCLE-1, UI-MVP-ADMIN-CONFIG-1 | Rule selection, delegation/block, approve, reject, request-data and proposed-slot tests |
| BDP-EDIT-001 | Field edit matrix and reschedule rules | No complete details/reschedule workflow | UI-MVP-LIFECYCLE-1 | Pre/post-confirmation edit and cut-off tests |
| BDP-CAN-001 | Cancellation rules | No complete cancellation workflow | UI-MVP-LIFECYCLE-1 | Reason, cut-off, released-capacity and immutable-history tests |
| BDP-OPS-001 | Gate arrival handling with capability fallback or block | No Security Officer route, gate flow or capability routing | UI-MVP-FLOW-ROUTING-1, UI-MVP-GATE-OPS-1 | Search, scoped delegation, check-in/out, no-show and dock tests |
| BDP-LIST-001 | Appointment list plus planning status, booking origin and product-derived filters | `/appointments` provides a partial list, filters and empty state | UI-MVP-LIST-DETAILS-1 | Role columns, planning filters, global search and saved-view tests |
| BDP-DET-001 | Detail hierarchy with Supplier-safe SKU contents and internal import diagnostics | No complete details route | UI-MVP-LIST-DETAILS-1 | Product detail, visibility, controlled edit, comment and history tests |
| BDP-DASH-001 | Role-specific dashboards and KPI drill-down | Dashboard is disabled `Soon` navigation | UI-MVP-DASH-MOBILE-1 | Role KPI and filtered drill-down tests |
| BDP-WH-001 | Warehouse configuration affects demo calendar | Working hours, docks, capacity and local configuration routes exist after PR #42; calendar UI remains absent | UI-MVP-ADMIN-CONFIG-1 | Working-hours, dock, capacity, form and approval consequence tests |
| BDP-SUP-001 | Supplier profile, assignments and approval mode | Scoped Supplier configuration, assignments, restrictions and approval settings exist | UI-MVP-FOUNDATION-1, UI-MVP-ADMIN-CONFIG-1 | Assignment, block and approval-restriction tests |
| BDP-USR-001 | User fields, invitations, roles and assignments | Typed users, six roles, stable assignments and scoped UI routes exist | UI-MVP-FOUNDATION-1 | Role, organization, warehouse, invitation and last-admin constraints |
| BDP-NOT-001 | Demo e-mail and in-app notifications | No complete notification center or preference model | UI-MVP-NOTIFICATIONS-STATES-1 | Critical/noncritical preference and event-recipient tests |
| BDP-VAL-001 | Core, import, matching, transport-rule and routing validations | Validation exists only in individual current forms and configuration contracts | UI-MVP-FLOW-ROUTING-1, UI-MVP-TRANSPORT-RULES-1, UI-MVP-BOOKING-1, UI-MVP-ADMIN-IMPORT-1, UI-MVP-WEEKLY-PLANNING-1, UI-MVP-LIFECYCLE-1, UI-MVP-CALENDAR-CAPACITY-1 | Required-field, exact-match, missing-rule, scope, duplicate and transition tests |
| BDP-MOB-001 | Mobile scope by role | Current pages are responsive but do not cover approved mobile workflows | UI-MVP-DASH-MOBILE-1 | Supplier list booking, operator agenda and Security phone/tablet tests |
| BDP-WPL-001 | Week W reservation for W+1 followed by Friday enrichment without silent slot movement | No weekly-planning model | UI-MVP-BOOKING-1, UI-MVP-ADMIN-IMPORT-1, UI-MVP-WEEKLY-PLANNING-1 | End-to-end cadence, enrichment, unmatched queue and unchanged-slot tests |
| BDP-BOOK-002 | Restricted one-Supplier, warehouse, week, PO and slot reservation with both transport fields | No weekly Supplier booking flow | UI-MVP-BOOKING-1 | One-PO scope, fixed delivery part and mandatory transport tests |
| BDP-IMP-001 | Authorized Friday administrative import | No import workflow | UI-MVP-ADMIN-IMPORT-1 | Role scope, result classification and no-persistence tests |
| BDP-DATA-001 | PO header with zero-to-many SKU lines and explicit booking origin | Existing appointment fixtures have no canonical PO/SKU planning model | UI-MVP-BOOKING-1, UI-MVP-CALENDAR-CAPACITY-1, UI-MVP-ADMIN-IMPORT-1, UI-MVP-WEEKLY-PLANNING-1, UI-MVP-LIST-DETAILS-1 | PO/SKU shape, derived aggregate, origin and no-split tests |
| BDP-MATCH-001 | Exact/no/ambiguous matching and planning status independent of lifecycle | No matching or planning statuses | UI-MVP-ADMIN-IMPORT-1, UI-MVP-WEEKLY-PLANNING-1 | Exact-key, ambiguous, duplicate, unmatched, conflict and lifecycle-separation tests |
| BDP-TRN-001 | Mandatory Supplier transport fields and downstream validation matrix | Existing configuration does not encode the approved boundary | UI-MVP-TRANSPORT-RULES-1, UI-MVP-BOOKING-1 | Required Supplier fields, four downstream combinations and reconciliation tests |
| BDP-CAL-002 | PO-aware weekly calendar and accessible delivery-content action | Calendar remains disabled `Soon` navigation | UI-MVP-CALENDAR-CAPACITY-1, UI-MVP-LIST-DETAILS-1 | One-card aggregation, role-safe content, mouse/keyboard/touch action and no-silent-move tests |
| BDP-REP-001 | Weekly all-delivery and monthly Slipsheet reporting with PO/SKU dates | No reporting route | UI-MVP-REPORTING-1 | Report coverage, filters, role scope and local CSV/XLSX tests |
| BDP-FLOW-001 | Capability routing with RUN, SKIP, DELEGATE and BLOCK | Six roles exist; capability workflow participation is not modeled | UI-MVP-FLOW-ROUTING-1 | Capability, optional-role, delegation, block and audit tests |

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
| AC-SUP-001 | Supplier User creates a non-weekly standard appointment using only an available slot | UI-MVP-BOOKING-1, UI-MVP-CALENDAR-CAPACITY-1 |
| AC-SUP-002 | Supplier User adds allowed vehicle data after a non-weekly appointment is created | UI-MVP-LIST-DETAILS-1 |
| AC-SUP-003 | Supplier User reschedules before cut-off | UI-MVP-LIFECYCLE-1 |
| AC-SUP-004 | Supplier User requests reschedule after cut-off | UI-MVP-LIFECYCLE-1 |
| AC-SUP-005 | Supplier User cancels and the slot becomes available again | UI-MVP-LIFECYCLE-1, UI-MVP-CALENDAR-CAPACITY-1 |
| AC-CONC-001 | Only one of two users obtains the final capacity; the other receives alternatives | UI-MVP-CALENDAR-CAPACITY-1 |
| AC-SUP-006 | Supplier reserves one W+1 slot for one PO without SKU lines and supplies both transport values | UI-MVP-BOOKING-1 |
| AC-SUP-007 | Missing either Supplier transport value blocks completion regardless of downstream matrix | UI-MVP-TRANSPORT-RULES-1, UI-MVP-BOOKING-1 |
| AC-SUP-008 | Supplier cannot import or edit imported product details or see diagnostics | UI-MVP-BOOKING-1, UI-MVP-LIST-DETAILS-1, UI-MVP-ADMIN-IMPORT-1 |
| AC-FLOW-001 | Missing Supplier booking actor produces SKIP and enables the Admin queue path | UI-MVP-FLOW-ROUTING-1 |
| AC-FLOW-002 | Present scoped Supplier booking actor produces RUN | UI-MVP-FLOW-ROUTING-1 |
| AC-FLOW-003 | Missing warehouse importer delegates to an authorized System Administrator | UI-MVP-FLOW-ROUTING-1, UI-MVP-ADMIN-IMPORT-1 |
| AC-FLOW-004 | Missing primary and fallback importer produces BLOCK | UI-MVP-FLOW-ROUTING-1, UI-MVP-ADMIN-IMPORT-1 |
| AC-FLOW-005 | Missing approver blocks and never causes silent auto-approval | UI-MVP-FLOW-ROUTING-1, UI-MVP-LIFECYCLE-1 |
| AC-FLOW-006 | Gate check-in delegates only within warehouse scope | UI-MVP-FLOW-ROUTING-1, UI-MVP-GATE-OPS-1 |
| AC-FLOW-007 | Navigation, actions and direct routes use one routing decision | UI-MVP-FLOW-ROUTING-1 |
| AC-ADM-001 | Local import preview groups SKU lines, preserves precision and waits for explicit apply | UI-MVP-ADMIN-IMPORT-1 |
| AC-ADM-002 | Exact Friday match enriches SKU detail while preserving slot and lineage | UI-MVP-ADMIN-IMPORT-1, UI-MVP-WEEKLY-PLANNING-1 |
| AC-ADM-003 | Import transport differences warn and never silently overwrite Supplier values | UI-MVP-ADMIN-IMPORT-1, UI-MVP-TRANSPORT-RULES-1 |
| AC-ADM-004 | Unmatched delivery enters an unscheduled queue without fabricated capacity | UI-MVP-ADMIN-IMPORT-1, UI-MVP-WEEKLY-PLANNING-1 |
| AC-ADM-005 | Authorized Administrator creates an ADMIN_ADDED appointment in a compatible free slot | UI-MVP-WEEKLY-PLANNING-1 |
| AC-ADM-006 | Ambiguous match blocks attachment until explicit Administrator resolution | UI-MVP-ADMIN-IMPORT-1, UI-MVP-WEEKLY-PLANNING-1 |
| AC-ADM-007 | Enrichment conflict preserves slot and requires safe, audited resolution | UI-MVP-ADMIN-IMPORT-1, UI-MVP-WEEKLY-PLANNING-1 |
| AC-ADM-008 | Duplicate or changed re-import never doubles quantities and requires explicit replacement | UI-MVP-ADMIN-IMPORT-1 |
| AC-ADM-009 | Warehouse Administrator applies only groups inside assigned warehouse scope | UI-MVP-ADMIN-IMPORT-1 |
| AC-TRN-001 | Four matrix combinations govern downstream/Admin records, not Supplier field presence | UI-MVP-TRANSPORT-RULES-1 |
| AC-TRN-002 | Multi-SKU downstream requirement uses logical OR with source traceability | UI-MVP-TRANSPORT-RULES-1 |
| AC-TRN-003 | Missing downstream rule blocks READY without assuming identifiers are unnecessary | UI-MVP-TRANSPORT-RULES-1 |
| AC-CAL-002 | Multiple SKU lines aggregate into one PO card and correct totals | UI-MVP-CALENDAR-CAPACITY-1 |
| AC-CAL-003 | Exact Polish delivery-content action works by mouse, keyboard and touch with role-safe detail | UI-MVP-CALENDAR-CAPACITY-1 |
| AC-CAL-004 | Appointment without SKU shows Awaiting SKU details without fabricated zero quantities | UI-MVP-CALENDAR-CAPACITY-1 |
| AC-REP-001 | Weekly report includes all deliveries, planned dates and permitted PO/SKU data | UI-MVP-REPORTING-1 |
| AC-REP-002 | Monthly Slipsheet preserves dates, PO and SKU detail | UI-MVP-REPORTING-1 |
| AC-REP-003 | Multi-line appointments count once while units and pallets sum once per line | UI-MVP-REPORTING-1 |
| AC-REP-004 | Local CSV/XLSX preserves active query, columns, order and role scope | UI-MVP-REPORTING-1 |

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
| 29 Weekly planning | Canonical cadence, booking, import, data, matching, transport, calendar, reporting and routing authority |
| 29.10 Controlled sequence | Dependency order only; never implementation permission |
| 30 Weekly-planning acceptance scenarios | End-to-end acceptance authority for the new model |

## Exclusion boundary

The following remain outside UI MVP: ERP, WMS and SAP integration; real e-mail;
real attachment storage; advanced dock optimization; charges and penalties;
gate-system integration; OCR and plate recognition; advanced reporting warehouse;
SMS; native mobile app; geofencing; ETA; yard map; AI planning; supplier
prioritization for constrained capacity; an independent multi-supplier
Carrier/Broker role; and waitlisting.

A task that needs any excluded item must stop and obtain a superseding accepted
decision and a separate authorized contract.
