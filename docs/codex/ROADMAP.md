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
| SPR-SEC-2 — React Router 8.3 security migration | DONE; PR #9 human-merged |

## Active and queued

### AUTONOMY-GOV-1 — local autonomy runner MVP

- Objective: implement the repository-native local runner and GitHub
  task issue form for bounded Builder, validation, Reviewer, repair,
  publication, CI-observation orchestration, and Dock AI Playbook v2
  model and execution policy.
- State: `IN_PROGRESS`.
- Risk class: Class C.
- Allowed repository:
  `lukaszgebicki/dock-scheduling-ui-ai-studio` only.
- Dependency/configuration authorization: one `package.json` runner
  script is authorized; dependencies and `package-lock.json` changes
  are not. Locked `npm ci` validation is not a dependency change.
- Required human gates: the exact runner contract and Class C paths are
  approved; independent review and the human merge decision remain
  mandatory.
- Expected quality gates: runner and policy-focused security tests, the
  complete repository validation baseline, installed-profile evidence,
  actual non-mutating doctor PASS, exact scope, independent Reviewer
  PASS, green CI, and human merge decision.
- Completion criteria: the runner and issue form are implemented in
  approved paths, validated, independently reviewed, and made available
  in one verified open PR. Operational use still requires a successful
  pilot.

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
- Blocking reason: `AUTONOMY-GOV-1` must be independently reviewed and
  merged, then controlled local setup and a separate pilot contract
  must be approved.

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

Only `AUTONOMY-GOV-1` is currently `IN_PROGRESS`. No ambiguous product
task is `READY`.
