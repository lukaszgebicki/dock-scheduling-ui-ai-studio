# Security boundaries

## Repository and write boundary

The only repository authorized by ordinary roadmap tasks is
`lukaszgebicki/dock-scheduling-ui-ai-studio`, the UI sandbox.
`lukaszgebicki/dock-scheduling-app-ai-studio1707` is prohibited unless a
separate task explicitly authorizes that repository. Read-only
inspection is not permission to modify a protected repository or path.

Task writes are limited to the task's named external worktree, branch,
and allowed paths. Do not modify another active task's branch or
worktree. Do not write inside the canonical repository.

## Least privilege

- Use network access only for the approved repository operation or
  validation command.
- Do not discover, read, print, transmit, or store secrets, tokens,
  credentials, or unrelated environment data.
- Do not permanently modify `PATH` or other machine configuration.
- Do not run `npm audit fix`, suppress an advisory, or add an override.
- Authentication, authorization, security controls, network calls,
  storage, persistence, backend contracts, databases, migrations, CI,
  repository configuration, and deployment require explicit Class C
  approval.

## Locked dependency preparation

`npm ci` is permitted as routine repository preparation and validation
for an otherwise authorized task when all of these conditions hold:

- `package.json` and `package-lock.json` already exist;
- both files remain unchanged;
- npm uses the exact committed lockfile;
- no package version is selected manually;
- the dependency graph is not changed;
- no `npm audit fix`, override, or resolution is used;
- tracked files remain unchanged.

The command may modify only the local ignored dependency directory and
may execute package lifecycle scripts already declared by the
repository. This permission does not authorize a dependency change and
does not raise an otherwise Class A or Class B task to Class C.

Class C authorization remains mandatory for `npm install` that changes
a manifest or lockfile, `npm update`, `npm audit fix`, adding or
removing a package, changing a package range or lockfile, adding an
override or resolution, migrating the package manager, modifying a
lifecycle script, or making any dependency or configuration change.

Stop when `npm ci` would modify a tracked file, reports a manifest and
lockfile mismatch, or requires an exception not authorized by the task.

## Local runner boundary

The local autonomy runner is an enforcement layer, not new authority.
It accepts only strict JSON task contracts from a local file or one
literal `autonomy-task` block in an open GitHub issue. GitHub issue
execution additionally requires `READY`, roadmap `READY`, and, for
Class C, `class-c-approved` plus concern-specific authorization. Local
Class C contracts require an explicit approved ChatGPT Project Lead
record. Class D always stops.

Contracts select only fixed IDs from the repository-owned
`.ai/orchestrator-policy.json`. Raw model IDs, reasoning values,
executables, arguments, sandboxes, approval modes and environment
profile overrides are prohibited. The runner fails before agent
execution when the policy is invalid, a profile is unavailable, or a
role or permission exceeds its ceiling.

The trusted `.ai/**` policy boundary is Class C-sensitive. A lower-risk
contract cannot authorize it directly or through a broader path pattern.

One exclusive lock is held per canonical repository. Locks, prompts,
process output, Reviewer results, and final reports live under the
user's external Dock Scheduling autonomy-runs directory and must not be
written to Git. Logs are sanitized and environment variables are not
dumped.

All child processes receive executable and argument arrays with the
shell disabled. Git, GitHub CLI, and Codex are reachable only through
operation-specific builders with exact argument shapes; contracts,
issues, and prompts cannot supply executables, flags, sandboxes,
approval modes, working directories, output paths, or trailing
arguments. The runner applies bounded timeouts and retries, stops
immediately on HTTP 4xx authorization failures, and stops after three
consecutive transient failures.

Every Builder, repair, and Reviewer process is enclosed by deterministic
local and remote snapshots. They compare HEAD, current branch, staged
inventory, feature-branch reflog, local `main`, `origin/main`, remote
`main`, the remote feature ref, and the count and identities of every
matching open or closed PR. Reviewer snapshots additionally require the
changed working-tree content fingerprint to remain identical. Any
commit, staging, push, PR creation, PR update, or PR reopen stops the run
without rollback and preserves both observed snapshots in the external
failure report.

The Reviewer is a fresh Codex process whose only permitted invocation
uses the read-only repository sandbox. Publication is implemented only
after verified Reviewer PASS. GitHub CLI has no merge-capable builder.
E2 and E3 prohibit publication; E4 may publish the verified feature
branch but still contains no merge path.

## Git and filesystem prohibitions

Never:

- write directly to `main`;
- merge autonomously;
- force push;
- run `git clean` or `git reset --hard`;
- delete a branch with `git branch -D`;
- use `git worktree remove --force`;
- perform recursive directory deletion without exact task
  authorization and verified target resolution;
- weaken tests, TypeScript, CI, audit behavior, or security controls;
- stage, commit, push, or open a PR when the task contract withholds
  that permission.

## Audit trail

Retain in the task report:

- repository, remote, branch, baseline, merge base, and worktree;
- initial and final status and staged/untracked inventories;
- exact changed paths and protected-path check;
- exact validation commands and results;
- environmental failures and controlled reruns;
- authorization evidence for every Class C or network action;
- Reviewer findings, repairs, verdict, and score;
- local commit, remote SHA, PR, and CI evidence when publication is
  authorized.

Never redact a failure by presenting only a later PASS.

## Incident and stop procedure

Stop writes immediately when identity, scope, authorization, security,
or evidence differs from the task contract. Preserve the worktree and
diagnostic evidence; do not clean, reset, delete, rebase, or conceal the
state.

Report the exact observed condition, affected paths or command, whether
any external action occurred, and the safest recovery options. Resume
only after the Project Lead supplies the missing decision or explicit
authority. Production-repository contact, secret exposure, unauthorized
network or persistence behavior, and unexpected Git publication are
security incidents requiring immediate human escalation.
