# Project charter

## Purpose and boundary

Dock Scheduling supports the coordination of dock appointments and the
people, warehouses, and supplier organizations that participate in that
work. This repository is a UI sandbox for testing frontend workflows and
interaction design before any separately approved production delivery.

The sandbox repository is
`lukaszgebicki/dock-scheduling-ui-ai-studio`. The production repository
`lukaszgebicki/dock-scheduling-app-ai-studio1707` is separate and
prohibited. Sandbox output is not automatically transferable to
production.

The verified architecture is a React and TypeScript frontend. It has no
backend, Prisma, PostgreSQL, Firebase, Gemini integration, production
storage, migrations, or deployment infrastructure. Existing API adapter
code is not connected by `src/main.tsx`; the running sandbox injects the
local `demoAuthApi`.

## Demonstration model

Authentication is an in-memory demonstration. The fixtures
`demo@dock.local`, `DemoPassword123!`, and `valid-demo-token` exist only
to exercise the sandbox login and reset flows. They are not production
credentials or secrets. The session token is held in memory.

Current administration demonstrations cover:

- users and access search, filtering, roles, organizations, and status;
- a local-only invite-user preparation flow;
- warehouse overview and local-only warehouse preparation;
- supplier-organization overview and local-only organization
  preparation;
- inherited warehouse scope for supplier organizations.

Successful form submission validates and displays a local success state.
It does not send email, create an account, mutate catalogues, call a
backend, or persist data.

Centralization is partial. `src/users/demoAccessScope.ts` is the typed
source for stable warehouse IDs, supplier-organization IDs, and
organization-to-warehouse mappings used by newer access-scope and
administration flows. New features in those areas should use it.

`src/users/demoUsers.ts` remains a separate legacy fixture and
duplicates organization labels, warehouse labels, and supplier access
presentation data. The repository therefore does not yet have one
complete source of truth for all demo user and access presentation
data. The remaining normalization is tracked in
[TECH_DEBT.md](TECH_DEBT.md#demo-data-001--legacy-demo-user-access-duplication).

## Brand use

The established application palette is:

- deep navy `#000A32`;
- navy `#023466`;
- light blue `#7FA5D0`;
- warm neutral `#D9D9C4`;
- coral `#FF9166`.

Use only an official, owner-approved logo asset. The repository contains
no approved logo asset at this baseline, so do not invent, trace,
reconstruct, or present a placeholder as an official logo. Palette use
does not imply logo approval.

## Responsibilities

| Role | Responsibility |
| --- | --- |
| Łukasz | Business owner, final product authority, and ultimate merge authority. |
| ChatGPT | Project Lead; approves scope, acceptance criteria, architecture, Class C authorization, and merge under Łukasz's authority. |
| Codex Builder | Implements an approved task in its external worktree, validates it, repairs review findings, and may publish only as allowed by the task. |
| Codex Reviewer | Separate session; performs independent read-only review and issues PASS or findings. |
| GitHub Actions | Runs the configured validation workflow; it does not approve architecture or merge. |
| Optional Claude review | Additional advisory review when requested; it does not replace the Codex Reviewer or human merge gate. |

Detailed autonomy, lifecycle, and security rules are canonical in
[AUTONOMY_POLICY.md](AUTONOMY_POLICY.md),
[TASK_PROTOCOL.md](TASK_PROTOCOL.md), and
[SECURITY_BOUNDARIES.md](SECURITY_BOUNDARIES.md).
