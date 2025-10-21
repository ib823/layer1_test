# SAP MVP Framework - Production Deployment Guide

**Version**: 1.0.0
**Target Platform**: SAP Business Technology Platform (BTP) - Cloud Foundry
**Last Updated**: October 13, 2025

---

## Prerequisites

### 1. SAP BTP Account Setup
- ✅ SAP BTP Global Account with Cloud Foundry environment
- ✅ Cloud Foundry Space with appropriate quotas:
  - Memory: 4GB minimum
  - Services: 5 service instances minimum
- ✅ User with Space Developer role

### 2. Required Services
- PostgreSQL Database (v16)
- Redis Cache (medium plan)
- XSUAA (Application plan)
- SAP Destination Service (lite plan)
- SAP Connectivity Service (lite plan)

### 3. Tools Required
```bash
# Cloud Foundry CLI
cf version  # Should be v8+

# Multi-Target Application Plugin
cf plugins | grep multiapps  # Should show version 3.0+

# Node.js and pnpm
node --version  # Should be v20+
pnpm --version  # Should be v9+
```

---

## Deployment Steps

### Step 1: Prepare Environment

```bash
# Clone repository
git clone <repository-url>
cd layer1_test

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests to verify
pnpm test
```

### Step 2: Configure Environment Variables

Create `.env.production` file:

```bash
# Database Configuration (will be overridden by service binding)
DATABASE_URL=<managed-by-cf-service>

# Redis Configuration (will be overridden by service binding)
REDIS_URL=<managed-by-cf-service>

# API Configuration
NODE_ENV=production
AUTH_ENABLED=true
API_PORT=8080
LOG_LEVEL=info

# Security
JWT_SECRET=<generate-strong-secret>
ENCRYPTION_KEY=<generate-strong-key>

# SAP S/4HANA Configuration
SAP_CLIENT=<client-number>
SAP_LANGUAGE=EN
```

**Generate secrets:**
```bash
# JWT Secret (64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption Key (32 bytes base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Step 3: Login to Cloud Foundry

```bash
# Login to SAP BTP
cf login -a https://api.cf.eu10.hana.ondemand.com

# Target your org and space
cf target -o <your-org> -s <your-space>

# Verify target
cf target
```

### Step 4: Create Required Services

```bash
# Navigate to deployment directory
cd deploy/production

# Create PostgreSQL service
cf create-service postgresql-db v9.6-m sapmvp-postgres \
  -c '{"engine":"postgres","version":"16","storage":"20GB","backup_enabled":true}'

# Create Redis service
cf create-service redis-cache cache-medium sapmvp-redis

# Create XSUAA service (authentication)
cf create-service xsuaa application sapmvp-xsuaa -c xs-security-prod.json

# Create Destination service
cf create-service destination lite sapmvp-destination

# Create Connectivity service
cf create-service connectivity lite sapmvp-connectivity

# Verify services are created
cf services
```

**Wait for services to be ready:**
```bash
watch -n 5 'cf services | grep sapmvp'
# All services should show "create succeeded"
```

### Step 5: Database Migration

```bash
# Set DATABASE_URL from service binding
export DATABASE_URL=$(cf service-key sapmvp-postgres default | grep uri | awk '{print $2}')

# Run Prisma migrations
cd ../../packages/core
pnpm prisma migrate deploy

# Verify tables created
pnpm prisma studio  # Opens browser to verify schema
```

### Step 6: Deploy Application

**Option A: Using CF CLI**

```bash
cd deploy/production

# Deploy API
cf push sapmvp-api -f manifest.yml

# Deploy Web Frontend
cf push sapmvp-web -f manifest.yml

# Verify deployment
cf apps
```

**Option B: Using MTA Deployment** (Recommended)

```bash
cd deploy/production

# Build MTA archive
mbt build -p cf

# Deploy MTA
cf deploy mta_archives/sapmvp-prod_1.0.0.mtar

# Monitor deployment
cf dmol -i <deployment-id>
```

### Step 7: Configure Role Collections

```bash
# Login to BTP Cockpit
# Navigate to: Security > Role Collections

# Assign role collections to users:
# 1. SAP_MVP_SystemAdmin → Platform administrators
# 2. SAP_MVP_ComplianceManager → Compliance team
# 3. SAP_MVP_FinanceManager → Finance team
# 4. SAP_MVP_Auditor → Auditors
# 5. SAP_MVP_VendorManager → Vendor management team
```

### Step 8: Configure S/4HANA Destinations

```bash
# In BTP Cockpit: Connectivity > Destinations

# Create destination: SAPMVP_S4HANA
Name: SAPMVP_S4HANA
Type: HTTP
URL: https://<s4hana-host>:<port>
Proxy Type: Internet
Authentication: BasicAuthentication
User: <technical-user>
Password: <password>

Additional Properties:
- sap-client: <client-number>
- TrustAll: false
- WebIDEEnabled: true
- WebIDEUsage: odata_gen
```

### Step 9: Health Check Verification

```bash
# Check API health
curl https://sapmvp-api.cfapps.eu10.hana.ondemand.com/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-10-13T...",
  "checks": {
    "api": "healthy",
    "database": "healthy",
    "modules": "healthy"
  }
}

# Check database health
curl https://sapmvp-api.cfapps.eu10.hana.ondemand.com/api/health/database

# Check readiness probe
curl https://sapmvp-api.cfapps.eu10.hana.ondemand.com/api/health/ready

# Access Web UI
open https://sapmvp.cfapps.eu10.hana.ondemand.com
```

### Step 10: Initial Data Setup

```bash
# Create first tenant via API
curl -X POST https://sapmvp-api.cfapps.eu10.hana.ondemand.com/api/admin/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "name": "Production Tenant",
    "subdomain": "prod",
    "sapDestination": "SAPMVP_S4HANA",
    "config": {
      "modules": ["invoice-matching", "gl-anomaly", "vendor-quality", "sod-control"]
    }
  }'
```

---

## Post-Deployment Verification

### 1. Application Logs

```bash
# View API logs
cf logs sapmvp-api --recent

# Stream live logs
cf logs sapmvp-api

# Check for errors
cf logs sapmvp-api --recent | grep ERROR
```

### 2. Service Bindings

```bash
# Verify service bindings
cf env sapmvp-api

# Should show VCAP_SERVICES with all 5 services bound
```

### 3. Metrics and Monitoring

```bash
# Check application metrics
cf app sapmvp-api

# Memory usage should be < 80% of allocated
# CPU usage should be < 60%
# All instances should be "running"
```

### 4. Security Scan

```bash
# Run security audit
pnpm audit --production

# Check for vulnerabilities
pnpm audit --audit-level=moderate
```

### 5. Performance Testing

```bash
# Install k6 load testing tool
brew install k6

# Run load test
k6 run scripts/load-test.js
```

---

## Scaling Configuration

### Horizontal Scaling

```bash
# Scale API instances
cf scale sapmvp-api -i 4

# Scale Web instances
cf scale sapmvp-web -i 3

# Verify scaling
cf app sapmvp-api
```

### Vertical Scaling

```bash
# Increase memory for API
cf scale sapmvp-api -m 2048M

# Increase disk quota
cf scale sapmvp-api -k 1024M
```

### Auto-Scaling (Cloud Foundry App Autoscaler)

```bash
# Install autoscaler plugin
cf install-plugin app-autoscaler-plugin

# Create autoscaling policy
cf create-autoscaling-policy sapmvp-api autoscaling-policy.json

# Example policy:
{
  "instance_min_count": 2,
  "instance_max_count": 10,
  "scaling_rules": [
    {
      "metric_type": "memoryused",
      "threshold": 80,
      "operator": ">=",
      "adjustment": "+1"
    },
    {
      "metric_type": "memoryused",
      "threshold": 40,
      "operator": "<",
      "adjustment": "-1"
    }
  ]
}
```

---

## Backup and Recovery

### Database Backup

```bash
# Manual backup
cf create-service-key sapmvp-postgres backup-key
cf service-key sapmvp-postgres backup-key

# Use credentials to create pg_dump backup
pg_dump -h <host> -U <user> -d <database> > backup_$(date +%Y%m%d).sql
```

### Automated Backups

PostgreSQL service includes automated daily backups with 30-day retention.

To restore from backup:
```bash
cf update-service sapmvp-postgres -c '{"restore_from_backup":"backup_id_here"}'
```

---

## Monitoring and Alerting

### Application Logging

```bash
# Configure log streaming to SAP Cloud Logging
cf cups sapmvp-logging -l syslog-tls://<logging-endpoint>

# Bind to application
cf bind-service sapmvp-api sapmvp-logging
cf restage sapmvp-api
```

### Prometheus Metrics

```bash
# Metrics endpoint
curl https://sapmvp-api.cfapps.eu10.hana.ondemand.com/metrics

# Configure Prometheus scraping in BTP
# Cockpit > Observability > Prometheus
```

### Alerting Rules

Set up alerts for:
- ❗ Application downtime (health check failures)
- ⚠️ High memory usage (> 85%)
- ⚠️ Database connection errors
- ⚠️ Authentication failures (spike detection)
- 📊 Performance degradation (response time > 2s)

---

## Rollback Procedure

```bash
# List recent deployments
cf apps

# Rollback to previous version
cf rollback sapmvp-api

# Or use blue-green deployment for zero-downtime rollback:
cf push sapmvp-api-green -f manifest.yml
cf map-route sapmvp-api-green cfapps.eu10.hana.ondemand.com --hostname sapmvp-api
# Test green deployment
cf unmap-route sapmvp-api cfapps.eu10.hana.ondemand.com --hostname sapmvp-api
cf delete sapmvp-api -f
cf rename sapmvp-api-green sapmvp-api
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs for startup errors
cf logs sapmvp-api --recent | grep ERROR

# Common issues:
# 1. Database connection failure → Verify service binding
# 2. Missing environment variables → Check cf env sapmvp-api
# 3. Port binding issues → Verify $PORT is used (not hardcoded)
```

### Database Connection Issues

```bash
# Test database connectivity
cf ssh sapmvp-api
$ curl $DATABASE_URL  # Should connect

# Recreate service binding if needed
cf unbind-service sapmvp-api sapmvp-postgres
cf bind-service sapmvp-api sapmvp-postgres
cf restage sapmvp-api
```

### Authentication Failures

```bash
# Verify XSUAA service
cf service sapmvp-xsuaa

# Check role collections assigned
# BTP Cockpit > Security > Users > <user> > Role Collections

# Regenerate service key if needed
cf delete-service-key sapmvp-xsuaa default
cf create-service-key sapmvp-xsuaa default
```

### Performance Issues

```bash
# Check application metrics
cf app sapmvp-api

# If memory > 80%, scale vertically
cf scale sapmvp-api -m 2048M

# If CPU > 80%, scale horizontally
cf scale sapmvp-api -i 4

# Check database performance
# BTP Cockpit > PostgreSQL > sapmvp-postgres > Monitoring
```

---

## Maintenance Windows

Recommended maintenance schedule:
- **Weekly**: Review logs and error rates
- **Bi-weekly**: Security patches and minor updates
- **Monthly**: Database optimization and backup verification
- **Quarterly**: Major version upgrades and performance tuning

---

## Support Contacts

- **Technical Support**: support@sapmvp.com
- **Emergency Hotline**: +1-XXX-XXX-XXXX
- **SAP BTP Support**: SAP Support Portal

---

## Additional Resources

- [SAP BTP Documentation](https://help.sap.com/btp)
- [Cloud Foundry Documentation](https://docs.cloudfoundry.org)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
- [Next.js Production Deployment](https://nextjs.org/docs/deployment)

---

**Deployment Complete!** 🚀

Your SAP MVP Framework is now running in production on SAP BTP.
