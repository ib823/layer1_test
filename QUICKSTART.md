# SAP MVP Framework - Quick Start Guide

Get up and running in 5 minutes! ⚡

---

## Prerequisites

- Node.js 20+
- pnpm 8.15+
- Docker & Docker Compose

---

## Option 1: Docker Compose (Recommended) 🐳

```bash
# 1. Clone and navigate
cd /workspaces/layer1_test

# 2. Create environment file
cp .env.example .env

# 3. Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Copy the output

# 4. Edit .env and add the key
nano .env
# Set: ENCRYPTION_MASTER_KEY=<paste-key-here>
# Save: Ctrl+X, Y, Enter

# 5. Start all services (PostgreSQL + Redis + API)
docker-compose up -d

# 6. Check logs
docker-compose logs -f

# 7. Test API
curl http://localhost:3000/api/health

# 8. Open Swagger docs
open http://localhost:3000/api-docs
```

**Services Running**:
- ✅ PostgreSQL on port 5432
- ✅ Redis on port 6379
- ✅ API on port 3000

---

## Option 2: Local Development (No Docker) 💻

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL
docker run -d --name sap-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=sapframework \
  -p 5432:5432 \
  postgres:15-alpine

# 3. Apply database schema
docker cp infrastructure/database/schema.sql sap-db:/tmp/
docker exec sap-db psql -U postgres -d sapframework -f /tmp/schema.sql

# 4. Start Redis
docker run -d --name sap-redis \
  -p 6379:6379 \
  redis:7-alpine

# 5. Generate encryption key
export ENCRYPTION_MASTER_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

# 6. Set environment
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sapframework"
export REDIS_URL="redis://localhost:6379"
export AUTH_ENABLED="true"
export NODE_ENV="development"
export PORT="3000"

# 7. Build all packages
pnpm build

# 8. Start API server
cd packages/api
pnpm dev
```

---

## Option 3: Frontend Development 🎨

```bash
# Terminal 1: Start API (using Option 1 or 2)
docker-compose up -d

# Terminal 2: Start frontend
cd packages/web
pnpm dev
```

**Frontend Running**:
- Dashboard: http://localhost:3001
- Violations: http://localhost:3001/violations
- Analytics: http://localhost:3001/analytics
- Admin: http://localhost:3001/admin/connectors

---

## Test the System 🧪

### 1. Health Check
```bash
curl http://localhost:3000/api/health
# Expected: {"status":"healthy"}
```

### 2. Version Check
```bash
curl http://localhost:3000/api/version
# Expected: {"version":"1.0.0",...}
```

### 3. Create Test Tenant
```bash
curl -X POST http://localhost:3000/api/admin/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-tenant-001",
    "name": "ACME Corporation",
    "status": "active"
  }'
```

### 4. Run SoD Analysis (Mock Data)
```bash
curl -X POST http://localhost:3000/api/modules/sod/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-tenant-001"
  }'
```

### 5. Get Violations
```bash
curl http://localhost:3000/api/modules/sod/violations
```

---

## Verify Installation ✅

```bash
# Check all services
docker-compose ps

# Should show:
# - sap-framework-db (postgres)  → healthy
# - sap-framework-redis (redis)  → healthy
# - sap-framework-api (node)     → healthy

# Check database
docker exec sap-framework-db psql -U postgres -d sapframework -c "\dt"

# Should show tables:
# - tenants
# - tenant_sap_connections
# - tenant_capability_profiles
# - service_discovery_history
# - tenant_module_activations
# - sod_violations
# - sod_analysis_runs
# - (+ 2 more from migrations)

# Check Redis
docker exec sap-framework-redis redis-cli ping
# Expected: PONG
```

---

## Common Commands 📝

```bash
# Restart services
docker-compose restart

# View logs
docker-compose logs -f api

# Stop everything
docker-compose down

# Stop and remove volumes (DANGER: deletes data)
docker-compose down -v

# Rebuild API container
docker-compose up -d --build api

# Run tests
pnpm test

# Build all packages
pnpm build

# Lint code
pnpm lint

# Type check
pnpm typecheck
```

---

## Troubleshooting 🔧

### Error: "Port 5432 already in use"
```bash
# Find process using port
lsof -ti:5432 | xargs kill -9

# Or change port in docker-compose.yml
ports:
  - "5433:5432"  # Use 5433 instead
```

### Error: "ENCRYPTION_MASTER_KEY not set"
```bash
# Generate and set key
export ENCRYPTION_MASTER_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

# Or add to .env file
echo "ENCRYPTION_MASTER_KEY=<your-key>" >> .env
```

### Error: "Database connection failed"
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check DATABASE_URL is correct
echo $DATABASE_URL

# Test connection
docker exec sap-framework-db psql -U postgres -c "SELECT 1"
```

### Error: "Redis connection failed"
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
docker exec sap-framework-redis redis-cli ping
```

---

## Next Steps 🚀

1. **Explore API Docs**: http://localhost:3000/api-docs
2. **Read Full Documentation**: `CLAUDE.md`
3. **Check Implementation Status**: `COMPLETION_SUMMARY.md`
4. **Review Project Roadmap**: `IMPLEMENTATION_ROADMAP.md`
5. **Run Tests**: `pnpm test`
6. **Deploy to Cloud**: See `docs/BTP_DEPLOYMENT.md`

---

## Environment Variables Reference

```bash
# Required
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sapframework
ENCRYPTION_MASTER_KEY=<generated-base64-key>
AUTH_ENABLED=true

# Optional (with defaults)
PORT=3000
NODE_ENV=development
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:3001

# Security (production)
SOD_ENFORCEMENT_ENABLED=true
DATA_RESIDENCY_ENABLED=true
ENCRYPTION_AT_REST_REQUIRED=true

# XSUAA (production only)
XSUAA_URL=<from-btp>
XSUAA_CLIENT_ID=<from-btp>
XSUAA_CLIENT_SECRET=<from-btp>
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│            (Next.js 15 + React 19)              │
│   /violations  /analytics  /users  /dashboard   │
└─────────────────────┬───────────────────────────┘
                      │
                      │ HTTP/REST
                      │
┌─────────────────────▼───────────────────────────┐
│                  API Layer                       │
│            (Express + XSUAA Auth)               │
│  /admin/tenants  /modules/sod  /monitoring      │
└─────────────────────┬───────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼──────┐ ┌───▼────┐ ┌──────▼───────┐
│   Services   │ │  Core  │ │   Modules    │
│   Layer 2    │ │ Layer 1│ │   Layer 3    │
├──────────────┤ ├────────┤ ├──────────────┤
│ RuleEngine   │ │SAP Con-│ │ User Access  │
│ Analytics    │ │nectors │ │   Review     │
│ Workflow     │ │Database│ │              │
└──────────────┘ └───┬────┘ └──────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼─────┐ ┌───▼────┐ ┌─────▼─────┐
│ PostgreSQL  │ │ Redis  │ │    SAP    │
│  Database   │ │ Cache  │ │  Systems  │
└─────────────┘ └────────┘ └───────────┘
```

---

## File Locations

```
Project Root
├── packages/
│   ├── api/              → REST API endpoints
│   ├── services/         → Analytics, Workflow, RuleEngine
│   ├── core/             → SAP connectors, Database, Utils
│   ├── user-access-review/ → SoD analysis module
│   └── web/              → Next.js frontend
├── infrastructure/
│   ├── database/         → SQL schema + migrations
│   ├── cloud-foundry/    → BTP deployment configs
│   └── scripts/          → Deployment scripts
├── docs/                 → Detailed documentation
├── .env.example          → Environment template
├── docker-compose.yml    → Local development stack
├── Dockerfile            → Production container build
└── QUICKSTART.md         → This file
```

---

## Support

- **Documentation**: `CLAUDE.md` (detailed instructions)
- **Completion Summary**: `COMPLETION_SUMMARY.md`
- **Contact**: ikmal.baharudin@gmail.com
- **Repository**: https://github.com/ib823/layer1_test

---

**Last Updated**: October 4, 2025
**Production Ready**: 85%

🤖 Generated with [Claude Code](https://claude.com/claude-code)
