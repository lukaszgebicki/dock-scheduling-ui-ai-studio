# Orchestrator

## Deterministic routing

The repository runner:

1. loads and validates `.ai/orchestrator-policy.json`;
2. verifies installed Codex model and reasoning capabilities;
3. validates the strict contract, roadmap risk class and Class C
   authorization;
4. maps fixed profile IDs to immutable model, reasoning, sandbox and
   approval arguments;
5. enforces execution, validation and Git permission ceilings;
6. runs fresh Builder, repair and Reviewer sessions inside existing
   mutation snapshots;
7. publishes only for E4 after Reviewer PASS and stops before merge.

E0 and E1 use non-mutating planning. E2 permits focused validation
without publication. E3 permits complete validation and simplification
without publication. E4 alone permits exact feature-branch publication.
No level, profile or Git permission permits merge.

## Selection and context

Use [MODEL_ROUTING.md](MODEL_ROUTING.md) for model and reasoning
selection. Scan and repair profiles are policy-derived. The contract
selects a permitted Builder profile, the read-only Reviewer profile,
context budget, token posture and validation depth. These values do not
override risk or authorization.

## Escalation and failure

Fail closed on missing or malformed policy, unavailable model or effort,
profile-role mismatch, permission conflict, runtime evidence conflict,
scope drift, premature mutation, validation failure or unresolved
review. Preserve external evidence and do not silently fall back,
rewrite user Codex configuration or broaden scope.

The orchestrator never invents business behavior, acceptance criteria,
architecture, Class C approval or publication authority. Material
ambiguity returns to the Project Lead or Business Owner.

## Telemetry

Sanitized external reports may record task and profile IDs, requested
model and effort, runtime-verification status, execution level, context
budget, token posture, validation depth, repair count, command results,
findings and stop reason. Do not record secrets, raw environment data or
unrelated content. Telemetry supports later human-controlled tuning; it
does not change policy during a run.
