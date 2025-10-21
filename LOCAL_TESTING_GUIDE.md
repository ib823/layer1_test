# Local Testing Guide (Without BTP Authentication)

**Purpose**: Test the SAP MVP Framework locally without SAP BTP access

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Disable Authentication

```bash
# Edit .env file in project root
cd /workspaces/layer1_test

# Add this line (or modify existing)
echo "AUTH_ENABLED=false" >> .env
```

Or manually edit `.env`:
```bash
# Authentication (SET TO FALSE FOR LOCAL TESTING)
AUTH_ENABLED=false

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sapframework"

# Redis
REDIS_URL="redis://:redis123@localhost:6379"

# API Configuration
API_PORT=3000
NODE_ENV=development
```

### Step 2: Start Services

```bash
# Start database and redis (if not running)
docker-compose up -d postgres redis

# Verify services are running
docker ps
```

### Step 3: Start API Server

```bash
# Start API in development mode
cd /workspaces/layer1_test
PORT=3000 AUTH_ENABLED=false pnpm --filter @sap-framework/api dev
```

**Expected output**:
```
⚠️  WARNING: Authentication is DISABLED. Set AUTH_ENABLED=true in production!
Server listening on http://localhost:3000
```

### Step 4: Start Web Frontend (Optional)

```bash
# In a new terminal
cd /workspaces/layer1_test
pnpm --filter @sap-framework/web dev
```

**Expected output**:
```
▲ Next.js 14.x
- Local:        http://localhost:3001
```

---

## ✅ Verify System is Running

### Test 1: Health Check
```bash
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-10-13T...",
  "uptime": 5.123,
  "environment": "development",
  "checks": {
    "api": "healthy",
    "database": "healthy",
    "modules": "healthy"
  }
}
```

### Test 2: Database Health
```bash
curl http://localhost:3000/api/health/database

# Expected: All tables showing "ok"
```

### Test 3: Modules Health
```bash
curl http://localhost:3000/api/health/modules

# Expected: 4 modules listed as "available"
```

---

## 🧪 Test Each Module (API Testing)

### Test Invoice Matching

```bash
# Run invoice matching analysis
curl -X POST http://localhost:3000/api/matching/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "dev-tenant",
    "fromDate": "2025-10-01",
    "toDate": "2025-10-31",
    "config": {
      "matchThreshold": 95,
      "fraudDetection": true
    }
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "runId": "uuid-here",
    "statistics": {
      "totalInvoices": 10,
      "matchedInvoices": 8,
      "unmatchedInvoices": 2,
      "fraudAlerts": 1,
      "matchRate": 80
    },
    "matches": [ ... ],
    "fraudAlerts": [ ... ]
  }
}
```

### Get Invoice Matching Runs

```bash
curl "http://localhost:3000/api/matching/runs?tenantId=dev-tenant"
```

### Get Specific Run

```bash
curl "http://localhost:3000/api/matching/runs/{runId}"
```

---

### Test GL Anomaly Detection

```bash
# Run GL anomaly detection
curl -X POST http://localhost:3000/api/modules/gl-anomaly/detect \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "dev-tenant",
    "fiscalYear": "2025",
    "fiscalPeriod": "010",
    "config": {
      "detectionMethods": ["benford", "outlier", "after_hours"],
      "riskThreshold": 70
    }
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "runId": "uuid-here",
    "totalLineItems": 1000,
    "anomaliesDetected": 15,
    "summary": {
      "byRiskLevel": {
        "critical": 3,
        "high": 5,
        "medium": 7
      },
      "byDetectionMethod": {
        "benford": 5,
        "outlier": 6,
        "after_hours": 4
      }
    },
    "anomalies": [ ... ]
  }
}
```

### Get GL Anomaly Runs

```bash
curl "http://localhost:3000/api/modules/gl-anomaly/runs?tenantId=dev-tenant"
```

---

### Test Vendor Data Quality

```bash
# Run vendor quality analysis
curl -X POST http://localhost:3000/api/modules/vendor-quality/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "dev-tenant",
    "config": {
      "duplicateDetection": true,
      "qualityThreshold": 70
    }
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "runId": "uuid-here",
    "totalVendors": 100,
    "issuesFound": 25,
    "duplicatesFound": 5,
    "potentialSavings": 15000,
    "summary": {
      "overallQualityScore": 78.5,
      "issuesByType": {
        "missing_field": 15,
        "invalid_format": 10
      }
    },
    "qualityScores": [ ... ],
    "duplicateClusters": [ ... ]
  }
}
```

### Get Vendor Quality Runs

```bash
curl "http://localhost:3000/api/modules/vendor-quality/runs?tenantId=dev-tenant"
```

---

## 🎨 Test Web UI (Browser)

### Access the Application

1. **Open Browser**: http://localhost:3001

2. **You'll see**: Dashboard with navigation sidebar

3. **No Login Required**: Auth is disabled, you're auto-logged in as admin

### Test Each Dashboard

#### 1. Invoice Matching
```
Navigate to: http://localhost:3001/modules/invoice-matching

Actions:
1. Select date range (Oct 1-31, 2025)
2. Click "Run Analysis" button
3. Wait for results (~5-10 seconds)
4. Verify summary cards display
5. Verify results table displays
6. Click "Export" button (test download)
```

#### 2. GL Anomaly Detection
```
Navigate to: http://localhost:3001/modules/gl-anomaly

Actions:
1. Select Fiscal Year: 2025
2. Select Fiscal Period: 010
3. Check all detection methods
4. Click "Run Detection" button
5. Wait for results (~10-15 seconds)
6. Verify anomaly count displays
7. Verify risk distribution chart
8. Verify anomaly table with filters
9. Click on an anomaly to see details
```

#### 3. Vendor Data Quality
```
Navigate to: http://localhost:3001/modules/vendor-quality

Actions:
1. Leave filters at default (or select country)
2. Click "Run Analysis" button
3. Wait for results (~10-20 seconds)
4. Verify quality score summary
5. Verify issues table
6. Check "Duplicates" tab
7. Verify duplicate clusters display
8. Check estimated savings calculation
```

#### 4. SoD Control
```
Navigate to: http://localhost:3001/modules/sod

Actions:
1. Enter a test User ID
2. Select Company Code
3. Click "Analyze User" button
4. Verify violations display (if any)
5. Click on a violation to see details
```

---

## 📊 Test with Mock Data

Since you don't have SAP S/4HANA connection, the system will use **mock data** for testing.

### What Mock Data Provides:

1. **Invoice Matching**:
   - 10-100 sample invoices
   - Mix of matched, partial, and unmatched
   - 1-3 fraud alerts
   - Realistic match scores

2. **GL Anomaly Detection**:
   - 100-1000 sample transactions
   - Benford's Law violations
   - After-hours postings
   - Statistical outliers
   - Weekend transactions

3. **Vendor Data Quality**:
   - 50-200 sample vendors
   - Missing field issues
   - Invalid format issues
   - 2-5 duplicate clusters
   - Quality score distribution

4. **SoD Control**:
   - Sample user roles
   - 0-5 violations per user
   - Mix of risk levels

---

## 🔍 Verify Database Persistence

### Check that data is being saved:

```sql
-- Connect to database
psql postgresql://postgres:postgres@localhost:5432/sapframework

-- Check invoice matching runs
SELECT COUNT(*) FROM "InvoiceMatchRun";
SELECT * FROM "InvoiceMatchRun" ORDER BY "runDate" DESC LIMIT 5;

-- Check GL anomaly runs
SELECT COUNT(*) FROM "GLAnomalyRun";
SELECT * FROM "GLAnomalyRun" ORDER BY "runDate" DESC LIMIT 5;

-- Check vendor quality runs
SELECT COUNT(*) FROM "VendorQualityRun";
SELECT * FROM "VendorQualityRun" ORDER BY "runDate" DESC LIMIT 5;

-- Check detailed results
SELECT COUNT(*) FROM "InvoiceMatchResult";
SELECT COUNT(*) FROM "GLAnomaly";
SELECT COUNT(*) FROM "VendorQualityIssue";
SELECT COUNT(*) FROM "VendorDuplicateCluster";
```

**Expected**: You should see rows in these tables after running analyses.

---

## 📋 Local Testing Checklist

### ✅ System Health
- [ ] Health endpoint returns "healthy"
- [ ] Database health shows all tables "ok"
- [ ] Modules health shows 4 modules "available"
- [ ] API logs show no errors
- [ ] Web UI loads without errors

### ✅ Invoice Matching Module
- [ ] Can access dashboard
- [ ] Can run analysis
- [ ] Results display in < 10 seconds
- [ ] Summary cards show correct data
- [ ] Results table displays matches
- [ ] Fraud alerts display (if any)
- [ ] Can export results
- [ ] Can view historical runs
- [ ] Data persists to database

### ✅ GL Anomaly Detection Module
- [ ] Can access dashboard
- [ ] Can run detection
- [ ] Results display in < 15 seconds
- [ ] Anomaly count shows
- [ ] Risk distribution displays
- [ ] Anomaly table with filters works
- [ ] Can view anomaly details
- [ ] Can export report
- [ ] Can view historical runs
- [ ] Data persists to database

### ✅ Vendor Data Quality Module
- [ ] Can access dashboard
- [ ] Can run analysis
- [ ] Results display in < 20 seconds
- [ ] Quality score displays
- [ ] Issues table shows problems
- [ ] Duplicate clusters display
- [ ] Savings calculation shows
- [ ] Can filter by country
- [ ] Can view issue details
- [ ] Data persists to database

### ✅ SoD Control Module
- [ ] Can access dashboard
- [ ] Can analyze user
- [ ] Violations display (if any)
- [ ] Can view violation details
- [ ] Risk levels shown correctly

### ✅ Cross-Cutting Concerns
- [ ] Navigation between modules works
- [ ] Browser back/forward works
- [ ] Results persist on navigation
- [ ] No console errors
- [ ] No network errors (check Network tab)
- [ ] Performance acceptable
- [ ] Export functions work

---

## 🐛 Troubleshooting

### Issue: "NOAUTH Authentication required" error

**Solution**:
```bash
# Make sure AUTH_ENABLED=false in .env
echo "AUTH_ENABLED=false" >> .env

# Restart API server
# Press Ctrl+C to stop, then:
PORT=3000 AUTH_ENABLED=false pnpm --filter @sap-framework/api dev
```

### Issue: Database connection error

**Solution**:
```bash
# Check if postgres is running
docker ps | grep postgres

# If not running, start it
docker-compose up -d postgres

# Verify connection
psql postgresql://postgres:postgres@localhost:5432/sapframework -c "SELECT 1"
```

### Issue: Redis connection error

**Solution**:
```bash
# Check if redis is running
docker ps | grep redis

# If not running, start it
docker-compose up -d redis

# Test connection
redis-cli -h localhost -p 6379 -a redis123 ping
# Should return: PONG
```

### Issue: "Module not found" or build errors

**Solution**:
```bash
# Rebuild all packages
pnpm install
pnpm build

# If still issues, clean and rebuild
rm -rf node_modules
rm -rf packages/*/node_modules
pnpm install
pnpm build
```

### Issue: Mock data not showing

**Expected**: This is normal - mock data is generated on-the-fly during analysis.

**To verify**:
```bash
# Check API logs during analysis
# You should see: "Using mock data for testing"
```

### Issue: Slow performance

**Solution**:
```bash
# Check Docker resources
docker stats

# Increase Docker memory if needed (Docker Desktop → Settings → Resources)
# Recommended: 4GB RAM, 2 CPUs
```

---

## 📊 Expected Performance (Local)

| Operation | Expected Time | Status |
|-----------|---------------|--------|
| Health Check | < 100ms | ⚡ Fast |
| Dashboard Load | < 500ms | ⚡ Fast |
| Invoice Analysis | 2-5 seconds | ✅ Good |
| GL Anomaly Detection | 5-10 seconds | ✅ Good |
| Vendor Quality | 5-15 seconds | ✅ Good |
| Database Query | < 100ms | ⚡ Fast |
| Export Report | 1-3 seconds | ✅ Good |

**Note**: Local testing is slower than production due to:
- Mock data generation overhead
- Development mode (no optimizations)
- Docker resource limits

---

## 🎯 Quick Test Script

Save this as `test-local.sh`:

```bash
#!/bin/bash

echo "🧪 SAP MVP Framework - Local Testing"
echo "===================================="
echo ""

# Test health endpoints
echo "1. Testing health endpoints..."
curl -s http://localhost:3000/api/health | jq -r '.status' || echo "❌ Failed"
echo ""

echo "2. Testing database health..."
curl -s http://localhost:3000/api/health/database | jq -r '.status' || echo "❌ Failed"
echo ""

echo "3. Testing modules health..."
curl -s http://localhost:3000/api/health/modules | jq -r '.status' || echo "❌ Failed"
echo ""

# Test Invoice Matching
echo "4. Testing Invoice Matching..."
curl -s -X POST http://localhost:3000/api/matching/analyze \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"dev-tenant","fromDate":"2025-10-01","toDate":"2025-10-31"}' \
  | jq -r '.success' || echo "❌ Failed"
echo ""

# Test GL Anomaly
echo "5. Testing GL Anomaly Detection..."
curl -s -X POST http://localhost:3000/api/modules/gl-anomaly/detect \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"dev-tenant","fiscalYear":"2025","fiscalPeriod":"010"}' \
  | jq -r '.success' || echo "❌ Failed"
echo ""

# Test Vendor Quality
echo "6. Testing Vendor Data Quality..."
curl -s -X POST http://localhost:3000/api/modules/vendor-quality/analyze \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"dev-tenant"}' \
  | jq -r '.success' || echo "❌ Failed"
echo ""

echo "✅ All tests completed!"
```

Run with:
```bash
chmod +x test-local.sh
./test-local.sh
```

---

## 📸 What to Test in Browser

### 1. Visual Elements
- [ ] Sidebar navigation displays
- [ ] Module icons visible
- [ ] Colors match design system
- [ ] Typography consistent
- [ ] Buttons styled correctly
- [ ] Tables format properly
- [ ] Cards display correctly
- [ ] Charts render (if any)

### 2. Interactions
- [ ] Buttons clickable
- [ ] Forms work
- [ ] Date pickers function
- [ ] Filters apply correctly
- [ ] Tables sortable
- [ ] Pagination works
- [ ] Modals open/close
- [ ] Export downloads file

### 3. Responsive Design
- [ ] Works on desktop (1920x1080)
- [ ] Works on laptop (1366x768)
- [ ] Sidebar collapses on mobile
- [ ] Tables scroll horizontally if needed

---

## 🎓 Testing Scenarios

### Scenario 1: Happy Path (5 minutes)
1. Start services
2. Open http://localhost:3001
3. Navigate to Invoice Matching
4. Run analysis
5. Verify results display
6. Export report
7. Done! ✅

### Scenario 2: All Modules (15 minutes)
1. Test Invoice Matching
2. Test GL Anomaly Detection
3. Test Vendor Data Quality
4. Test SoD Control
5. Verify all data persisted
6. Check database has records
7. Done! ✅

### Scenario 3: API Testing (10 minutes)
1. Run `test-local.sh` script
2. Check all endpoints return success
3. Verify database has data
4. Test GET /runs endpoints
5. Done! ✅

---

## ✅ You're Ready!

You can now test the entire SAP MVP Framework **locally without BTP authentication**.

**Start testing**:
```bash
cd /workspaces/layer1_test
AUTH_ENABLED=false pnpm --filter @sap-framework/api dev
```

Then open: http://localhost:3001

**All features work** - just without real SAP S/4HANA data (uses mocks).

---

**Questions?** Check the Troubleshooting section above!
