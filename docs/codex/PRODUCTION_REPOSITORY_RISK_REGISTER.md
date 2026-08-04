# Production Repository Risk Register

| ID | Risk | Severity | Evidence | Required treatment |
| --- | --- | --- | --- | --- |
| PRR-001 | Critical/high dependency advisories are not merge-gated. | Critical | Latest CI install reports 3 critical, 7 high and 5 moderate vulnerabilities. | Capture exact audit graph and remediate targeted runtime findings. |
| PRR-002 | Database integration behavior is not exercised in required CI. | High | 28 auth integration/E2E tests are skipped. | PostgreSQL CI service, migrations and required integration job. |
| PRR-003 | Unhandled API errors can disclose internal messages. | High | Global handler returns `error.message` for 5xx. | Generic 5xx contract and focused leakage tests. |
| PRR-004 | Diagnostic endpoint is present in application composition. | High | `/api/error` intentionally throws. | Remove. |
| PRR-005 | Readiness can be green with no database and no auth routes. | High | `database:not_configured` returns 200. | Production fail-closed readiness using shared connection. |
| PRR-006 | Rate limiting is not shared across instances. | High | Process-local `Map`; proxy trust not explicit. | Shared/edge limiter and trusted proxy decision. |
| PRR-007 | No server RBAC or tenant/warehouse isolation. | High | Auth schema has no roles, organizations or grants. | Implement before business APIs. |
| PRR-008 | No transactional booking/capacity model. | High | No appointment/capacity entities or commands. | First product vertical slice after foundation. |
| PRR-009 | No graceful shutdown or DB drain. | Medium-high | `closeDb` is not connected to server lifecycle. | Signal/app close handling and tests. |
| PRR-010 | Developer environment guidance is unsafe/inaccurate. | Medium | AI Studio README and malformed `.env.example`. | Rewrite immediately. |
| PRR-011 | No deploy/IaC/rollback/backup evidence. | High for release | No runtime manifests or operational pipeline found. | Build in Production Foundation phases before pilot. |
| PRR-012 | Observability is limited to logs. | Medium-high | No metrics, traces, alert ownership or SLO evidence. | Observability foundation before vertical slice exit. |
