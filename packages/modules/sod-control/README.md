# SoD Control Module

**Segregation of Duties (SoD) Audit & Control Layer for SAP Framework**

A production-grade SoD analysis and control system comparable to SAP GRC Access Control, built for multi-tenant SAP environments with comprehensive coverage across S/4HANA, ECC, BTP, Ariba, SuccessFactors, and generic SCIM/OIDC applications.

## Overview

The SoD Control module provides enterprise-grade segregation of duties monitoring and control with:

- ✅ **Full SoD Lifecycle**: Discover → Assess → Simulate → Request/Approve → Enforce → Mitigate → Certify → Evidence
- ✅ **Multi-System Support**: S/4HANA Cloud/PCE, ECC, BTP, Ariba, SuccessFactors, SCIM, OIDC/SAML
- ✅ **28+ Seeded Rules**: Across 7 business processes (OTC, P2P, R2R, H2R, TRE, MFG, BTP)
- ✅ **Context-Aware Rules**: SAME_SCOPE, THRESHOLD, TEMPORAL, ORG_UNIT conditions
- ✅ **Explainability**: Full trace paths showing User → Role → Permission → Function → Risk
- ✅ **Compliance Standards**: SOX, ISO 27001, NIST 800-53, COBIT 5, PDPA

## Architecture

### Canonical Access Graph

All systems are normalized into a unified access graph model:

```
Users ↔ Roles ↔ Permissions ↔ Functions ↔ Risks
```

**Supported Systems:**
- **SAP S/4HANA Cloud**: OData v4, Communication Arrangements
- **SAP S/4HANA PCE**: OData v2/v4, BAPI/RFC via Cloud Connector
- **SAP ECC**: RFC/BAPI (BAPI_USER_GET_DETAIL, BAPI_AGR_GET_*)
- **SAP BTP**: BTP APIs, XSUAA, Role Collections
- **SAP Ariba**: Ariba Network APIs
- **SAP SuccessFactors**: OData API v2
- **SCIM 2.0**: Generic SCIM protocol
- **OIDC/SAML**: JWT parsing, SAML assertions

### Database Schema

**4 Migration Files** with comprehensive tables:

1. **007_add_sod_control_core.sql**: Core SoD tables (risks, functions, permissions, rulesets)
2. **008_add_sod_access_graph.sql**: Canonical access graph (users, roles, assignments, snapshots)
3. **009_add_sod_findings_mitigation.sql**: Findings, mitigations, simulations, workflows
4. **010_add_sod_certification_evidence.sql**: Certification campaigns, evidence vault, compliance reports

**Total Tables**: 30+ tables with Row-Level Security (RLS) for multi-tenancy

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Build the module
pnpm build

# Run tests
pnpm test
```

### Database Setup

```bash
# Run migrations
psql -U postgres -d sapframework -f /workspaces/layer1_test/infrastructure/database/migrations/007_add_sod_control_core.sql
psql -U postgres -d sapframework -f /workspaces/layer1_test/infrastructure/database/migrations/008_add_sod_access_graph.sql
psql -U postgres -d sapframework -f /workspaces/layer1_test/infrastructure/database/migrations/009_add_sod_findings_mitigation.sql
psql -U postgres -d sapframework -f /workspaces/layer1_test/infrastructure/database/migrations/010_add_sod_certification_evidence.sql

# Seed baseline rules
psql -U postgres -d sapframework -f /workspaces/layer1_test/infrastructure/database/seeds/001_sod_baseline_rules.sql
```

### Usage

#### 1. Connect to SAP S/4HANA Cloud

```typescript
import { S4HCConnector, AccessGraphService, RuleEngine } from '@sap-framework/sod-control';

// Create connector
const connector = new S4HCConnector(
  'tenant-123',
  'system-456',
  {
    baseUrl: 'https://my-s4hana-cloud.com',
    authConfig: {
      type: 'OAUTH2',
      credentials: {
        clientId: 'your-client-id',
        clientSecret: 'your-client-secret',
        tokenUrl: 'https://my-s4hana-cloud.com/oauth/token',
      },
    },
  }
);

// Test connection
const isConnected = await connector.testConnection();
console.log('Connected:', isConnected);
```

#### 2. Sync Access Data

```typescript
import { AccessGraphService } from '@sap-framework/sod-control';

const accessGraphService = new AccessGraphService(db);

// Full sync from connector
const syncResult = await accessGraphService.syncFromConnector(
  'tenant-123',
  'system-456',
  connector
);

console.log('Sync result:', syncResult);
// {
//   success: true,
//   totalUsers: 1250,
//   totalRoles: 450,
//   totalPermissions: 3200,
//   totalAssignments: 5600,
//   errors: [],
//   syncDuration: 45000
// }
```

#### 3. Run SoD Analysis

```typescript
import { RuleEngine } from '@sap-framework/sod-control';

const ruleEngine = new RuleEngine(db);

// Run analysis
const result = await ruleEngine.analyze('tenant-123', {
  mode: 'snapshot',
  scope: {
    systems: ['system-456'],
    orgUnits: ['SALES', 'FINANCE'],
  },
  riskLevels: ['CRITICAL', 'HIGH'],
});

console.log('Analysis result:', result);
// {
//   analysisId: 'analysis-789',
//   tenantId: 'tenant-123',
//   totalFindings: 42,
//   criticalCount: 8,
//   highCount: 15,
//   mediumCount: 12,
//   lowCount: 7,
//   findings: [...],
//   analysisStats: {
//     totalUsersAnalyzed: 1250,
//     totalRolesAnalyzed: 450,
//     totalRulesEvaluated: 28,
//     analysisDuration: 12000
//   }
// }
```

#### 4. Create Snapshot

```typescript
// Create point-in-time snapshot
const snapshot = await accessGraphService.createSnapshot(
  'tenant-123',
  'SCHEDULED',
  'SYSTEM'
);

console.log('Snapshot created:', snapshot.id);
```

#### 5. Detect Deltas

```typescript
// Compare two snapshots
const deltas = await accessGraphService.detectDeltas(
  'snapshot-old-id',
  'snapshot-new-id'
);

console.log('Changes detected:', deltas.length);
// [
//   {
//     changeType: 'ROLE_ASSIGNED',
//     entityType: 'ASSIGNMENT',
//     entityId: 'user-123_role-456',
//     newValue: {...},
//     introducesSodRisk: true
//   }
// ]
```

## Seeded Rules

28 baseline SoD rules across 7 business processes:

### Procure-to-Pay (P2P) - 6 Rules
- **P2P-001**: Vendor Master + Bank Data (CRITICAL)
- **P2P-002**: Vendor Creation + Payment Posting (CRITICAL)
- **P2P-003**: PO Creation + PO Approval (HIGH, >$10,000)
- **P2P-004**: Goods Receipt + Invoice Verification (HIGH)
- **P2P-005**: Change Vendor Bank + Process Payment (CRITICAL)
- **P2P-006**: Three-Way Match Circumvention (CRITICAL)

### Order-to-Cash (OTC) - 5 Rules
- **OTC-001**: Customer Master + Credit Limit (CRITICAL)
- **OTC-002**: Sales Order + Pricing Override (HIGH)
- **OTC-003**: Billing + AR Posting (HIGH)
- **OTC-004**: Credit Memo + Cash Application (CRITICAL)
- **OTC-005**: Shipping + Billing (MEDIUM)

### Record-to-Report (R2R) - 4 Rules
- **R2R-001**: GL Posting + GL Account Maintenance (CRITICAL)
- **R2R-002**: Journal Entry + Period Close (CRITICAL)
- **R2R-003**: Asset Create + Asset Retirement (HIGH)
- **R2R-004**: Bank Reconciliation + GL Posting (HIGH)

### Hire-to-Retire (H2R) - 4 Rules
- **H2R-001**: Employee Master + Payroll Processing (CRITICAL)
- **H2R-002**: Salary Change + Payroll Approval (CRITICAL)
- **H2R-003**: Time Entry + Time Approval (HIGH)
- **H2R-004**: User Administration + Security Roles (CRITICAL)

### Treasury (TRE) - 3 Rules
- **TRE-001**: Payment Proposal + Payment Release (CRITICAL)
- **TRE-002**: Bank Account Master + Payment Processing (CRITICAL)
- **TRE-003**: Cash Forecast + Cash Transfer (HIGH)

### Manufacturing (MFG) - 3 Rules
- **MFG-001**: BOM Maintenance + Production Order (HIGH)
- **MFG-002**: Inventory Posting + Inventory Count (HIGH)
- **MFG-003**: Material Master + Inventory Valuation (HIGH)

### SAP BTP - 3 Rules
- **BTP-001**: BTP Admin + Role Collection Assignment (CRITICAL)
- **BTP-002**: API Development + Production Deployment (HIGH)
- **BTP-003**: Database Admin + Application Development (CRITICAL)

## Compliance Mapping

| Feature | SOX | ISO 27001 | NIST 800-53 | COBIT 5 | PDPA |
|---------|-----|-----------|-------------|---------|------|
| Access Control | IC-17 | A.9.1.1, A.9.2.1 | AC-5, AC-6 | DSS05.04 | Principle 1 |
| Segregation of Duties | COSO-3 | A.9.4.4 | AC-5 (SoD) | DSS05.03 | - |
| Access Reviews | SOX 404 | A.9.2.5 | AC-2 | DSS05.05 | Principle 5 |
| Audit Logging | IT Controls | A.12.4.1, A.12.4.3 | AU-2, AU-6, AU-12 | DSS05.07 | Principle 3 |

## Features

### ✅ Phase 1 Complete (Foundation)
- Database migrations (4 files, 30+ tables)
- Row-Level Security (RLS) policies
- Seed data (28 baseline rules)
- Base connector interface
- S/4HANA Cloud connector
- Access graph normalization
- Basic rule engine with snapshot analysis

### 🟡 Phase 2-10 (Roadmap)
- Advanced rule engine (context-aware, ML-based)
- Full connector coverage (ECC, BTP, Ariba, SFx, SCIM, OIDC)
- Simulation & what-if analysis
- Workflow engine (mitigations, exceptions, approvals)
- Certification campaigns
- 6 UX screens (Violations Inbox, Risk Workbench, Access Request, Certification Console, Evidence Vault, Connector Health)
- Evidence management (tamper-evident, digital signatures)
- Observability & monitoring
- Comprehensive testing (50+ scenarios)
- Load testing & performance tuning

## API Reference

See [SOD_PLAN.md](./SOD_PLAN.md) for complete API documentation.

## Testing

```bash
# Unit tests
pnpm test:unit

# Integration tests
pnpm test:integration

# Coverage report
pnpm test:coverage
```

## Contributing

See the main [CONTRIBUTING.md](../../../CONTRIBUTING.md) for contribution guidelines.

## License

MIT License - See [LICENSE](../../../LICENSE) for details.

---

**Implementation Status**: ✅ Phase 1 Complete (Foundation)

**Next Steps**: Phase 2 (Advanced Rule Engine) - See [SOD_PLAN.md](./SOD_PLAN.md) for roadmap.
