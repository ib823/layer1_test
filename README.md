# SAP MVP Framework - Multi-Tenant GRC Platform

Enterprise-grade SAP Governance, Risk, and Compliance framework with automatic service discovery and multi-tenant architecture.

## Architecture Overview
┌─────────────────────────────────────────────────────────────┐
│                        Layer 4: API                          │
│                  REST API / GraphQL Endpoints                │
├─────────────────────────────────────────────────────────────┤
│                    Layer 3: Modules                          │
│         SoD Analysis | Invoice Matching | Anomaly Detection  │
├─────────────────────────────────────────────────────────────┤
│                    Layer 2: Services                         │
│              Rule Engine | Analytics | Workflow              │
├─────────────────────────────────────────────────────────────┤
│                     Layer 1: Core                            │
│   Connectors | Discovery | Persistence | Events | Utils      │
└─────────────────────────────────────────────────────────────┘

## Key Features

### 🔍 **Automatic Service Discovery**
- Scans SAP Gateway catalog on tenant onboarding
- Detects available OData services automatically
- Tests permissions per service
- Generates tenant capability profiles

### 🏢 **Multi-Tenant Architecture**
- Isolated data per tenant
- Per-tenant capability profiles
- Module activation based on available services
- Graceful degradation when services unavailable

### 🔌 **SAP Product Connectors**
- **S/4HANA**: Complete OData v2 support with retry/circuit breaker
- **IPS (Identity Provisioning)**: User identity management
- **Ariba**: Procurement data (stub ready)
- **SuccessFactors**: HR data (stub ready)

### 💾 **Persistence Layer**
- PostgreSQL multi-tenant schema
- Tenant capability profiles
- Service discovery history (audit trail)
- Module activation tracking

### 🛡️ **Enterprise Patterns**
- Circuit breaker for fault tolerance
- Exponential backoff retry strategy
- Comprehensive error handling (15+ error types)
- Event-driven architecture with EventBus

## Project Structure
layer1_test/
├── packages/
│   ├── core/                    # Layer 1: Core Framework
│   │   ├── connectors/
│   │   │   ├── base/           # BaseSAPConnector + ServiceDiscovery
│   │   │   ├── s4hana/         # S/4HANA connector
│   │   │   ├── ips/            # Identity Provisioning
│   │   │   ├── ariba/          # Ariba stub
│   │   │   └── successfactors/ # SuccessFactors stub
│   │   ├── persistence/        # Database repositories
│   │   ├── auth/               # XSUAA authentication
│   │   ├── events/             # EventBus
│   │   ├── errors/             # Error hierarchy
│   │   └── utils/              # Retry, circuit breaker, OData helpers
│   │
│   ├── services/               # Layer 2: Business Services
│   │   └── rules/              # Rule engine
│   │
│   └── modules/                # Layer 3: Business Modules
│       └── user-access-review/ # SoD analysis module
│
├── infrastructure/
│   ├── database/
│   │   └── schema.sql          # PostgreSQL schema
│   └── cloud-foundry/          # BTP deployment configs
│
└── docs/                       # Documentation

## Quick Start

### Prerequisites
```bash
Node.js 20+
pnpm 8+
PostgreSQL 14+ (for persistence)
Installation
bash# Clone repository
git clone <repository-url>
cd layer1_test

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
Database Setup
bash# Create database
createdb sapframework

# Run schema
psql sapframework < infrastructure/database/schema.sql
Environment Variables
bash# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://localhost/sapframework
SAP_BASE_URL=https://your-sap-system.com
SAP_CLIENT=100
SAP_AUTH_TYPE=OAUTH
SAP_CLIENT_ID=your_client_id
SAP_CLIENT_SECRET=your_client_secret
EOF
Usage Examples
Tenant Onboarding with Service Discovery
typescriptimport { S4HANAConnector, ServiceDiscovery } from '@sap-framework/core';
import { TenantProfileRepository } from '@sap-framework/core';

// 1. Create connector
const connector = new S4HANAConnector({
  baseUrl: process.env.SAP_BASE_URL,
  auth: {
    type: 'OAUTH',
    credentials: {
      clientId: process.env.SAP_CLIENT_ID,
      clientSecret: process.env.SAP_CLIENT_SECRET,
    },
  },
});

// 2. Initialize discovery
const discovery = new ServiceDiscovery(connector);

// 3. Discover available services
const result = await discovery.discoverServices();
console.log(`Found ${result.services.length} services`);

// 4. Generate tenant profile
const profile = await discovery.generateTenantProfile('tenant-123');

// 5. Save to database
const repo = new TenantProfileRepository(process.env.DATABASE_URL);
await repo.createTenant('tenant-123', 'ACME Corp');
await repo.saveProfile(profile);

// 6. Activate modules based on capabilities
if (profile.capabilities.canDoSoD) {
  await repo.activateModule('tenant-123', 'SoD_Analysis');
}
Multi-Tenant Capability Check
typescript// Check what modules a tenant can use
const repo = new TenantProfileRepository(process.env.DATABASE_URL);
const profile = await repo.getProfile('tenant-123');

if (profile.capabilities.canDoSoD) {
  // Enable SoD Analysis UI
} else {
  // Show "Activate API_USER_SRV and API_ROLE_SRV" message
  console.log('Missing services:', profile.missingServices);
}
Deployment
Local Development
bashpnpm dev
SAP BTP Cloud Foundry
bash# Build for production
pnpm build

# Deploy to Cloud Foundry
cf push -f infrastructure/cloud-foundry/manifest.yml
See BTP_DEPLOYMENT.md for detailed instructions.
Standalone (Non-BTP)
The framework can run standalone without BTP:
bash# Use standard Node.js + PostgreSQL
NODE_ENV=production node packages/api/dist/index.js
See STANDALONE_DEPLOYMENT.md for details.
Development
Build System
bashpnpm build          # Build all packages
pnpm dev            # Watch mode
pnpm test           # Run tests
pnpm test:watch     # Test watch mode
pnpm lint           # Lint code
pnpm typecheck      # Type checking only
Adding New Connectors

Create directory: packages/core/src/connectors/yourproduct/
Extend BaseSAPConnector
Implement abstract methods
Export from packages/core/src/connectors/index.ts

Testing
bash# Unit tests
pnpm test

# Integration tests (requires SAP connection)
SAP_BASE_URL=https://test.sap.com pnpm test:integration

# Coverage
pnpm test --coverage
Documentation

Service Discovery Guide
Multi-Tenant Architecture
BTP Deployment
Standalone Deployment
API Reference

Roadmap
Current (v1.0)

✅ Service discovery
✅ Multi-tenant persistence
✅ S/4HANA + IPS connectors
✅ SoD analysis module

Next (v1.1)

🔄 Runtime module activation/deactivation
🔄 Tenant onboarding API
🔄 Capability dashboard
🔄 Continuous monitoring service

Future (v2.0)

⏳ Complete Ariba connector
⏳ Complete SuccessFactors connector
⏳ Invoice matching module
⏳ Anomaly detection module

License
Proprietary - All Rights Reserved
Support
Contact: ikmal.baharudin@gmail.com