# Task protocol

## State and phase model

Roadmap states are defined in [ROADMAP.md](ROADMAP.md). During an active
task, use this execution sequence:

`READY → PLANNING → IMPLEMENTING → VALIDATING → SIMPLIFYING → INDEPENDENT_REVIEW → REPAIR → PUBLICATION → PR_OPEN → WAITING_FOR_HUMAN_MERGE → DONE`

`PLANNING` through `PUBLICATION` map to roadmap `IN_PROGRESS`.
Independent review may map to `REVIEW`; publication completes at
`PR_OPEN`. `DONE` is used only after the human-controlled merge and
verified state update.

## Task contract

Every task contract must state:

- task ID and objective;
- repository;
- baseline branch and exact SHA;
- risk class;
- feature branch and external worktree;
- implementation owner and separate independent Reviewer;
- allowed scope and protected paths;
- approved acceptance criteria and validation;
- security boundaries and documentation impact;
- Git permissions;
- stop conditions.

Missing or conflicting fields block implementation.

## Required lifecycle

1. Read `AGENTS.md` and the relevant `docs/codex` sources.
2. Verify the roadmap task is `READY`.
3. Fetch and run repository preflight.
4. Confirm the exact baseline.
5. Classify the risk.
6. Confirm all required authorization.
7. Create the external worktree and branch.
8. Perform the Pattern Study.
9. Write a minimal-diff plan that assesses documentation impact.
10. Implement only the allowed scope, including required governance and
    state-document updates.
11. Perform Builder self-review.
12. Run focused validation.
13. Run complete validation.
14. Perform the Simplification Pass over the complete diff, including
    documentation.
15. Rerun complete validation.
16. Perform scope and security audit.
17. Obtain a separate read-only Reviewer assessment of the complete
    final diff.
18. Return confirmed findings to the Builder.
19. Repeat Builder repair, validation, and independent review until
    final Reviewer PASS.
20. Stage the exact approved paths.
21. Run `git diff --cached --name-only` and
    `git diff --cached --check`.
22. Create one controlled commit.
23. Push only the feature branch.
24. Create or update one pull request.
25. Verify the remote SHA, PR inventory, and required checks.
26. Stop before merge.

The task contract may stop earlier by withholding stage, commit, push,
or PR permission. It may never bypass review, security, or human merge
controls.

## Documentation and publication timing

Durable governance and state facts known before publication belong in
the implementation diff. When required by the task, update
`CURRENT_STATE.md`, `ROADMAP.md`, `DECISION_LOG.md`, or `TECH_DEBT.md`
during implementation so Builder validation, the Simplification Pass,
and final independent review cover those changes.

The PR number, check results, and review status belong primarily in pull
request metadata. Do not require an uncommitted repository-document
update after creating the PR.

After merge, transition the roadmap item to `DONE` and record the new
`main` SHA only through a separate authorized follow-up or the next
controlled state-update task. An after-publication repair creates
another reviewed commit and reruns the applicable validation,
Simplification Pass, independent review, remote, and CI gates.

## Builder and Reviewer

The Builder owns implementation, self-review, validation evidence,
repairs, and publication. The Builder must not issue the final
independent-review verdict for its own implementation.

The Reviewer is a separate Codex session with read-only assessment scope.
It checks the complete diff, task contract, evidence, security boundary,
repository fit, AI-code smells, and Engineering Quality Score. Findings
must identify severity and evidence. PASS requires the conditions in
[ENGINEERING_QUALITY.md](ENGINEERING_QUALITY.md).

Routine questions are answered from repository, Git, GitHub, test, and
command evidence. Stop rather than guess when ambiguity affects
business behavior, access rules, architecture, persistence, security,
external contracts, or scope boundaries.
