# End-to-End Testing Guide

**Last Updated**: 2025-10-04
**Status**: Ready to Use

---

## 📋 Overview

Comprehensive E2E test suite for validating complete SoD workflow with real database operations.

### Test Coverage

The E2E test suite (`test-sod-e2e.ts`) validates:
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

#### Using the Test Runner (Recommended)

```bash
cd packages/core/tests/e2e
./run-e2e-tests.sh
```

The test runner automatically:
- ✅ Checks DATABASE_URL
- ✅ Validates database connectivity
- ✅ Verifies required tables exist
- ✅ Runs the E2E test suite
- ✅ Provides clear error messages

#### Direct Execution

```bash
# From project root
pnpm test:e2e

# Or with custom database
DATABASE_URL="postgresql://user:pass@host:5432/db" pnpm test:e2e
```

---

## 📊 Test Scenarios

### 1. Database Connection
Validates PostgreSQL connectivity and pool configuration.

### 2. Setup Test Data
Creates test tenant and prepares test environment.

### 3. Create Analysis Run
Tests creation of new SoD analysis run with metadata.

### 4. Store Violations
Validates batch insertion of SoD violations:
- User conflicts
- Role conflicts
- Risk levels
- Conflict metadata

### 5. Get Violations with Filters
Tests retrieval with:
- Status filtering
- Risk level filtering
- Pagination
- Sorting
- Date ranges

### 6. Get Violation By ID
Validates single violation retrieval.

### 7. Update Violation Status
Tests status transitions:
- PENDING → RESOLVED
- PENDING → ACCEPTED_RISK
- Adding resolution notes

### 8. Get Latest Analysis
Retrieves most recent analysis run for tenant.

### 9. Get Violation Statistics
Validates statistics calculation:
- Total violations
- By status
- By risk level
- By conflict type

### 10. Delete Old Violations
Tests cleanup of violations older than retention period.

### 11. CSV Export
Validates CSV generation:
- All fields present
- Proper formatting
- Correct row count

---

## 🎯 Expected Output

```
ℹ Starting SoD End-to-End Test Suite
ℹ Database: postgresql://postgres:****@localhost:5432/sapframework
ℹ Test Tenant ID: test-tenant-e2e-1234567890

▶ Test 1: Database Connection
✓ Database connection established

▶ Test 2: Setup Test Data
✓ Test tenant created

▶ Test 3: Create Analysis Run
✓ Analysis run created (ID: abc123)

▶ Test 4: Store Violations
✓ Stored 3 violations

▶ Test 5: Get Violations
  ✓ Retrieved all violations (3)
  ✓ Filtered by status PENDING (3)
  ✓ Filtered by risk level HIGH (2)
  ✓ Pagination works (limit: 2)

▶ Test 6: Get Violation By ID
✓ Retrieved violation by ID

▶ Test 7: Update Violation Status
✓ Updated violation status to RESOLVED

▶ Test 8: Get Latest Analysis
✓ Retrieved latest analysis run

▶ Test 9: Get Violation Statistics
✓ Statistics calculated correctly

▶ Test 10: Delete Old Violations
✓ Deleted 0 old violations

▶ Test 11: CSV Export
✓ Exported 3 violations to CSV

================================================================================
TEST RESULTS SUMMARY
================================================================================
1. [PASS] Database Connection (45ms)
2. [PASS] Setup Test Data (23ms)
3. [PASS] Create Analysis Run (34ms)
4. [PASS] Store Violations (67ms)
5. [PASS] Get Violations (89ms)
6. [PASS] Get Violation By ID (12ms)
7. [PASS] Update Violation Status (28ms)
8. [PASS] Get Latest Analysis (15ms)
9. [PASS] Get Violation Statistics (42ms)
10. [PASS] Delete Old Violations (31ms)
11. [PASS] CSV Export (56ms)
================================================================================
Total: 11 | Passed: 11 | Failed: 0 | Duration: 442ms
================================================================================

✓ All tests passed!
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
