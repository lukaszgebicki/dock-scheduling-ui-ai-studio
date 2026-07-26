# Prompt standard

Implementation, review, repair and publication prompts must state the
task, allowed and protected scope, stop conditions, required evidence
and applicable human gates. They must not invent acceptance criteria,
authorization, raw runtime arguments or permissions.

Every such prompt ends with:

```text
RECOMMENDED RUN

- Model/profile:
- Reasoning effort:
- Execution autonomy:
- Context budget:
- Sandbox:
- Approval mode:
- Git permissions:
- Validation depth:
- Token posture:
- Completion evidence:
```

## Builder example

```text
Implement TASK-1 only in src/example/**. Preserve protected paths and
stop before staging.

RECOMMENDED RUN

- Model/profile: GPT-5.6 Terra (build_medium)
- Reasoning effort: medium
- Execution autonomy: E3
- Context budget: standard
- Sandbox: workspace-write
- Approval mode: never
- Git permissions: worktree_write
- Validation depth: complete
- Token posture: balanced
- Completion evidence: changed paths and exact validation results
```

## Reviewer example

```text
Independently review TASK-1 and return findings plus the Engineering
Quality Score. Do not modify files.

RECOMMENDED RUN

- Model/profile: GPT-5.6 Sol (review_high)
- Reasoning effort: high
- Execution autonomy: E3
- Context budget: standard
- Sandbox: read-only
- Approval mode: never
- Git permissions: read_only
- Validation depth: complete
- Token posture: balanced
- Completion evidence: findings, verdict and score
```
