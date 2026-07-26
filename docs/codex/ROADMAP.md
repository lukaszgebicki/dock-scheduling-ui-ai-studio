# Roadmap

Allowed roadmap states are `READY`, `BLOCKED`, `IN_PROGRESS`, `REVIEW`,
`PR_OPEN`, and `DONE`. Execution phases in
[TASK_PROTOCOL.md](TASK_PROTOCOL.md) do not add roadmap states.

## Completed

| Task | State |
| --- | --- |
| DEMO-AUTH-1 — Demo authentication | DONE |
| CI-FOUNDATION-1 — CI foundation | DONE |
| SPR-2A — Users and access overview | DONE |
| SPR-2B — Invite user and centralized access scope | DONE |
| SPR-2C — Warehouses administration | DONE |
| SPR-2D — Supplier organizations administration | DONE |
| SPR-SEC-1 — React Router security migration | DONE |
| AUTONOMY-FOUNDATION-1 — repository governance foundation | DONE |

## Active and queued

### SPR-SEC-2 — React Router 8.3 security migration

- Objective: remediate GHSA-qwww-vcr4-c8h2 with the smallest safe
  React Router 8.3.0 and React 19 compatibility migration.
- State: `IN_PROGRESS`.
- Risk class: Class C with explicit Project Lead authorization for the
  dependency, lockfile, compatibility-source, test, and governance paths
  named in the task contract and recovery amendment.
- Allowed repository:
  `lukaszgebicki/dock-scheduling-ui-ai-studio` only.
- Dependency authorization: remove React Router DOM 7.18.0, add React
  Router 8.3.0, and update React, React DOM, and their type packages to
  the minimum coherent compatible React 19 versions. Update Lucide React
  from 0.394.0 to 0.397.0 only to satisfy its React 19 peer contract.
- Prohibited dependency behavior: no audit suppression, overrides,
  `npm audit fix`, force, or legacy-peer resolution.
- Expected quality gates: focused routing tests, complete validation,
  zero runtime audit vulnerabilities, documentation consistency,
  Simplification Pass, independent Reviewer PASS, and an Engineering
  Quality Score of at least 8/10.
- Completion criteria: the authorized migration preserves route,
  access, UI, and business behavior and passes every task-contract
  validation check.
- Required human gate: merge remains human-controlled.

### AUTONOMY-GOV-1 — GitHub governance and task template

- Objective: define and implement separately approved GitHub governance
  and a repository task template.
- State: `BLOCKED`.
- Risk class: Class C.
- Allowed repository:
  `lukaszgebicki/dock-scheduling-ui-ai-studio` only.
- Dependency/configuration authorization: dependencies are not
  authorized; GitHub governance or configuration changes require
  explicit Project Lead authorization in the task contract and are not
  authorized by this roadmap entry alone. Locked `npm ci` validation is
  not a dependency change.
- Required human gates: exact governance design, protected paths,
  permissions, and Class C implementation authorization.
- Expected quality gates: repository and GitHub baseline, exact
  configuration diff, independent Reviewer PASS before publication,
  green CI, and human merge decision.
- Completion criteria: approved governance behavior and template are
  implemented in allowed paths, validated, independently reviewed, and
  available in one verified open PR.
- Blocking reason: its mandatory runtime audit is blocked by
  GHSA-qwww-vcr4-c8h2 and depends on successful completion of
  `SPR-SEC-2`; its separate local implementation remains preserved and
  paused.

### AUTONOMY-PILOT-1 — first bounded autonomous delivery task

- Objective: take one separately approved low-risk UI-sandbox task from
  `READY` through a verified open PR using this governance.
- State: `BLOCKED`.
- Risk class: Class A; the approved pilot contract must remain within
  Class A.
- Allowed repository:
  `lukaszgebicki/dock-scheduling-ui-ai-studio` only.
- Dependency/configuration authorization: no changes; locked `npm ci`
  validation remains permitted.
- Required human gates: business acceptance criteria, pilot scope, and
  merge decision.
- Expected quality gates: the complete task protocol, independent
  Reviewer PASS, score at least 8/10, green CI, and human merge gate.
- Completion criteria: approved behavior is delivered in one verified
  open PR with complete evidence and no unresolved findings.
- Blocking reason: governance foundation review and
  `AUTONOMY-GOV-1` completion are required before the pilot can start.

### SPR-2E — next product capability

- Objective: to be scoped by ChatGPT as Project Lead; no business
  behavior is approved.
- State: `BLOCKED`.
- Risk class: unclassified until scope is approved.
- Allowed repository:
  `lukaszgebicki/dock-scheduling-ui-ai-studio` only.
- Dependency/configuration authorization: no changes; locked `npm ci`
  validation remains permitted.
- Required human gates: ChatGPT Project Lead scope, acceptance criteria,
  architecture decision where applicable, and risk classification;
  Łukasz retains business approval and final product authority.
- Expected quality gates: to be selected from
  [QUALITY_GATES.md](QUALITY_GATES.md) after scope approval; complete
  validation and independent review remain mandatory.
- Completion criteria: cannot be defined until business acceptance
  criteria are approved.
- Blocking reason: pending ChatGPT Project Lead scope and approved
  business acceptance criteria.

Only `SPR-SEC-2` is currently `IN_PROGRESS`. `AUTONOMY-GOV-1` remains
preserved and paused until the runtime audit blocker is remediated.
