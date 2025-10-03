# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**SAP MVP Framework** - Enterprise-grade multi-tenant GRC (Governance, Risk, Compliance) platform for SAP environments. Built with TypeScript, PostgreSQL, and designed for SAP BTP Cloud Foundry deployment.

**Core Innovation**: Automatic service discovery that scans SAP Gateway catalogs during tenant onboarding, detects available OData services, and activates/deactivates modules based on tenant capabilities.

---

## Architecture

4-layer monorepo using pnpm workspaces + Turbo:

```
Layer 4: API          → REST endpoints (Express + XSUAA auth)
Layer 3: Modules      → Business modules (SoD Analysis, etc.)
Layer 2: Services     → Business logic (Rules engine, analytics)
Layer 1: Core         → Connectors, persistence, utils
```

**Key Packages:**
- `@sap-framework/core` - SAP connectors, service discovery, database repositories
- `@sap-framework/services` - Rule engine and business services
- `@sap-framework/user-access-review` - SoD (Segregation of Duties) analysis
- `@sap-framework/api` - REST API with XSUAA authentication

---

## Common Commands

### Development
```bash
pnpm install              # Install all dependencies
pnpm build                # Build all packages (uses Turbo)
pnpm dev                  # Watch mode for all packages
pnpm test                 # Run all unit tests
pnpm test:watch           # Watch mode for tests
pnpm test:coverage        # Run tests with coverage (70% threshold)
pnpm test:e2e             # Run E2E tests (requires PostgreSQL)
pnpm lint                 # Lint all packages
pnpm lint:fix             # Auto-fix linting issues
pnpm typecheck            # TypeScript type checking only
```

### Single Package Testing
```bash
cd packages/core && pnpm test                    # Test core package only
cd packages/core && pnpm test ServiceDiscovery   # Test specific file
cd packages/api && pnpm test:watch               # Watch mode for API tests
```

### Database
```bash
# Setup local PostgreSQL (Docker)
docker run -d --name sap-framework-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=sapframework \
  -p 5432:5432 postgres:15

# Apply schema
psql sapframework < infrastructure/database/schema.sql

# Check DATABASE_URL is set
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sapframework"
```

### Running E2E Tests
```bash
# Automated test runner (recommended)
cd packages/core/tests/e2e && ./run-e2e-tests.sh

# Or directly
DATABASE_URL="postgresql://localhost/sapframework" pnpm test:e2e
```

---

## Key Architectural Patterns

### 1. Multi-Tenant Service Discovery

**Flow**: Tenant onboards → ServiceDiscovery scans SAP Gateway → Generates TenantProfile → Activates modules based on available services

**Critical Files:**
- `packages/core/src/connectors/base/ServiceDiscovery.ts` - Auto-discovers OData services
- `packages/core/src/connectors/base/BaseSAPConnector.ts` - Abstract SAP connector
- `packages/core/src/persistence/TenantProfileRepository.ts` - Stores capabilities

**Example Usage:**
```typescript
const connector = new S4HANAConnector({ baseUrl, auth });
const discovery = new ServiceDiscovery(connector);
const result = await discovery.discoverServices();
const profile = await discovery.generateTenantProfile('tenant-123');

// Check capabilities
if (profile.capabilities.canDoSoD) {
  await repo.activateModule('tenant-123', 'SoD_Analysis');
}
```

### 2. SAP Product Connectors

All connectors extend `BaseSAPConnector` which provides:
- Circuit breaker pattern (fail-fast after 5 errors)
- Exponential backoff retry (3 attempts)
- OAuth/Basic auth abstraction
- OData v2 query building

**Implemented:**
- `S4HANAConnector` - Complete OData v2 support (users, roles, authorizations)
- `IPSConnector` - Identity Provisioning (SCIM protocol)

**Stubs (future):**
- `AribaConnector` - Procurement data
- `SuccessFactorsConnector` - HR data

**Adding New Connectors:**
1. Create `packages/core/src/connectors/yourproduct/`
2. Extend `BaseSAPConnector`
3. Implement `abstract initialize()` and `abstract fetchODataMetadata()`
4. Export from `packages/core/src/connectors/index.ts`

### 3. Error Handling Hierarchy

All errors extend `FrameworkError` from `packages/core/src/errors/FrameworkError.ts`:

```typescript
- AuthenticationError
- ConfigurationError
- ConnectorError
  - CircuitBreakerOpenError
  - ODataQueryError
- ValidationError
- DatabaseError
```

**Usage:**
```typescript
import { AuthenticationError, ErrorCode } from '@sap-framework/core';
throw new AuthenticationError('Token expired', ErrorCode.AUTH_TOKEN_INVALID);
```

### 4. Database Multi-Tenancy

PostgreSQL schema with tenant isolation via foreign keys:

**Core Tables:**
- `tenants` - Tenant metadata
- `tenant_capability_profiles` - Discovered SAP services per tenant
- `tenant_module_activations` - Which modules are active per tenant
- `sod_violations` - SoD analysis results (tenant-scoped)
- `sod_analysis_runs` - Analysis execution metadata

**Repository Pattern:**
- `TenantProfileRepository` - CRUD for tenant profiles
- `SoDViolationRepository` - Stores/queries SoD violations with filters

### 5. Event-Driven Architecture

`EventBus` (packages/core/src/events/EventBus.ts) enables decoupled communication:

```typescript
import { EventBus, EventType } from '@sap-framework/core';

// Emit events
EventBus.emit(EventType.TENANT_ONBOARDED, { tenantId: 'acme-123' });
EventBus.emit(EventType.DISCOVERY_COMPLETED, { services: [...] });

// Subscribe
EventBus.on(EventType.SOD_VIOLATION_DETECTED, async (data) => {
  await notifySecurityTeam(data);
});
```

### 6. Security Implementation

**Authentication**: XSUAA JWT validation (SAP BTP standard)
- Middleware: `packages/api/src/middleware/auth.ts`
- Validates JWT signature, expiration, tenant claims
- **Note**: Currently commented out (line 37 in routes/index.ts) - enable for production

**Encryption**: AES-256-GCM for credentials at rest
- Utility: `packages/core/src/utils/encryption.ts`
- Auto-encrypts credentials in `TenantProfileRepository`
- Keys stored in BTP credential store (never in code)

**Data Protection**:
- PII masking: `packages/core/src/utils/piiMasking.ts`
- GDPR service: `packages/core/src/services/GDPRService.ts`
- Retention: `packages/core/src/services/DataRetentionService.ts`

---

## Testing Strategy

### Unit Tests
- **Location**: `packages/{package}/tests/unit/`
- **Coverage Target**: 70% minimum (configured in jest.config.js)
- **Mocking**: Use Jest mocks for SAP connectors, database

### Integration Tests
- **Location**: `packages/core/tests/integration/`
- **Status**: Some currently skipped (require real SAP connection)
- **Future**: Mock SAP OData server for CI/CD

### E2E Tests
- **Location**: `packages/core/tests/e2e/test-sod-e2e.ts`
- **Coverage**: Full SoD workflow (create run → store violations → query → export CSV)
- **Database**: Requires PostgreSQL with schema
- **Cleanup**: Automatic (deletes test-tenant-e2e-* data)

**Run E2E**: See `docs/E2E_TESTING_GUIDE.md` for detailed instructions

---

## Important Implementation Notes

### Circuit Breaker Pattern
All SAP connectors use circuit breaker (packages/core/src/utils/circuitBreaker.ts):
- Opens after 5 consecutive failures
- Stays open for 60 seconds
- Half-open state allows 1 test request

**Implication**: When testing connectors, consecutive failures will trigger circuit breaker. Reset by waiting 60s or restarting.

### Retry Strategy
Exponential backoff with jitter (packages/core/src/utils/retry.ts):
- Default: 3 attempts, 1s base delay
- Jitter prevents thundering herd

### OData Query Building
Helper functions in `packages/core/src/utils/odata.ts`:
```typescript
buildODataQuery('Users', {
  $select: ['UserId', 'UserName'],
  $filter: "Department eq 'Finance'",
  $top: 100
});
// Returns: Users?$select=UserId,UserName&$filter=Department eq 'Finance'&$top=100
```

### Database Connection Pooling
Repositories accept `DATABASE_URL` and create `pg.Pool` internally:
```typescript
const repo = new TenantProfileRepository(process.env.DATABASE_URL!);
await repo.createTenant('tenant-123', 'ACME Corp');
// Pool automatically manages connections
```

---

## Environment Variables

Required for local development:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sapframework

# SAP S/4HANA (for testing connectors)
SAP_BASE_URL=https://your-sap-system.com
SAP_CLIENT=100
SAP_AUTH_TYPE=OAUTH  # or BASIC
SAP_CLIENT_ID=your_client_id
SAP_CLIENT_SECRET=your_client_secret

# SAP IPS (Identity Provisioning)
IPS_BASE_URL=https://your-ips-instance.accounts.ondemand.com
IPS_CLIENT_ID=your_ips_client
IPS_CLIENT_SECRET=your_ips_secret

# Encryption (production)
ENCRYPTION_KEY=base64-encoded-32-byte-key  # Stored in BTP credential store
```

---

## Deployment

### SAP BTP Cloud Foundry
1. Build: `pnpm build`
2. Deploy: `cf push -f infrastructure/cloud-foundry/manifest.yml`
3. Bind services: PostgreSQL, XSUAA, Destination, Credential Store

**See**: `docs/BTP_DEPLOYMENT.md` for full deployment guide

### CI/CD
GitHub Actions workflows in `.github/workflows/`:
- `ci-cd.yml` - Build, test, deploy pipeline
- `security.yml` - Security scanning (Snyk)

**E2E tests run only on main branch** (requires PostgreSQL service in CI)

---

## Production Readiness Status

**Current**: 70% complete - core architecture solid, production components in progress

**Recent Additions** (see IMPLEMENTATION_ROADMAP.md):
- ✅ AES-256-GCM encryption service
- ✅ SoD violation database storage
- ✅ E2E test suite with automated runner
- ✅ CI/CD pipeline setup
- ✅ Security implementation (auth, encryption, PII masking)

**Remaining Work**:
- Enable XSUAA authentication (uncomment line 37 in packages/api/src/routes/index.ts)
- Increase test coverage to 80%+
- Add rate limiting with Redis
- Complete Swagger API documentation
- Build React dashboard frontend

**Timeline**: 8-12 weeks to production (see IMPLEMENTATION_ROADMAP.md for detailed plan)

---

## Module Activation Logic

**Key Concept**: Modules auto-activate/deactivate based on tenant's available SAP services.

**Example - SoD Analysis Requirements:**
```typescript
// Requires these SAP OData services:
- API_USER_SRV (user data)
- API_ROLE_SRV (role assignments)
- API_AUTHORIZATION_OBJ_SRV (authorization objects)

// Capability check:
if (profile.capabilities.canDoSoD) {
  // Tenant has all required services → activate
} else {
  // Show error with missing services
  console.log('Missing:', profile.missingServices);
  // UI shows "Contact SAP admin to activate API_USER_SRV"
}
```

**Future Modules** (defined but not implemented):
- Invoice Matching (requires FI-related services)
- Anomaly Detection (requires audit log services)

---

## Troubleshooting

### Build Failures
```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```

### Test Failures
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Verify PostgreSQL is running
psql sapframework -c "SELECT 1"

# Run tests with verbose output
cd packages/core && pnpm test -- --verbose
```

### Circuit Breaker Issues
If SAP connector tests fail with "Circuit breaker is open":
- Wait 60 seconds for reset
- Or restart test process
- Check SAP system is reachable

### TypeScript Errors
```bash
# Type check without building
pnpm typecheck

# Check specific package
cd packages/core && pnpm typecheck
```

---

## Code Style & Conventions

- **TypeScript**: Strict mode enabled
- **Imports**: Use workspace aliases (`@sap-framework/core`)
- **Errors**: Always extend FrameworkError
- **Async**: Prefer async/await over promises
- **Database**: Use repositories, never raw queries in controllers
- **Logging**: Use Winston logger from `packages/core/src/utils/logger.ts`
- **Config**: Use ConfigManager (`packages/core/src/config/ConfigManager.ts`)

---

## Key Dependencies

- **axios** - HTTP client for SAP APIs
- **pg** - PostgreSQL driver
- **express** - REST API framework
- **@sap/xssec** - XSUAA authentication
- **zod** - Runtime validation
- **winston** - Structured logging
- **jest** - Testing framework
- **turbo** - Monorepo build system

---

## Related Documentation

- `README.md` - Project overview and quick start
- `IMPLEMENTATION_ROADMAP.md` - 12-week production roadmap
- `docs/E2E_TESTING_GUIDE.md` - E2E testing instructions
- `docs/BTP_DEPLOYMENT.md` - SAP BTP deployment guide
- `docs/MULTI_TENANT_DISCOVERY.md` - Service discovery architecture
- `docs/CICD_SETUP_GUIDE.md` - CI/CD configuration

---

**Contact**: ikmal.baharudin@gmail.com
**Repository**: https://github.com/ib823/layer1_test
**Last Updated**: 2025-10-03
