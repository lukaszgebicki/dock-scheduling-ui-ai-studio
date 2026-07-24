# Autonomy policy

Codex autonomy is bounded by an approved `READY` roadmap item, a
complete task contract, the repository boundary, the risk class, and
the granted Git permissions. It ends at a verified open pull request.

## Risk classes

### Class A — low risk

Includes documentation, focused repository-native UI changes, local
demo-state behavior, focused tests, and accessibility corrections.

When the roadmap task is `READY`, Codex may plan, implement, validate,
obtain independent review, repair, commit, push, and create or update
one pull request, subject to the task contract. A task may impose
stricter Git permissions.

### Class B — controlled engineering

Includes routing, shared schemas, shared shell changes, broader UI
refactors, and shared demo-domain changes.

Codex may execute through an open pull request only within approved
scope. A separate Codex Reviewer PASS is mandatory before publication.

### Class C — explicit approval required

Includes dependencies and lockfiles, authentication, authorization,
security controls, network calls, persistence, backend contracts,
databases and migrations, CI, GitHub governance, repository
configuration, and deployment-related files.

Codex must not implement Class C work unless the specific roadmap item
or task contract records explicit Project Lead authorization for the
affected concern and paths. A `READY` label without that authorization
is insufficient.

A locked `npm ci` that satisfies
[SECURITY_BOUNDARIES.md](SECURITY_BOUNDARIES.md#locked-dependency-preparation)
is routine preparation and validation, not a dependency change.

### Class D — prohibited

The following are never autonomous:

- access to the production repository without a separate explicit task;
- deployment or handling secrets;
- direct writes to `main` or autonomous merge;
- force push or destructive Git cleanup;
- weakening tests, TypeScript, CI, or security controls;
- fabricated or inferred validation;
- silent scope broadening;
- inventing business behavior to resolve ambiguity.

## Human control

Łukasz retains final product authority. Business rules, acceptance
criteria, access rules, architecture decisions, security-sensitive
scope, persistence, and external contracts require human approval.

Merge is performed only by ChatGPT acting under Łukasz's standing or
task-specific authorization, or directly by Łukasz. Automated PASS,
green CI, a Reviewer verdict, or an Engineering Quality Score never
overrides the human merge decision.

The task lifecycle and required authorization checks are defined in
[TASK_PROTOCOL.md](TASK_PROTOCOL.md). Repository and operational
prohibitions are defined in
[SECURITY_BOUNDARIES.md](SECURITY_BOUNDARIES.md).
