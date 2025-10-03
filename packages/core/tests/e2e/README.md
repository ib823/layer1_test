# End-to-End Tests

This directory contains end-to-end tests that validate the complete functionality of the SAP MVP Framework with a real database.

## Overview

E2E tests verify the entire system workflow from start to finish, including:
- Database connectivity
- CRUD operations
- Business logic
- Data integrity
- Error handling

## Prerequisites

Before running E2E tests, ensure you have:

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
   psql -h localhost -U postgres -d sapframework -f infrastructure/database/migrations/002_security_compliance.sql
   ```

3. **Environment Variable Set**
   ```bash
   export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sapframework"
   ```

## Running E2E Tests

### Run All E2E Tests
```bash
# From project root
pnpm test:e2e

# Or directly
cd packages/core
ts-node tests/e2e/test-sod-e2e.ts
```

### Run Specific Test
```bash
DATABASE_URL="postgresql://user:pass@host:5432/db" \
  ts-node tests/e2e/test-sod-e2e.ts
```

## Available E2E Tests

### 1. SoD Analysis E2E (`test-sod-e2e.ts`)

Tests the complete Segregation of Duties workflow:

**Test Coverage:**
1. ✅ Database Connection
2. ✅ Setup Test Data
3. ✅ Create Analysis Run
4. ✅ Store Violations
5. ✅ Get Violations (with filters, pagination)
6. ✅ Get Violation By ID
7. ✅ Update Violation Status
8. ✅ Get Latest Analysis
9. ✅ Get Violation Statistics
10. ✅ Delete Old Violations
11. ✅ CSV Export

**Expected Output:**
```
ℹ Starting SoD End-to-End Test Suite
ℹ Database: postgresql://postgres:****@localhost:5432/sapframework
ℹ Test Tenant ID: test-tenant-e2e-1234567890

▶ Test 1: Database Connection
✓ Database connection established

▶ Test 2: Setup Test Data
✓ Test tenant created

...

================================================================================
TEST RESULTS SUMMARY
================================================================================
1. [PASS] Database Connection (45ms)
2. [PASS] Setup Test Data (23ms)
...
================================================================================
Total: 11 | Passed: 11 | Failed: 0 | Duration: 532ms
================================================================================

✓ All tests passed!
```

## Test Data Management

### Automatic Cleanup
All E2E tests automatically clean up test data after execution, whether tests pass or fail.

### Manual Cleanup
If tests are interrupted, clean up manually:
```sql
DELETE FROM sod_violations WHERE tenant_id LIKE 'test-tenant-e2e-%';
DELETE FROM sod_analysis_runs WHERE tenant_id LIKE 'test-tenant-e2e-%';
DELETE FROM tenants WHERE tenant_id LIKE 'test-tenant-e2e-%';
```

## CI/CD Integration

E2E tests can be integrated into CI/CD pipelines:

```yaml
# .github/workflows/e2e-tests.yml
jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: sapframework
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Run E2E Tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/sapframework
        run: pnpm test:e2e
```

## Writing New E2E Tests

### Template
```typescript
import { Pool } from 'pg';

class MyEndToEndTest {
  private pool: Pool;
  private results: TestResult[] = [];

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }

  async run(): Promise<void> {
    try {
      await this.testFeature1();
      await this.testFeature2();
      await this.cleanup();
      this.printResults();
    } catch (error) {
      await this.cleanup();
      process.exit(1);
    }
  }

  private async testFeature1(): Promise<void> {
    const start = Date.now();
    try {
      // Test implementation
      this.recordResult('Feature 1', true, Date.now() - start);
    } catch (error: any) {
      this.recordResult('Feature 1', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async cleanup(): Promise<void> {
    // Clean up test data
    await this.pool.end();
  }
}
```

## Troubleshooting

### Connection Issues
```bash
# Test database connectivity
psql -h localhost -U postgres -d sapframework -c "SELECT 1"

# Check if PostgreSQL is running
docker ps | grep postgres
```

### Schema Issues
```bash
# Verify tables exist
psql -h localhost -U postgres -d sapframework -c "\dt"

# Re-run migrations
psql -h localhost -U postgres -d sapframework -f infrastructure/database/schema.sql
```

### Test Failures
```bash
# Enable debug logging
DEBUG=* ts-node tests/e2e/test-sod-e2e.ts

# Check test data
psql -h localhost -U postgres -d sapframework -c "SELECT * FROM tenants WHERE tenant_id LIKE 'test-%'"
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data
3. **Idempotency**: Tests should be repeatable
4. **Fast**: Keep tests under 30 seconds
5. **Clear Output**: Use descriptive test names and logging

## Performance

Typical E2E test performance:
- SoD Analysis E2E: ~500-800ms
- Database operations: ~20-50ms each
- CSV generation: ~50-100ms

## Security

⚠️ **Important Security Notes:**
- Never commit database credentials
- Use environment variables for sensitive data
- Don't run E2E tests against production databases
- Ensure test data is properly cleaned up

## Future E2E Tests

Planned E2E test suites:
- [ ] GDPR Compliance E2E
- [ ] Tenant Onboarding E2E
- [ ] Service Discovery E2E
- [ ] API Integration E2E
- [ ] Multi-tenant Isolation E2E
