# Consolidation Plan & PR Strategy

**Repository:** layer1_test (SAP MVP Framework)
**Plan Date:** 2025-10-07
**Target:** Consolidate work, ship BTP-ready multi-tenant product

---

## Current Repository State

### Branch Analysis

```bash
$ git branch -a
* main
  remotes/origin/HEAD -> origin/main
  remotes/origin/main
```

**Observation:** Single `main` branch, no active feature branches, no `develop` branch.

**Git Status (Modified Files):**
```
M  apps/api/src/app.test.ts
M  packages/api/package.json
M  packages/api/src/middleware/auditLog.ts
M  packages/api/src/middleware/auth.ts
M  packages/api/src/middleware/errorHandler.ts
M  packages/api/src/routes/admin/discovery.ts
M  packages/api/src/routes/admin/tenants.ts
M  packages/api/src/routes/compliance/gdpr.ts
M  packages/api/src/routes/index.ts
M  packages/api/src/routes/modules/sod.ts
M  packages/api/src/routes/monitoring/index.ts
M  packages/api/src/routes/onboarding/index.ts
M  packages/api/src/services/OnboardingService.ts
M  packages/api/tests/integration/auth.test.ts
M  packages/core/src/connectors/base/ServiceDiscovery.ts
M  packages/core/src/connectors/s4hana/S4HANAConnector.ts
M  packages/core/src/connectors/s4hana/types.ts
M  packages/core/src/persistence/index.ts
M  pnpm-lock.yaml

?? ADMIN_USER_MANUAL.md (untracked)
?? END_USER_MANUAL.md (untracked)
?? IMPLEMENTATION_COMPLETE.md (untracked)
?? INVOICE_MATCHING_MODULE.md (untracked)
?? NEW_MODULES_COMPLETE.md (untracked)
?? REMAINING_WORK.md (untracked)
?? SYSTEM_OVERVIEW.md (untracked)
?? infrastructure/database/migrations/004_add_invoice_matching.sql (untracked)
?? packages/api/src/controllers/InvoiceMatchingController.ts (untracked)
?? packages/api/src/routes/matching/ (untracked)
?? packages/core/src/persistence/InvoiceMatchRepository.ts (untracked)
?? packages/modules/gl-anomaly-detection/ (untracked)
?? packages/modules/invoice-matching/ (untracked)
?? packages/modules/vendor-data-quality/ (untracked)
```

**Interpretation:**
- **Modified files:** In-progress work on API routes, middleware, connectors (18 files)
- **Untracked files:** 3 new modules + documentation + migration
- **No merge conflicts:** All work is on `main`, no divergent branches
- **Decision:** Since there are no parallel branches, we'll create feature branches from current state and use PRs to consolidate work into a clean `main`.

---

## Proposed Branch Strategy

### Branch Model: Trunk-Based Development with Short-Lived Feature Branches

```
main (protected)
├── release/v1.0.0 (tags for production releases)
├── feat/repo-audit (this work)
├── feat/security-hardening
├── feat/replace-mock-data
├── feat/test-coverage
├── feat/rate-limiting
├── feat/connector-improvements
├── chore/dead-code-cleanup
└── fix/auth-enforcement
```

### Branch Protection Rules (GitHub)

**`main` branch:**
- ✅ Require pull request reviews (1+ approvals)
- ✅ Require status checks to pass before merging:
  - `lint-and-typecheck`
  - `test` (80% coverage minimum)
  - `security-scan` (no high/critical CVEs)
  - `build`
- ✅ Require linear history (squash or rebase merges)
- ✅ Require signed commits (optional but recommended)
- ✅ Include administrators (no force push even for admins)
- ✅ Require conversation resolution before merging
- ❌ Allow force pushes: **DISABLED**
- ❌ Allow deletions: **DISABLED**

**`release/*` branches:**
- Same as `main` plus:
- ✅ Only allow hotfix merges from `fix/*` branches
- ✅ Auto-tag on merge

---

## Code Owners (CODEOWNERS)

**Create `.github/CODEOWNERS`:**
```
# Default owner for everything
* @ib823

# Core infrastructure and connectors (require senior review)
/packages/core/ @ib823
/infrastructure/ @ib823

# Security-sensitive code (require security review)
/packages/api/src/middleware/auth.ts @ib823
/packages/core/src/utils/encryption.ts @ib823
/packages/api/src/middleware/rateLimiting.ts @ib823

# Database schema changes (require DBA review)
/infrastructure/database/ @ib823

# CI/CD configuration (require DevOps review)
/.github/workflows/ @ib823
/infrastructure/cloud-foundry/ @ib823

# Documentation (anyone can contribute)
/docs/ @ib823
*.md @ib823
```

---

## Pull Request Template

**Create `.github/PULL_REQUEST_TEMPLATE.md`:**
```markdown
## Problem

<!-- What issue does this PR solve? Link to GitHub issue if applicable. -->

## Changes

<!-- High-level summary of what changed. Use a bulleted list for multiple changes. -->

-
-

## Type of Change

<!-- Check all that apply -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🔒 Security fix
- [ ] ♻️ Refactoring (no functional changes)
- [ ] 🧪 Test coverage improvement
- [ ] 🏗️ Infrastructure/build change

## Risks

<!-- What could break? What edge cases exist? Any performance implications? -->

## Testing

<!-- How was this tested? -->

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated (if applicable)
- [ ] Manual testing performed
- [ ] Tested with multiple tenants (multi-tenancy verification)

**Test Coverage:** X%

## Screenshots/Demos

<!-- For UI changes, provide before/after screenshots or screen recordings -->

## Related ADRs

<!-- Link to any Architecture Decision Records (docs/adr/ADR-XXXX.md) -->

- ADR-XXXX: [Title](link)

## Deployment Notes

<!-- Any special deployment considerations? Database migrations? Env var changes? -->

- [ ] No deployment changes required
- [ ] Database migration required (see `infrastructure/database/migrations/XXX.sql`)
- [ ] New environment variables required (documented in `.env.example`)
- [ ] BTP service binding changes required
- [ ] Secrets rotation required

## Security Checklist

<!-- For security-sensitive changes -->

- [ ] No secrets committed to repo
- [ ] Input validation added for all user inputs
- [ ] Authentication/authorization enforced
- [ ] Audit logging added for sensitive operations
- [ ] PII masking applied where necessary
- [ ] SQL injection protection verified (parameterized queries)
- [ ] XSS protection verified (output encoding)

## Checklist

- [ ] Code follows project conventions (ESLint, Prettier)
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated (if needed)
- [ ] No `console.log` or debug code left
- [ ] All tests passing locally
- [ ] No merge conflicts
- [ ] Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)

## Reviewer Notes

<!-- Any specific areas you want reviewers to focus on? -->
```

---

## Consolidation Sequence (PR Order)

### Phase 1: Immediate Cleanup & Security (Week 1)

#### PR #1: `chore/repo-audit` - Repository Audit Documentation
**Branch:** `feat/repo-audit`
**Label:** `area:docs`
**Effort:** 1 hour (already done)
**Changes:**
- ✅ Add `docs/00_audit/ARCHITECTURE.md`
- ✅ Add `docs/00_audit/CONSOLIDATION_PLAN.md`
- ✅ Create directory structure: `docs/ux/`, `docs/operative/`, `docs/adr/`, `adapters/*/`

**Acceptance Criteria:**
- Documentation accurately reflects current state
- All diagrams render correctly in GitHub markdown
- No breaking changes to code

**Merge Order:** 1st (foundation for all other PRs)

---

#### PR #2: `chore/dead-code-cleanup` - Archive Status Documentation
**Branch:** `chore/dead-code-cleanup`
**Label:** `area:docs`
**Effort:** 2 hours
**Changes:**
```bash
# Move documentation to proper locations
mkdir -p docs/archive docs/manuals docs/architecture docs/security
mv ADMIN_USER_MANUAL.md docs/manuals/
mv END_USER_MANUAL.md docs/manuals/
mv COMPLETION_REPORT.md docs/archive/
mv COMPLETION_SUMMARY.md docs/archive/
mv FINAL_STATUS.txt docs/archive/ # or delete
mv GAP_ANALYSIS_RESPONSE.md docs/archive/
mv IMPLEMENTATION_COMPLETE.md docs/archive/
mv NEW_MODULES_COMPLETE.md docs/archive/
mv NEXT_STEPS.md docs/archive/ # or delete
mv PRIORITY_ACTIONS_COMPLETED.md docs/archive/
mv PRODUCTION_READINESS_PROGRESS.md docs/archive/
mv PROJECT_STATUS.md docs/archive/
mv SECURITY_COMPLIANCE_IMPLEMENTATION.md docs/security/
mv SYSTEM_OVERVIEW.md docs/architecture/
rm main # empty file

# Module-specific docs
mv INVOICE_MATCHING_MODULE.md packages/modules/invoice-matching/DESIGN.md

# Update README.md to reference new locations
```

**Acceptance Criteria:**
- Root directory contains only: `README.md`, `CLAUDE.md`, `QUICKSTART.md`, `IMPLEMENTATION_ROADMAP.md`, `REMAINING_WORK.md` (or move these too)
- All moved docs still render correctly
- Links in other files updated to new paths

**Merge Order:** 2nd (parallel with PR #1, no conflicts)

---

#### PR #3: `fix/secrets-exposure` - Remove Secrets from Repo
**Branch:** `fix/secrets-exposure`
**Label:** `area:security` 🔒
**Effort:** 1 hour
**Changes:**
```bash
# Remove .env from tracking
git rm --cached .env

# Update .gitignore
echo "" >> .gitignore
echo "# Environment files (NEVER commit these)" >> .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore

# Ensure .env.example is up-to-date
# Add pre-commit hook to prevent .env commits
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check for .env files
if git diff --cached --name-only | grep -E "^\.env$"; then
  echo "❌ ERROR: .env file cannot be committed"
  echo "Only .env.example should be committed"
  exit 1
fi

# Run prettier
pnpm prettier --check .
EOF

chmod +x .husky/pre-commit
```

**Post-Merge Actions:**
1. Rotate any secrets that were in `.env` (DATABASE_URL password, JWT_SECRET, etc.)
2. Notify team to never commit `.env` files

**Acceptance Criteria:**
- `.env` removed from git history (or at least from tracking)
- `.gitignore` prevents future commits
- Pre-commit hook blocks `.env` commits
- `.env.example` contains all required vars with placeholder values

**Merge Order:** 3rd (critical security fix)

---

#### PR #4: `feat/ci-quality-gates` - Strengthen CI Pipeline
**Branch:** `feat/ci-quality-gates`
**Label:** `area:ci-cd`
**Effort:** 3 hours
**Changes:**
```yaml
# .github/workflows/ci-cd.yml

# BEFORE (line 44):
run: pnpm lint
continue-on-error: true # Don't fail build on warnings

# AFTER:
run: pnpm lint
# Removed continue-on-error - now blocks on warnings

# BEFORE (line 126):
run: pnpm audit --audit-level=high
continue-on-error: true

# AFTER:
run: pnpm audit --audit-level=high
# Removed continue-on-error - now blocks on high/critical vulnerabilities

# ADD: License checker step
- name: Check licenses
  run: |
    npx license-checker --onlyAllow "MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;0BSD" \
      --excludePackages "spdx-exceptions@2.5.0" \
      --excludePrivatePackages

# ADD: Bundle size monitoring (for web package)
- name: Analyze bundle size
  run: |
    cd packages/web
    npx @next/bundle-analyzer
    # Fail if main bundle > 500KB
    BUNDLE_SIZE=$(du -k .next/static/chunks/main-*.js | cut -f1)
    if [ "$BUNDLE_SIZE" -gt 500 ]; then
      echo "❌ Main bundle too large: ${BUNDLE_SIZE}KB (max: 500KB)"
      exit 1
    fi

# ADD: PostgreSQL service for E2E tests
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: sapframework_test
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432

# UPDATE: Test step to run E2E tests
- name: Run E2E tests
  run: pnpm test:e2e
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/sapframework_test
```

**Additional Files:**
- Update `package.json` to add `test:e2e` script that doesn't require manual PostgreSQL setup
- Add `.github/workflows/deploy-production.yml` (separate from ci-cd.yml for clarity)

**Acceptance Criteria:**
- CI fails on linting warnings
- CI fails on high/critical vulnerabilities
- CI fails on license violations
- CI fails if bundle size exceeds 500KB
- E2E tests run automatically in CI
- All existing tests still pass

**Merge Order:** 4th (enables quality gates for subsequent PRs)

---

### Phase 2: Security & Authentication (Week 1-2)

#### PR #5: `fix/auth-enforcement` - Enable Authentication Middleware
**Branch:** `fix/auth-enforcement`
**Label:** `area:security` 🔒
**Effort:** 4 hours
**Changes:**
```typescript
// packages/api/src/routes/index.ts

// BEFORE (line 37):
// router.use(authenticate); // Enable in production

// AFTER:
router.use(authenticate); // Authentication required for all routes

// ADD: Public routes exception list
const publicRoutes = [
  '/api/monitoring/health',
  '/api/monitoring/metrics',
];

router.use((req, res, next) => {
  if (publicRoutes.includes(req.path)) {
    return next();
  }
  return authenticate(req, res, next);
});
```

**Additional Changes:**
- Add `requireRole` middleware to admin routes:
  ```typescript
  router.use('/api/admin', authenticate, requireRole('admin'));
  ```
- Update tests to include auth tokens
- Add integration test verifying tenant isolation (tenant A cannot query tenant B's data)

**Acceptance Criteria:**
- All protected routes return `401` without valid JWT
- Public routes (`/health`, `/metrics`) remain accessible
- Admin routes require `admin` role
- Integration test proves tenant isolation works

**Merge Order:** 5th (critical security fix)

---

#### PR #6: `feat/rate-limiting` - Implement Redis Rate Limiting
**Branch:** `feat/rate-limiting`
**Label:** `area:security` 🔒
**Effort:** 6 hours
**Changes:**
```typescript
// packages/api/src/middleware/rateLimiting.ts (new file)
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import logger from '../utils/logger';

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : null;

if (!redis) {
  logger.warn('Redis not configured - using in-memory rate limiting (NOT for production)');
}

export const apiLimiter = rateLimit({
  store: redis ? new RedisStore({ client: redis, prefix: 'rl:' }) : undefined,
  windowMs: 60 * 1000, // 1 minute
  max: async (req) => {
    const user = req.user;
    if (!user) return 10; // Public: 10/min
    if (user.roles.includes('admin')) return 1000; // Admin: 1000/min
    return 100; // Authenticated: 100/min
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit per tenant + user
    return `${req.user?.tenantId || 'anon'}:${req.user?.id || req.ip}`;
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
      ip: req.ip,
    });
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

// Stricter limits for expensive operations
export const discoveryLimiter = rateLimit({
  store: redis ? new RedisStore({ client: redis, prefix: 'rl:discovery:' }) : undefined,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 discoveries per hour
  keyGenerator: (req) => req.user?.tenantId || req.ip,
});

export const sodAnalysisLimiter = rateLimit({
  store: redis ? new RedisStore({ client: redis, prefix: 'rl:sod:' }) : undefined,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 analyses per hour
  keyGenerator: (req) => req.user?.tenantId || req.ip,
});
```

**Apply to Routes:**
```typescript
// packages/api/src/routes/index.ts
import { apiLimiter, discoveryLimiter, sodAnalysisLimiter } from '../middleware/rateLimiting';

router.use('/api', apiLimiter);
router.use('/api/admin/tenants/:id/discovery', discoveryLimiter);
router.use('/api/modules/sod/analyze', sodAnalysisLimiter);
```

**Docker Compose Update:**
```yaml
# docker-compose.yml - add Redis service
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --requirepass redis123
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

**Environment Variables:**
```bash
# .env.example
REDIS_URL=redis://:redis123@localhost:6379
```

**Tests:**
- Unit test: verify rate limiter configuration
- Integration test: make 11 requests, assert 11th returns 429
- Integration test: verify Redis failure falls back to memory store

**Acceptance Criteria:**
- Rate limiting works with Redis
- Graceful degradation if Redis unavailable (in-memory fallback)
- Different limits for public/authenticated/admin users
- Expensive operations (discovery, SoD analysis) have stricter limits
- Tests verify 429 responses after limit exceeded

**Merge Order:** 6th (critical security feature)

---

### Phase 3: Data Quality & Testing (Week 2-3)

#### PR #7: `feat/replace-mock-data` - Remove Mock Data from Production Code
**Branch:** `feat/replace-mock-data`
**Label:** `area:api`, `area:ui`
**Effort:** 8 hours
**Changes:**

**Backend - Analytics API:**
```typescript
// packages/api/src/routes/analytics/index.ts

// BEFORE (mock data):
router.get('/kpis', (req, res) => {
  res.json({
    data: {
      total: 42,
      critical: 5,
      users: 156,
      score: 87,
      trend: +5,
    },
  });
});

// AFTER (real data):
import { SoDViolationRepository } from '@sap-framework/core';

router.get('/kpis', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const repo = new SoDViolationRepository(process.env.DATABASE_URL!);

  try {
    const [total, critical, users, latestRun] = await Promise.all([
      repo.countViolations(tenantId),
      repo.countViolations(tenantId, { riskLevel: 'HIGH' }),
      repo.countUniqueUsers(tenantId),
      repo.getLatestAnalysisRun(tenantId),
    ]);

    const score = total > 0 ? Math.max(0, 100 - (critical / total) * 100) : 100;
    const trend = latestRun?.trend || 0; // Calculate from previous run

    res.json({
      data: { total, critical, users, score, trend },
    });
  } catch (error) {
    logger.error('Failed to fetch KPIs', { tenantId, error });
    res.status(500).json({ error: 'Failed to fetch KPIs' });
  }
});
```

**Frontend - Dashboard:**
```tsx
// packages/web/src/app/dashboard/page.tsx

// BEFORE (hardcoded):
<span className="px-3 py-1 bg-green-100 text-green-800">Active</span>
<span className="px-3 py-1 bg-green-100 text-green-800">Connected</span>
<span className="text-sm text-gray-600">2 hours ago</span>

// AFTER (live):
import { useQuery } from '@tanstack/react-query';

const { data: health } = useQuery({
  queryKey: ['health'],
  queryFn: () => fetch('/api/monitoring/health').then(r => r.json()),
  refetchInterval: 30000, // Refresh every 30s
});

const { data: latestAnalysis } = useQuery({
  queryKey: ['latest-analysis'],
  queryFn: () => fetch('/api/modules/sod/runs?limit=1').then(r => r.json()),
});

// In JSX:
<span className={`px-3 py-1 ${health?.database === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
  {health?.database === 'ok' ? 'Active' : 'Error'}
</span>
<span className={`px-3 py-1 ${health?.sapConnector === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
  {health?.sapConnector === 'ok' ? 'Connected' : 'Disconnected'}
</span>
<span className="text-sm text-gray-600">
  {latestAnalysis?.completed_at
    ? formatDistanceToNow(new Date(latestAnalysis.completed_at), { addSuffix: true })
    : 'Never'}
</span>
```

**Backend - Health Endpoint Enhancement:**
```typescript
// packages/api/src/routes/monitoring/index.ts

router.get('/health', async (req, res) => {
  const checks = {
    database: 'unknown',
    sapConnector: 'unknown',
    redis: 'unknown',
  };

  try {
    // Database check
    await pool.query('SELECT 1');
    checks.database = 'ok';
  } catch (e) {
    checks.database = 'error';
  }

  try {
    // SAP connector check (use health check endpoint)
    const connector = await getSAPConnector(req.user?.tenantId || 'default');
    await connector.healthCheck();
    checks.sapConnector = 'ok';
  } catch (e) {
    checks.sapConnector = 'error';
  }

  try {
    // Redis check
    if (redis) {
      await redis.ping();
      checks.redis = 'ok';
    } else {
      checks.redis = 'not_configured';
    }
  } catch (e) {
    checks.redis = 'error';
  }

  const status = Object.values(checks).every(c => c === 'ok' || c === 'not_configured')
    ? 200
    : 503;

  res.status(status).json(checks);
});
```

**Delete Test Pages:**
```bash
rm -rf packages/web/src/app/test-modal
rm -rf packages/web/src/app/test-toast
rm -rf packages/web/src/app/test-sidebar
rm -rf packages/web/src/app/timeline # unless this is a real feature
```

**Acceptance Criteria:**
- Dashboard KPIs show real data from database
- System status reflects actual health checks (green = ok, red = error)
- No hardcoded/mock values in production code
- All test pages deleted or gated behind `if (process.env.NODE_ENV !== 'production')`
- Frontend fetches data from real API endpoints
- Loading states and error states handled gracefully

**Merge Order:** 7th (depends on PR #5 auth enforcement)

---

#### PR #8: `feat/test-coverage` - Comprehensive Test Suite
**Branch:** `feat/test-coverage`
**Label:** `area:testing`
**Effort:** 20 hours (large PR, may split into multiple)
**Changes:**

**New Tests:**
1. **Invoice Matching Module** (`packages/modules/invoice-matching/tests/`)
   - Unit tests for 3-way matching logic
   - Test fuzzy matching threshold
   - Test tolerance calculations
   - Test match result aggregation

2. **GL Anomaly Detection Module** (`packages/modules/gl-anomaly-detection/tests/`)
   - Unit tests for Benford's Law analysis
   - Unit tests for Z-score calculations
   - Test anomaly detection thresholds
   - Test edge cases (empty data, single transaction)

3. **Vendor Data Quality Module** (`packages/modules/vendor-data-quality/tests/`)
   - Unit tests for duplicate detection (fuzzy matching)
   - Unit tests for data validation rules
   - Test address normalization
   - Test vendor scoring

4. **API Integration Tests** (`packages/api/tests/integration/`)
   - Tenant isolation tests (prove tenant A cannot access tenant B's data)
   - Rate limiting tests (verify 429 after limit)
   - Auth flow tests (valid token → 200, invalid → 401, missing role → 403)
   - Error handling tests (database down, SAP connector down)

5. **E2E Tests** (`packages/core/tests/e2e/`)
   - Full onboarding → discovery → module activation flow
   - SoD analysis end-to-end (already exists, ensure passing)
   - Invoice matching end-to-end

**Jest Configuration Updates:**
```javascript
// jest.config.js (root)
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/index.ts', // re-exports
    '!packages/web/**', // exclude Next.js (tested separately)
  ],
};
```

**CI Update:**
```yaml
# .github/workflows/ci-cd.yml
- name: Run tests with coverage
  run: pnpm test --coverage
  env:
    CI: true

- name: Verify coverage threshold
  run: |
    COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "❌ Coverage too low: ${COVERAGE}% (minimum: 80%)"
      exit 1
    fi
```

**Acceptance Criteria:**
- All new modules have ≥80% test coverage
- API integration tests verify tenant isolation
- E2E tests cover critical workflows
- CI fails if coverage drops below 80%
- All tests passing in CI

**Merge Order:** 8th (can be parallel with PR #7)

---

### Phase 4: Connectors & Features (Week 3-4)

#### PR #9: `feat/connector-improvements` - Enhance SAP Connectors
**Branch:** `feat/connector-improvements`
**Label:** `area:connectors`
**Effort:** 16 hours
**Changes:**

**1. Ariba Connector - Decision: Keep as Stub with Feature Flag**
```typescript
// packages/core/src/connectors/ariba/AribaConnector.ts

export class AribaConnector extends BaseSAPConnector {
  // Keep minimal implementation
  // Add JSDoc:
  /**
   * Ariba Connector - STUB IMPLEMENTATION
   *
   * This connector is planned for future releases. Current implementation
   * provides basic structure but does not support production workloads.
   *
   * Roadmap:
   * - v2.0: Implement Ariba Network API integration
   * - v2.1: Supplier management endpoints
   * - v2.2: Purchase order tracking
   *
   * @see https://developer.ariba.com/api for API documentation
   */

  // Add method to check if ready
  public isProductionReady(): boolean {
    return false; // Always return false for stub
  }
}
```

**Frontend - Hide Ariba if Not Ready:**
```typescript
// packages/web/src/app/admin/connectors/page.tsx

const connectors = [
  { name: 'S/4HANA', status: 'ready', connector: S4HANAConnector },
  { name: 'IPS', status: 'ready', connector: IPSConnector },
  { name: 'SuccessFactors', status: 'partial', connector: SuccessFactorsConnector },
  // Only show Ariba if feature flag enabled
  ...(process.env.NEXT_PUBLIC_ENABLE_ARIBA === 'true'
    ? [{ name: 'Ariba', status: 'planned', connector: AribaConnector }]
    : []),
];
```

**2. SuccessFactors Connector - Complete Partial Implementation**
```typescript
// packages/core/src/connectors/successfactors/SuccessFactorsConnector.ts

/**
 * Get Employee Compensation Data
 */
async getCompensation(userId: string): Promise<SFCompensation> {
  try {
    const response = await this.request<SFODataResponse<SFCompensation>>({
      method: 'GET',
      url: `/odata/v2/EmpCompensation?$filter=userId eq '${escapeODataString(userId)}'`,
    });
    return response.d.results[0];
  } catch (error: unknown) {
    throw this.mapSFError(error);
  }
}

/**
 * Get Performance Reviews
 */
async getPerformanceReviews(userId: string): Promise<SFPerformanceReview[]> {
  try {
    const response = await this.request<SFODataResponse<SFPerformanceReview>>({
      method: 'GET',
      url: `/odata/v2/PerformanceReview?$filter=subjectUserId eq '${escapeODataString(userId)}'`,
    });
    return response.d.results;
  } catch (error: unknown) {
    throw this.mapSFError(error);
  }
}
```

**3. BTP Destination Service Integration**
```typescript
// packages/core/src/connectors/base/DestinationService.ts (new file)

import * as xsenv from '@sap/xsenv';

export interface DestinationConfig {
  Name: string;
  URL: string;
  Type: 'HTTP';
  Authentication: 'OAuth2SAMLBearerAssertion' | 'BasicAuthentication';
  // ... other SAP BTP destination properties
}

export class DestinationService {
  /**
   * Fetch destination configuration from BTP Destination Service
   * Falls back to environment variables in development
   */
  static async getDestination(name: string): Promise<DestinationConfig> {
    if (process.env.NODE_ENV === 'production' || process.env.VCAP_SERVICES) {
      // Production: Use BTP Destination Service
      const destService = xsenv.getServices({ destination: { tag: 'destination' } });
      // TODO: Implement actual destination fetch via REST API
      throw new Error('BTP Destination Service integration not yet implemented');
    } else {
      // Development: Use environment variables
      return {
        Name: name,
        URL: process.env[`${name.toUpperCase()}_BASE_URL`] || '',
        Type: 'HTTP',
        Authentication: (process.env[`${name.toUpperCase()}_AUTH_TYPE`] as any) || 'OAuth2SAMLBearerAssertion',
        // Map other env vars as needed
      };
    }
  }
}
```

**Usage in Connectors:**
```typescript
// packages/api/src/services/ConnectorFactory.ts

import { DestinationService } from '@sap-framework/core';

export async function createS4HANAConnector(tenantId: string): Promise<S4HANAConnector> {
  // Fetch destination config (either from BTP or env vars)
  const destination = await DestinationService.getDestination('S4HANA');

  return new S4HANAConnector({
    baseUrl: destination.URL,
    authType: destination.Authentication === 'BasicAuthentication' ? 'BASIC' : 'OAUTH',
    // ... other config from destination
  });
}
```

**Tests:**
- Unit tests for SuccessFactors new methods
- Integration tests for DestinationService (mock BTP service)
- Document Ariba stub status in README

**Acceptance Criteria:**
- SuccessFactors connector has `getCompensation()` and `getPerformanceReviews()` implemented
- Ariba connector documented as stub with `isProductionReady() → false`
- Destination Service abstraction allows BTP or env var config
- All new methods tested
- Frontend hides Ariba connector unless feature flag enabled

**Merge Order:** 9th (parallel with PR #8)

---

### Phase 5: Documentation & Deployment (Week 4)

#### PR #10: `docs/ux-principles` - UX Design System Documentation
**Branch:** `docs/ux-principles`
**Label:** `area:docs`
**Effort:** 4 hours
**Changes:**
```markdown
<!-- docs/ux/UX_PRINCIPLES.md -->

# UX Principles - SAP MVP Framework

## Design Philosophy

Inspired by **Steve Jobs' minimalism**: Every element must justify its existence. If it doesn't serve the user's primary goal, remove it.

### Core Principles

1. **Progressive Disclosure**: Show only what's needed now. Advanced features behind clear, non-intrusive paths.
2. **Single Focal Point**: Each screen has ONE primary action. Secondary actions are visually subordinate.
3. **Informational Clarity**: Every status indicator must answer: "What does this mean?" and "What should I do?"
4. **Accessible by Default**: WCAG 2.1 AA minimum. Keyboard navigation, screen reader support, sufficient contrast.
5. **Motion with Purpose**: Animations only for feedback or guiding attention. No gratuitous motion.

## Component Guidelines

### Status Indicators
- **Green**: System healthy, no action required
- **Yellow**: Warning, review recommended
- **Red**: Error, immediate action required
- **Gray**: Not configured or disabled

**Example:**
```tsx
<StatusBadge status={health?.database === 'ok' ? 'success' : 'error'}>
  {health?.database === 'ok' ? 'Database Active' : 'Database Error - Check Logs'}
</StatusBadge>
```

### Banners (Informational)
When a feature is unavailable due to missing configuration:
```tsx
<Banner type="warning" dismissible={false}>
  <p><strong>SAP Connector Not Configured</strong></p>
  <p>Contact your administrator to enable API_USER_SRV in your SAP Gateway.</p>
  <Button href="/admin/connectors">Configure Now</Button>
</Banner>
```

### Loading States
Always show:
1. Skeleton screens (not spinners) for content-heavy pages
2. Optimistic UI updates where possible
3. Error boundaries with actionable messages

## Accessibility Checklist
- [ ] All interactive elements keyboard-accessible (Tab, Enter, Space)
- [ ] Focus states visible and high-contrast
- [ ] Form errors announced to screen readers
- [ ] Color not sole indicator of state (icons + text)
- [ ] Alt text for all images
- [ ] Heading hierarchy logical (H1 → H2 → H3, no skips)

## Design Tokens
See `packages/web/src/styles/tokens.css` for:
- Colors (primary, secondary, semantic)
- Typography (font families, sizes, weights)
- Spacing (4px base unit, 8px, 16px, 24px, ...)
- Shadows, borders, radii
```

**Create ADR:**
```markdown
<!-- docs/adr/ADR-0001-ux-minimalism.md -->

# ADR-0001: UX Minimalism and Progressive Disclosure

**Status:** Accepted
**Date:** 2025-10-07
**Deciders:** @ib823

## Context
Enterprise GRC applications often suffer from information overload. Users are presented with dozens of metrics, buttons, and options simultaneously, leading to decision paralysis.

## Decision
We adopt **progressive disclosure** as our core UX principle:
1. Every screen has a single primary action (e.g., Dashboard → "View Violations")
2. Advanced features hidden behind clear navigation paths (not buried)
3. Status indicators must be actionable (not just informational)
4. No decorative elements that don't serve user goals

## Consequences
- **Positive:** Faster time-to-value for new users, reduced cognitive load
- **Positive:** Clearer testing (each screen has obvious success criteria)
- **Negative:** Risk of hiding important features if not careful with information architecture
- **Mitigation:** User testing to validate navigation paths
```

**Acceptance Criteria:**
- UX principles documented
- ADR created for UX decisions
- Component examples provided
- Accessibility checklist defined

**Merge Order:** 10th (documentation, parallel with other work)

---

#### PR #11: `docs/operations` - Operational Runbook
**Branch:** `docs/operations`
**Label:** `area:docs`
**Effort:** 6 hours
**Changes:**
```markdown
<!-- docs/operative/OPERATIONS.md -->

# Operations Runbook - SAP MVP Framework

## Tenant Onboarding

### Prerequisites
1. SAP system credentials (OAuth or Basic Auth)
2. SAP Gateway OData catalog accessible
3. Database connection active
4. Encryption master key configured in BTP Credential Store

### Steps

1. **Create Tenant via API**
   ```bash
   curl -X POST https://api.sapframework.com/api/onboarding \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "tenantId": "acme-corp",
       "companyName": "Acme Corporation",
       "sapConfig": {
         "baseUrl": "https://acme.s4hana.cloud.sap",
         "authType": "OAUTH",
         "clientId": "...",
         "clientSecret": "..."
       }
     }'
   ```

2. **Service Discovery Runs Automatically**
   - Scans SAP Gateway catalog
   - Generates tenant capability profile
   - Activates modules based on available services

3. **Verify Module Activation**
   ```bash
   curl https://api.sapframework.com/api/admin/tenants/acme-corp \
     -H "Authorization: Bearer $ADMIN_TOKEN"

   # Response includes:
   # { "activeModules": ["SoD_Analysis", ...], "missingServices": [...] }
   ```

4. **If Services Missing**
   - Contact SAP Basis admin to activate required OData services in SEGW
   - Re-run discovery: `POST /api/admin/tenants/acme-corp/discovery`

## Credential Rotation

### Rotating SAP Connection Credentials

1. **Update Credentials in Database**
   ```sql
   UPDATE tenant_sap_connections
   SET auth_credentials = pgp_sym_encrypt(
     '{"clientId": "new_id", "clientSecret": "new_secret"}',
     current_setting('encryption.key')
   )
   WHERE tenant_id = (SELECT id FROM tenants WHERE tenant_id = 'acme-corp')
     AND connection_type = 'S4HANA';
   ```

2. **Verify Connection**
   ```bash
   curl -X POST https://api.sapframework.com/api/admin/tenants/acme-corp/test-connection \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

### Rotating Encryption Master Key

⚠️ **CRITICAL OPERATION - Requires Downtime**

1. Backup database
2. Decrypt all credentials with old key
3. Update `ENCRYPTION_MASTER_KEY` in BTP Credential Store
4. Re-encrypt all credentials with new key
5. Restart all app instances

**Script:** `infrastructure/scripts/rotate-encryption-key.sh` (TODO: create)

## Monitoring & Alerts

### Health Checks

**Application Health:**
```bash
curl https://api.sapframework.com/api/monitoring/health
# Expected: {"database": "ok", "sapConnector": "ok", "redis": "ok"}
```

**Database Health:**
```sql
-- Check connection pool usage
SELECT count(*) FROM pg_stat_activity WHERE datname = 'sapframework';

-- Check slow queries
SELECT query, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Redis Health:**
```bash
redis-cli -a $REDIS_PASSWORD ping
# Expected: PONG

# Check memory usage
redis-cli -a $REDIS_PASSWORD info memory
```

### Log Analysis

**View Recent Errors:**
```bash
# In BTP Application Logging
cf logs sap-framework-api --recent | grep ERROR

# Filter by tenant
cf logs sap-framework-api --recent | grep 'tenantId":"acme-corp"'
```

**Audit Log Queries:**
```sql
-- View recent audit events
SELECT * FROM audit_logs
WHERE tenant_id = 'acme-corp'
ORDER BY created_at DESC
LIMIT 100;

-- Detect suspicious activity (multiple failed logins)
SELECT user_id, count(*) as failed_attempts
FROM audit_logs
WHERE event_type = 'AUTH_FAILURE'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING count(*) > 5;
```

## Troubleshooting

### Issue: "Circuit breaker is open"

**Symptoms:** API returns 503, logs show "Circuit breaker open for tenant X"

**Cause:** SAP system unreachable or returned 5+ consecutive errors

**Resolution:**
1. Check SAP system availability
2. Verify credentials haven't expired
3. Wait 60s for circuit breaker to half-open
4. Test connection: `POST /api/admin/tenants/:id/test-connection`
5. If persistent, check firewall rules / network connectivity

### Issue: "Rate limit exceeded"

**Symptoms:** API returns 429 with `Retry-After` header

**Cause:** Tenant exceeded request quota (e.g., 100 req/min for authenticated users)

**Resolution:**
1. Check if legitimate traffic spike or potential abuse
2. Review audit logs for user activity
3. If legitimate, consider increasing tenant's quota (requires code change or Redis config)
4. If abuse, block user/IP via firewall

### Issue: "Tenant isolation breach suspected"

**Symptoms:** Logs show tenant A querying data for tenant B

**Resolution:**
1. **IMMEDIATE:** Disable affected tenant accounts
2. Review code for missing `WHERE tenant_id = $1` clauses
3. Check repository method calls - ensure tenantId passed correctly
4. Run tenant isolation integration tests
5. Notify security team and affected tenants
6. Incident report required

## Database Maintenance

### Vacuum & Analyze
```bash
# Run weekly during low-traffic window
psql $DATABASE_URL -c "VACUUM ANALYZE;"
```

### Index Rebuild
```sql
-- If query performance degrades
REINDEX DATABASE sapframework;
```

### Data Retention Cleanup
```sql
-- Delete old audit logs (per GDPR retention policy)
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '365 days';

-- Delete resolved SoD violations older than 2 years
DELETE FROM sod_violations
WHERE status = 'REMEDIATED'
  AND resolved_at < NOW() - INTERVAL '730 days';
```

## Backup & Recovery

### Automated Backups
- BTP PostgreSQL service performs daily backups (retention: 7 days)
- Weekly full backups to S3 (retention: 90 days)

### Manual Backup
```bash
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz
```

### Restore from Backup
```bash
gunzip -c backup-20251007.sql.gz | psql $DATABASE_URL
```

## Scaling

### Horizontal Scaling (Add App Instances)
```bash
cf scale sap-framework-api -i 3
```

### Vertical Scaling (Increase Memory)
```bash
cf scale sap-framework-api -m 2G
```

### Database Scaling
- Contact BTP support to upgrade PostgreSQL plan
- Migration plan: `docs/operative/DATABASE_SCALING.md` (TODO)

## Security Incident Response

1. **Identify:** Logs, alerts, user reports
2. **Contain:** Disable affected accounts, block IPs
3. **Eradicate:** Fix vulnerability, deploy patch
4. **Recover:** Restore service, verify no backdoors
5. **Post-Mortem:** Document incident, update runbooks
```

**Acceptance Criteria:**
- Operational procedures documented
- Troubleshooting guides for common issues
- Credential rotation procedures defined
- Backup/restore tested

**Merge Order:** 11th (documentation, parallel)

---

#### PR #12: `feat/btp-deployment` - Production Deployment Configuration
**Branch:** `feat/btp-deployment`
**Label:** `area:infrastructure`
**Effort:** 12 hours
**Changes:**

**1. Update `manifest.yml` for Production**
```yaml
# infrastructure/cloud-foundry/manifest.yml
applications:
  - name: sap-framework-api
    memory: 1G
    instances: 2
    buildpacks:
      - nodejs_buildpack
    path: ../../
    command: node packages/api/dist/server.js
    health-check-type: http
    health-check-http-endpoint: /api/monitoring/health
    timeout: 180
    env:
      NODE_ENV: production
      LOG_LEVEL: info
    services:
      - sapframework-db        # PostgreSQL
      - sapframework-redis     # Redis
      - sapframework-xsuaa     # Authentication
      - sapframework-dest      # Destination Service
      - sapframework-cred      # Credential Store
      - sapframework-logs      # Application Logging

  - name: sap-framework-web
    memory: 512M
    instances: 2
    buildpacks:
      - staticfile_buildpack
    path: ../../packages/web/out  # Next.js static export
    env:
      NEXT_PUBLIC_API_URL: https://sap-framework-api.cfapps.sap.hana.ondemand.com/api
```

**2. Deployment Script**
```bash
#!/bin/bash
# infrastructure/scripts/deploy-btp.sh

set -e

ENV=${1:-staging}  # staging or production

echo "🚀 Deploying to $ENV..."

# 1. Build all packages
echo "📦 Building packages..."
pnpm install --frozen-lockfile
pnpm build

# 2. Run tests
echo "🧪 Running tests..."
pnpm test

# 3. Security audit
echo "🔒 Security audit..."
pnpm audit --audit-level=high

# 4. Login to Cloud Foundry
echo "🔐 Logging into Cloud Foundry..."
cf api https://api.cf.$ENV.hana.ondemand.com
cf login -u $CF_USERNAME -p $CF_PASSWORD -o $CF_ORG -s $ENV

# 5. Deploy API
echo "🌐 Deploying API..."
cf push sap-framework-api -f infrastructure/cloud-foundry/manifest.yml

# 6. Deploy Frontend
echo "🎨 Deploying Frontend..."
cd packages/web && pnpm build && pnpm export
cf push sap-framework-web -f ../../infrastructure/cloud-foundry/manifest.yml

# 7. Run database migrations
echo "📊 Running database migrations..."
DB_URL=$(cf env sap-framework-api | grep -A 1 sapframework-db | tail -n 1)
psql "$DB_URL" < infrastructure/database/migrations/004_add_invoice_matching.sql

# 8. Smoke tests
echo "🧪 Running smoke tests..."
curl -f https://sap-framework-api.cfapps.sap.hana.ondemand.com/api/monitoring/health || {
  echo "❌ Health check failed"
  exit 1
}

echo "✅ Deployment successful!"
```

**3. Database Migration Strategy**
```markdown
<!-- docs/operative/DATABASE_MIGRATIONS.md -->

# Database Migration Strategy

## Approach: Sequential SQL Scripts

- Each migration is a numbered SQL file: `001_initial_schema.sql`, `002_add_indexes.sql`, etc.
- Migrations applied manually via `psql` during deployment
- Track applied migrations in `schema_migrations` table

### Migration Tracking Table
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW()
);
```

### Applying Migrations
```bash
# Check current version
psql $DATABASE_URL -c "SELECT MAX(version) FROM schema_migrations;"

# Apply next migration
psql $DATABASE_URL < infrastructure/database/migrations/004_add_invoice_matching.sql

# Record migration
psql $DATABASE_URL -c "INSERT INTO schema_migrations (version) VALUES (4);"
```

### Rollback Strategy
- Each migration should have a corresponding `XXX_rollback.sql`
- Test rollbacks in staging before production deployments
```

**4. GitHub Actions Deployment Workflow**
```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*.*.*'  # Trigger on version tags (v1.0.0, v1.1.0, etc.)

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://sap-framework-api.cfapps.sap.hana.ondemand.com

    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8.15.1

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Run tests
        run: pnpm test --coverage

      - name: Security audit
        run: pnpm audit --audit-level=high

      - name: Deploy to BTP
        run: |
          chmod +x ./infrastructure/scripts/deploy-btp.sh
          ./infrastructure/scripts/deploy-btp.sh production
        env:
          CF_USERNAME: ${{ secrets.CF_USERNAME }}
          CF_PASSWORD: ${{ secrets.CF_PASSWORD }}
          CF_ORG: ${{ secrets.CF_ORG }}

      - name: Notify on success
        if: success()
        run: echo "✅ Production deployment successful!"

      - name: Notify on failure
        if: failure()
        run: echo "❌ Production deployment failed!"
```

**Tests:**
- Test deployment to staging environment
- Verify health checks pass post-deployment
- Verify database migrations apply correctly
- Verify environment variables loaded from BTP services

**Acceptance Criteria:**
- Deployment script executes successfully in staging
- Database migrations tracked in `schema_migrations` table
- GitHub Actions workflow deploys on version tags
- Post-deployment smoke tests pass
- Rollback procedure documented and tested

**Merge Order:** 12th (final PR, requires all previous PRs merged)

---

## Summary: PR Merge Order

| **PR #** | **Branch** | **Label** | **Effort** | **Merge Order** | **Dependencies** |
|----------|------------|-----------|------------|-----------------|------------------|
| 1 | `feat/repo-audit` | `area:docs` | 1h | 1st | None |
| 2 | `chore/dead-code-cleanup` | `area:docs` | 2h | 2nd | None (parallel with #1) |
| 3 | `fix/secrets-exposure` | `area:security` 🔒 | 1h | 3rd | None |
| 4 | `feat/ci-quality-gates` | `area:ci-cd` | 3h | 4th | None |
| 5 | `fix/auth-enforcement` | `area:security` 🔒 | 4h | 5th | #4 (needs CI gates) |
| 6 | `feat/rate-limiting` | `area:security` 🔒 | 6h | 6th | #5 (needs auth) |
| 7 | `feat/replace-mock-data` | `area:api`, `area:ui` | 8h | 7th | #5 (needs auth) |
| 8 | `feat/test-coverage` | `area:testing` | 20h | 8th | #4 (needs CI) |
| 9 | `feat/connector-improvements` | `area:connectors` | 16h | 9th | None (parallel with #8) |
| 10 | `docs/ux-principles` | `area:docs` | 4h | 10th | None (parallel) |
| 11 | `docs/operations` | `area:docs` | 6h | 11th | None (parallel) |
| 12 | `feat/btp-deployment` | `area:infrastructure` | 12h | 12th | All previous PRs |

**Total Effort:** ~83 hours (~2-3 weeks with 1 engineer, 1-1.5 weeks with 2 engineers)

---

## Conflict Resolution Strategy

### Handling Modified Files

**Current modified files:**
```
packages/api/src/routes/index.ts (18 modified files total)
```

**Strategy:**
- Before creating each feature branch, commit current work to a staging branch:
  ```bash
  git checkout -b staging/current-work
  git add .
  git commit -m "chore: checkpoint current work"
  git push -u origin staging/current-work
  ```
- Create feature branches from `main` (not from staging)
- Cherry-pick relevant changes from staging into each feature branch
- Once all PRs merged, delete staging branch

**Alternative (if changes are cohesive):**
- Create single large PR from current state
- Split into logical commits within that PR
- Use GitHub's "Create branch from commit" feature to extract subsets

---

## Code Review Checklist

### For All PRs

- [ ] Conventional Commits style (`feat:`, `fix:`, `docs:`, etc.)
- [ ] No secrets or credentials in code/comments
- [ ] Tests added/updated for new code
- [ ] Documentation updated (if applicable)
- [ ] No `console.log` or debug code
- [ ] ESLint and Prettier pass
- [ ] TypeScript strict mode passes
- [ ] No breaking changes (or clearly documented)
- [ ] Migration path documented (if breaking)

### For Security PRs (area:security)

- [ ] Input validation on all user inputs
- [ ] Output encoding for all outputs
- [ ] Authentication/authorization enforced
- [ ] Audit logging added
- [ ] PII handling reviewed
- [ ] SQL injection prevention verified (parameterized queries)
- [ ] XSS prevention verified
- [ ] CSRF protection verified (if applicable)
- [ ] Rate limiting applied
- [ ] Security tests added

### For API PRs (area:api)

- [ ] Tenant isolation verified (integration test)
- [ ] Error handling graceful (no stack traces in responses)
- [ ] Response caching considered (if expensive query)
- [ ] Rate limiting applied
- [ ] Swagger docs updated
- [ ] Logging includes `tenantId` and `userId`
- [ ] Idempotency keys used (if mutating operation)

### For UI PRs (area:ui)

- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Screen reader tested (VoiceOver/NVDA)
- [ ] Color contrast ≥4.5:1 (WCAG AA)
- [ ] Loading states shown
- [ ] Error states handled gracefully
- [ ] No layout shift on data load
- [ ] Mobile responsive (if applicable)
- [ ] Bundle size impact assessed

---

## Post-Consolidation: Ongoing Workflow

### Daily Development

```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feat/your-feature

# 2. Make changes, commit often
git add .
git commit -m "feat: add user profile page"

# 3. Push and open PR
git push -u origin feat/your-feature
# Open PR in GitHub, request review

# 4. Address review feedback
git add .
git commit -m "fix: address review feedback on validation"
git push

# 5. After approval, squash and merge
# GitHub UI: "Squash and merge" button
```

### Hotfix Workflow (Production Bug)

```bash
# 1. Create hotfix branch from main (or latest release tag)
git checkout -b fix/critical-auth-bypass

# 2. Fix bug, write test
# ...

# 3. Fast-track PR (no waiting for full CI if urgent)
# Request immediate review from code owner
# Deploy to staging, verify fix
# Merge to main
# Deploy to production ASAP

# 4. Create release tag
git tag -a v1.0.1 -m "Hotfix: auth bypass vulnerability"
git push origin v1.0.1
```

### Release Workflow

```bash
# 1. Ensure main is stable (all PRs merged, CI green)
# 2. Create release branch
git checkout -b release/v1.1.0

# 3. Bump version in package.json
pnpm version 1.1.0

# 4. Generate changelog
git log --pretty=format:"- %s" v1.0.0..HEAD > CHANGELOG-1.1.0.md

# 5. Merge release branch to main
git checkout main
git merge --no-ff release/v1.1.0
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin main --tags

# 6. GitHub Actions automatically deploys to production (via tag trigger)
```

---

## Metrics & Success Criteria

### KPIs for Consolidation Success

1. **Code Quality**
   - Test coverage: ≥80% (currently 45%)
   - Linting warnings: 0 (currently passing with `continue-on-error`)
   - Security vulnerabilities (high/critical): 0

2. **Security Posture**
   - Authentication enforced on all protected routes: ✅
   - Rate limiting active: ✅
   - Secrets removed from repo: ✅
   - Audit logging for sensitive operations: ✅

3. **Data Quality**
   - Mock data removed: 100% (currently ~5% mock)
   - Hardcoded status indicators: 0

4. **Documentation**
   - Architecture docs: ✅
   - Operations runbook: ✅
   - ADRs for major decisions: ≥3
   - API documentation (Swagger): 100% coverage

5. **Deployment Readiness**
   - Staging deployment successful: ✅
   - Production deployment successful: ✅
   - Smoke tests passing: ✅
   - Rollback tested: ✅

### Definition of "Consolidation Complete"

- [ ] All 12 PRs merged to `main`
- [ ] `main` branch protected with status checks
- [ ] CI/CD pipeline green
- [ ] Test coverage ≥80%
- [ ] Security scan passes (no high/critical)
- [ ] Staging deployment successful
- [ ] Production deployment tested (not necessarily live)
- [ ] Documentation complete (ARCHITECTURE.md, OPERATIONS.md, ADRs)
- [ ] Code owners and PR template in place
- [ ] Dead code removed, root directory clean

---

## Next Steps After Consolidation

1. **User Acceptance Testing (UAT)**
   - Onboard 2-3 pilot tenants in staging
   - Gather feedback on UX
   - Validate SoD analysis accuracy

2. **Load Testing**
   - Simulate 100 concurrent tenants
   - Target: 1000 req/min sustained
   - Identify bottlenecks (database, Redis, SAP connectors)

3. **Security Audit**
   - External penetration testing
   - OWASP Top 10 verification
   - Compliance audit (GDPR, SOC 2 if required)

4. **Production Launch**
   - Go-live checklist
   - Monitoring dashboards (Prometheus/Grafana or BTP-native)
   - On-call rotation setup
   - Customer onboarding process defined

5. **Feature Roadmap (v1.1+)**
   - Complete Ariba connector implementation
   - Anomaly detection enhancements (ML models)
   - Workflow engine (approval processes)
   - Multi-language support (i18n)

---

## Conclusion

This consolidation plan provides a **structured, incremental path** from current state (70% complete, scattered work) to production-ready (95%+ complete, cohesive codebase).

**Key Success Factors:**
1. **Small, Atomic PRs**: Each PR is reviewable in <2 hours
2. **Security First**: Blockers (auth, secrets, rate limiting) addressed early
3. **Parallel Work**: Documentation and feature work can proceed in parallel
4. **Clear Dependencies**: Merge order prevents conflicts and blockers
5. **Quality Gates**: CI enforces standards (no merging broken code)

**Timeline:**
- **Week 1:** PRs #1-6 (audit, cleanup, security)
- **Week 2:** PRs #7-8 (data quality, testing)
- **Week 3:** PRs #9-11 (connectors, docs)
- **Week 4:** PR #12 (deployment), UAT, launch prep

**Ready to begin:** Start with PR #1 (repo audit docs - already complete).
