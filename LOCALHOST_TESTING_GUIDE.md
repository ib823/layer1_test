# SAP MVP Framework - Localhost Testing Guide

**Version**: 1.0
**Last Updated**: 2025-10-31
**Purpose**: Complete guide for testing the entire SAP MVP Framework on localhost

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Starting the Application](#starting-the-application)
5. [Testing All Endpoints](#testing-all-endpoints)
6. [Testing All Modules](#testing-all-modules)
7. [Frontend Testing](#frontend-testing)
8. [Performance Testing](#performance-testing)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

```bash
# Check Node.js version (need 18+)
node --version  # Should be v18.x or v20.x

# Check pnpm version (need 8+)
pnpm --version  # Should be 8.x

# Check PostgreSQL version (need 14+)
psql --version  # Should be 14.x or higher

# Optional: Redis (for rate limiting)
redis-cli --version  # 7.x
```

### Install Missing Dependencies

```bash
# Install Node.js 20 (if needed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm (if needed)
npm install -g pnpm@8

# Install PostgreSQL (if needed)
sudo apt-get install -y postgresql postgresql-contrib

# Install Redis (optional, for rate limiting)
sudo apt-get install -y redis-server
```

---

## Environment Setup

### Step 1: Clone and Install

```bash
# Navigate to project directory
cd /home/user/layer1_test

# Install dependencies
pnpm install

# This will install all packages in the monorepo
```

### Step 2: Configure Environment Variables

```bash
# Create .env file from example
cp .env.example .env

# Edit .env file
nano .env  # or use your preferred editor
```

**Required Environment Variables:**

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sapframework

# Encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
ENCRYPTION_MASTER_KEY=your-32-byte-base64-key

# Authentication
AUTH_ENABLED=false  # Set to false for local testing
JWT_SECRET=your-jwt-secret-for-testing

# API Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug

# CORS
CORS_ORIGIN=http://localhost:3001

# Redis (optional)
REDIS_URL=redis://localhost:6379

# SAP Configuration (for testing with mock data, these can be fake)
SAP_BASE_URL=https://mock-sap-system.com
SAP_CLIENT=100
SAP_CLIENT_ID=test-client-id
SAP_CLIENT_SECRET=test-client-secret
```

### Step 3: Generate Encryption Key

```bash
# Generate a secure encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Copy the output and paste it as ENCRYPTION_MASTER_KEY in .env
```

---

## Database Setup

### Step 1: Start PostgreSQL

```bash
# Start PostgreSQL service
sudo service postgresql start

# Verify it's running
sudo service postgresql status
```

### Step 2: Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In psql console:
CREATE DATABASE sapframework;
CREATE USER sapframework_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE sapframework TO sapframework_user;
\q
```

### Step 3: Run Schema Migrations

```bash
# Load the SQL schema
psql -U postgres -d sapframework -f infrastructure/database/schema.sql

# Or if you have custom user:
psql -U sapframework_user -d sapframework -f infrastructure/database/schema.sql
```

### Step 4: Generate Prisma Client

```bash
# Navigate to core package
cd packages/core

# Set environment variable to ignore checksum errors (for offline/restricted environments)
export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

# Generate Prisma client
npx prisma generate

# Go back to root
cd ../..
```

### Step 5: Verify Database

```bash
# Connect to database
psql -U postgres -d sapframework

# List tables
\dt

# You should see tables like:
# - tenants
# - tenant_capabilities
# - service_discovery_history
# - sod_violations
# - InvoiceMatchRun
# - GLAnomalyRun
# - VendorQualityRun
# etc.

# Exit psql
\q
```

---

## Starting the Application

### Option 1: Development Mode (Recommended for Testing)

```bash
# From project root
pnpm dev

# This starts:
# - API server on http://localhost:3000
# - Web UI on http://localhost:3001
# - All packages in watch mode
```

### Option 2: Production Build

```bash
# Build all packages
pnpm build

# Start API server
cd packages/api
node dist/server.js

# In another terminal, start Web UI
cd packages/web
pnpm start
```

### Option 3: Individual Services

```bash
# Terminal 1: API Server
cd packages/api
pnpm dev

# Terminal 2: Web UI
cd packages/web
pnpm dev

# Terminal 3: Run tests
pnpm test
```

### Verify Services Are Running

```bash
# Test API health
curl http://localhost:3000/api/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-10-31T...",
#   "uptime": 123.45,
#   "checks": {
#     "api": "healthy",
#     "database": "healthy",
#     "modules": "healthy"
#   }
# }

# Test Web UI
curl http://localhost:3001
# Should return HTML
```

---

## Testing All Endpoints

### 1. Health Check Endpoints

```bash
# Basic health
curl http://localhost:3000/api/health

# Database health
curl http://localhost:3000/api/health/database

# Modules health
curl http://localhost:3000/api/health/modules

# Kubernetes readiness probe
curl http://localhost:3000/api/health/ready

# Kubernetes liveness probe
curl http://localhost:3000/api/health/live
```

### 2. Metrics Endpoints

```bash
# Simple metrics
curl http://localhost:3000/api/metrics/simple

# Prometheus metrics (if prom-client installed)
curl http://localhost:3000/api/metrics

# Expected response:
# {
#   "requests": 10,
#   "errors": 0,
#   "avgResponseTime": 25,
#   "errorRate": "0%"
# }
```

### 3. Version Endpoint

```bash
curl http://localhost:3000/api/version

# Expected response:
# {
#   "success": true,
#   "data": {
#     "version": "1.0.0",
#     "apiVersion": "v1",
#     "framework": "SAP MVP Framework"
#   }
# }
```

### 4. Authentication Endpoints (Development Mode)

```bash
# Login (development mode - any credentials work)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "any-password"
  }'

# Save the token from response
TOKEN="<token-from-response>"

# Get current user
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

---

## Testing All Modules

### Module 1: Invoice Matching

```bash
# Run invoice matching analysis
curl -X POST http://localhost:3000/api/matching/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-tenant",
    "fromDate": "2025-01-01",
    "toDate": "2025-10-31"
  }'

# Get all runs for tenant
curl "http://localhost:3000/api/matching/runs?tenantId=test-tenant"

# Get fraud alerts
curl "http://localhost:3000/api/matching/fraud-alerts?tenantId=test-tenant"

# Get vendor patterns
curl "http://localhost:3000/api/matching/vendor-patterns?tenantId=test-tenant"
```

### Module 2: GL Anomaly Detection

```bash
# Run GL anomaly detection
curl -X POST http://localhost:3000/api/modules/gl-anomaly/detect \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-tenant",
    "fiscalYear": "2025",
    "period": "001"
  }'

# Get all runs
curl "http://localhost:3000/api/modules/gl-anomaly/runs?tenantId=test-tenant"

# Get anomalies for a run
curl "http://localhost:3000/api/modules/gl-anomaly/runs/{runId}/anomalies"
```

### Module 3: Vendor Data Quality

```bash
# Run vendor quality analysis
curl -X POST http://localhost:3000/api/modules/vendor-quality/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-tenant"
  }'

# Get quality runs
curl "http://localhost:3000/api/modules/vendor-quality/runs?tenantId=test-tenant"

# Get duplicates
curl "http://localhost:3000/api/modules/vendor-quality/duplicates?tenantId=test-tenant"
```

### Module 4: SoD Control

```bash
# Run SoD analysis
curl -X POST http://localhost:3000/api/modules/sod/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-tenant"
  }'

# Get violations
curl "http://localhost:3000/api/modules/sod/violations?tenantId=test-tenant"

# Get conflict rules
curl http://localhost:3000/api/modules/sod/rules
```

---

## Frontend Testing

### 1. Access Web UI

```bash
# Open in browser
http://localhost:3001

# Or use curl to test if it's serving
curl -I http://localhost:3001
```

### 2. Test Key Pages

Visit these URLs in your browser:

- **Home**: http://localhost:3001/
- **Login**: http://localhost:3001/login
- **Dashboard**: http://localhost:3001/dashboard
- **SoD Violations**: http://localhost:3001/t/test-tenant/sod/violations
- **Invoice Matching**: http://localhost:3001/t/test-tenant/modules/invoice-matching
- **GL Anomaly**: http://localhost:3001/t/test-tenant/modules/gl-anomaly
- **Vendor Quality**: http://localhost:3001/t/test-tenant/modules/vendor-quality

### 3. Test UI Functionality

1. **Login Flow**
   - Go to login page
   - Enter any email/password (development mode)
   - Verify redirect to dashboard

2. **Module Navigation**
   - Click on each module in sidebar
   - Verify page loads without errors
   - Check console for JavaScript errors (F12)

3. **Data Display**
   - Verify tables render
   - Test filtering and sorting
   - Test pagination (if data available)

---

## Performance Testing

### 1. Load Test with Apache Bench

```bash
# Install Apache Bench (if needed)
sudo apt-get install apache2-utils

# Test health endpoint
ab -n 1000 -c 10 http://localhost:3000/api/health

# Test metrics endpoint
ab -n 500 -c 5 http://localhost:3000/api/metrics/simple

# Expected results:
# - Requests per second: >500
# - Time per request: <20ms (mean)
# - Failed requests: 0
```

### 2. Rate Limiting Test

```bash
# Test rate limiting by making many requests
for i in {1..150}; do
  curl -s http://localhost:3000/api/version | grep -q "success" && echo "✓ $i" || echo "✗ $i"
  sleep 0.1
done

# You should see rate limiting kick in after 100 requests per minute
# Expected: After request 100-110, you'll start seeing 429 errors
```

### 3. Memory Leak Test

```bash
# Monitor memory usage
while true; do
  curl -s http://localhost:3000/api/health > /dev/null
  ps aux | grep "node" | grep -v grep | awk '{print $6}'
  sleep 1
done

# Memory should remain stable (<500MB)
# If it grows continuously, there's a memory leak
```

---

## Running Unit Tests

### Test All Packages

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @sap-framework/core test
pnpm --filter @sap-framework/api test
pnpm --filter @sap-framework/sod-control test

# Run tests with coverage
pnpm test --coverage

# Run tests in watch mode
pnpm test:watch
```

### Test Individual Modules

```bash
# Test SoD Control module
cd packages/modules/sod-control
pnpm test

# Test Invoice Matching module
cd packages/modules/invoice-matching
pnpm test

# Test GL Anomaly Detection
cd packages/modules/gl-anomaly-detection
pnpm test

# Test Vendor Data Quality
cd packages/modules/vendor-data-quality
pnpm test
```

---

## Integration Testing

### Test Complete Workflow

Create a test script (`test-workflow.sh`):

```bash
#!/bin/bash
# Complete workflow test

API="http://localhost:3000/api"

echo "1. Testing health checks..."
curl -f $API/health || exit 1

echo ""
echo "2. Testing authentication..."
TOKEN=$(curl -s -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' \
  | jq -r '.data.token')

echo "Token: $TOKEN"

echo ""
echo "3. Testing invoice matching..."
curl -f -X POST $API/matching/analyze \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test"}' || echo "Note: May fail without SAP connection"

echo ""
echo "4. Testing GL anomaly..."
curl -f -X POST $API/modules/gl-anomaly/detect \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test","fiscalYear":"2025"}' || echo "Note: May fail without SAP connection"

echo ""
echo "5. Testing vendor quality..."
curl -f -X POST $API/modules/vendor-quality/analyze \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test"}' || echo "Note: May fail without SAP connection"

echo ""
echo "✓ Workflow test complete"
```

```bash
# Make executable
chmod +x test-workflow.sh

# Run test
./test-workflow.sh
```

---

## Testing Database Backup

```bash
# Test manual backup
./scripts/backup-database.sh -o ./test-backups -r 7

# Verify backup was created
ls -lh ./test-backups/

# Test backup restoration
gunzip < ./test-backups/sapframework_*.sql.gz | psql -U postgres -d sapframework_test

# Cleanup test database
dropdb sapframework_test
```

---

## Troubleshooting

### Problem: Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Problem: Database Connection Failed

```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Start PostgreSQL
sudo service postgresql start

# Test connection
psql -U postgres -d sapframework -c "SELECT 1"
```

### Problem: Prisma Client Not Generated

```bash
# Generate Prisma client with ignore flag
cd packages/core
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate
cd ../..
```

### Problem: Module Not Found Errors

```bash
# Clean install
rm -rf node_modules
rm -rf packages/*/node_modules
pnpm install

# Rebuild
pnpm build
```

### Problem: Tests Failing

```bash
# Run tests in verbose mode
pnpm test -- --verbose

# Run single test file
pnpm test packages/core/tests/unit/ServiceDiscovery.test.ts

# Check for environment variables
printenv | grep -E "DATABASE_URL|NODE_ENV"
```

---

## Success Criteria

Your localhost setup is working correctly if:

- ✅ All health checks return "healthy"
- ✅ Metrics endpoint returns data
- ✅ Database connection successful
- ✅ Can login and get token
- ✅ All module endpoints respond (may return empty data without SAP connection)
- ✅ Web UI loads without JavaScript errors
- ✅ Unit tests pass (>90% passing)
- ✅ No memory leaks during load testing
- ✅ Rate limiting works (429 errors after threshold)

---

## Next Steps

After successful localhost testing:

1. **Run Full Test Suite**
   ```bash
   pnpm test --coverage
   ```

2. **Check Test Coverage**
   ```bash
   # Coverage should be >70%
   open packages/*/coverage/index.html
   ```

3. **Deploy to Staging**
   - Follow `docs/operative/OPERATIONS.md` deployment section
   - Test with real SAP connections

4. **Production Deployment**
   - Review `PRODUCTION_COMPLETION_REPORT.md`
   - Follow production deployment checklist

---

## Quick Reference Commands

```bash
# Start everything
pnpm dev

# Stop everything
# Ctrl+C (in terminal)

# Clean everything
pnpm clean

# Rebuild everything
pnpm build

# Test everything
pnpm test

# View logs
tail -f logs/api.log

# Database console
psql -U postgres -d sapframework

# Check running processes
ps aux | grep node

# Monitor system resources
htop
```

---

**END OF LOCALHOST TESTING GUIDE**

For more information:
- Operations Runbook: `docs/operative/OPERATIONS.md`
- Production Report: `PRODUCTION_COMPLETION_REPORT.md`
- Quick Start: `QUICKSTART.md`
