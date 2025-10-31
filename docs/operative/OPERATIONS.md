# SAP MVP Framework - Operations Runbook

**Version:** 1.0
**Last Updated:** 2025-10-31
**Maintainer:** ikmal.baharudin@gmail.com

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Deployment](#deployment)
4. [Tenant Onboarding](#tenant-onboarding)
5. [Credential Management](#credential-management)
6. [Database Operations](#database-operations)
7. [Monitoring & Alerting](#monitoring--alerting)
8. [Incident Response](#incident-response)
9. [Rate Limiting Management](#rate-limiting-management)
10. [Backup & Recovery](#backup--recovery)
11. [Troubleshooting Guide](#troubleshooting-guide)
12. [Performance Tuning](#performance-tuning)
13. [Security Operations](#security-operations)

---

## System Overview

### Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| API Server | Node.js 20 + Express | REST API endpoints |
| Web UI | Next.js 15 | Frontend dashboard |
| Database | PostgreSQL 14+ | Multi-tenant data persistence |
| Cache | Redis 7+ | Rate limiting, sessions |
| Job Queue | Bull + Redis | Background jobs (optional) |

### Environments

- **Development**: Local development (localhost)
- **Staging**: Pre-production testing (staging.sap-mvp.cloud)
- **Production**: Live system (app.sap-mvp.cloud)

### Service URLs

- **Production API**: `https://api.sap-mvp.cloud`
- **Production UI**: `https://app.sap-mvp.cloud`
- **Staging API**: `https://api-staging.sap-mvp.cloud`
- **Health Check**: `https://api.sap-mvp.cloud/health`

---

## Architecture

### 4-Layer System

```
┌─────────────────────────────────────────────┐
│         Layer 4: API (REST Endpoints)       │
├─────────────────────────────────────────────┤
│    Layer 3: Modules (Business Logic)        │
│  SoD | Invoice Matching | GL Anomaly | ...  │
├─────────────────────────────────────────────┤
│     Layer 2: Services (Shared Logic)        │
│    Rule Engine | Analytics | Workflow       │
├─────────────────────────────────────────────┤
│       Layer 1: Core (Infrastructure)        │
│  Connectors | Auth | Events | Persistence   │
└─────────────────────────────────────────────┘
```

### Data Flow

1. Client → API Gateway → API Server
2. API Server → SAP Connectors → SAP Systems (S/4HANA, IPS, Ariba, SF)
3. API Server → PostgreSQL (persistence)
4. API Server → Redis (caching, rate limiting)

---

## Deployment

### Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL 14+
- Redis 7+ (optional but recommended)
- Cloud Foundry CLI (for BTP deployment)

### Environment Variables

Create `.env` file in project root:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/sapframework

# Encryption (generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
ENCRYPTION_MASTER_KEY=<base64-32-byte-key>

# Authentication
AUTH_ENABLED=true
JWT_SECRET=<your-jwt-secret>

# SAP Connectivity (default tenant for testing)
SAP_BASE_URL=https://your-sap-system.com
SAP_CLIENT=100
SAP_CLIENT_ID=<your-client-id>
SAP_CLIENT_SECRET=<your-client-secret>
SAP_TOKEN_URL=https://your-sap-system.com/oauth/token

# Redis (optional)
REDIS_URL=redis://localhost:6379

# API Configuration
PORT=3000
CORS_ORIGIN=http://localhost:3001
NODE_ENV=production

# Logging
LOG_LEVEL=info
```

### Deployment Steps

#### Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Build all packages
pnpm build

# 3. Setup database
createdb sapframework
psql sapframework < infrastructure/database/schema.sql
cd packages/core && npx prisma generate

# 4. Start services
pnpm dev
```

#### SAP BTP Cloud Foundry

```bash
# 1. Login to Cloud Foundry
cf login -a https://api.cf.us10.hana.ondemand.com

# 2. Create services
cf create-service postgresql-db small sapframework-db
cf create-service xsuaa application sapframework-xsuaa
cf create-service redis cache-small sapframework-redis

# 3. Build application
pnpm build

# 4. Push application
cf push -f infrastructure/cloud-foundry/manifest.yml

# 5. Verify deployment
cf apps
cf logs sapframework-api --recent
```

#### Docker Deployment

```bash
# Build image
docker build -t sap-mvp-framework:latest .

# Run container
docker run -d \
  --name sap-mvp-api \
  -p 3000:3000 \
  --env-file .env \
  sap-mvp-framework:latest

# Check logs
docker logs -f sap-mvp-api
```

---

## Tenant Onboarding

### Prerequisites

- Tenant ID (unique identifier)
- Tenant Name (display name)
- SAP system credentials (OAuth client ID/secret)
- SAP Gateway URL

### Onboarding Procedure

#### Step 1: Prepare Tenant Credentials

```bash
# Generate encryption master key for tenant (if needed)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### Step 2: Create Tenant via API

```bash
curl -X POST https://api.sap-mvp.cloud/api/admin/tenants \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "acme-corp",
    "tenantName": "ACME Corporation",
    "sapConfig": {
      "baseUrl": "https://acme.s4hana.ondemand.com",
      "client": "100",
      "authType": "OAUTH",
      "clientId": "ACME_CLIENT_ID",
      "clientSecret": "ACME_CLIENT_SECRET",
      "tokenUrl": "https://acme.s4hana.ondemand.com/oauth/token"
    }
  }'
```

#### Step 3: Run Service Discovery

```bash
curl -X POST https://api.sap-mvp.cloud/api/admin/discovery/run \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "acme-corp"
  }'
```

#### Step 4: Verify Tenant Profile

```bash
curl -X GET https://api.sap-mvp.cloud/api/admin/tenants/acme-corp/profile \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Response should include:
```json
{
  "tenantId": "acme-corp",
  "capabilities": {
    "canDoSoD": true,
    "canDoUserReview": true,
    "canDoGLAnomaly": true
  },
  "services": [...],
  "moduleStatus": {...}
}
```

#### Step 5: Activate Modules

```bash
curl -X POST https://api.sap-mvp.cloud/api/admin/tenants/acme-corp/modules/activate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "modules": ["sod-control", "gl-anomaly-detection", "invoice-matching"]
  }'
```

---

## Credential Management

### Credential Rotation Procedures

#### SAP OAuth Client Credentials

**Rotation Frequency:** Every 90 days

1. **Generate new credentials in SAP**
   - Login to SAP Gateway
   - Navigate to OAuth 2.0 Client Registration
   - Create new client or regenerate secret

2. **Update in database (encrypted)**
   ```sql
   UPDATE tenants
   SET sap_config = jsonb_set(
     sap_config,
     '{clientSecret}',
     '"NEW_SECRET"'::jsonb
   )
   WHERE tenant_id = 'acme-corp';
   ```

3. **Restart API servers** (for config reload)

4. **Verify connectivity**
   ```bash
   curl -X POST https://api.sap-mvp.cloud/api/admin/discovery/test \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d '{"tenantId": "acme-corp"}'
   ```

#### Encryption Master Key Rotation

**Rotation Frequency:** Annually or after security incident

⚠️ **WARNING**: This requires re-encrypting ALL sensitive data

1. **Generate new key**
   ```bash
   NEW_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
   echo "New key: $NEW_KEY"
   ```

2. **Run migration script** (TBD - requires implementation)
   ```bash
   node scripts/rotate-encryption-key.js \
     --old-key="$OLD_KEY" \
     --new-key="$NEW_KEY"
   ```

3. **Update environment variable**
   ```bash
   cf set-env sapframework-api ENCRYPTION_MASTER_KEY "$NEW_KEY"
   cf restage sapframework-api
   ```

#### Database Credentials

**Rotation Frequency:** Every 180 days

1. **Create new database user**
   ```sql
   CREATE USER sapframework_new WITH PASSWORD 'new_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE sapframework TO sapframework_new;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sapframework_new;
   ```

2. **Update connection string**
   ```bash
   cf set-env sapframework-api DATABASE_URL "postgresql://sapframework_new:new_pass@host/db"
   ```

3. **Restart application**
   ```bash
   cf restage sapframework-api
   ```

4. **Remove old user**
   ```sql
   DROP USER sapframework_old;
   ```

---

## Database Operations

### Daily Maintenance

#### Vacuum (Reclaim Storage)

```sql
-- Vacuum specific tenant tables
VACUUM ANALYZE tenants;
VACUUM ANALYZE sod_violations;
VACUUM ANALYZE invoice_match_runs;

-- Full database vacuum (run during low traffic)
VACUUMDB --full --analyze sapframework
```

#### Index Maintenance

```sql
-- Reindex for performance
REINDEX TABLE tenants;
REINDEX TABLE sod_violations;

-- Check for bloated indexes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

### Data Retention

#### Cleanup Old Data (90-day retention)

```sql
-- Delete old SoD violation runs (keep 90 days)
DELETE FROM sod_violations
WHERE detected_at < NOW() - INTERVAL '90 days';

-- Delete old invoice match runs
DELETE FROM "InvoiceMatchRun"
WHERE "runDate" < NOW() - INTERVAL '90 days';

-- Delete old GL anomaly runs
DELETE FROM "GLAnomalyRun"
WHERE "runDate" < NOW() - INTERVAL '90 days';
```

#### Archive Before Deletion (recommended)

```bash
# Export to CSV before deletion
psql sapframework -c "COPY (
  SELECT * FROM sod_violations
  WHERE detected_at < NOW() - INTERVAL '90 days'
) TO '/backups/archives/sod_violations_$(date +%Y%m%d).csv' CSV HEADER"

# Then delete
psql sapframework -c "DELETE FROM sod_violations WHERE detected_at < NOW() - INTERVAL '90 days'"
```

### Database Monitoring

```sql
-- Check active connections
SELECT count(*) as connections, state
FROM pg_stat_activity
WHERE datname = 'sapframework'
GROUP BY state;

-- Check slow queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
AND now() - query_start > interval '5 seconds'
ORDER BY duration DESC;

-- Check database size
SELECT pg_database.datname,
       pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE datname = 'sapframework';

-- Check table sizes
SELECT relname AS table_name,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;
```

---

## Monitoring & Alerting

### Health Checks

#### API Health Check

```bash
# Basic health
curl https://api.sap-mvp.cloud/health

# Database health
curl https://api.sap-mvp.cloud/health/database

# All services
curl https://api.sap-mvp.cloud/health/detailed
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-31T10:00:00Z",
  "uptime": 3600,
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "sapConnectivity": "healthy"
  }
}
```

### Key Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold | Action |
|--------|-------------------|-------------------|---------|
| API Response Time (p95) | 500ms | 1000ms | Check database queries, add indexes |
| Error Rate | 1% | 5% | Check logs, review recent deployments |
| Database Connections | 70% of max | 90% of max | Increase pool size, check for leaks |
| Memory Usage | 80% | 95% | Restart application, investigate memory leaks |
| Disk Usage | 75% | 90% | Run vacuum, delete old data, expand disk |
| Redis Memory | 75% | 90% | Clear expired keys, increase memory |

### Log Aggregation

Logs are structured JSON format via Winston:

```bash
# View recent logs
cf logs sapframework-api --recent

# Follow logs in real-time
cf logs sapframework-api

# Search for errors
cf logs sapframework-api | grep '"level":"error"'

# Search for specific tenant
cf logs sapframework-api | grep '"tenantId":"acme-corp"'
```

### Alert Configuration

Configure alerts in monitoring dashboard (Grafana/DataDog/etc):

1. **High Error Rate**: >5% errors in last 5 minutes
2. **Slow Response**: p95 >1s for 5 minutes
3. **Database Down**: Health check fails 3 times
4. **Redis Down**: Health check fails 3 times
5. **Circuit Breaker Open**: SAP connector circuit open >5 minutes

---

## Incident Response

### Severity Levels

| Level | Definition | Response Time | Example |
|-------|------------|---------------|---------|
| P1 - Critical | Complete outage | 15 minutes | API down, database crash |
| P2 - High | Partial outage | 1 hour | Single module failing |
| P3 - Medium | Performance degradation | 4 hours | Slow response times |
| P4 - Low | Minor issue | Next business day | UI cosmetic bug |

### Incident Response Playbook

#### P1: API Server Down

1. **Verify outage**
   ```bash
   curl -I https://api.sap-mvp.cloud/health
   ```

2. **Check application status**
   ```bash
   cf apps
   cf logs sapframework-api --recent | tail -100
   ```

3. **Restart application**
   ```bash
   cf restart sapframework-api
   ```

4. **If still down, check dependencies**
   ```bash
   # Check database
   psql $DATABASE_URL -c "SELECT 1"

   # Check Redis
   redis-cli -u $REDIS_URL ping
   ```

5. **Escalate if not resolved in 15 minutes**

#### P1: Database Crash

1. **Check database status**
   ```bash
   psql $DATABASE_URL -c "SELECT NOW()"
   ```

2. **If unresponsive, check disk space**
   ```bash
   df -h
   ```

3. **Restart PostgreSQL** (if self-hosted)
   ```bash
   sudo systemctl restart postgresql
   ```

4. **Restore from backup if corrupted**
   ```bash
   psql < /backups/sapframework_$(date +%Y%m%d).sql
   ```

5. **Verify data integrity**
   ```sql
   SELECT count(*) FROM tenants;
   SELECT count(*) FROM sod_violations;
   ```

#### P2: Module Failure (e.g., SoD Analysis)

1. **Check module logs**
   ```bash
   cf logs sapframework-api | grep "SoD"
   ```

2. **Test module directly**
   ```bash
   curl -X POST https://api.sap-mvp.cloud/api/modules/sod/analyze \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"tenantId": "test-tenant"}'
   ```

3. **Check SAP connectivity**
   ```bash
   curl -X POST https://api.sap-mvp.cloud/api/admin/discovery/test \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"tenantId": "acme-corp"}'
   ```

4. **Disable module if broken**
   ```bash
   curl -X POST https://api.sap-mvp.cloud/api/admin/tenants/acme-corp/modules/deactivate \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"modules": ["sod-control"]}'
   ```

---

## Rate Limiting Management

### Current Rate Limits

| Endpoint | Rate Limit | Window |
|----------|-----------|--------|
| Global (authenticated) | 100 requests | 1 minute |
| Public endpoints | 10 requests | 1 minute |
| Admin endpoints | 1000 requests | 1 minute |
| Service Discovery | 5 requests | 1 hour (per tenant) |
| SoD Analysis | 10 requests | 1 hour (per tenant) |

### Adjusting Rate Limits

Edit `packages/api/src/middleware/rateLimiting.ts`:

```typescript
export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Increase this for higher limits
  message: 'Too many requests',
  standardHeaders: true,
});
```

### Checking Rate Limit Status

```bash
# Check headers in response
curl -I https://api.sap-mvp.cloud/api/tenants \
  -H "Authorization: Bearer $TOKEN"

# Look for:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 95
# X-RateLimit-Reset: 1635772800
```

### Whitelisting IPs (Emergency)

Add to rate limiting middleware:

```typescript
const whitelist = ['10.0.0.1', '192.168.1.100'];

export const globalRateLimiter = rateLimit({
  skip: (req) => whitelist.includes(req.ip),
  // ...
});
```

---

## Backup & Recovery

### Backup Strategy

| Type | Frequency | Retention | Storage Location |
|------|-----------|-----------|------------------|
| Full Database | Daily (2 AM UTC) | 30 days | BTP Object Store |
| Incremental | Every 6 hours | 7 days | BTP Object Store |
| Transaction Logs | Continuous | 7 days | BTP Object Store |
| Configuration | On change | Forever | Git repository |

### Manual Backup

```bash
# Full database backup
pg_dump $DATABASE_URL > sapframework_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
pg_dump $DATABASE_URL | gzip > sapframework_$(date +%Y%m%d_%H%M%S).sql.gz

# Specific tables only
pg_dump $DATABASE_URL \
  --table=tenants \
  --table=sod_violations \
  > sapframework_core_$(date +%Y%m%d).sql
```

### Automated Backup Script

Create `/scripts/backup-database.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="/backups"
DATABASE_URL="$DATABASE_URL"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="sapframework_${TIMESTAMP}.sql.gz"

# Create backup
pg_dump $DATABASE_URL | gzip > "${BACKUP_DIR}/${FILENAME}"

# Upload to object storage (BTP/S3/Azure Blob)
aws s3 cp "${BACKUP_DIR}/${FILENAME}" s3://backups/sapframework/

# Delete backups older than 30 days
find $BACKUP_DIR -name "sapframework_*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${FILENAME}"
```

Schedule with cron:
```bash
0 2 * * * /scripts/backup-database.sh
```

### Restore Procedures

#### Full Restore

```bash
# Download backup
aws s3 cp s3://backups/sapframework/sapframework_20251031.sql.gz .

# Decompress
gunzip sapframework_20251031.sql.gz

# Restore
psql $DATABASE_URL < sapframework_20251031.sql

# Verify
psql $DATABASE_URL -c "SELECT count(*) FROM tenants;"
```

#### Point-in-Time Recovery (PITR)

```bash
# Restore to specific timestamp
pg_restore --create --clean \
  --if-exists \
  --jobs=4 \
  --dbname=$DATABASE_URL \
  sapframework_backup.dump
```

### Recovery Time Objectives (RTO/RPO)

- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 24 hours (daily backups)
- **For mission-critical deployments**: Consider hourly backups (RPO: 1 hour)

---

## Troubleshooting Guide

### Common Issues

#### Issue: API returns 500 errors

**Symptoms**: All endpoints returning 500 Internal Server Error

**Diagnosis**:
```bash
# Check logs
cf logs sapframework-api --recent | grep "error"

# Check database connectivity
psql $DATABASE_URL -c "SELECT NOW()"

# Check environment variables
cf env sapframework-api
```

**Resolution**:
1. Check if DATABASE_URL is correct
2. Verify ENCRYPTION_MASTER_KEY is set
3. Restart application: `cf restart sapframework-api`

---

#### Issue: "Circuit breaker open" errors

**Symptoms**: SAP API calls failing with circuit breaker error

**Diagnosis**:
```bash
# Check SAP connectivity
curl $SAP_BASE_URL/sap/opu/odata/sap/API_USER_SRV

# Check circuit breaker state in logs
cf logs sapframework-api | grep "circuit"
```

**Resolution**:
1. Wait 60 seconds for circuit breaker to half-open
2. If SAP system is down, coordinate with SAP Basis team
3. Manually close circuit breaker (requires code change)

---

#### Issue: Rate limit exceeded (429 errors)

**Symptoms**: Users getting "Too many requests" errors

**Diagnosis**:
```bash
# Check rate limit headers
curl -I https://api.sap-mvp.cloud/api/tenants \
  -H "Authorization: Bearer $TOKEN"
```

**Resolution**:
1. Identify offending IP/user: Check logs for high request count
2. Increase rate limits if legitimate: Edit `rateLimiting.ts`
3. Block malicious IPs: Add to firewall

---

#### Issue: Memory leak / High memory usage

**Symptoms**: Memory usage growing over time, eventual crash

**Diagnosis**:
```bash
# Check memory usage
cf app sapframework-api

# Enable Node.js heap profiling
cf set-env sapframework-api NODE_OPTIONS "--max-old-space-size=2048"
cf restage sapframework-api
```

**Resolution**:
1. Restart application immediately: `cf restart sapframework-api`
2. Review recent code changes for memory leaks
3. Add memory monitoring and alerts
4. Scale up memory allocation: Edit `manifest.yml`

---

#### Issue: Slow queries / Database performance

**Symptoms**: API slow, p95 response time >1s

**Diagnosis**:
```sql
-- Find slow queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;

-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
AND n_distinct > 100
ORDER BY abs(correlation) DESC;
```

**Resolution**:
1. Add missing indexes
2. Run VACUUM ANALYZE
3. Optimize queries (use EXPLAIN ANALYZE)
4. Increase database connection pool

---

## Performance Tuning

### Database Connection Pooling

Edit `packages/core/src/persistence/prisma.ts`:

```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  connection_limit: 100, // Increase for high traffic
});
```

### Redis Configuration

```bash
# Set max memory policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Set max memory
redis-cli CONFIG SET maxmemory 1gb
```

### Node.js Optimization

```bash
# Increase heap size for large datasets
cf set-env sapframework-api NODE_OPTIONS "--max-old-space-size=4096"

# Enable cluster mode (multiple processes)
cf set-env sapframework-api WEB_CONCURRENCY 4
```

---

## Security Operations

### Security Scanning

```bash
# NPM audit
npm audit --audit-level=high

# Snyk scan
npx snyk test

# OWASP dependency check
dependency-check --project sapframework --scan .
```

### SSL/TLS Certificate Renewal

For BTP deployments, certificates are managed automatically. For standalone:

```bash
# Using Let's Encrypt (certbot)
sudo certbot renew --nginx
sudo systemctl reload nginx
```

### Security Headers Verification

```bash
curl -I https://api.sap-mvp.cloud | grep -E "(X-|Strict|Content-Security)"
```

Expected headers:
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy`

---

## Appendix

### Contact Information

- **Primary On-call**: ikmal.baharudin@gmail.com
- **SAP Basis Team**: basis@company.com
- **Infrastructure Team**: infra@company.com

### Useful Links

- [GitHub Repository](https://github.com/company/sap-mvp-framework)
- [API Documentation](https://api.sap-mvp.cloud/api-docs)
- [User Manual](../END_USER_MANUAL.md)
- [Admin Manual](../ADMIN_USER_MANUAL.md)

### Maintenance Windows

- **Weekly**: Sundays 2:00-4:00 UTC
- **Monthly**: First Sunday 2:00-6:00 UTC
- **Emergency**: Immediate notification to all users

---

**END OF OPERATIONS RUNBOOK**
