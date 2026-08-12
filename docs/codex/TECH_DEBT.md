# Technical debt

## SPR-SEC-1 — React Router runtime advisories

- Status: `RESOLVED`.
- Prior UI-repository condition: React Router 6 runtime advisories were removed
  by migration to the supported 7.x line.
- Current governance-repository runtime audit remained clean at the latest
  dependency remediation gate.

## DEMO-DATA-001 — legacy demo user access duplication

- Status: `OPEN`.
- Current evidence: `src/users/demoAccessScope.ts` centralizes typed stable
  warehouse IDs, Supplier-organization IDs and organization-to-warehouse
  mappings for newer access-scope/admin flows.
- Remaining debt: `src/users/demoUsers.ts` still duplicates organization labels,
  warehouse labels and Supplier-access presentation data.
- Boundary: this is demonstrational UI normalization debt and is not a
  production authorization issue.
- Proposed follow-up: dedicated future normalization only if continued work in
  the UI sandbox justifies it.

## DEV-SEC-001 — development toolchain audit findings

- Status: `RESOLVED`.
- Resolution: PR #21 upgraded the approved development graph and restored clean
  full/runtime audits without dependency overrides or audit suppression.

## DEV-SEC-002 — renewed development dependency audit findings

- Status: `RESOLVED` through issue #150 and squash-merged PR #151 at
  `27f15b6fed81e59e4ea8b38b1a99267c6c48b3c8`.
- Resolution: lockfile-only remediation moved `postcss 8.5.21 -> 8.5.26` and
  `nanoid 3.3.16 -> 3.3.18`.
- Full and runtime audits were clean; no manifest, source, workflow or
  production-behavior change was used.

## PROD-BASELINE-CI-UNBLOCK-1 — production baseline blockers

- Status: `RESOLVED` through production PR #61 at
  `5c60fa0b960d83b56a8cf17cc061510f8a2ed744`.
- Resolution: the Nano ID HIGH blocker and deterministic invitation-expiry
  fixture failure were repaired without weakening auth/session semantics.

## PROD-SEC-REACT-ROUTER-MIGRATION-1 — production React Router advisories

- Status: `RESOLVED` through production issue #57 / PR #62 at
  `f0d98f3cb97e8b2f1fa072c1eb49301f62e7dab6`.
- Resolution: production web migrated from `react-router-dom 6.30.4` to
  `react-router-dom 7.18.2` / `react-router 7.18.2`.
- Final migration evidence: exact-head CI passed and both dependency audits
  reported 0 vulnerabilities.
- No advisory suppression, backend authorization change or unrelated dependency
  migration was used.
- This item must no longer be represented as `PLANNED / SECURITY NEXT`.

## PROD-ROLE-DIVERGENCE-001 — UI demo Operator booking vs production role model

- Status: `GOVERNANCE RESOLVED / HISTORICAL DIVERGENCE`.
- Historical UI MVP included `UI-MVP-OPERATOR-MANUAL-BOOKING-1`, where the demo
  Operator could create on behalf of Supplier.
- Product Authority subsequently defined the production rule:
  - business Warehouse Manager = existing `WAREHOUSE_ADMINISTRATOR`;
  - `WAREHOUSE_OPERATOR` is read + `START_UNLOADING` + `COMPLETE_UNLOADING`
    only;
  - Operator cannot create bookings, approve/reject/request information,
    reschedule/cancel or mutate booking configuration;
  - assisted booking is a Warehouse Administrator/System Administrator
    capability.
- Direction: production implementation and this Product Authority decision are
  controlling. The old UI demo remains historical evidence only and must not be
  reused as authorization policy.

## PROD-CAPACITY-SEMANTICS-001 — appointment-count vs pallet capacity

- Status: `RESOLVED` through `PROD-BOOKING-CONFIG-ADMIN-1`, issue #63 / PR #64
  at `5e3533f36e54f2430257b08dbf6be76930def9d5`.
- Production capacity is now explicitly measured in pallets.
- Slot capacity is configurable from 1 to 33 pallets with a hard system ceiling
  of 33.
- Reservation/release lineage and counters were migrated to pallet units with
  fail-closed upgrade tests and no historical appointment rewrite.

## PROD-NOTIFICATIONS-DELIVERY-001 — outbox without production delivery

- Status: `RESOLVED AT APPLICATION LAYER` through issue #71 / PR #72 at
  `d3824404113052c33b9feddf37a30aa4daa9d9b4`.
- Delivered:
  - post-cutover notification projection without historical flood;
  - authenticated in-app notifications;
  - provider-neutral SMTP transport;
  - send-time recipient authorization revalidation;
  - bounded leasing/retry/dead-letter/crash recovery;
  - System Administrator delivery operations;
  - deterministic Message-ID and explicit at-least-once external semantics.
- Remaining boundary is operational/release work, not missing application
  pipeline: real SMTP credentials/provider configuration and production
  deployment remain separately governed.

## PROD-SECURITY-HARDENING-001 — final multi-instance abuse protection

- Status: `OPEN / P5`.
- Existing application security and endpoint authorization are strong, but
  final production hardening still requires a production-scale threat-model
  refresh, multi-instance rate/abuse protection, privileged-access review and
  independent security evidence before release.
- Do not solve this with per-process limits presented as distributed
  enforcement.

## PROD-DEPLOYMENT-DR-001 — environment promotion and recovery evidence

- Status: `OPEN`.
- Application CI, migrations and local/integration reliability evidence do not
  establish production environment readiness.
- Remaining work includes controlled deployment/promotion/rollback, managed
  database backup/PITR, restore rehearsal, measured RPO/RTO and operational
  ownership.

## PROD-P4-OPEN-001 — remaining planning/content/reporting services

- Status: `OPEN / NOT ACTIVATED`.
- Notifications are now delivered at application level, but production still
  lacks the remaining P4 capabilities:
  - secure files/attachments/object-storage lifecycle;
  - durable weekly planning/import and reconciliation;
  - scoped production reporting/KPI/export services.
- Recommended next product candidate is `PROD-FILES-1`, subject to a separate
  exact-SHA Product Authority contract.

## Current security posture note

At the final `PROD-NOTIFICATIONS-1` gate, production `npm audit` and
`npm audit --omit=dev` both reported 0 vulnerabilities. This is point-in-time
evidence, not a permanent guarantee; future dependency changes remain subject to
normal security governance.
