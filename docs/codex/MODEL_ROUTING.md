# Model routing

## Principle

Select the cheapest trusted profile expected to pass the required
quality gate without predictable rework. Contracts select only profile
IDs from [the trusted policy](../../.ai/orchestrator-policy.json); they
cannot provide raw models, reasoning values or Codex arguments.

## Fixed profiles

| Profile | Model and effort | Intended use |
| --- | --- | --- |
| `scan_low` | GPT-5.6 Luna, low | Bounded read-only scan and E0/E1 work |
| `mechanical_low` | GPT-5.6 Luna, low | Deterministic or mechanical edit |
| `build_medium` | GPT-5.6 Terra, medium | Ordinary patterned implementation |
| `repair_medium` | GPT-5.6 Terra, medium | Confirmed mechanical repair |
| `build_high` | GPT-5.6 Sol, high | Security, architecture, complexity or ambiguity |
| `review_high` | GPT-5.6 Sol, high | Non-trivial independent final review |

The runner derives scan and repair profiles from policy. Builder and
Reviewer profile IDs are explicit contract fields. The installed Codex
catalog must prove every configured model and effort before execution.
Unavailable profiles fail closed.

## Context budgets

- Minimal: contract, governing boundary, target files and focused
  evidence.
- Standard: relevant governance, repository patterns, direct consumers,
  tests and final diff.
- Extended: targeted architecture, security and cross-boundary evidence
  required by the task.

## Escalation and de-escalation

Escalate only when evidence shows ambiguity, security or architecture
risk, repeated failed validation, or a confirmed finding beyond the
current profile. De-escalate when the remaining work is deterministic
and independently bounded. Changing profile never changes task scope,
risk class, execution level or permissions.

Builder and Reviewer always use separate fresh sessions. Reviewers use
the fixed read-only review profile. Prompts and reports stay concise:
state the outcome, exact evidence, findings and stop condition without
repeating repository-wide context.
