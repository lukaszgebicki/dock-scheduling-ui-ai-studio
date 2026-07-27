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
| AUTONOMY-GOV-1 — local autonomy runner MVP | DONE; PR #10 human-merged |

## Active and queued

### AUTONOMY-PILOT-1 — first bounded autonomous delivery task

- Objective: take one separately approved low-risk UI-sandbox task from
  `READY` through a verified open PR using this governance.
- State: `READY`.
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
- Readiness evidence: the merged runner passed `npm ci`, autonomy doctor,
  focused runner tests (68/68), `npm audit --omit=dev` with zero
  vulnerabilities, and `git diff --check` from the clean `main`
  baseline.
- Separate execution contract: before any pilot, Project Lead and
  Business Owner approval must define exact behavior, acceptance
  criteria, baseline SHA, branch, external worktree, allowed and
  protected paths, profiles, execution level, Git permissions, and
  stop conditions. No product behavior or UI path is approved by this
  roadmap entry.

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

`AUTONOMY-PILOT-1` is the only task currently `READY`. `SPR-2E` remains
`BLOCKED`; no ambiguous product task is approved beyond the separately
contracted pilot.
