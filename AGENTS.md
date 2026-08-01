# Dock Scheduling UI sandbox operating guide

## Contents

- [Repository boundary](#repository-boundary)
- [Governance sources](#governance-sources)
- [Product specification sources](#product-specification-sources)
- [Required commands](#required-commands)
- [Local autonomy runner](#local-autonomy-runner)
- [Delivery rules](#delivery-rules)
- [Task execution](#task-execution)
- [Human gates](#human-gates)
- [Stop conditions](#stop-conditions)

## Repository boundary

Repository: `lukaszgebicki/dock-scheduling-ui-ai-studio`.

This is the frontend-only Dock Scheduling UI sandbox. It is not a
production system and does not provide production persistence.

The production repository
`lukaszgebicki/dock-scheduling-app-ai-studio1707` is prohibited. Do not
open, fetch, clone, inspect, modify, or use it as a source for this
repository unless a separate explicit task authorizes that repository.

All task writes must occur in an external worktree. Never create a
worktree inside the canonical repository.

## Governance sources

- [Project charter](docs/codex/PROJECT_CHARTER.md)
- [Verified current state](docs/codex/CURRENT_STATE.md)
- [Roadmap](docs/codex/ROADMAP.md)
- [Autonomy and risk policy](docs/codex/AUTONOMY_POLICY.md)
- [Task protocol](docs/codex/TASK_PROTOCOL.md)
- [Quality gates](docs/codex/QUALITY_GATES.md)
- [Security boundaries](docs/codex/SECURITY_BOUNDARIES.md)
- [Engineering quality](docs/codex/ENGINEERING_QUALITY.md)
- [Decision log](docs/codex/DECISION_LOG.md)
- [Technical debt](docs/codex/TECH_DEBT.md)
- [Dock AI Playbook v2](docs/codex/DOCK_AI_PLAYBOOK_V2.md)
- [Model routing](docs/codex/MODEL_ROUTING.md)
- [Prompt standard](docs/codex/PROMPT_STANDARD.md)
- [Orchestrator](docs/codex/ORCHESTRATOR.md)

Detailed definitions live in those documents. Link to the canonical
policy instead of copying it into task notes or pull requests.

## Product specification sources

- [UI MVP Business Decision Pack v0.3](docs/product/UI_MVP_BUSINESS_DECISION_PACK_v0.3.md)
  is the approved canonical source for UI MVP business behavior.
- [UI MVP Business Decision Pack v0.2](docs/product/UI_MVP_BUSINESS_DECISION_PACK_v0.2.md)
  remains unchanged historical evidence and is not the current authority.
- [UI MVP traceability](docs/product/UI_MVP_TRACEABILITY.md) maps approved BDP
  requirements and AC scenarios to controlled implementation tasks.
- [UI MVP implementation plan](docs/codex/UI_MVP_IMPLEMENTATION_PLAN.md) defines
  the approved delivery sequence; it does not authorize a task by itself.

Business Decision Pack v0.3, including the approved weekly-planning decisions
and `BDR-TRN-001`, was approved by Łukasz Gębicki on 2026-07-31. Every source
occurrence of `REKOMENDACJA DO ZATWIERDZENIA` inherited from v0.2 is interpreted
as `APPROVED`. Section 24 remains excluded from UI MVP. For weekly-planning
conflicts, sections 29–30 control: both Supplier transport fields are required
at reservation, while the transport matrix is limited to downstream readiness
and Administrator-added or imported deliveries.

Codex must implement only the BDP identifiers, numbered sections, and AC
identifiers explicitly named in the active exact-SHA task contract. Planning
traceability is not implementation permission.

When the Business Decision Pack, current repository behavior, and active task
contract conflict or leave material business behavior ambiguous, stop and return
the conflict to the Project Lead. Do not invent a transition, permission,
persistence effect, integration, role, entity, workflow, or excluded feature.

The implementation order in
[UI MVP implementation plan](docs/codex/UI_MVP_IMPLEMENTATION_PLAN.md) is a
dependency plan only. `UI-MVP-FLOW-ROUTING-1` is the first possible candidate;
it and every later task still require separate activation, exact-SHA contract,
external worktree, validation, independent review, pull request and human merge.

## Required commands

Use the repository's locked dependency graph and existing scripts:

```bash
npm ci
npm run typecheck
npm test -- --reporter=verbose
npm run build
npm audit --omit=dev
```

Also run `git diff --check`. Record each exact command and its actual
result. Never infer, round, omit, or fabricate validation evidence.

CI currently runs `npm ci`, typecheck, tests, build, and the runtime
audit on Node.js 24. CI is evidence, not merge authorization.
Locked `npm ci` preparation is permitted under the conditions in
[SECURITY_BOUNDARIES.md](docs/codex/SECURITY_BOUNDARIES.md); it does not
authorize dependency changes.

## Local autonomy runner

`tools/autonomy/run-task.mjs` defines the repository's local bounded
orchestration entry point. Use `npm run autonomy -- doctor` for
non-mutating capability checks and `plan` to validate an approved task
without creating a branch or worktree. `execute` is permitted only by a
complete task contract and the gates in
[TASK_PROTOCOL.md](docs/codex/TASK_PROTOCOL.md).
Model, reasoning, context, validation and execution permissions are
resolved only through
[`.ai/orchestrator-policy.json`](.ai/orchestrator-policy.json) and the
[Dock AI Playbook v2](docs/codex/DOCK_AI_PLAYBOOK_V2.md).

The runner is not operational governance until its implementation is
independently reviewed, merged, and successfully piloted. It never
authorizes merge.

## Delivery rules

- One task has one branch, one external worktree, and one implementation
  owner.
- The implementation owner is the Codex Builder.
- A separate Codex Reviewer session performs independent read-only
  review. The Builder cannot issue its own independent-review verdict.
- Never write directly to `main`.
- Never merge autonomously.
- Do not stage before the publication phase defined by the task
  contract.
- Change only paths expressly allowed by the task contract.
- Treat authentication, authorization, dependencies, CI, repository
  configuration, network, persistence, backend contracts, databases,
  deployment, and secrets as protected concerns.
- Apply the risk class and authorization rules in
  [AUTONOMY_POLICY.md](docs/codex/AUTONOMY_POLICY.md).
- Preserve demo-only behavior unless approved business scope says
  otherwise. Do not present local UI success as persisted state.

## Task execution

Start only from a `READY` roadmap item and a complete task contract.
Follow [TASK_PROTOCOL.md](docs/codex/TASK_PROTOCOL.md).

Before editing, perform a Pattern Study:

1. inspect comparable routes, components, schemas, tests, and data
   sources for every affected concern;
2. record the patterns to reuse;
3. justify any new pattern architecturally.

Plan the smallest coherent diff. Avoid unrelated refactors, rename or
formatting churn, and speculative infrastructure.

After initial validation, perform the mandatory Simplification Pass in
[ENGINEERING_QUALITY.md](docs/codex/ENGINEERING_QUALITY.md), then rerun
complete validation.

Every implementation and review must include the Engineering Quality
Score. PASS requires at least 8/10, no category scored 0, and no
unresolved task-specific finding at any severity.

When durable governance or state changes are required, include the
relevant documentation in the implementation diff before final
independent review. Do not update state documents merely to predict
future work.

## Human gates

Łukasz is the business owner and final product authority. ChatGPT is the
Project Lead. Human approval is required for business behavior,
acceptance criteria, access rules, architecture, security-sensitive
scope, external contracts, and persistence.

Codex autonomy ends at a verified open pull request. Merge is performed
only by ChatGPT under Łukasz's standing or task-specific authorization,
or directly by Łukasz. Reviewer PASS, green CI, or an automated score
never overrides that decision.

## Stop conditions

Stop without guessing when:

- repository identity, remote, baseline SHA, branch, merge base, or
  worktree boundary differs from the task contract;
- the working tree is not clean before branch creation;
- the roadmap item is not `READY`, required authorization is absent, or
  another implementation task is already active;
- requested work crosses an allowed path, repository, risk class, or
  security boundary;
- business behavior, access rules, architecture, persistence, security,
  external contracts, or acceptance criteria are ambiguous;
- validation cannot be completed or evidence conflicts;
- an unexpected file is modified, staged, generated, or untracked;
- independent review cannot be obtained or has unresolved findings.

Explicit task instructions take precedence over general guidance only
when they do not weaken repository, production, security, Git, review,
merge, or human-approval prohibitions.
