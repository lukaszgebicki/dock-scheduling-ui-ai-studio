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

## Active and queued

### AUTONOMY-FOUNDATION-1 — repository governance foundation

- Objective: add the repository-native bounded-autonomy documentation
  set without changing existing files.
- State: `IN_PROGRESS`.
- Risk class: Class A.
- Allowed repository:
  `lukaszgebicki/dock-scheduling-ui-ai-studio` only.
- Dependency/configuration authorization: no dependency or
  configuration change; locked `npm ci` validation is permitted under
  [SECURITY_BOUNDARIES.md](SECURITY_BOUNDARIES.md#locked-dependency-preparation).
- Required human gates: approved task scope and human decision after
  independent Reviewer assessment.
- Expected quality gates: every applicable gate in
  [QUALITY_GATES.md](QUALITY_GATES.md), including exact eleven-file
  scope, link validation, consistency review, and score at least 8/10.
- Completion criteria: eleven approved files only; all validation
  passes; independent Reviewer PASS; no commit, push, or PR under the
  foundation task's restricted Git permissions.

### AUTONOMY-GOV-1 — GitHub governance and task template

- Objective: define and implement separately approved GitHub governance
  and a repository task template.
- State: `READY`.
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

Only `AUTONOMY-FOUNDATION-1` is currently `IN_PROGRESS`. No ambiguous
product task is `READY`.
