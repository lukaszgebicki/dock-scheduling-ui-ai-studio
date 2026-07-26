# Dock AI Playbook v2

## Purpose and authority

This Playbook defines efficient, bounded AI-assisted delivery for the
Dock Scheduling UI sandbox. Łukasz remains Business Owner and final
product authority. ChatGPT is Project Lead. Codex Builder and Reviewer
operate only within an approved task contract and the stricter
repository governance linked from [AGENTS.md](../../AGENTS.md).

The Playbook improves routing and token economy; it creates no business,
architecture, security, publication, or merge authority.

## Roles

- The Project Lead approves scope, acceptance criteria, architecture,
  Class C concerns, and task-specific execution ceilings.
- The Builder implements and validates within the approved worktree.
- The Reviewer is a separate, read-only session and independently
  assesses the complete diff.
- The runner enforces policy, contract, process and publication
  boundaries. It never merges.

## Risk and execution

Risk class and execution autonomy are independent:

| Dimension | Question | Values |
| --- | --- | --- |
| Risk class | What may change? | Class A, B, C; Class D is prohibited |
| Execution level | How far may the run proceed? | E0 through E4 |

E0 reads and reports. E1 analyzes and plans without edits. E2 may edit
and run focused validation but cannot publish. E3 adds simplification
and complete validation but cannot publish. E4 may complete the approved
lifecycle through one verified open pull request and always stops before
merge.

A higher execution level never lowers risk classification or replaces
Class C authorization.

## Implementation ladder

For each proposed change:

1. Confirm whether the change is necessary.
2. Reuse repository patterns.
3. Prefer deletion to parallel behavior.
4. Use standard language or platform capability.
5. Use an existing dependency.
6. Avoid an abstraction when a direct implementation is clearer.
7. Add only the smallest coherent code.

Simplicity never weakens security, validation, error handling, business
correctness, accessibility, architecture, or tests.

## Context economy

Load the smallest context that can establish the task boundary, relevant
patterns, direct consumers, tests and final evidence. Use Minimal for a
bounded scan, Standard for ordinary patterned work, and Extended only
for cross-cutting architecture, security or material ambiguity. Do not
reread unrelated application areas to create artificial confidence.

## Lifecycle

The canonical lifecycle remains in
[TASK_PROTOCOL.md](TASK_PROTOCOL.md). Policy and contract validation
precede every agent. Builder, repair and Reviewer sessions are fresh.
Mutation snapshots enclose each session. E2 and E3 stop before
publication; E4 publishes only after Reviewer PASS and stops before
merge.

## Token economy

Choose the cheapest trusted profile expected to pass the required gate
without predictable rework. Prefer concise prompts, targeted evidence,
stable profile IDs and direct reports. Escalate model, reasoning or
context only from observed risk, ambiguity, failed validation or a
confirmed finding. Do not promise exact token or cost savings.

## Learning-loop boundaries

External sanitized evidence may support later human-approved tuning of
routing choices, failure rates and validation depth. A run may not
rewrite repository policy, alter user Codex configuration, infer new
acceptance criteria, or silently promote a profile based on telemetry.

## Precedence

When this Playbook conflicts with the project charter, autonomy policy,
task protocol, security boundaries, quality gates or a stricter task
contract, the stricter rule prevails.
