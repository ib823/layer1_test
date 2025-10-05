# End-to-End Testing Guide

**Last Updated**: 2025-10-05
**Status**: Production Ready

---

## 📋 Overview

Comprehensive E2E test suite for validating critical user workflows with real database and API operations.

### Test Coverage

The E2E test suite includes three test suites covering all critical user flows:

#### 1. **Tenant Onboarding** (`tenant-onboarding.e2e.ts`)
- ✅ Create tenant via API
- ✅ Configure SAP connection
- ✅ Retrieve tenant details
- ✅ List tenants with pagination
- ✅ Get tenant profile
- ✅ Module activation/deactivation
- ✅ Data cleanup

#### 2. **Service Discovery** (`service-discovery.e2e.ts`)
- ✅ Trigger service discovery
- ✅ Get discovery status
- ✅ Verify capability profile generation
- ✅ Check module recommendations
- ✅ Identify missing services
- ✅ Data cleanup

#### 3. **SoD Analysis** (`test-sod-e2e.ts`)
- ✅ Database connectivity
- ✅ SoD analysis run creation
- ✅ Violation storage (batch operations)
- ✅ Violation retrieval with filters
- ✅ Status updates
- ✅ Statistics calculation
- ✅ CSV export functionality
- ✅ Data cleanup

---

## 🚀 Quick Start

### Prerequisites

1. **PostgreSQL Database Running**
   ```bash
   # Using Docker
   docker run -d \
     --name sap-framework-db \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=sapframework \
     -p 5432:5432 \
     postgres:15
   ```

2. **Database Schema Created**
   ```bash
   psql -h localhost -U postgres -d sapframework -f infrastructure/database/schema.sql
   psql -h localhost -U postgres -d sapframework -f infrastructure/database/migrations/001_sod_violations.sql
   ```

3. **Environment Variable Set**
   ```bash
   export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sapframework"
   ```

### Running E2E Tests

#### Using the Master Test Runner (Recommended)

```bash
cd packages/api/tests/e2e
./run-all-e2e-tests.sh
```

The master test runner automatically:
- ✅ Checks DATABASE_URL
- ✅ Validates database connectivity
- ✅ Disables authentication for testing
- ✅ Runs all 3 E2E test suites sequentially
- ✅ Provides detailed pass/fail summary
- ✅ Reports failed test names

#### Running Individual Test Suites

```bash
# Tenant Onboarding E2E
DATABASE_URL="..." AUTH_ENABLED=false tsx packages/api/tests/e2e/tenant-onboarding.e2e.ts

# Service Discovery E2E
DATABASE_URL="..." AUTH_ENABLED=false tsx packages/api/tests/e2e/service-discovery.e2e.ts

# SoD Analysis E2E
DATABASE_URL="..." tsx packages/core/tests/e2e/test-sod-e2e.ts
```

#### From Project Root

```bash
# Run all E2E tests
pnpm test:e2e

# Or with custom database
DATABASE_URL="postgresql://user:pass@host:5432/db" pnpm test:e2e
```

---

## 📊 Test Scenarios

### Tenant Onboarding Flow (8 tests)

1. **Health Endpoint** - Validates API is running and responsive
2. **Create Tenant** - Tests tenant creation with SAP connection configuration
3. **Get Tenant** - Retrieves tenant details and verifies data integrity
4. **List Tenants** - Tests pagination and tenant listing
5. **Get Tenant Profile** - Validates capability profile retrieval
6. **Get Active Modules** - Lists activated modules for tenant
7. **Activate Module** - Enables a module for tenant (e.g., SoD_Analysis)
8. **Deactivate Module** - Disables a module for tenant

### Service Discovery Flow (6 tests)

1. **Setup Test Tenant** - Creates test tenant with SAP connection
2. **Trigger Discovery** - Initiates service discovery for tenant
3. **Get Discovery Status** - Checks discovery job status
4. **Get Capability Profile** - Validates discovered capabilities and SAP version
5. **Get Recommended Modules** - Lists modules available based on discovered services
6. **Get Missing Services** - Identifies services needed for unavailable modules

### SoD Analysis Flow (11 tests)

1. **Database Connection** - Validates PostgreSQL connectivity
2. **Setup Test Data** - Creates test tenant and analysis environment
3. **Create Analysis Run** - Initiates new SoD analysis run with configuration
4. **Store Violations** - Batch inserts SoD violations (user/role conflicts)
5. **Get Violations with Filters** - Tests filtering by status, risk level, pagination
6. **Get Violation By ID** - Retrieves single violation details
7. **Update Violation Status** - Tests status transitions (OPEN → ACKNOWLEDGED)
8. **Get Latest Analysis** - Retrieves most recent analysis run
9. **Get Violation Statistics** - Calculates aggregated statistics
10. **Delete Old Violations** - Tests retention policy enforcement
11. **CSV Export** - Generates and validates CSV export

---

## 🎯 Expected Output

### Master Test Runner Output

```
╔════════════════════════════════════════════════════════════════╗
║         SAP MVP Framework - E2E Test Suite Runner              ║
╚════════════════════════════════════════════════════════════════╝

✓ DATABASE_URL is set
ℹ Database: postgresql://****:****@localhost:5432/sapframework

▶ Testing database connectivity...
✓ Database is accessible

═══════════════════════════════════════════════════════════════
▶ Running: Tenant Onboarding
═══════════════════════════════════════════════════════════════

ℹ Starting Tenant Onboarding E2E Test Suite
ℹ Database: postgresql://****:****@localhost:5432/sapframework
ℹ Test Tenant ID: test-onboarding-1234567890

▶ Test 1: Health Endpoint
✓ API health check passed

▶ Test 2: Create Tenant
✓ Tenant created: test-onboarding-1234567890

▶ Test 3: Get Tenant Details
✓ Retrieved tenant: E2E Test Corp

... (remaining tests)

================================================================================
TEST RESULTS SUMMARY
================================================================================
1. [PASS] Health Endpoint (45ms)
2. [PASS] Create Tenant (156ms)
3. [PASS] Get Tenant (78ms)
4. [PASS] List Tenants (89ms)
5. [PASS] Get Tenant Profile (45ms)
6. [PASS] Get Active Modules (34ms)
7. [PASS] Activate Module (67ms)
8. [PASS] Deactivate Module (56ms)
================================================================================
Total: 8 | Passed: 8 | Failed: 0 | Duration: 570ms
================================================================================

✓ All tests passed!
✓ Tenant Onboarding PASSED

═══════════════════════════════════════════════════════════════
▶ Running: Service Discovery
═══════════════════════════════════════════════════════════════

... (Service Discovery tests)

✓ Service Discovery PASSED

═══════════════════════════════════════════════════════════════
▶ Running: SoD Analysis (Core Package)
═══════════════════════════════════════════════════════════════

... (SoD Analysis tests)

✓ SoD Analysis PASSED

╔════════════════════════════════════════════════════════════════╗
║                    FINAL TEST RESULTS                          ║
╚════════════════════════════════════════════════════════════════╝

Total Tests:  3
Passed:       3
Failed:       0

✓ All E2E tests passed!
```

---

## 🔧 Test Data Management

### Automatic Cleanup

All E2E tests automatically clean up test data after execution:

```typescript
private async cleanup(): Promise<void> {
  await this.pool.query(
    'DELETE FROM sod_violations WHERE tenant_id LIKE $1',
    ['test-tenant-e2e-%']
  );
  await this.pool.query(
    'DELETE FROM sod_analysis_runs WHERE tenant_id LIKE $1',
    ['test-tenant-e2e-%']
  );
  await this.pool.query(
    'DELETE FROM tenants WHERE tenant_id LIKE $1',
    ['test-tenant-e2e-%']
  );
  await this.pool.end();
}
```

### Manual Cleanup

If tests are interrupted:

```sql
DELETE FROM sod_violations WHERE tenant_id LIKE 'test-tenant-e2e-%';
DELETE FROM sod_analysis_runs WHERE tenant_id LIKE 'test-tenant-e2e-%';
DELETE FROM tenants WHERE tenant_id LIKE 'test-tenant-e2e-%';
```

---

## 🐛 Troubleshooting

### Connection Issues

```bash
# Test database connectivity
psql -h localhost -U postgres -d sapframework -c "SELECT 1"

# Check PostgreSQL is running
docker ps | grep postgres

# Check DATABASE_URL
echo $DATABASE_URL
```

### Schema Issues

```bash
# Verify tables exist
psql sapframework -c "\dt"

# Re-run migrations
psql sapframework -f infrastructure/database/schema.sql
psql sapframework -f infrastructure/database/migrations/001_sod_violations.sql
```

### Test Failures

```bash
# Enable debug mode
DEBUG=* ./run-e2e-tests.sh

# Check test data
psql sapframework -c "SELECT * FROM tenants WHERE tenant_id LIKE 'test-%'"
```

---

## 🔄 CI/CD Integration

E2E tests are integrated into the CI/CD pipeline:

```yaml
# .github/workflows/ci-cd.yml
integration-tests:
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'

  services:
    postgres:
      image: postgres:15
      env:
        POSTGRES_PASSWORD: postgres
        POSTGRES_DB: sapframework_test

  steps:
    - run: pnpm test:e2e
```

---

## 📊 Performance Benchmarks

Typical E2E test performance:
- Database operations: 20-50ms each
- CSV generation: 50-100ms
- Total suite: 400-800ms

---

## ✅ Success Criteria

E2E tests pass when:
- ✅ All 11 tests show green checkmarks
- ✅ No database errors
- ✅ All data properly cleaned up
- ✅ CSV export contains correct data
- ✅ Statistics match expected values

---

## 📚 Writing New E2E Tests

### Template

```typescript
private async testNewFeature(): Promise<void> {
  const testName = 'New Feature Test';
  console.log(`\n${colors.blue}▶${colors.reset} ${testName}`);

  const start = Date.now();
  try {
    // Test implementation
    const result = await this.repository.newFeature();

    if (!result) {
      throw new Error('Feature test failed');
    }

    console.log(`${colors.green}✓${colors.reset} Feature test passed`);
    this.recordResult(testName, true, Date.now() - start);
  } catch (error: any) {
    console.error(`${colors.red}✗${colors.reset} ${error.message}`);
    this.recordResult(testName, false, Date.now() - start, error.message);
    throw error;
  }
}
```

---

## 🔒 Security Notes

⚠️ **Important**:
- Never commit database credentials
- Use environment variables
- Don't run against production
- Ensure test data cleanup

---

## 📞 Support

**Issues?** Create GitHub issue with `testing` label

**Test failing?** Check:
1. Database is running
2. Schema is up to date
3. DATABASE_URL is correct
4. No connection limits reached

---

**Status**: ✅ Production-ready
**Maintenance**: Automatic cleanup
**Duration**: ~400-800ms per run
