# Local autonomy runner

The runner coordinates one approved repository task through a verified
open pull request and always stops before merge.

## Commands

```text
npm run autonomy -- doctor
npm run autonomy -- plan --contract <file>
npm run autonomy -- plan --issue <number>
npm run autonomy -- execute --contract <file>
npm run autonomy -- execute --issue <number>
```

The default invocation displays help and performs no write. `doctor`
and `plan` are also non-mutating. `execute` creates repository and
GitHub state only after every capability, contract, roadmap, baseline,
scope, and authorization gate passes.

## Contract

The JSON object is strict: unknown fields are rejected.

| Field | Required value |
| --- | --- |
| `taskId` | Stable ID present as `READY` in `docs/codex/ROADMAP.md` |
| `objective` | One non-empty bounded outcome |
| `repository` | `lukaszgebicki/dock-scheduling-ui-ai-studio` |
| `baseBranch` | `main` |
| `baseSha` | Approved full lowercase 40-character SHA |
| `riskClass` | `Class A`, `Class B`, or `Class C`; Class D is rejected |
| `executionLevel` | `E0` through `E4`; controls how far execution may proceed |
| `builderProfile` | Policy-approved scan or Builder profile for the execution level |
| `reviewerProfile` | Policy-approved read-only Reviewer profile |
| `contextBudget` | `minimal`, `standard`, or `extended` |
| `tokenPosture` | `economy`, `balanced`, or `quality_first` |
| `validationDepth` | Exact depth required by the execution level |
| `gitPermission` | Exact Git permission ID required by the execution level |
| `branch` | Valid non-main feature branch |
| `externalWorktree` | Non-root absolute path outside the canonical repository |
| `allowedPaths` | Non-empty exact paths or trailing `/**` subtrees |
| `protectedPaths` | Non-empty paths that do not overlap allowed paths |
| `acceptanceCriteria` | Non-empty array of approved outcomes |
| `classCAuthorizations` | Concern-specific strings; non-empty for Class C |
| `focusedTestArgs` | Required when the trusted validation depth includes focused tests; appended only to the existing test command |
| `commitMessage` | Exact controlled commit message |
| `prTitle` | Exact pull-request title |
| `prBody` | Exact pull-request body |
| `maxRepairCycles` | Optional integer from 0 to 2; defaults to 2 |
| `projectLeadAuthorization` | Local Class C only: approved ChatGPT Project Lead record and concerns |

Local Class C authorization has this shape:

```json
{
  "approved": true,
  "authorizedBy": "ChatGPT Project Lead",
  "concerns": ["Concern-specific authorization"]
}
```

GitHub issue contracts use exactly one block:

````text
```autonomy-task
{
  "taskId": "AUTONOMY-PILOT-1"
}
```
````

The issue must be open and labeled `READY`. Class C issues also require
`class-c-approved`; labels must already be managed through separate
human-controlled GitHub governance.

## Policy

`.ai/orchestrator-policy.json` is the only trusted source for profile,
execution, context, token, validation and Git-permission IDs. Scan and
repair profiles are derived from policy. Contracts cannot supply raw
models, reasoning values, executables, flags, sandboxes or approval
modes. Doctor fails when a configured model or effort is unavailable.

## Process boundaries

The runner never evaluates a shell command from a contract. Protected
Git, GitHub CLI, and Codex calls are produced only by operation-specific
builders with fixed argument shapes. Unknown fields and trailing
arguments are rejected. Processes use executable-plus-argument arrays,
bounded timeouts, a sanitized environment, and sanitized external logs.

The exact Codex process forms are:

```text
codex --strict-config --model <trusted-model> --config model_reasoning_effort="<trusted-effort>" --sandbox workspace-write --cd <worktree> --ask-for-approval never exec --ephemeral --ignore-user-config --output-last-message <external-file> -
codex --strict-config --model <trusted-model> --config model_reasoning_effort="<trusted-effort>" --sandbox read-only --cd <worktree> --ask-for-approval never exec review --uncommitted --ephemeral --ignore-user-config --output-last-message <external-file> -
```

Before and after every Builder, repair, and Reviewer process, the runner
records HEAD, branch, index, branch reflog, local and remote `main`,
the remote feature ref, and every open or closed PR for the feature
branch. Any commit, staging, push, PR creation, PR update, or PR reopen
stops the run with the observed snapshots preserved externally. Reviewer
boundaries additionally fingerprint the complete changed working-tree
content and require it to remain identical.

The Reviewer command is fixed to the read-only sandbox. Contracts and
issues cannot override either sandbox, approval mode, executable,
working directory, output path, or append flags. No command builder can
produce a merge operation.

E0 and E1 remain non-mutating. E2 and E3 preserve an unstaged worktree
and stop before publication. E4 alone can invoke the existing exact
publication path, which stops before merge.

## Reviewer result

The Reviewer returns exactly one JSON object between
`AUTONOMY_REVIEW_RESULT_START` and `AUTONOMY_REVIEW_RESULT_END`.
It contains `verdict`, five 0–2 `qualityScores`, their `totalScore`,
arrays of `BLOCKER`, `HIGH`, `MEDIUM`, and `LOW` findings, and `notes`.

PASS is accepted only when the total is at least 8, no category is 0,
and every finding array is empty. Exit code alone never implies PASS.

## External state

Locks, process logs, Codex output, Reviewer results, and final reports
are stored below the user's `Dock Scheduling/autonomy-runs` directory.
No runner state belongs in Git.
