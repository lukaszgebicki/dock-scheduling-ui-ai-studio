# Production Repository Reuse Matrix

| Component | Decision | Reason | First action |
| --- | --- | --- | --- |
| npm workspace topology | Reuse | Suitable modular-monolith shape. | Document and protect workspace boundaries. |
| React/Vite web | Reuse with change | Auth foundation is sound; product shell is placeholder. | Integrate product UI only through API-backed vertical slices. |
| Fastify API | Reuse with change | Good test seams and lightweight composition. | Harden errors, readiness, lifecycle and module registration. |
| PostgreSQL/Prisma | Reuse and extend | Correct transactional platform; schema is auth-only. | Add server RBAC/audit before booking entities. |
| Auth repositories/use cases | Reuse with change | Substantial tested login/refresh/reset implementation. | Add production identity/RBAC decision and shared limiter. |
| Pino/redaction | Reuse and extend | Strong auth-secret redaction. | Validate correlation IDs and add metrics/traces. |
| Basic CI | Reuse and harden | Reproducible unit/build pipeline. | Add audit and PostgreSQL integration jobs. |
| In-memory rate limiter | Retire as final production control | Per-process and reset-on-restart. | Keep port/tests; replace implementation or enforce at shared edge. |
| `/api/error` route | Retire | Diagnostic-only exposed route. | Remove in first remediation. |
| Current readiness handler | Replace | Can report ready without DB/auth routes and creates pools per probe. | Shared dependency probe with production fail-closed behavior. |
| AI Studio README | Replace | Incorrect setup and environment guidance. | Rewrite in first remediation. |
| `.env.example` | Replace | Malformed and incomplete. | Repair in first remediation. |
| AuthenticatedShell placeholder | Retire incrementally | Not a Dock Scheduling product UI. | Replace per vertical slice, not wholesale. |
| Noop password notifier | Retire for production | Cannot deliver reset workflow. | Introduce outbox/provider adapter in notification phase. |
