# Decision log

Stable IDs do not encode dates. `ACCEPTED` decisions remain authoritative
until replaced by a later decision that cites the superseded ID.

| ID | Status | Decision | Rationale | Consequences |
| --- | --- | --- | --- | --- |
| DCF-001 | ACCEPTED | Keep the UI sandbox separate from the production repository. | Sandbox experiments must not create implicit production authority. | Production access and automatic transfer are prohibited. |
| DCF-002 | ACCEPTED | Keep the sandbox frontend-only. | The verified repository contains a React UI demonstration, not production services. | Backend, database, persistence, and deployment work require separately approved architecture and scope. |
| DCF-003 | ACCEPTED | Perform task writes only in external worktrees. | Canonical `main` must remain a stable baseline. | Nested and in-repository worktrees are prohibited. |
| DCF-004 | ACCEPTED | Use one task, one branch, and one implementation owner. | Scope, evidence, and accountability must remain attributable. | Do not combine tasks or edit another active task's worktree. |
| DCF-005 | ACCEPTED | Separate Builder and Reviewer roles. | Self-review cannot provide independent assurance. | A separate read-only Reviewer issues the independent verdict. |
| DCF-006 | ACCEPTED — PARTIAL | Centralize new access-scope and administration data in the typed demo access-scope source. | Stable warehouse IDs, supplier-organization IDs, and assignments are shared domain facts. | New work uses `src/users/demoAccessScope.ts`; legacy label and access duplication remains in `src/users/demoUsers.ts` and is tracked as `DEMO-DATA-001`. |
| DCF-007 | ACCEPTED | Keep demo success behavior local-only. | The sandbox has no persistence contract. | Success states must say what was not created, sent, or saved. |
| DCF-008 | ACCEPTED | Do not fake persistence. | A UI demonstration must not imply durable effects. | No catalogue mutation, storage write, or invented pending state without approved persistence scope. |
| DCF-009 | ACCEPTED | Use stable internal IDs and resolve display names centrally. | Names can change and are not safe relational identifiers. | Forms, schemas, and assignments use stable IDs. |
| DCF-010 | ACCEPTED | Require human gates for business and architecture decisions. | Repository evidence cannot resolve product intent or architectural authority. | Codex stops on material ambiguity. |
| DCF-011 | ACCEPTED | Keep merge human-controlled. | Merge is the final product and repository authority boundary. | Automation, CI, and Reviewer PASS cannot merge. |
| DCF-012 | ACCEPTED | Bound autonomous delivery at an open pull request. | This permits useful execution while preserving human control. | Codex stops at a verified PR and waits for merge authority. |
| DCF-013 | ACCEPTED | Require minimal diffs and repository fit. | Small, conventional changes are easier to review and maintain. | Unrelated cleanup and unjustified new patterns fail review. |
| DCF-014 | ACCEPTED | Require an Engineering Quality Score of at least 8/10. | Passing commands alone does not establish human-grade quality. | No category may be 0 and every 0 or 1 requires justification. |
| DCF-015 | ACCEPTED | Track accepted technical debt explicitly. | Silent debt creates false assurance and loses remediation context. | Verified debt receives a stable ID, exposure statement, owner gate, and follow-up task. |
