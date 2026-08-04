# PROD-REPO-ASSESSMENT-1 Evidence Index

## Production baseline

- Repository: `lukaszgebicki/dock-scheduling-app-ai-studio1707`
- Branch: `main`
- SHA: `c758e8403a4693fa7ba96081254072ad5d743aba`

## Inspected evidence

- root and workspace `package.json` files;
- `package-lock.json` dependency graph;
- `.github/workflows/ci.yml`;
- latest successful PR CI run #29 and job logs;
- `prisma/schema.prisma` and `prisma.config.ts`;
- database configuration resolver;
- API app, server, database, configuration and logger modules;
- access-token, login and browser authentication modules;
- web router and authenticated shell;
- `.env.example` and README;
- merged PRs #1–#4 and repository commit history.

## Key quantitative evidence

- latest CI: typecheck, lint, tests and build succeeded;
- 248 tests passed;
- 28 database integration/E2E tests skipped;
- installation audit summary: 15 vulnerabilities — 5 moderate, 7 high, 3 critical;
- Prisma schema: four auth models and one user-status enum;
- product business routes/entities: none beyond authentication and placeholder shell.

## Confidence limitations

- No live infrastructure, database contents, cloud configuration, secrets or production traffic were inspected.
- The connector environment could not perform a local network clone; repository source and CI evidence were read through the authorized GitHub connector.
- Exact vulnerability advisory paths require an explicit `npm audit --json` execution on a remediation branch.
