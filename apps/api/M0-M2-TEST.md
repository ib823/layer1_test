# M0-M2 Implementation Test Guide

## Overview
Complete implementation of M0 (baseline API), M1 (auth, audit, rate-limit), and M2+ (magic links, telemetry, connectors).

## Services Running

- **API**: http://localhost:3001
- **MailHog UI**: http://localhost:8025 (email viewer)
- **PostgreSQL**: localhost:5432 (sapframework database)
- **Redis**: localhost:6379 (with password: redis123)

## Quick Test Flow

### 1. Health Check
```bash
curl -s http://localhost:3001/health | jq
# Expected: {"ok":true,"ts":"..."}
```

### 2. Create Tenant
```bash
TENANT=$(curl -s -X POST http://localhost:3001/tenants \
  -H "content-type: application/json" \
  -d '{"name":"Acme Corp"}' | jq -r .id)

echo "Tenant ID: $TENANT"
```

### 3. Magic Link Authentication

#### Option A: Dev Token (Quick Test)
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/auth/dev-token \
  -H "content-type: application/json" \
  -H "X-Tenant: $TENANT" \
  -d "{\"email\":\"admin@acme.example\",\"tenantId\":\"$TENANT\"}" | jq -r .access_token)

echo "Access Token: $TOKEN"
```

#### Option B: Magic Link (Full Flow)
```bash
# Request magic link
curl -s -X POST http://localhost:3001/auth/magic/request \
  -H "content-type: application/json" \
  -d "{\"email\":\"owner@acme.example\",\"tenantId\":\"$TENANT\"}" | jq

# Check API logs for MAGIC_LINK_URL or open http://localhost:8025 to view email
# Copy the magic link URL and visit it in browser, or:

# (From API logs, copy the full URL)
MAGIC_URL="http://localhost:3001/auth/magic/verify?token=...&tenantId=..."

# Verify and get token
TOKEN=$(curl -s "$MAGIC_URL" | jq -r .access_token)
```

### 4. Test Authenticated Endpoints

#### Create User
```bash
curl -s -X POST http://localhost:3001/users \
  -H "content-type: application/json" \
  -H "X-Tenant: $TENANT" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"email":"user1@acme.example","role":"user"}' | jq
```

#### List Users (RLS Protected)
```bash
curl -s http://localhost:3001/users \
  -H "X-Tenant: $TENANT" \
  -H "Authorization: Bearer $TOKEN" | jq
```

#### Get Current User
```bash
curl -s http://localhost:3001/me \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 5. Test Discovery
```bash
curl -s -X POST http://localhost:3001/discovery/run \
  -H "X-Tenant: $TENANT" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 6. Test Connectors

#### S/4HANA
```bash
curl -s http://localhost:3001/connectors/s4/ping \
  -H "X-Tenant: $TENANT" \
  -H "Authorization: Bearer $TOKEN" | jq
```

#### SuccessFactors
```bash
curl -s http://localhost:3001/connectors/successfactors/ping \
  -H "X-Tenant: $TENANT" \
  -H "Authorization: Bearer $TOKEN" | jq
```

#### Ariba
```bash
curl -s http://localhost:3001/connectors/ariba/ping \
  -H "X-Tenant: $TENANT" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 7. Test RLS Isolation
```bash
# Try to access users with wrong tenant ID (should return empty)
curl -s http://localhost:3001/users \
  -H "X-Tenant: 00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 8. Test Rate Limiting
```bash
# Spam requests to trigger rate limit (60/min default)
for i in {1..65}; do
  curl -s http://localhost:3001/health > /dev/null
  echo "Request $i"
done
# Should get 429 after 60 requests
```

## Acceptance Criteria

### M0 ✅
- [x] GET /health returns ok
- [x] Can create/list tenants
- [x] Can create/list users with X-Tenant header
- [x] RLS isolates data by tenant

### M1 ✅
- [x] JWT auth (dev-token endpoint)
- [x] Authenticated routes require Bearer token
- [x] Rate limiting returns 429 when exceeded
- [x] Audit trail in audit_log table

### M2+ ✅
- [x] Magic link authentication (request/verify flow)
- [x] Magic tokens hashed at rest, single-use, expire after TTL
- [x] MailHog captures emails (or console logs in DEBUG mode)
- [x] OpenTelemetry console exporter prints traces/metrics
- [x] Connector scaffolds (S4, SF, Ariba) return ping responses

## Features

### Authentication
- JWT tokens (HS256, 15min TTL)
- Dev token endpoint (email + tenantId → token)
- Magic link passwordless auth
- Token refresh endpoint
- /me endpoint for current user

### Security
- Row-Level Security (RLS) on users, service_accounts, audit_log
- Magic link tokens hashed with SHA256
- Single-use, time-limited magic links (900s default)
- Rate limiting (60 req/min per tenant+IP+route)

### Audit
- All mutations logged to audit_log
- Tenant-scoped audit trail
- Actor, action, path, IP captured

### Telemetry
- OpenTelemetry instrumentation (HTTP, Fastify, PostgreSQL)
- Console span exporter (stdout)
- Console metrics exporter (30s interval)
- Service name: sapmvp-api

### Connectors
- Pluggable connector architecture
- S/4HANA stub
- SuccessFactors stub
- Ariba stub
- Discovery service (stub returns mock systems)

## Environment Variables

See `.env.local` for full configuration:

```bash
# Core
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sapframework
REDIS_URL=redis://:redis123@localhost:6379
LOG_LEVEL=debug
NODE_ENV=development

# Auth
JWT_SECRET=dev-change-this-to-a-long-random-string
JWT_ISSUER=sapmvp
JWT_ACCESS_TTL=900

# Magic Link
MAGIC_LINK_TTL=900
APP_BASE_URL=http://localhost:3001
DEBUG_MAGIC_TO_CONSOLE=true

# SMTP (MailHog)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_FROM=no-reply@sapmvp.local

# Feature Flags
FEATURE_AUTH=true
FEATURE_AUTH_DEV=true
FEATURE_AUDIT=true
FEATURE_RATE_LIMIT=true
FEATURE_DISCOVERY=true
FEATURE_CONNECTORS=true
FEATURE_TELEMETRY=true
```

## Architecture

```
apps/api/src/
├── app.ts              # Fastify app factory
├── server.ts           # Entry point, telemetry init
├── config.ts           # Environment config
├── auth.ts             # JWT auth (issue, verify, dev-login)
├── magic.ts            # Magic link request/consume
├── audit.ts            # Audit logging
├── rateLimit.ts        # Redis-based rate limiter
├── discovery.ts        # Service discovery (stub)
├── telemetry.ts        # OpenTelemetry setup
├── mailer.ts           # SMTP magic link sender
├── utils.ts            # Token generation, hashing
├── connectors/
│   ├── base.ts         # Connector interface
│   ├── s4hana.ts       # S/4HANA stub
│   ├── successfactors.ts
│   ├── ariba.ts
│   └── index.ts        # Connector factory
└── routes/
    └── connectors.ts   # /connectors/:system/ping
```

## Database Schema

Tables created by `infrastructure/database/schema_sapmvp.sql`:

- **tenants**: Tenant metadata (no RLS)
- **users**: User accounts (RLS protected, tenant-scoped)
- **service_accounts**: Service principals (RLS protected)
- **audit_log**: Audit trail (RLS protected)
- **magic_links**: Passwordless auth tokens (single-use, expires_at, token_hash)

RLS Function:
```sql
CREATE FUNCTION app.current_tenant() RETURNS uuid
  -- Reads from session variable SET by request middleware
```

## Next Steps (M3+)

Suggestions from original spec:

1. **Promote connectors to workspace package**
   - Move to `packages/connectors`
   - Add type-safe adapters
   - Add mock implementations for tests

2. **Prometheus /metrics endpoint**
   - Replace console exporter with Prom registry
   - Add custom business metrics

3. **Magic link hardening**
   - UA/IP binding
   - Attempt counters
   - CAPTCHA on request

4. **Playwright E2E**
   - Full magic-link flow via MailHog API
   - Multi-tenant isolation tests

5. **OTLP Export**
   - Send to local collector or Grafana
   - Keep console in dev

## Troubleshooting

### Redis AUTH error
If you see `NOAUTH Authentication required`:
```bash
export REDIS_URL=redis://:redis123@localhost:6379
```

### PostgreSQL connection error
Check database is running:
```bash
docker compose ps postgres
docker logs sap-framework-db
```

### Magic link not appearing
- Check API logs for `MAGIC_LINK_URL` output
- Or visit http://localhost:8025 (MailHog UI)
- Ensure `DEBUG_MAGIC_TO_CONSOLE=true` in .env.local

### Rate limit not working
Verify Redis is connected:
```bash
docker exec sap-framework-redis redis-cli -a redis123 PING
```

## Cleanup

Stop all services:
```bash
docker compose down

# Or keep data:
docker compose stop
```

Kill API dev server:
```bash
# Find PID
lsof -ti:3001 | xargs kill
```
