# Engineering quality

Passing tests is necessary but not sufficient. A change must look like a
natural extension of this repository written by an experienced
engineer, not isolated boilerplate produced from a prompt.

## Repository fit

Before implementation, inspect comparable repository examples for every
affected concern: routes, shell navigation, forms, schemas, demo data,
responsive presentations, accessibility, and tests as applicable.
Record reused patterns in the implementation plan.

Prefer existing conventions. A new pattern requires explicit
architectural justification and human approval when it changes an
architectural boundary.

## Smallest coherent change

Implement the smallest complete change satisfying the approved
acceptance criteria. Do not include unrelated refactors, rename churn,
formatting churn, opportunistic cleanup, or speculative
future-proofing.

## Abstraction discipline

A new abstraction must remove meaningful duplication, represent a
domain concept, enforce an invariant, isolate a real boundary, or
materially improve readability or testability. A single-use abstraction
requires written justification.

Do not create generic helpers, managers, adapters, wrappers, or hooks
merely to reduce line count.

## Language and comments

Use business and technical names that communicate intent. Reject names
such as `processData`, `handleStuff`, `genericHelper`, `commonUtils`,
`dataManager`, and `itemProcessor`.

Comments explain why, not what. Comments may document a business rule,
security decision, external constraint, or tracked workaround. Remove
comments that restate visible code.

## Defensive coding

Handle untrusted input and explicit contract states. Do not handle
states excluded by types and trusted contracts, hide failure behind a
silent fallback, or duplicate validation already guaranteed by a schema
or trusted boundary.

## React discipline

Do not add `useMemo`, `useCallback`, `React.memo`, context, reducers, or
custom hooks by default. Each requires a demonstrated need or matching
repository pattern. Do not split components solely to reduce line
count.

## Test quality

Tests should verify user-observable behavior, contracts, business rules,
accessibility, side effects, and regressions. Reject:

- placeholder assertions or broad snapshots;
- implementation-detail coupling;
- optional-chain DOM assertions;
- forced non-null assertions;
- weak `toBeDefined` checks for nullable queries;
- greater-than-zero assertions where the contract is exact;
- tests that stay green when required behavior is removed.

## Simplification Pass

After initial validation passes, the Builder must:

1. reread the complete diff;
2. remove scaffolding;
3. remove dead code;
4. remove unnecessary indirection;
5. remove speculative options;
6. replace generic names;
7. remove obvious comments;
8. justify every new file;
9. justify every new abstraction;
10. rerun complete validation.

## Independent AI-code smell review

The Reviewer explicitly checks for excessive boilerplate, generic
naming, one-use abstraction layers, duplicated source-of-truth data,
redundant validation, unnecessary memoization, unnecessary `try/catch`,
silent fallbacks, over-fragmented files, speculative future-proofing,
mechanically generated tests, unrelated cleanup, and style inconsistent
with adjacent files.

## Engineering Quality Score

Score each category from 0 to 2:

1. repository fit;
2. simplicity;
3. domain and technical clarity;
4. validation quality and confidence;
5. maintainability.

For code, category four covers tests and regression confidence. For
documentation or governance, it covers factual verification, policy
consistency, link integrity, and confidence in the recorded evidence.

PASS requires at least 8/10, no category scored 0, and no unresolved
task-specific `LOW`, `MEDIUM`, `HIGH`, or `BLOCKER` finding. Every score
of 0 or 1 requires written justification.

Human reviewers may reject a green change that introduces unnecessary
complexity or does not fit the repository.
