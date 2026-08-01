# UI MVP implementation plan

## Authority and execution boundary

This plan sequences the approved Business Decision Pack UI MVP v0.3 into
controlled repository tasks. It does not authorize implementation by itself.

- Business Owner: Łukasz Gębicki.
- Approval date: 2026-07-31.
- Product source: `../product/UI_MVP_BUSINESS_DECISION_PACK_v0.3.md`.
- Historical source: `../product/UI_MVP_BUSINESS_DECISION_PACK_v0.2.md` remains
  unchanged evidence and is not the current authority.
- Traceability source: `../product/UI_MVP_TRACEABILITY.md`.
- Repository: `lukaszgebicki/dock-scheduling-ui-ai-studio`.
- Repository type: frontend-only UI sandbox with demonstrational local state.
- Production repository access remains prohibited.
- Every task requires its own `READY` roadmap state, exact-SHA machine-readable
  contract, external worktree, Builder, separate read-only Reviewer, validation,
  pull request and human merge.
- Only one implementation task may be active at a time.
- No task may imply backend persistence, real integrations or durable effects.

## Delivery principles

1. Reuse repository patterns before introducing new architecture.
2. Establish one typed demo-domain source before multiplying feature fixtures.
3. Deliver vertical, demonstrable consequences rather than disconnected screens.
4. Keep role and organization data boundaries explicit in every task.
5. Build capacity, status and approval behavior as constrained domain rules,
   not arbitrary no-code workflow.
6. Include focused behavior tests and complete repository validation.
7. Stop on any conflict between the approved BDP, current repository behavior
   and an active contract.
8. Preserve all section 24 exclusions.
9. Treat weekly-planning sections 29–30 and `BDR-TRN-001` as controlling any
   conflicting earlier booking or transport assumption.

## Controlled sequence

The following dependency order is canonical after Business Decision Pack v0.3.
Only the first item may become the next implementation candidate, and even that
requires a separate activation, `READY` state and exact-SHA task contract.
Completing or planning one item does not activate the next.

### 1. UI-MVP-FLOW-ROUTING-1 — capability and optional-role routing

Define the approved capabilities and deterministic `RUN`, `SKIP`, `DELEGATE`
and `BLOCK` outcomes for the six existing global role types. A missing Supplier
must use `SKIP`, never a placeholder; a missing mandatory actor must produce an
authorized delegation or block. This foundation must not add roles, lifecycle
transitions, data access or persistence.

**Coverage:** BDP-FLOW-001 and AC-FLOW-001–007.

### 2. UI-MVP-TRANSPORT-RULES-1 — transport contract and readiness

Model both Supplier reservation fields as unconditionally required and keep the
`warehouse + loadCarrierType + goodsCategory` matrix limited to downstream
readiness and Administrator-added or imported deliveries. Administrator changes
and import reconciliation must be explicit and auditable.

**Coverage:** BDP-TRN-001 and AC-TRN-001–003.

### 3. Revised UI-MVP-BOOKING-1 — restricted Supplier reservation

Implement the W-to-W+1 flow for one Supplier, warehouse, week, PO and slot,
fixed `deliveryPartKey` `"1"`, no SKU entry and no split UI. The two transport
fields are required before completion. The five-step BDP-BOOK-001 flow remains
outside weekly planning unless separately contracted.

**Coverage:** BDP-BOOK-002, relevant BDP-WPL-001, AC-SUP-006–008 and the
booking-facing transport rules.

### 4. Extended UI-MVP-CALENDAR-CAPACITY-1 — PO planning calendar

Extend approved capacity behavior with role-safe PO cards, planning state and
the exact keyboard-accessible action `Pokaż zawartość dostawy`. No import may
silently move a slot.

**Coverage:** BDP-CAL-001, BDP-CAL-002, AC-CAL-002–004 and applicable existing
capacity scenarios.

### 5. UI-MVP-ADMIN-IMPORT-1 — Friday delivery-details import

Provide local demonstrational import only for System Administrator and assigned
Warehouse Administrator scope. Classify accepted, rejected, unmatched and
conflicting rows; do not imply persistence or ERP/WMS/SAP integration.

**Coverage:** BDP-IMP-001, AC-ADM-001–004 and AC-ADM-006–009.

### 6. UI-MVP-WEEKLY-PLANNING-1 — exact enrichment and planning queue

Join exact matching, PO headers with zero-to-many SKU lines, explicit booking
origins, planning statuses, unmatched scheduling and Administrator conflict
resolution. Planning status must remain independent of appointment lifecycle.

**Coverage:** BDP-WPL-001, BDP-DATA-001, BDP-MATCH-001, AC-ADM-002,
AC-ADM-004–007 and the integrated Supplier/calendar scenarios.

### 7. Lifecycle and gate routing consumers

Revise `UI-MVP-LIFECYCLE-1` and `UI-MVP-GATE-OPS-1` only through separately
contracted consumer tasks. They consume capabilities and planning readiness but
may not infer new transitions or let readiness authorize execution.

### 8. Extended UI-MVP-LIST-DETAILS-1 — planning-aware details

Expose approved PO/SKU, origin, planning state, transport reconciliation and
audit information through role-scoped list/detail patterns. Slot-affecting and
transport changes remain controlled actions.

### 9. UI-MVP-REPORTING-1 — PO/SKU reports and local exports

Deliver the weekly all-delivery report, monthly Slipsheet and role-scoped local
CSV/XLSX exports with planned dates and PO/SKU data.

**Coverage:** BDP-REP-001 and AC-REP-001–004.

### 10. Remaining notification, dashboard and standing work

Only after the earlier dependencies are stable may separately contracted tasks
complete notification/exception states, dashboards/mobile and standing
appointments. Section 24 exclusions remain unchanged.

## Historical pre-v0.3 task descriptions

The entries below preserve the earlier task detail as planning history. Where
they conflict with the numbered sequence above, Business Decision Pack v0.3 and
the numbered sequence control. Already merged tasks remain historical facts;
unmerged task descriptions are not active and do not grant implementation
permission.

### UI-MVP-FOUNDATION-1 — role and demo-domain foundation

**Objective**

Create the minimum shared UI-only foundation required by later role-specific
work: six approved roles, active demonstration identity/context, role-aware
navigation, stable organization/warehouse assignments and typed shared
demo-domain records.

**Approved coverage**

- BDP-CFG-001
- BDP-RBAC-001
- BDP-SUP-001
- BDP-USR-001
- sections 3.1–3.7, 17.3, 18 and 19
- AC-SYS-001 foundation only

**Repository fit**

Reuse `AuthenticatedShell`, existing demo authentication, `/users`,
`/warehouses`, `/supplier-organizations`, and `demoAccessScope.ts`.
Resolve shared-domain duplication only where the task proves it is directly
required; do not perform unrelated normalization.

**Risk estimate**

Class B because the work affects shared shell, routing and shared demo-domain
data. No authentication security, backend authorization or persistence change.

**Exit gate**

Every role sees only approved routes, data scope and actions in focused tests.
The demo identity selector, if used, is visibly demonstrational and cannot imply
real authentication or authorization.

---

### UI-MVP-ADMIN-CONFIG-1 — warehouse and rule configuration

**Objective**

Extend current warehouse and supplier administration into a coherent
demonstrational configuration model whose changes affect later booking and
calendar behavior.

**Approved coverage**

- BDP-CFG-001 levels 1–3
- BDP-BLOCK-001
- BDP-WH-001
- BDP-SUP-001
- relevant BDP-USR-001 assignments
- approval configuration from BDP-APR-001
- AC-SYS-001
- AC-WAD-001
- AC-WAD-002
- AC-WAD-003

**Minimum demonstrational consequences**

Working hours, active docks, flow availability, capacity, required form fields,
approval mode, cut-off and supplier assignment must be represented in typed
local state and consumed by later features. Exceptions require a reason and
history entry.

**Risk estimate**

Class B because shared schemas and cross-route demo-domain behavior are affected.

**Exit gate**

Configuration changes are proven through focused consumers or contract fixtures;
they are not isolated form-success mockups.

---

### UI-MVP-BOOKING-1 — Supplier appointment creation

**Objective**

Implement the five-step Supplier booking workflow with local draft and success
states, using approved configuration and slot data.

**Approved coverage**

- BDP-BOOK-001
- sections 4.1–4.4
- BDP-VAL-001 booking validations
- Supplier-specific parts of BDP-MOB-001
- AC-SUP-001
- AC-SUP-002 where vehicle data is supplied during creation

**Explicitly deferred**

Standing appointments in section 4.5 require a separately named task or an
explicit extension of this contract. Calendar internals, operational status,
real document storage and real notifications remain outside this task.

**Risk estimate**

Class A when implemented as a focused route using established patterns. Escalate
to Class B only if shared routing or shared domain schemas materially expand.

**Exit gate**

The wizard order is exact, data affecting duration/compatibility precedes slot
selection, draft reserves no capacity, Supplier cannot choose duration directly,
and success clearly states that the sandbox did not persist or send data.

---

### UI-MVP-CALENDAR-CAPACITY-1 — availability, blocks and concurrency

**Objective**

Implement the shared UI-only slot availability model and approved calendar
presentations, including exact duration reservation, composite capacity,
privacy-safe Supplier availability, internal diagnostics, blocks, override and
last-capacity conflict handling.

**Approved coverage**

- BDP-CAL-001
- BDP-CAP-001
- BDP-BLOCK-001 calendar consequences
- sections 5.1–7.3
- applicable BDP-VAL-001 rules
- AC-WAD-001
- AC-SUP-001
- AC-SUP-005 capacity release
- AC-CONC-001

**Risk estimate**

Class B due to shared domain rules and multiple consumers.

**Exit gate**

The first active composite limit closes a slot, duration occupies exact
15-minute units where configured, Supplier data privacy is preserved, blocked
capacity rejects new bookings, override is visibly audited, and deterministic
demo concurrency allows only one final booking.

---

### UI-MVP-LIFECYCLE-1 — approval, status, reschedule and cancellation

**Objective**

Implement the approved appointment lifecycle as constrained UI-only domain
transitions with clear actions, validation, reason capture and immutable history.

**Approved coverage**

- BDP-STAT-001
- section 9 transition matrices and capacity effects
- BDP-APR-001
- BDP-EDIT-001
- BDP-CAN-001
- relevant BDP-VAL-001 transition rules
- AC-WAD-003
- AC-WOP-002 lifecycle transitions
- AC-SUP-003
- AC-SUP-004
- AC-SUP-005

**Risk estimate**

Class B due to shared domain behavior and state transitions.

**Exit gate**

No transition outside section 9 is possible, rollback uses the dedicated
correction flow and reason, reschedule preserves old capacity until the new slot
is accepted, cancellation releases capacity and remains visible, and all
material changes preserve before/after history.

---

### UI-MVP-LIST-DETAILS-1 — list, details, history and comments

**Objective**

Expand the current appointments overview into approved role-specific list and
detail experiences with saved-view demonstration, global search, action
hierarchy, inline safe edits, shared comments, internal notes and visible
history.

**Approved coverage**

- BDP-LIST-001
- BDP-DET-001
- section 11 field-edit rules as consumed by details
- AC-SUP-002
- operator and administrator list/detail portions of screen inventory

**Risk estimate**

Class A if focused on appointments routes and established shared primitives.

**Exit gate**

Columns and actions vary by role, global search covers approved identifiers,
saved views are clearly local/demo, slot-affecting edits use controlled
revalidation, Supplier never sees internal notes or technical audit data, and
comment visibility is explicit before submission.

---

### UI-MVP-GATE-OPS-1 — operator and Security workflows

**Objective**

Implement Warehouse Operator operational progression and Security Officer
gate workflows for search, check-in, check-out, unannounced visits, arrival
classification, dock assignment and confirmed no-show.

**Approved coverage**

- BDP-OPS-001
- sections 13.1–13.5
- operational transitions from section 9.2
- relevant BDP-MOB-001 scope
- AC-WOP-001
- AC-WOP-002
- AC-SEC-001
- AC-SEC-002

**Risk estimate**

Class B because multiple roles consume and mutate shared appointment demo state.

**Exit gate**

Security sees only the approved limited horizon and fields, unannounced visits
enter a decision workflow, no-show requires human confirmation, dock changes are
audited, and check-out cannot precede check-in.

---

### UI-MVP-NOTIFICATIONS-STATES-1 — notifications and exceptional states

**Objective**

Add demonstrational in-app and e-mail-status notifications plus reusable empty,
error, stale, conflict, permission and connection states with actionable next
steps.

**Approved coverage**

- BDP-NOT-001
- section 22
- feature-specific exceptional states required by earlier tasks

**Risk estimate**

Class A for focused UI primitives and local state; Class B if shared domain
event architecture changes.

**Exit gate**

No real e-mail is sent, critical notifications cannot be disabled, noncritical
frequency is demonstrational, every exceptional state presents a safe next
action, and stale/conflict states never fabricate successful persistence.

---

### UI-MVP-DASH-MOBILE-1 — dashboards and responsive completion

**Objective**

Enable role-specific dashboards, KPI drill-down and the approved responsive-web
coverage for Supplier, Warehouse Operator, Security Officer and basic Warehouse
Administrator actions.

**Approved coverage**

- BDP-DASH-001
- BDP-MOB-001
- sections 16, 23 and 23.1–23.2
- final responsive coverage of section 25 screen inventory

**Risk estimate**

Class A when composed from existing feature data and routes; Class B if shared
shell/navigation changes are required.

**Exit gate**

Every KPI links to a correctly filtered list, Supplier uses mobile day/time
lists rather than a compressed desktop grid, Operator uses an agenda,
Security workflows work on phone/tablet, and no native-app, QR, OCR or plate
recognition behavior is introduced.

---

### UI-MVP-STANDING-1 — standing appointments

**Objective**

Implement section 4.5 only after the single-appointment model, capacity,
approval and lifecycle tasks are stable.

**Approved coverage**

- section 4.5
- related calendar, capacity, approval and notification behavior

**Risk estimate**

Class B because series and occurrence behavior spans multiple shared domains.

**Exit gate**

Each occurrence is independently validated, one occurrence can change without
mutating the whole series, authorized actors can pause/end the series, and
expired unconfirmed occurrences release capacity.

## Product-level completion review

After all required implementation tasks are human-merged, create a dedicated
read-only/product-review task that evaluates:

- all 29 BDP identifiers;
- all 43 AC scenarios;
- section 22 exceptional states;
- section 23 mobile coverage;
- section 24 exclusions;
- section 25 screen inventory;
- section 27 Definition of Done;
- section 28 downstream configuration consequences.
- sections 29–30 weekly-planning decisions and scenarios;
- `BDR-TRN-001` conflict resolution and the controlled dependency sequence.

This review may identify gaps but may not silently add implementation scope.
Every repair requires a separate contracted task.
