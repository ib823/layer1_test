# Sentinel Workbench — Execution Plan & Self-Validation Log

> Mode: **Autonomous, non-interactive.** All confirmations treated as YES.  
> Fallback: If cloud/BTP/CF credentials are absent, proceed in **local-only** mode.

## 0. Assumptions & Ports
- Node ≥ 18, pnpm installed.
- Local ports: API `3001`, Web `3000`, Storybook `6006`, Postgres `5432`, Redis `6379`.
- Env files: `.env` (dev), `.env.example` (reference).
- No real secrets committed. Dev JWT keys stored in `.secrets/`.

## 1. Bootstrap
- [ ] Initialize repo, root configs (`package.json`, `turbo.json`, etc.)
- [ ] Shared configs package created and linked.
- **Check:** `pnpm install`, `pnpm lint`, `pnpm typecheck` (non-blocking early).

## 2. Data & Services
- [ ] `docker-compose.yml` (Postgres, Redis) with healthchecks.
- [ ] Prisma schema for multi-tenant core entities; migrations applied.
- [ ] Seed script creates Demo tenant & Admin.
- **Check:** `docker compose up -d`, `prisma migrate dev`, `seed`.

## 3. API Service
- [ ] Fastify server with auth (prod XSUAA verifier; dev JWT signer/verifier).
- [ ] RBAC guard; OpenAPI; health endpoints.
- [ ] Issues CRUD, comments, workflow transitions (basic); audit trail.
- [ ] OTEL traces/metrics/logs configured.
- **Check:** build + e2e: `pnpm --filter api build && pnpm --filter api test`  
  Health probe: `curl :3001/health`.

## 4. Web App
- [ ] Next.js 15 (App Router), Tailwind, tokens from design system.
- [ ] Login (dev), projects list, issues list/detail, create/transition.
- [ ] Command palette, keyboard shortcuts, a11y baseline.
- **Check:** build + e2e: `pnpm --filter web build && pnpm --filter web test`.

## 5. Design System
- [ ] Tokens (CSS vars), primitives (Button/Input/Card/Modal/Toast/Menu/Badge/DataTable).
- [ ] Storybook with a11y + interaction tests.
- **Check:** `pnpm --filter design-system storybook -- --smoke-test`.

## 6. Jobs & Automation
- [ ] BullMQ worker; `automation:execute` and `sla:tick` processors.
- [ ] API emits events to Redis.
- **Check:** Start worker and ensure it subscribes without errors.

## 7. Adapters
- [ ] Email (dev transport), Slack (stub), Webhooks (HMAC).
- [ ] No-op if creds absent.
- **Check:** Unit tests for no-op and mock success.

## 8. Observability & SRE Docs
- [ ] OTEL shared package wired to API/Web/Jobs.
- [ ] `docs/op/slo.md` + `docs/security/threat-model.md`.
- **Check:** Traces appear (stdout) if no collector; metrics exported.

## 9. CI/CD & Security
- [ ] GitHub Actions `ci.yml`: install → typecheck → lint → test → build → SBOM → (cosign continue-on-error).
- [ ] Policies: `SECURITY.md`, `CONTRIBUTING.md`, `CODEOWNERS`, `LICENSE`.
- **Check:** Workflow passes on push (documented).

## 10. Terraform (Optional Local Validate)
- [ ] CF/BTP skeleton with variables and safe defaults.
- **Check:** `terraform init -backend=false && terraform validate`.

## 11. Final System Check
- [ ] `pnpm dev` runs compose + API + Web (and logs).
- [ ] Seeded demo login works (dev mode).
- [ ] OpenAPI served at `/docs`.
- [ ] Record any auto-fixes applied below.

---

## Self-Validation Log
- Paste command outputs (summarized) and any auto-fixes applied.
- Note fallbacks engaged (e.g., no CF creds → local-only).

