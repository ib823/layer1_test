# 🏗️ SAP MVP Framework - Complete System Overview

**Last Updated:** 2025-10-05
**Version:** 1.0.0
**Status:** 70% Complete - Production Deployment Pending

---

## 📊 Executive Summary

The **SAP MVP Framework** is an enterprise-grade multi-tenant GRC (Governance, Risk, Compliance) platform designed for SAP environments. It features automatic service discovery, intelligent module activation, and comprehensive Segregation of Duties (SoD) analysis.

### Current Status

| Component | Status | Completion |
|-----------|--------|------------|
| **Backend API** | ✅ Operational | 90% |
| **Database** | ✅ Operational | 100% |
| **Frontend** | ✅ Operational | 80% |
| **SAP Connectors** | ⚠️ Partial | 60% |
| **Testing** | ⚠️ Needs Improvement | 45% |
| **Deployment** | ⏳ Not Deployed | 0% |
| **Documentation** | ✅ Complete | 95% |

**Overall Progress:** 70% Complete

---

## 🎯 What This System Does

### Core Capabilities

1. **Multi-Tenant Service Discovery**
   - Automatically scans SAP Gateway catalogs during tenant onboarding
   - Detects available OData services (API_USER_SRV, API_ROLE_SRV, etc.)
   - Generates tenant capability profiles
   - Activates/deactivates modules based on available services

2. **Segregation of Duties (SoD) Analysis**
   - Analyzes user role assignments for conflicts
   - Detects combinations that violate segregation principles
   - Risk scoring (HIGH/MEDIUM/LOW)
   - Remediation tracking and workflow

3. **Multi-SAP Product Support**
   - SAP S/4HANA (Full implementation)
   - SAP Identity Provisioning Service (Full implementation)
   - SAP Ariba (Stub - planned v1.1)
   - SAP SuccessFactors (Stub - planned v1.1)

4. **Compliance & Data Protection**
   - GDPR compliance features
   - PII masking
   - Data retention policies
   - Audit logging

---

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SAP MVP FRAMEWORK                         │
│                     4-Layer Architecture                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  LAYER 4: API                    (@sap-framework/api)           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  REST API Endpoints (Express + TypeScript)                │  │
│  │  • /api/admin/tenants          • /api/modules/sod        │  │
│  │  • /api/admin/discovery        • /api/compliance/gdpr    │  │
│  │  • /api/onboarding             • /api/analytics          │  │
│  │  • /api/monitoring             • /api/dashboard          │  │
│  │                                                            │  │
│  │  Middleware:                                              │  │
│  │  • XSUAA Authentication (JWT)  • Rate Limiting            │  │
│  │  • Audit Logging               • Error Handling           │  │
│  │  • Request Validation          • Response Caching         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: MODULES            (@sap-framework/user-access-review)│
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Business Logic Modules                                   │  │
│  │                                                            │  │
│  │  ✅ SoD Analysis (UserAccessReviewer)                     │  │
│  │     • Conflict detection                                  │  │
│  │     • Risk assessment                                     │  │
│  │     • Rule-based evaluation                               │  │
│  │                                                            │  │
│  │  ⏳ Invoice Matching (Planned v1.1)                       │  │
│  │  ⏳ Anomaly Detection (Planned v2.0)                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: SERVICES           (@sap-framework/services)          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Reusable Business Services                               │  │
│  │                                                            │  │
│  │  ✅ RuleEngine                                            │  │
│  │     • Pattern matching (ANY, ALL, GT, LT)                │  │
│  │     • Threshold evaluation                                │  │
│  │     • Multi-rule execution                                │  │
│  │     • Statistics tracking                                 │  │
│  │                                                            │  │
│  │  ✅ AnalyticsEngine (Placeholder)                         │  │
│  │  ✅ WorkflowEngine (Placeholder)                          │  │
│  │  ⏳ ExportService (Planned)                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: CORE               (@sap-framework/core)              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  SAP Connectors                                           │  │
│  │  • BaseSAPConnector (Abstract)                            │  │
│  │    ✅ OAuth/Basic/Certificate auth                        │  │
│  │    ✅ Circuit breaker pattern                             │  │
│  │    ✅ Retry with exponential backoff                      │  │
│  │                                                            │  │
│  │  • ✅ S4HANAConnector (Complete)                          │  │
│  │  • ✅ IPSConnector (Complete)                             │  │
│  │  • ⏳ AribaConnector (Stub)                               │  │
│  │  • ⏳ SuccessFactorsConnector (Stub)                      │  │
│  │                                                            │  │
│  │  Service Discovery                                        │  │
│  │  • ✅ ServiceDiscovery (Auto-detect OData services)       │  │
│  │  • ✅ TenantProfileRepository (Capability storage)        │  │
│  │                                                            │  │
│  │  Infrastructure                                           │  │
│  │  • ✅ EventBus (Event-driven architecture)                │  │
│  │  • ✅ Circuit Breaker                                     │  │
│  │  • ✅ Error Hierarchy (15+ types)                         │  │
│  │  • ✅ Encryption (AES-256-GCM)                            │  │
│  │  • ✅ PII Masking                                         │  │
│  │  • ✅ GDPR Service                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  DATA LAYER: PostgreSQL Database                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Tables:                                                   │  │
│  │  • tenants                    • tenant_module_activations │  │
│  │  • tenant_sap_connections     • sod_violations            │  │
│  │  • tenant_capability_profiles • sod_analysis_runs         │  │
│  │  • service_discovery_history                              │  │
│  │                                                            │  │
│  │  Features:                                                │  │
│  │  • UUID primary keys          • Composite indexes         │  │
│  │  • JSONB for flexibility      • Automatic timestamps      │  │
│  │  • Foreign key cascades       • Audit triggers            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND: Next.js Dashboard     (@sap-framework/web)          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  React UI Components                                      │  │
│  │  • Dashboard (KPIs, charts)   • Analytics                │  │
│  │  • Violations List/Detail     • Admin Panel               │  │
│  │  • User Access Review         • Settings                  │  │
│  │                                                            │  │
│  │  Component Library:                                       │  │
│  │  • Button, Card, Table        • Modal, Toast              │  │
│  │  • Sidebar, Badge, Tabs       • Breadcrumbs, Timeline     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  EXTERNAL SYSTEMS                                                │
│  • SAP S/4HANA (OData v2)                                       │
│  • SAP IPS (SCIM 2.0)                                           │
│  • SAP BTP Services (XSUAA, Destination, Credential Store)      │
│  • Redis (Rate limiting, caching)                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Key Workflows

### Workflow 1: Tenant Onboarding

```
┌─────────────────────────────────────────────────────────────────┐
│  TENANT ONBOARDING FLOW                                          │
└─────────────────────────────────────────────────────────────────┘

1. CREATE TENANT
   POST /api/admin/tenants
   ┌────────────────────────┐
   │ Request Body:          │
   │ {                      │
   │   tenant_id: "acme",   │
   │   company_name: "ACME" │
   │ }                      │
   └────────────────────────┘
           ↓
   [Database] Insert into tenants table
           ↓
   ✅ Tenant created with UUID

2. ADD SAP CONNECTION
   POST /api/admin/tenants/:id/connections
   ┌────────────────────────────────┐
   │ Request Body:                  │
   │ {                              │
   │   connection_type: "S4HANA",   │
   │   base_url: "https://...",     │
   │   auth_type: "OAUTH",          │
   │   client_id: "xxx",            │
   │   client_secret: "xxx"         │
   │ }                              │
   └────────────────────────────────┘
           ↓
   [Encryption] Encrypt credentials
           ↓
   [Database] Store in tenant_sap_connections
           ↓
   ✅ Connection saved securely

3. RUN SERVICE DISCOVERY
   POST /api/admin/tenants/:id/discovery
           ↓
   [ServiceDiscovery] Query SAP Gateway catalog
           ↓
   GET /sap/opu/odata/iwfnd/catalogservice;v=2/ServiceCollection
           ↓
   [SAP System] Returns available services:
   - API_USER_SRV
   - API_ROLE_SRV
   - API_AUTHORIZATION_OBJ_SRV
   - (50+ other services)
           ↓
   [ServiceDiscovery] Test permissions for each
           ↓
   [ServiceDiscovery] Assess capabilities
           ↓
   [TenantProfileRepository] Generate profile
   ┌──────────────────────────────────────┐
   │ TenantCapabilityProfile:             │
   │ {                                    │
   │   capabilities: {                    │
   │     canDoSoD: true,                 │
   │     canAccessUsers: true,            │
   │     canAccessRoles: true,            │
   │     canAccessAuths: true             │
   │   },                                 │
   │   availableServices: [...],          │
   │   missingServices: []                │
   │ }                                    │
   └──────────────────────────────────────┘
           ↓
   [Database] Store in tenant_capability_profiles
           ↓
   [EventBus] Emit DISCOVERY_COMPLETED event
           ↓
   ✅ Discovery complete

4. AUTO-ACTIVATE MODULES
   [ModuleActivationService] Check capabilities
           ↓
   IF canDoSoD == true:
       [Database] INSERT tenant_module_activations
       ┌─────────────────────────────┐
       │ module_name: "SoD_Analysis" │
       │ is_active: true             │
       │ activation_reason: "Auto"   │
       └─────────────────────────────┘
           ↓
   [EventBus] Emit MODULE_ACTIVATED event
           ↓
   ✅ Tenant ready for SoD analysis!
```

### Workflow 2: SoD Analysis Execution

```
┌─────────────────────────────────────────────────────────────────┐
│  SOD ANALYSIS FLOW                                               │
└─────────────────────────────────────────────────────────────────┘

1. START ANALYSIS
   POST /api/modules/sod/analyze
   ┌────────────────────────┐
   │ Request Body:          │
   │ {                      │
   │   tenant_id: "acme"    │
   │ }                      │
   └────────────────────────┘
           ↓
   [SoDController] Validate tenant has SoD module active
           ↓
   [Database] CREATE analysis run
   INSERT INTO sod_analysis_runs
   ┌──────────────────────────────┐
   │ status: "RUNNING"            │
   │ started_at: NOW()            │
   └──────────────────────────────┘
           ↓
   [EventBus] Emit ANALYSIS_STARTED event

2. FETCH USER DATA
   [S4HANAConnector] GET /sap/opu/odata/sap/API_USER_SRV/Users
           ↓
   [SAP System] Returns user list:
   ┌────────────────────────────────────────┐
   │ [                                      │
   │   {                                    │
   │     UserId: "USER001",                 │
   │     UserName: "John Smith",            │
   │     Email: "john@acme.com",            │
   │     Department: "Finance"              │
   │   },                                   │
   │   { ... } // 1000+ users               │
   │ ]                                      │
   └────────────────────────────────────────┘

3. FETCH ROLE ASSIGNMENTS
   FOR EACH User:
       [S4HANAConnector] GET /sap/opu/odata/sap/API_ROLE_SRV/
                            UserRoleAssignments(UserId='USER001')
           ↓
   [SAP System] Returns roles:
   ┌────────────────────────────────────────┐
   │ User: USER001                          │
   │ Roles:                                 │
   │ - SAP_FI_AP_CLERK (Accounts Payable)  │
   │ - SAP_FI_AR_CLERK (Accounts Receivable)│
   │ - SAP_FI_ACCOUNTANT                    │
   └────────────────────────────────────────┘

4. EVALUATE SOD RULES
   [UserAccessReviewer] Load SoD rules from sodRules.ts
   ┌─────────────────────────────────────────┐
   │ Rule: "AP_AR_SEGREGATION"               │
   │ {                                       │
   │   ruleId: "SOD-001",                    │
   │   description: "AP and AR must be split"│
   │   pattern: {                            │
   │     type: "SOD",                        │
   │     conflictingRoles: {                 │
   │       matchType: "ALL",                 │
   │       roles: [                          │
   │         "SAP_FI_AP_CLERK",              │
   │         "SAP_FI_AR_CLERK"               │
   │       ]                                 │
   │     }                                   │
   │   },                                    │
   │   severity: "HIGH"                      │
   │ }                                       │
   └─────────────────────────────────────────┘
           ↓
   [RuleEngine] Evaluate rule against user
           ↓
   ⚠️ VIOLATION DETECTED!
   ┌─────────────────────────────────────────┐
   │ Violation:                              │
   │ {                                       │
   │   userId: "USER001",                    │
   │   userName: "John Smith",               │
   │   email: "john@acme.com",               │
   │   conflictingRoles: [                   │
   │     "SAP_FI_AP_CLERK",                  │
   │     "SAP_FI_AR_CLERK"                   │
   │   ],                                    │
   │   riskLevel: "HIGH",                    │
   │   conflictType: "AP_AR_SEGREGATION"     │
   │ }                                       │
   └─────────────────────────────────────────┘

5. STORE VIOLATIONS
   [Database] BATCH INSERT into sod_violations
   ┌─────────────────────────────────────────┐
   │ INSERT INTO sod_violations              │
   │ (tenant_id, analysis_id, user_id,       │
   │  risk_level, conflicting_roles, ...)    │
   │ VALUES                                  │
   │ ('uuid-1', 'run-1', 'USER001', ...)     │
   │ // 100+ violations in single query      │
   └─────────────────────────────────────────┘

6. COMPLETE ANALYSIS
   [Database] UPDATE sod_analysis_runs
   ┌─────────────────────────────────────────┐
   │ UPDATE sod_analysis_runs                │
   │ SET status = 'COMPLETED',               │
   │     completed_at = NOW(),               │
   │     violations_found = 127,             │
   │     high_risk_count = 45,               │
   │     medium_risk_count = 62,             │
   │     low_risk_count = 20                 │
   └─────────────────────────────────────────┘
           ↓
   [EventBus] Emit ANALYSIS_COMPLETED event
           ↓
   ✅ Analysis complete!

7. VIEW RESULTS
   GET /api/modules/sod/violations?tenant_id=acme
           ↓
   [Database] Query with filters, pagination
           ↓
   Returns:
   ┌─────────────────────────────────────────┐
   │ {                                       │
   │   total: 127,                           │
   │   high: 45,                             │
   │   medium: 62,                           │
   │   low: 20,                              │
   │   violations: [...]                     │
   │ }                                       │
   └─────────────────────────────────────────┘

8. EXPORT TO CSV
   GET /api/modules/sod/export?tenant_id=acme&format=csv
           ↓
   [SoDController] Generate CSV
           ↓
   Returns:
   user_id,user_name,risk_level,conflicting_roles,...
   USER001,John Smith,HIGH,"SAP_FI_AP_CLERK,SAP_FI_AR_CLERK",...
   ...
```

---

## 🗂️ Database Schema

```sql
-- TENANT MANAGEMENT

┌─────────────────────────────────────────────────────────────────┐
│  tenants                                                         │
├─────────────────────────────────────────────────────────────────┤
│  • id (UUID, PK)                                                │
│  • tenant_id (VARCHAR, UNIQUE)     → "acme", "contoso"          │
│  • company_name (VARCHAR)          → "ACME Corporation"         │
│  • status (VARCHAR)                → "ACTIVE", "SUSPENDED"      │
│  • created_at, updated_at                                       │
└─────────────────────────────────────────────────────────────────┘
                    ↓ (1:N)
┌─────────────────────────────────────────────────────────────────┐
│  tenant_sap_connections                                          │
├─────────────────────────────────────────────────────────────────┤
│  • id (UUID, PK)                                                │
│  • tenant_id (UUID, FK → tenants)                               │
│  • connection_type (VARCHAR)       → "S4HANA", "IPS"            │
│  • base_url (VARCHAR)              → "https://sap.acme.com"     │
│  • auth_type (VARCHAR)             → "OAUTH", "BASIC"           │
│  • auth_credentials (JSONB)        → {encrypted credentials}    │
│  • is_active (BOOLEAN)                                          │
└─────────────────────────────────────────────────────────────────┘

-- SERVICE DISCOVERY

┌─────────────────────────────────────────────────────────────────┐
│  tenant_capability_profiles                                      │
├─────────────────────────────────────────────────────────────────┤
│  • id (UUID, PK)                                                │
│  • tenant_id (UUID, FK → tenants, UNIQUE)                       │
│  • sap_version (VARCHAR)           → "SAP S/4HANA 2021"         │
│  • discovered_at (TIMESTAMP)                                    │
│  • available_services (JSONB)      → [ODataService objects]     │
│  • capabilities (JSONB)            → {canDoSoD: true, ...}      │
│  • missing_services (TEXT[])       → ["API_WORKFLOW_SRV"]       │
│  • recommended_actions (JSONB)     → [Action objects]           │
└─────────────────────────────────────────────────────────────────┘
                    ↓ (1:N)
┌─────────────────────────────────────────────────────────────────┐
│  service_discovery_history                                       │
├─────────────────────────────────────────────────────────────────┤
│  • id (UUID, PK)                                                │
│  • tenant_id (UUID, FK → tenants)                               │
│  • discovery_result (JSONB)        → Full DiscoveryResult       │
│  • services_count (INTEGER)                                     │
│  • success (BOOLEAN)                                            │
│  • errors (TEXT[])                                              │
│  • discovered_at (TIMESTAMP)                                    │
└─────────────────────────────────────────────────────────────────┘

-- MODULE ACTIVATION

┌─────────────────────────────────────────────────────────────────┐
│  tenant_module_activations                                       │
├─────────────────────────────────────────────────────────────────┤
│  • id (UUID, PK)                                                │
│  • tenant_id (UUID, FK → tenants)                               │
│  • module_name (VARCHAR)           → "SoD_Analysis"             │
│  • is_active (BOOLEAN)                                          │
│  • activation_reason (TEXT)        → "Auto-activated..."        │
│  • activated_at, deactivated_at                                 │
│  UNIQUE(tenant_id, module_name)                                 │
└─────────────────────────────────────────────────────────────────┘

-- SOD ANALYSIS

┌─────────────────────────────────────────────────────────────────┐
│  sod_analysis_runs                                               │
├─────────────────────────────────────────────────────────────────┤
│  • id (UUID, PK)                                                │
│  • tenant_id (UUID, FK → tenants)                               │
│  • status (VARCHAR)                → "RUNNING", "COMPLETED"     │
│  • total_users_analyzed (INTEGER)                               │
│  • violations_found (INTEGER)                                   │
│  • high_risk_count (INTEGER)                                    │
│  • medium_risk_count (INTEGER)                                  │
│  • low_risk_count (INTEGER)                                     │
│  • started_at, completed_at                                     │
│  • error_message (TEXT)                                         │
│  • config (JSONB)                  → Analysis configuration     │
└─────────────────────────────────────────────────────────────────┘
                    ↓ (1:N)
┌─────────────────────────────────────────────────────────────────┐
│  sod_violations                                                  │
├─────────────────────────────────────────────────────────────────┤
│  • id (UUID, PK)                                                │
│  • tenant_id (UUID, FK → tenants)                               │
│  • analysis_id (UUID)              → Links to sod_analysis_runs │
│  • user_id (VARCHAR)               → "USER001"                  │
│  • user_name (VARCHAR)             → "John Smith"               │
│  • user_email (VARCHAR)            → "john@acme.com"            │
│  • conflict_type (VARCHAR)         → "AP_AR_SEGREGATION"        │
│  • risk_level (VARCHAR)            → "HIGH", "MEDIUM", "LOW"    │
│  • conflicting_roles (TEXT[])      → ["SAP_FI_AP_CLERK", ...]   │
│  • affected_transactions (TEXT[])                               │
│  • business_process (VARCHAR)                                   │
│  • status (VARCHAR)                → "OPEN", "REMEDIATED"       │
│  • remediation_notes (TEXT)                                     │
│  • remediation_plan (TEXT)                                      │
│  • acknowledged_by, acknowledged_at                             │
│  • resolved_by, resolved_at                                     │
│  • detected_at, created_at, updated_at                          │
│                                                                  │
│  Indexes:                                                       │
│  • tenant_id, analysis_id, user_id, status, risk_level          │
│  • detected_at DESC (for time-based queries)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Package Structure

```
sap-mvp-framework/
│
├── packages/                      # Shared packages (monorepo)
│   │
│   ├── core/                      # Layer 1: Foundation
│   │   ├── src/
│   │   │   ├── connectors/
│   │   │   │   ├── base/
│   │   │   │   │   ├── BaseSAPConnector.ts       ✅ Complete
│   │   │   │   │   ├── ServiceDiscovery.ts       ✅ Complete
│   │   │   │   │   └── ServiceDiscoveryTypes.ts  ✅ Complete
│   │   │   │   ├── s4hana/
│   │   │   │   │   └── S4HANAConnector.ts        ✅ Complete
│   │   │   │   ├── ips/
│   │   │   │   │   └── IPSConnector.ts           ✅ Complete
│   │   │   │   ├── ariba/
│   │   │   │   │   └── AribaConnector.ts         ⏳ Stub
│   │   │   │   └── successfactors/
│   │   │   │       └── SuccessFactorsConnector.ts ⏳ Stub
│   │   │   │
│   │   │   ├── persistence/
│   │   │   │   ├── TenantProfileRepository.ts    ✅ Complete
│   │   │   │   ├── SoDViolationRepository.ts     ✅ Complete
│   │   │   │   └── BaseRepository.ts             ✅ Complete
│   │   │   │
│   │   │   ├── events/
│   │   │   │   └── EventBus.ts                   ✅ Complete
│   │   │   │
│   │   │   ├── utils/
│   │   │   │   ├── circuitBreaker.ts             ✅ Complete
│   │   │   │   ├── retry.ts                      ✅ Complete
│   │   │   │   ├── encryption.ts                 ✅ Complete
│   │   │   │   ├── piiMasking.ts                 ✅ Complete
│   │   │   │   ├── odata.ts                      ✅ Complete
│   │   │   │   └── logger.ts                     ✅ Complete
│   │   │   │
│   │   │   ├── errors/
│   │   │   │   └── FrameworkError.ts             ✅ Complete
│   │   │   │
│   │   │   └── services/
│   │   │       ├── GDPRService.ts                ✅ Complete
│   │   │       └── DataRetentionService.ts       ✅ Complete
│   │   │
│   │   └── tests/
│   │       ├── unit/                             ⚠️  45% coverage
│   │       ├── integration/                      ⚠️  Some skipped
│   │       └── e2e/                              ✅ Complete
│   │
│   ├── services/                  # Layer 2: Business Services
│   │   ├── src/
│   │   │   ├── RuleEngine.ts                     ✅ Complete
│   │   │   ├── analytics/
│   │   │   │   └── AnalyticsEngine.ts            ⏳ Placeholder
│   │   │   └── workflow/
│   │   │       └── WorkflowEngine.ts             ⏳ Placeholder
│   │   │
│   │   └── tests/
│   │       └── RuleEngine.test.ts                ✅ Complete
│   │
│   ├── modules/                   # Layer 3: Business Modules
│   │   └── user-access-review/
│   │       ├── src/
│   │       │   ├── UserAccessReviewer.ts         ✅ Complete
│   │       │   ├── rules/
│   │       │   │   └── sodRules.ts               ✅ Complete
│   │       │   └── types.ts                      ✅ Complete
│   │       │
│   │       └── tests/
│   │           ├── UserAccessReviewer.test.ts    ✅ Complete
│   │           └── sodRules.test.ts              ✅ Complete
│   │
│   ├── api/                       # Layer 4: REST API
│   │   ├── src/
│   │   │   ├── app.ts                            ✅ Complete
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts                       ✅ Complete
│   │   │   │   ├── auditLog.ts                   ✅ Complete
│   │   │   │   ├── errorHandler.ts               ✅ Complete
│   │   │   │   ├── rateLimiting.ts               ⏳ TODO
│   │   │   │   └── validation.ts                 ✅ Complete
│   │   │   │
│   │   │   ├── controllers/
│   │   │   │   ├── TenantController.ts           ✅ Complete
│   │   │   │   ├── DiscoveryController.ts        ✅ Complete
│   │   │   │   ├── OnboardingController.ts       ✅ Complete
│   │   │   │   ├── SoDController.ts              ✅ Complete
│   │   │   │   ├── MonitoringController.ts       ✅ Complete
│   │   │   │   ├── DashboardController.ts        ✅ Complete
│   │   │   │   └── AnalyticsController.ts        ✅ Complete
│   │   │   │
│   │   │   ├── routes/
│   │   │   │   ├── index.ts                      ✅ Complete
│   │   │   │   ├── admin/
│   │   │   │   ├── modules/
│   │   │   │   ├── compliance/
│   │   │   │   ├── analytics/
│   │   │   │   └── dashboard/
│   │   │   │
│   │   │   └── services/
│   │   │       └── OnboardingService.ts          ✅ Complete
│   │   │
│   │   └── tests/
│   │       ├── api/                              ⚠️  Limited coverage
│   │       └── e2e/                              ✅ 7 tests passing
│   │
│   └── web/                       # Frontend Dashboard
│       ├── src/
│       │   ├── app/                              # Next.js App Router
│       │   │   ├── dashboard/page.tsx            ✅ Complete
│       │   │   ├── violations/page.tsx           ✅ Complete
│       │   │   ├── analytics/page.tsx            ✅ Complete
│       │   │   ├── users/[id]/page.tsx           ✅ Complete
│       │   │   └── admin/connectors/page.tsx     ✅ Complete
│       │   │
│       │   ├── components/
│       │   │   └── ui/                           # Component library
│       │   │       ├── Button.tsx                ✅ Complete
│       │   │       ├── Card.tsx                  ✅ Complete
│       │   │       ├── Table.tsx                 ✅ Complete
│       │   │       ├── Modal.tsx                 ✅ Complete
│       │   │       ├── Toast.tsx                 ✅ Complete
│       │   │       ├── Sidebar.tsx               ✅ Complete
│       │   │       ├── Badge.tsx                 ✅ Complete
│       │   │       ├── Tabs.tsx                  ✅ Complete
│       │   │       ├── Breadcrumbs.tsx           ✅ Complete
│       │   │       └── Timeline.tsx              ✅ Complete
│       │   │
│       │   ├── hooks/
│       │   │   ├── useDashboard.ts               ✅ Complete
│       │   │   ├── useViolations.ts              ✅ Complete
│       │   │   ├── useAnalytics.ts               ✅ Complete
│       │   │   └── useTenant.ts                  ✅ Complete
│       │   │
│       │   └── lib/
│       │       ├── api-client.ts                 ✅ Complete
│       │       └── store.ts                      ✅ Complete
│       │
│       └── public/                               # Static assets
│
├── apps/
│   └── api/                       # Standalone API app
│       └── src/
│           └── app.test.ts                       ✅ Complete
│
└── infrastructure/
    ├── database/
    │   ├── schema.sql                            ✅ Complete
    │   └── migrations/                           ✅ Complete
    │
    ├── cloud-foundry/
    │   ├── manifest.yml                          ✅ Complete
    │   ├── services.yml                          ✅ Complete
    │   └── xsuaa-config.json                     ✅ Complete
    │
    └── scripts/
        ├── deploy-btp.sh                         ✅ Complete
        └── setup-db.sh                           ✅ Complete
```

---

## 🔌 API Endpoints Reference

### Health & Version
- `GET /api/health` - System health check (no auth)
- `GET /api/version` - API version info (no auth)

### Tenant Management
- `POST /api/admin/tenants` - Create new tenant
- `GET /api/admin/tenants` - List all tenants
- `GET /api/admin/tenants/:id` - Get tenant details
- `PUT /api/admin/tenants/:id` - Update tenant
- `DELETE /api/admin/tenants/:id` - Delete tenant

### Service Discovery
- `POST /api/admin/tenants/:id/discovery` - Run service discovery
- `GET /api/admin/tenants/:id/profile` - Get capability profile
- `GET /api/admin/tenants/:id/modules` - List active modules
- `POST /api/admin/tenants/:id/modules/:moduleName/activate` - Activate module
- `POST /api/admin/tenants/:id/modules/:moduleName/deactivate` - Deactivate module

### Onboarding
- `POST /api/onboarding` - Complete tenant onboarding flow

### SoD Analysis
- `POST /api/modules/sod/analyze` - Run SoD analysis
- `GET /api/modules/sod/violations` - Get violations (with filters)
- `GET /api/modules/sod/violations/:id` - Get violation details
- `PUT /api/modules/sod/violations/:id` - Update violation status
- `GET /api/modules/sod/export` - Export violations to CSV

### Compliance
- `GET /api/compliance/gdpr/user/:id` - Get user data (GDPR request)
- `DELETE /api/compliance/gdpr/user/:id` - Delete user data (right to erasure)

### Monitoring
- `GET /api/monitoring/health` - Detailed health metrics
- `GET /api/monitoring/stats` - System statistics

### Analytics
- `GET /api/analytics/trends` - Violation trends
- `GET /api/analytics/risk-heatmap` - Risk distribution

### Dashboard
- `GET /api/dashboard/kpis` - Key performance indicators
- `GET /api/dashboard/recent-activity` - Recent system activity

---

*Continue to Part 2...*
