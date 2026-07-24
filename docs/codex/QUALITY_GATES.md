# Quality gates

Validation evidence must contain the exact command and actual result.
Do not infer or fabricate a result. Compare counts, package versions,
and build output with the verified baseline in
[CURRENT_STATE.md](CURRENT_STATE.md); changed totals require an
explanation, not a hardcoded acceptance threshold.

## Before implementation

- Repository identity: remote is the approved UI sandbox; the production
  repository was not accessed.
- Exact clean baseline: branch, `HEAD`, `main`, `origin/main`, status,
  staged inventory, and registered worktrees match the contract.
- Branch and merge base: feature branch and merge base resolve to the
  exact approved SHA.
- External worktree: path is outside the canonical repository and is
  assigned only to this task.
- Pattern Study: comparable routes, components, schemas, tests, and
  source-of-truth data are recorded.
- Minimal-diff plan: allowed paths, protected paths, intended changes,
  and exclusions are explicit.

## Implementation and validation

- Exact changed-path inventory contains only allowed paths.
- Protected-path verification confirms no protected file changed.
- Nothing is staged before publication.
- `git diff --check` validates tracked unstaged changes; it does not
  validate wholly untracked files.
- Every untracked task file receives an explicit trailing-whitespace,
  conflict-marker, malformed-link, and content scan before review.
- Focused tests cover the changed behavior and regression.
- Complete `npm test -- --reporter=verbose` passes with actual file,
  passed, failed, and skipped totals recorded.
- `npm run typecheck` passes.
- `npm run build` passes; record Vite version, transformed modules,
  artifact sizes, gzip sizes, and warnings.
- `npm audit --omit=dev` passes or the task stops.
- Accessibility checks cover semantics, names, labels, keyboard/focus
  behavior, ARIA relationships, and responsive equivalents relevant to
  the change.
- Security and isolation scan confirms no unauthorized network,
  storage, authentication, authorization, secret, or production access.
- Generated output, coverage, logs, and reports are removed unless
  expressly deliverable.
- Simplification Pass is complete and full validation is rerun.
- Independent Reviewer assessment covers the complete final diff,
  including required governance and state documents, and is PASS.
- Engineering Quality Score is at least 8/10, no category is 0, and no
  task-specific finding remains unresolved at any severity.

## Publication and remote verification

- Do not stage files merely to simulate Builder or Reviewer PASS during
  implementation.
- During publication, stage only the exact approved path list.
- Run `git diff --cached --name-only`; stop if the staged inventory
  differs from the approved inventory.
- Run `git diff --cached --check`; this is the authoritative
  pre-commit whitespace and conflict-marker check.
- After commit, the worktree is clean and the commit inventory is exact.
- Remote feature SHA equals the verified local SHA.
- Exactly one pull request targets the approved base with the exact
  commit and changed-path inventory.
- Required GitHub Actions checks are green.
- Human merge gate remains pending; no automated result authorizes
  merge.

## Environmental failures

A tool or environment failure is neither PASS nor code FAIL until the
underlying command completes successfully in a controlled rerun.
Examples include a pipe timeout, stale CLI session, missing `PATH`
entry, denied filesystem read, or unavailable external service.

Record the failed invocation and symptom, correct only the environmental
condition within task authority, and rerun the exact underlying check.
If a controlled rerun cannot complete, mark validation blocked and stop.
