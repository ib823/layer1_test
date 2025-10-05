# End-to-End (E2E) Test Suite

**Status**: ✅ Production Ready
**Total Test Suites**: 3
**Total Tests**: 25 (8 + 6 + 11)
**Coverage**: All critical user flows

---

## 📋 Overview

Comprehensive E2E test suite covering all critical user workflows in the SAP MVP Framework.

### Test Suites

| Suite | File | Tests | Focus |
|-------|------|-------|-------|
| **Tenant Onboarding** | `tenant-onboarding.e2e.ts` | 8 | API tenant management workflow |
| **Service Discovery** | `service-discovery.e2e.ts` | 6 | SAP service discovery and module recommendations |
| **SoD Analysis** | `../../core/tests/e2e/test-sod-e2e.ts` | 11 | Complete SoD violation workflow |

---

## 🚀 Quick Start

### Prerequisites

1. **PostgreSQL Database**
   ```bash
   docker run -d --name sap-framework-db \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=sapframework \
     -p 5432:5432 postgres:15
   ```

2. **Database Schema**
   ```bash
   psql sapframework < infrastructure/database/schema.sql
   psql sapframework < infrastructure/database/migrations/001_sod_violations.sql
   ```

3. **Environment Variables**
   ```bash
   export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sapframework"
   ```

### Running Tests

#### All E2E Tests (Recommended)

```bash
# From project root
pnpm test:e2e

# Or directly
cd packages/api/tests/e2e
./run-all-e2e-tests.sh
```

#### Individual Test Suites

```bash
# Tenant Onboarding
pnpm test:e2e:onboarding

# Service Discovery
pnpm test:e2e:discovery

# SoD Analysis
pnpm test:e2e:sod
```

---

## 📊 Test Coverage

### Tenant Onboarding (8 tests)
- ✅ Health endpoint validation
- ✅ Create tenant with SAP connection
- ✅ Retrieve tenant details
- ✅ List tenants with pagination
- ✅ Get capability profile
- ✅ Get active modules
- ✅ Module activation
- ✅ Module deactivation

### Service Discovery (6 tests)
- ✅ Setup test tenant
- ✅ Trigger service discovery
- ✅ Check discovery status
- ✅ Validate capability profile
- ✅ Get module recommendations
- ✅ Identify missing services

### SoD Analysis (11 tests)
- ✅ Database connectivity
- ✅ Create analysis run
- ✅ Store violations (batch)
- ✅ Retrieve with filters
- ✅ Get by ID
- ✅ Update status
- ✅ Get latest analysis
- ✅ Calculate statistics
- ✅ Delete old violations
- ✅ CSV export
- ✅ Data cleanup

---

## 🎯 Success Criteria

All E2E tests pass when:
- ✅ All test suites complete successfully (green checkmarks)
- ✅ No database connection errors
- ✅ All test data automatically cleaned up
- ✅ Master test runner reports 3/3 suites passed

---

## 🔧 Test Architecture

### Design Principles

1. **Isolation**: Each test suite uses unique tenant IDs with timestamps
2. **Cleanup**: Automatic cleanup after each suite (even on failure)
3. **Real Operations**: Tests use real database and API (no mocks)
4. **Independence**: Tests can run individually or as a suite
5. **Colored Output**: Clear visual feedback with color-coded results

### Test Structure

```typescript
class TestSuite {
  async run(): Promise<void> {
    try {
      await this.testScenario1();
      await this.testScenario2();
      // ...
      await this.cleanup();
      this.printResults();
    } catch (error) {
      await this.cleanup();
      process.exit(1);
    }
  }
}
```

### Data Cleanup Strategy

All tests follow this pattern:
```sql
DELETE FROM sod_violations WHERE tenant_id LIKE 'test-%';
DELETE FROM tenant_module_activations WHERE tenant_id LIKE 'test-%';
DELETE FROM tenant_capability_profiles WHERE tenant_id LIKE 'test-%';
DELETE FROM tenant_sap_connections WHERE tenant_id LIKE 'test-%';
DELETE FROM tenants WHERE tenant_id LIKE 'test-%';
```

---

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test connectivity
psql "$DATABASE_URL" -c "SELECT 1"

# Check PostgreSQL is running
docker ps | grep postgres

# Verify DATABASE_URL
echo $DATABASE_URL
```

### Schema Issues

```bash
# Verify tables exist
psql sapframework -c "\dt"

# Re-apply schema
psql sapframework -f infrastructure/database/schema.sql
```

### Test Failures

```bash
# Check for leftover test data
psql sapframework -c "SELECT * FROM tenants WHERE tenant_id LIKE 'test-%'"

# Manual cleanup if needed
psql sapframework -c "DELETE FROM tenants WHERE tenant_id LIKE 'test-%'"
```

### Authentication Issues

E2E tests automatically disable authentication:
```bash
export AUTH_ENABLED=false
```

If tests still fail with 401:
1. Verify `AUTH_ENABLED=false` is set
2. Check the test imports set environment before importing app
3. Restart the test runner

---

## 📈 Performance Benchmarks

Typical execution times:
- Tenant Onboarding: 400-700ms
- Service Discovery: 300-500ms
- SoD Analysis: 400-800ms
- **Total Suite**: 1.1-2.0 seconds

---

## 🔒 Security Notes

⚠️ **Important**:
- Never commit database credentials
- Always use environment variables
- Don't run E2E tests against production
- Tests automatically use test-* tenant IDs for safety

---

## 📚 Related Documentation

- **E2E Testing Guide**: `/docs/E2E_TESTING_GUIDE.md` - Comprehensive guide
- **Database Schema**: `/infrastructure/database/schema.sql`
- **API Documentation**: Generated via Swagger at `/api/docs`

---

## 🔄 CI/CD Integration

E2E tests run in CI/CD on main branch:

```yaml
# .github/workflows/ci-cd.yml
e2e-tests:
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

## ✅ Checklist Before Running

- [ ] PostgreSQL is running
- [ ] DATABASE_URL is set correctly
- [ ] Database schema is up to date
- [ ] AUTH_ENABLED is set to false (for tests)
- [ ] No other API server is running on port 3000

---

**Questions?** See `/docs/E2E_TESTING_GUIDE.md` or create a GitHub issue with the `testing` label.
