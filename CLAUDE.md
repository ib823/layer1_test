# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-tenant SAP GRC (Governance, Risk, and Compliance) platform with automatic service discovery, built as a monorepo using pnpm workspaces and Turbo. The system connects to various SAP products (S/4HANA, IPS, Ariba, SuccessFactors) and provides compliance modules for invoice matching, anomaly detection, SoD analysis, and more.

## Architecture

### 4-Layer Architecture
- **Layer 1 (Core)**: `packages/core` - SAP connectors, authentication, events, persistence, utilities
- **Layer 2 (Services)**: `packages/services` - Shared business services (rule engine, analytics)
- **Layer 3 (Modules)**: `packages/modules/*` - Independent business modules
- **Layer 4 (API)**: `packages/api` - REST API endpoints
- **Web UI**: `packages/web` - Next.js 15 frontend with Ant Design

### Module System
Each module in `packages/modules/` is an independent package with its own:
- Business logic engine
- Data models
- Tests
- API controllers (exported to Layer 4)

Active modules:
- `sod-control` - Segregation of Duties analysis
- `user-access-review` - User access reviews
- `lhdn-einvoice` - Malaysia MyInvois e-invoicing
- `invoice-matching` - Invoice/PO/GR matching
- `gl-anomaly-detection` - GL transaction anomaly detection
- `vendor-data-quality` - Vendor master data quality

## Build System & Commands

### Core Commands
```bash
# Build all packages (respects dependency order via Turbo)
pnpm build

# Development mode with watch (runs all packages concurrently)
pnpm dev

# Run all tests
pnpm test

# Run tests excluding web package (faster for backend work)
pnpm -r --filter="!@sap-framework/web" test

# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix
```

### Database Setup
```bash
# Create database
createdb sapframework

# Run schema
psql sapframework < infrastructure/database/schema.sql

# Generate Prisma client (when schema.prisma changes)
cd packages/core
npx prisma generate

# Set DATABASE_URL before running tests
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sapframework"
```

### Running Tests
```bash
# Run tests in a specific package
cd packages/api
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage

# E2E tests (require PostgreSQL running)
pnpm test:e2e:sod
pnpm test:e2e:discovery
pnpm test:e2e:onboarding
```

### Running the Application
```bash
# Start API server (default port 3000)
cd packages/api
pnpm dev

# Start frontend (default port 3001)
cd packages/web
pnpm dev

# Production build
pnpm build
cd packages/api
pnpm start
```

## Key Architectural Patterns

### Multi-Tenant Architecture
- Each tenant has isolated data in PostgreSQL
- Tenant profiles track available SAP services and capabilities
- Modules auto-activate based on discovered capabilities
- Schema: `infrastructure/database/schema.sql` (SQL tables) and `packages/core/prisma/schema.prisma` (Prisma ORM)

### Service Discovery
- On tenant onboarding, system discovers available OData services from SAP Gateway
- Generates capability profile indicating which modules can be activated
- Located in: `packages/core/src/connectors/base/ServiceDiscovery.ts`

### SAP Connectors
All connectors extend `BaseSAPConnector` (`packages/core/src/connectors/base/`):
- **S4HANAConnector**: Complete implementation with retry logic and circuit breaker
- **IPSConnector**: Identity Provisioning Service
- **AribaConnector**: Procurement (stub)
- **SuccessFactorsConnector**: HR data (stub)

### Error Handling
15+ specialized error types in `packages/core/src/errors/`:
- All extend `FrameworkError`
- Includes SAP-specific errors (OData, authentication, connectivity)
- Used consistently across all layers

### Authentication
- XSUAA (SAP BTP) integration in `packages/core/src/auth/`
- JWT-based authentication for standalone deployments
- Toggle with `AUTH_ENABLED` environment variable
- Middleware in `packages/api/src/middleware/auth.ts`

### Encryption & Security
- Master key encryption for sensitive data (credentials, PII)
- Initialize at startup: `initializeEncryption(process.env.ENCRYPTION_MASTER_KEY)`
- PII masking service in `packages/core/src/utils/piiMasking.ts`
- GDPR compliance with data retention policies

### Persistence Layer
- **SQL schema**: `infrastructure/database/schema.sql` (multi-tenant tables)
- **Prisma ORM**: `packages/core/prisma/schema.prisma` (module-specific tables)
- Repositories in `packages/core/src/repositories/` and `packages/core/src/persistence/`
- SoD violations use dedicated repository: `SoDViolationRepository`

## Important Implementation Details

### Module Development Pattern
When adding a new module:
1. Create package in `packages/modules/your-module/`
2. Create engine class with `analyze()` or `execute()` method
3. Export engine from module's `index.ts`
4. Create controller in `packages/api/src/controllers/YourModuleController.ts`
5. Create route in `packages/api/src/routes/modules/your-module.ts`
6. Import and mount in `packages/api/src/routes/index.ts`
7. Add Prisma models in `packages/core/prisma/schema.prisma`
8. Run `npx prisma generate` to update client

### Adding API Endpoints
1. Create controller in `packages/api/src/controllers/`
2. Create route file in `packages/api/src/routes/`
3. Import route in `packages/api/src/routes/index.ts`
4. Use middleware: `authenticate`, `rateLimiter`, `validateTenant`

### Turbo Pipeline
- Build dependencies run first (`dependsOn: ["^build"]`)
- Tests depend on build completion
- Dev mode is persistent (won't exit)
- Configuration in `turbo.json`

### Test Configuration
- Jest is configured with 70% coverage threshold
- E2E tests use actual database connections
- Integration tests may use testcontainers
- Config: `jest.config.js` in each package

## Environment Variables

Critical variables (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string
- `ENCRYPTION_MASTER_KEY` - AES-256-GCM key (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)
- `AUTH_ENABLED` - Toggle authentication (true/false)
- `JWT_SECRET` or XSUAA credentials
- `PORT` - API server port (default: 3000)
- `CORS_ORIGIN` - Frontend origin (default: http://localhost:3001)
- `REDIS_URL` - Optional for distributed rate limiting
- `SAP_BASE_URL`, `SAP_CLIENT`, `SAP_CLIENT_ID`, `SAP_CLIENT_SECRET` - SAP connection

## Common Gotchas

### Workspace Dependencies
- Use `workspace:*` for internal dependencies in package.json
- Changes in `packages/core` require rebuild for dependent packages
- Run `pnpm build` from root after core changes

### Prisma Client Location
- Generated client is in `packages/core/src/generated/prisma/`
- Import as: `import { PrismaClient } from '@sap-framework/core'`
- Must run `npx prisma generate` after schema changes

### Docker/PostgreSQL
- Tests require PostgreSQL running
- Docker Compose available in `infrastructure/`
- Default credentials: postgres/postgres
- Database name: sapframework

### TypeScript Builds
- Each package builds independently
- Output in `dist/` folder
- Type declarations (`.d.ts`) generated automatically
- Clean builds: `pnpm clean` then `pnpm build`

### Rate Limiting
- Applied after public endpoints in `routes/index.ts`
- Uses Redis if available, otherwise in-memory
- Health endpoints are excluded

## Code Style & Conventions

### Naming
- Controllers: `YourModuleController.ts` with class `YourModuleController`
- Engines: `YourModuleEngine.ts` with class `YourModuleEngine`
- Repositories: `EntityRepository.ts` with class `EntityRepository`
- Types: PascalCase interfaces, exported from `types/` folder

### Error Handling
- Always throw `FrameworkError` or its subclasses
- Use specific error types (e.g., `ODataError`, `AuthenticationError`)
- Include context in error constructors

### Async Patterns
- Prefer `async/await` over promises
- Use try-catch blocks, especially in controllers
- Return proper HTTP status codes (200, 201, 400, 401, 404, 500)

### Logging
- Import logger: `import logger from './utils/logger'` (or from @sap-framework/core)
- Use structured logging: `logger.info('message', { context })`
- Levels: error, warn, info, debug

## Testing Guidelines

### Unit Tests
- Located in `tests/unit/` or `tests/` in each package
- Mock external dependencies (SAP connectors, databases)
- Test file naming: `YourClass.test.ts`

### Integration Tests
- Located in `tests/integration/`
- May use testcontainers for PostgreSQL
- Run with `--runInBand` flag for serial execution

### E2E Tests
- Located in `packages/api/tests/e2e/`
- Use actual database and API server
- Named as `feature-name.e2e.ts`

### Web Tests
- Playwright for E2E: `packages/web/e2e/`
- Run with: `pnpm test:e2e` (in web package)
- Configured in `playwright.config.ts`

## Deployment

### Local Development
1. Start PostgreSQL
2. Create database and run schema
3. Copy `.env.example` to `.env` and configure
4. Run `pnpm install && pnpm build`
5. Start API: `cd packages/api && pnpm dev`
6. Start Web: `cd packages/web && pnpm dev`

### SAP BTP Cloud Foundry
- Manifests in `infrastructure/cloud-foundry/`
- Bind services: PostgreSQL, XSUAA, Redis
- Deploy with: `cf push -f infrastructure/cloud-foundry/manifest.yml`
- VCAP_SERVICES auto-configured

### Standalone Production
- Build: `pnpm build`
- Set environment variables (especially `ENCRYPTION_MASTER_KEY`, `AUTH_ENABLED=true`)
- Run: `cd packages/api && node dist/server.js`

## Key Files Reference

- `packages/core/src/index.ts` - Core exports
- `packages/api/src/app.ts` - Express app setup with middleware
- `packages/api/src/routes/index.ts` - Route mounting and rate limiting
- `packages/api/src/server.ts` - Server entry point
- `packages/web/src/app/layout.tsx` - Next.js root layout
- `infrastructure/database/schema.sql` - Multi-tenant SQL schema
- `packages/core/prisma/schema.prisma` - Module data models
- `.env.example` - Environment variable documentation

## Contact & Support

Maintainer: ikmal.baharudin@gmail.com
