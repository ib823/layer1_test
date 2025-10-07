# 👨‍💼 SAP MVP Framework - Administrator User Manual

**Version:** 1.0.0
**Last Updated:** 2025-10-05
**Audience:** System Administrators, SAP Basis Team, Platform Operators

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [System Requirements](#system-requirements)
3. [Installation & Setup](#installation--setup)
4. [Tenant Management](#tenant-management)
5. [Service Discovery](#service-discovery)
6. [Module Management](#module-management)
7. [User Access & Security](#user-access--security)
8. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
9. [Backup & Recovery](#backup--recovery)
10. [API Reference](#api-reference)

---

## 1. Introduction

### What is SAP MVP Framework?

The SAP MVP Framework is an enterprise GRC (Governance, Risk, Compliance) platform that:
- **Automatically discovers** available SAP services in your environment
- **Analyzes user access** for Segregation of Duties (SoD) violations
- **Manages multiple tenants** with isolated data
- **Provides compliance** features (GDPR, audit trails)

### Administrator Responsibilities

As an administrator, you will:
- ✅ Onboard new tenants (companies/business units)
- ✅ Configure SAP connections
- ✅ Run service discovery to detect capabilities
- ✅ Activate/deactivate modules based on needs
- ✅ Monitor system health and performance
- ✅ Manage user access and security
- ✅ Troubleshoot issues and review logs

---

## 2. System Requirements

### Infrastructure

**Minimum Requirements:**
- PostgreSQL 12+ (Production: 15+)
- Node.js 18+ LTS
- 4GB RAM minimum (8GB recommended)
- 20GB disk space

**SAP System Requirements:**
- SAP S/4HANA 2020 or later (for full functionality)
- OData v2 API enabled
- Required SAP services activated (see below)

**Required SAP Services for SoD Analysis:**
- `API_USER_SRV` - User data access
- `API_ROLE_SRV` - Role assignments
- `API_AUTHORIZATION_OBJ_SRV` - Authorization objects

**Optional SAP Services:**
- `API_WORKFLOW_SRV` - Workflow integration
- SAP IPS (Identity Provisioning Service)
- SAP Ariba (future support)
- SAP SuccessFactors (future support)

### Network & Firewall

**Required Ports:**
- 3000 - API Server (configurable)
- 5432 - PostgreSQL
- 6379 - Redis (for rate limiting)

**Outbound Access Required:**
- SAP system (typically port 443/8443)
- SAP BTP services (if deployed on BTP)

---

## 3. Installation & Setup

### Option A: Local Development Setup

#### Step 1: Install Dependencies

```bash
# Clone repository
git clone https://github.com/ib823/layer1_test.git
cd layer1_test

# Install dependencies using pnpm
pnpm install

# Build all packages
pnpm build
```

#### Step 2: Setup PostgreSQL Database

```bash
# Start PostgreSQL (Docker)
docker run -d --name sap-framework-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=sapframework \
  -p 5432:5432 \
  postgres:15

# Apply database schema
psql -h localhost -U postgres -d sapframework < infrastructure/database/schema.sql
```

#### Step 3: Configure Environment Variables

Create `.env` file in the root:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sapframework

# API Server
PORT=3000
NODE_ENV=development

# Authentication (set to true for production)
AUTH_ENABLED=false

# Encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
ENCRYPTION_MASTER_KEY=your-base64-encoded-32-byte-key

# SAP Connections (default values - override per tenant)
SAP_BASE_URL=https://your-sap-system.com
SAP_CLIENT=100

# Logging
LOG_LEVEL=info
```

#### Step 4: Start the API Server

```bash
# Development mode (watch mode)
pnpm dev

# Production mode
pnpm build
pnpm start
```

#### Step 5: Verify Installation

```bash
# Check health
curl http://localhost:3000/api/health

# Expected response:
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-10-05T10:30:00.000Z",
    "uptime": 123.45
  }
}
```

### Option B: SAP BTP Cloud Foundry Deployment

#### Prerequisites

- Cloud Foundry CLI installed (`cf --version`)
- SAP BTP account with Cloud Foundry enabled
- Required services: PostgreSQL, XSUAA, Destination

#### Deployment Steps

```bash
# Login to Cloud Foundry
cf login -a https://api.cf.us10.hana.ondemand.com

# Create PostgreSQL service
cf create-service postgresql-db v9.6-dev sap-mvp-db

# Create XSUAA service
cf create-service xsuaa application sap-mvp-xsuaa -c infrastructure/cloud-foundry/xsuaa-config.json

# Deploy application
cf push -f infrastructure/cloud-foundry/manifest.yml

# Check status
cf apps
cf logs sap-mvp-api --recent
```

**Detailed deployment guide:** See `docs/BTP_DEPLOYMENT.md`

---

## 4. Tenant Management

### 4.1 Creating a New Tenant

**Scenario:** Onboarding a new company "ACME Corporation"

#### Via API

```bash
POST /api/admin/tenants
Content-Type: application/json

{
  "tenant_id": "acme",
  "company_name": "ACME Corporation"
}

# Response:
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tenant_id": "acme",
    "company_name": "ACME Corporation",
    "status": "ACTIVE",
    "created_at": "2025-10-05T10:00:00.000Z"
  }
}
```

#### Via Database (Direct)

```sql
INSERT INTO tenants (tenant_id, company_name, status)
VALUES ('acme', 'ACME Corporation', 'ACTIVE');
```

### 4.2 Adding SAP Connection

**Important:** Credentials are encrypted using AES-256-GCM before storage.

```bash
POST /api/admin/tenants/:tenantId/connections
Content-Type: application/json

{
  "connection_type": "S4HANA",
  "base_url": "https://s4hana.acme.com",
  "auth_type": "OAUTH",
  "auth_credentials": {
    "client_id": "your_client_id",
    "client_secret": "your_client_secret",
    "token_url": "https://s4hana.acme.com/oauth/token",
    "scope": "API_USER_SRV API_ROLE_SRV"
  }
}
```

**Alternative Auth Types:**

**Basic Authentication:**
```json
{
  "connection_type": "S4HANA",
  "base_url": "https://s4hana.acme.com",
  "auth_type": "BASIC",
  "auth_credentials": {
    "username": "ADMIN",
    "password": "your_password"
  }
}
```

**Certificate Authentication:**
```json
{
  "connection_type": "S4HANA",
  "base_url": "https://s4hana.acme.com",
  "auth_type": "CERTIFICATE",
  "auth_credentials": {
    "cert": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
    "key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
  }
}
```

### 4.3 Listing Tenants

```bash
GET /api/admin/tenants

# Response:
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "tenant_id": "acme",
      "company_name": "ACME Corporation",
      "status": "ACTIVE",
      "created_at": "2025-10-05T10:00:00.000Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "tenant_id": "contoso",
      "company_name": "Contoso Ltd",
      "status": "ACTIVE",
      "created_at": "2025-10-04T09:00:00.000Z"
    }
  ]
}
```

### 4.4 Updating Tenant

```bash
PUT /api/admin/tenants/:tenantId
Content-Type: application/json

{
  "company_name": "ACME Corp (Updated)",
  "status": "ACTIVE"
}
```

### 4.5 Deleting Tenant

**⚠️ Warning:** This will delete ALL tenant data (connections, profiles, violations).

```bash
DELETE /api/admin/tenants/:tenantId

# Confirmation required in production
```

**Database Cascade:** Foreign keys are configured with `ON DELETE CASCADE`, so all related data is automatically removed.

---

## 5. Service Discovery

### 5.1 Running Service Discovery

Service discovery automatically scans the tenant's SAP system to detect available OData services.

```bash
POST /api/admin/tenants/:tenantId/discovery

# Response:
{
  "success": true,
  "data": {
    "version": "SAP S/4HANA 2021",
    "services": [
      {
        "name": "User Management API",
        "technicalName": "API_USER_SRV",
        "version": "v1",
        "endpoint": "/sap/opu/odata/sap/API_USER_SRV",
        "status": "ACTIVE",
        "type": "OData v2"
      },
      {
        "name": "Role Management API",
        "technicalName": "API_ROLE_SRV",
        "version": "v1",
        "endpoint": "/sap/opu/odata/sap/API_ROLE_SRV",
        "status": "ACTIVE",
        "type": "OData v2"
      }
      // ... 50+ more services
    ],
    "capabilities": {
      "canDoSoD": true,
      "canAccessUsers": true,
      "canAccessRoles": true,
      "canAccessAuthorizations": true,
      "canAccessWorkflows": false
    },
    "missingServices": [
      "API_WORKFLOW_SRV"
    ],
    "recommendedActions": [
      {
        "action": "ACTIVATE_SERVICE",
        "service": "API_WORKFLOW_SRV",
        "reason": "Enable workflow integration",
        "priority": "MEDIUM"
      }
    ]
  }
}
```

### 5.2 Understanding Discovery Results

#### Service Status
- **ACTIVE**: Service is available and accessible
- **INACTIVE**: Service exists but not activated in SAP
- **RESTRICTED**: Permissions insufficient
- **UNAVAILABLE**: Service not found

#### Capabilities
- `canDoSoD`: Can perform Segregation of Duties analysis
- `canAccessUsers`: Can read user data
- `canAccessRoles`: Can read role assignments
- `canAccessAuthorizations`: Can read authorization objects
- `canAccessWorkflows`: Can integrate with SAP workflows

#### Missing Services
Lists SAP services that are required for certain features but not available in the tenant's system.

**Common Missing Services:**
- `API_WORKFLOW_SRV` - Required for workflow automation
- `API_AUDIT_SRV` - Required for enhanced audit logging
- `API_BUSINESS_PARTNER` - Required for BP-related compliance

### 5.3 Viewing Capability Profile

```bash
GET /api/admin/tenants/:tenantId/profile

# Response:
{
  "success": true,
  "data": {
    "tenant_id": "acme",
    "sap_version": "SAP S/4HANA 2021",
    "discovered_at": "2025-10-05T10:30:00.000Z",
    "available_services": [...],
    "capabilities": {...},
    "missing_services": [...],
    "recommended_actions": [...]
  }
}
```

### 5.4 Service Discovery History

All discovery runs are logged for audit purposes.

```sql
-- View discovery history
SELECT
  tenant_id,
  services_count,
  success,
  discovered_at
FROM service_discovery_history
WHERE tenant_id = (SELECT id FROM tenants WHERE tenant_id = 'acme')
ORDER BY discovered_at DESC;
```

---

## 6. Module Management

### 6.1 Available Modules

| Module | Status | Requirements |
|--------|--------|--------------|
| **SoD Analysis** | ✅ Operational | API_USER_SRV, API_ROLE_SRV, API_AUTHORIZATION_OBJ_SRV |
| **Invoice Matching** | ⏳ Planned v1.1 | FI-related services |
| **Anomaly Detection** | ⏳ Planned v2.0 | Audit log services + ML |

### 6.2 Listing Active Modules

```bash
GET /api/admin/tenants/:tenantId/modules

# Response:
{
  "success": true,
  "data": [
    {
      "module_name": "SoD_Analysis",
      "is_active": true,
      "activation_reason": "Auto-activated after service discovery",
      "activated_at": "2025-10-05T10:30:00.000Z"
    }
  ]
}
```

### 6.3 Manually Activating a Module

```bash
POST /api/admin/tenants/:tenantId/modules/SoD_Analysis/activate

# Response:
{
  "success": true,
  "data": {
    "module_name": "SoD_Analysis",
    "is_active": true,
    "activated_at": "2025-10-05T11:00:00.000Z"
  }
}
```

### 6.4 Deactivating a Module

```bash
POST /api/admin/tenants/:tenantId/modules/SoD_Analysis/deactivate

# Response:
{
  "success": true,
  "data": {
    "module_name": "SoD_Analysis",
    "is_active": false,
    "deactivated_at": "2025-10-05T11:30:00.000Z"
  }
}
```

### 6.5 Module Activation Logic

**Automatic Activation:**
Modules are automatically activated when:
1. Service discovery completes successfully
2. Tenant has all required SAP services
3. Permissions are verified

**Manual Override:**
Administrators can:
- Activate modules even if requirements aren't met (may fail at runtime)
- Deactivate modules to disable features temporarily

---

## 7. User Access & Security

### 7.1 Authentication (XSUAA)

**Current Status:** Authentication is **optional** (controlled by `AUTH_ENABLED` env var).

**Production Deployment:** Set `AUTH_ENABLED=true` in environment.

#### Enabling Authentication

1. **Update `.env`:**
```bash
AUTH_ENABLED=true
```

2. **Restart API server:**
```bash
pnpm build
pnpm start
```

3. **Obtain JWT Token (via SAP BTP XSUAA):**
```bash
curl -X POST https://your-xsuaa.authentication.us10.hana.ondemand.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=your_client_id" \
  -d "client_secret=your_client_secret"

# Response:
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 43199
}
```

4. **Use Token in API Requests:**
```bash
GET /api/admin/tenants
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

### 7.2 Role-Based Access Control (RBAC)

**JWT Claims (from XSUAA):**
```json
{
  "user_id": "admin@acme.com",
  "user_name": "Admin User",
  "tenant_id": "acme",
  "scope": [
    "sap-mvp.admin",
    "sap-mvp.analyst",
    "sap-mvp.viewer"
  ]
}
```

**Permission Levels:**
- `sap-mvp.admin` - Full access (CRUD tenants, run discovery, configure)
- `sap-mvp.analyst` - Run analysis, view violations, export data
- `sap-mvp.viewer` - Read-only access to violations and reports

**Middleware Implementation:**
```typescript
// packages/api/src/middleware/auth.ts

export const requireRole = (role: string) => {
  return (req, res, next) => {
    const userScopes = req.user.scope || [];
    if (!userScopes.includes(role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Required role: ${role}`
      });
    }
    next();
  };
};
```

### 7.3 Credential Encryption

**All SAP credentials are encrypted at rest using AES-256-GCM.**

#### Encryption Key Management

**Development:**
```bash
# Generate encryption key
node -e "console.log('ENCRYPTION_MASTER_KEY=' + require('crypto').randomBytes(32).toString('base64'))"

# Output:
ENCRYPTION_MASTER_KEY=Kj3nF9xP2sQ7vB1mN8cR5tY4wZ6eA0dL3gH7iJ9kM2o=
```

**Production (SAP BTP):**
1. Store key in **BTP Credential Store** service
2. Never commit keys to Git
3. Rotate keys annually

#### How Encryption Works

**Encryption (on INSERT):**
```typescript
// packages/core/src/utils/encryption.ts
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_MASTER_KEY!, 'base64');

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}
```

**Decryption (on SELECT):**
```typescript
export function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### 7.4 Rate Limiting

**Status:** ⏳ TODO (Day 4 of production roadmap)

**Planned Implementation:**
- 10 requests/min for public endpoints
- 100 requests/min for authenticated users
- 1000 requests/min for admin users
- Redis-backed storage

---

## 8. Monitoring & Troubleshooting

### 8.1 Health Check

```bash
GET /api/health

# Response:
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-10-05T12:00:00.000Z",
    "uptime": 3600.5
  }
}
```

### 8.2 Detailed Monitoring

```bash
GET /api/monitoring/health

# Response:
{
  "success": true,
  "data": {
    "api": {
      "status": "UP",
      "response_time_ms": 15
    },
    "database": {
      "status": "UP",
      "connection_pool": {
        "total": 20,
        "idle": 15,
        "waiting": 0
      }
    },
    "sap_connectors": {
      "s4hana": {
        "status": "UP",
        "circuit_breaker": "CLOSED",
        "last_check": "2025-10-05T11:59:00.000Z"
      },
      "ips": {
        "status": "UP",
        "circuit_breaker": "CLOSED"
      }
    },
    "redis": {
      "status": "NOT_CONFIGURED"
    }
  }
}
```

### 8.3 System Statistics

```bash
GET /api/monitoring/stats

# Response:
{
  "success": true,
  "data": {
    "tenants": {
      "total": 5,
      "active": 4,
      "suspended": 1
    },
    "analysis_runs": {
      "total": 127,
      "completed": 120,
      "failed": 7,
      "avg_duration_seconds": 45
    },
    "violations": {
      "total": 1543,
      "high_risk": 234,
      "medium_risk": 876,
      "low_risk": 433
    }
  }
}
```

### 8.4 Viewing Logs

**Application Logs (Winston):**
```bash
# Logs are written to console and files
tail -f logs/application.log
tail -f logs/error.log
```

**Log Levels:**
- `error` - Critical errors requiring attention
- `warn` - Warnings (circuit breaker open, slow queries)
- `info` - Normal operations (tenant created, analysis completed)
- `debug` - Detailed debugging (HTTP requests, SQL queries)

**Setting Log Level:**
```bash
# .env
LOG_LEVEL=debug
```

### 8.5 Common Issues & Solutions

#### Issue: "Circuit breaker is open"

**Symptom:** SAP connector requests fail with circuit breaker error.

**Cause:** Multiple consecutive failures (5+) to SAP system.

**Solution:**
1. Check SAP system availability
2. Verify credentials are correct
3. Wait 60 seconds for circuit breaker to reset
4. Check network connectivity

```bash
# Force circuit breaker reset (restart API)
pnpm start
```

#### Issue: "Database connection pool exhausted"

**Symptom:** API requests timeout or fail.

**Cause:** Too many concurrent database queries.

**Solution:**
```typescript
// Increase pool size in connection string
DATABASE_URL=postgresql://user:pass@host/db?max=50
```

#### Issue: "Authentication failed"

**Symptom:** 401 Unauthorized errors.

**Cause:** Invalid/expired JWT token.

**Solution:**
1. Obtain new JWT token from XSUAA
2. Verify token expiration (`exp` claim)
3. Check scopes match required permissions

---

## 9. Backup & Recovery

### 9.1 Database Backup

**Daily Backup (Automated):**
```bash
# Add to crontab
0 2 * * * pg_dump sapframework | gzip > /backup/sapframework-$(date +\%Y\%m\%d).sql.gz
```

**Manual Backup:**
```bash
pg_dump -h localhost -U postgres sapframework > backup-$(date +%Y%m%d-%H%M).sql
```

### 9.2 Restore from Backup

```bash
# Drop and recreate database
psql -h localhost -U postgres -c "DROP DATABASE sapframework;"
psql -h localhost -U postgres -c "CREATE DATABASE sapframework;"

# Restore
psql -h localhost -U postgres sapframework < backup-20251005-1200.sql
```

### 9.3 Disaster Recovery Plan

**RTO (Recovery Time Objective):** 4 hours
**RPO (Recovery Point Objective):** 24 hours (daily backups)

**Recovery Steps:**
1. Restore database from latest backup
2. Redeploy API application
3. Verify health checks pass
4. Notify users of downtime window
5. Re-run service discovery for all tenants (if needed)

---

## 10. API Reference

**Full API documentation available at:**
```
http://localhost:3000/api-docs
```

**Swagger/OpenAPI specification:**
- Interactive API testing
- Request/response schemas
- Authentication examples

### Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/admin/tenants` | GET | List tenants |
| `/api/admin/tenants` | POST | Create tenant |
| `/api/admin/tenants/:id/discovery` | POST | Run discovery |
| `/api/admin/tenants/:id/profile` | GET | Get profile |
| `/api/modules/sod/analyze` | POST | Run SoD analysis |
| `/api/modules/sod/violations` | GET | List violations |
| `/api/modules/sod/export` | GET | Export CSV |
| `/api/monitoring/health` | GET | Detailed health |

---

## 📞 Support & Contact

**Technical Support:** ikmal.baharudin@gmail.com
**Repository:** https://github.com/ib823/layer1_test
**Documentation:** `/docs` directory

**Emergency Escalation:**
- Critical issues: Immediate response
- High priority: Within 4 hours
- Medium priority: Within 24 hours
- Low priority: Next business day

---

**End of Administrator Manual**
