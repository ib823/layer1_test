# SoD Control Module - Implementation Plan

**Version**: 1.0
**Date**: October 8, 2025
**Status**: Planning Phase

---

## Executive Summary

This document outlines the complete implementation plan for a **Segregation of Duties (SoD) Audit & Control Layer** that rivals SAP GRC Access Control while being simpler, more flexible, and extensible to non-SAP applications.

### Vision

Provide enterprise-grade SoD risk detection, simulation, mitigation, and certification capabilities across:
- SAP S/4HANA (Public Cloud & Private Cloud Edition)
- SAP ECC
- SAP BTP (Role Collections, Apps)
- SAP Ariba
- SAP SuccessFactors
- Generic SAML/OIDC/SCIM applications

### Success Criteria

✅ **Lifecycle**: Discover → Assess → Simulate → Request/Approve → Enforce → Mitigate → Certify → Evidence
✅ **Coverage**: 100+ seeded rules across OTC, P2P, R2R, H2R, Treasury, Manufacturing
✅ **Accuracy**: <5% false-positive rate with context-aware rules
✅ **Scale**: 100k+ users, 10k+ roles, sub-minute analysis
✅ **Compliance**: SOX, ISO 27001, NIST 800-53, COBIT, PDPA ready
✅ **UX**: Business-first design, <3 clicks to action, WCAG AA compliant

---

## Architecture Overview

### System Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI Layer (Next.js)                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Violations   │ │ Risk         │ │ Certification│            │
│  │ Inbox        │ │ Workbench    │ │ Console      │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Access       │ │ Evidence     │ │ Connector    │            │
│  │ Request+Sim  │ │ Vault        │ │ Health       │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (Express.js)                      │
│  /sod/analyze  /sod/simulate  /sod/findings  /sod/rules         │
│  /sod/certifications  /sod/evidence  /sod/connectors/*          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │ Rule       │  │ Simulation │  │ Workflow   │                │
│  │ Engine     │  │ Engine     │  │ Engine     │                │
│  └────────────┘  └────────────┘  └────────────┘                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │ Connector  │  │ Normalizer │  │ Evidence   │                │
│  │ Manager    │  │            │  │ Manager    │                │
│  └────────────┘  └────────────┘  └────────────┘                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer (PostgreSQL)                     │
│  Access Graph │ Rules │ Findings │ Workflows │ Evidence │ Audit │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     External Systems                             │
│  S/4 Cloud │ S/4 PCE │ ECC │ BTP │ Ariba │ SFx │ SCIM/OIDC     │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

1. **Connector Layer** - Extract roles, permissions, users from source systems
2. **Normalization Engine** - Map to canonical access graph
3. **Rule Engine** - Evaluate SoD conflicts with context
4. **Simulation Engine** - What-if analysis for access requests
5. **Workflow Engine** - Mitigations, exceptions, certifications
6. **Evidence Manager** - Immutable audit artifacts
7. **UI/UX Layer** - 6 business-first screens

---

## Data Model

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│ sod_risks   │──1:N──│sod_functions│──M:N──│sod_         │
│             │       │             │       │permissions  │
│ risk_id     │       │ function_id │       │             │
│ name        │       │ name        │       │ perm_id     │
│ severity    │       │ category    │       │ system      │
│ process     │       │ description │       │ action      │
└─────────────┘       └─────────────┘       │ object      │
      │                     │               │ scope       │
      │                     │               └─────────────┘
      │                     │                      │
      ▼                     ▼                      ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│sod_rulesets │       │   users     │       │   roles     │
│             │       │             │       │             │
│ ruleset_id  │       │ user_id     │       │ role_id     │
│ version     │       │ name        │       │ name        │
│ effective_  │       │ source_sys  │       │ source_sys  │
│   from      │       └─────────────┘       └─────────────┘
│ rules[]     │             │                      │
└─────────────┘             │                      │
                            ▼                      ▼
                      ┌──────────────────────────────┐
                      │  access_graph_edges          │
                      │                              │
                      │  user ──has──> role          │
                      │  role ──grants──> permission │
                      │  permission ──on──> object   │
                      └──────────────────────────────┘
                                  │
                                  ▼
                            ┌─────────────┐
                            │sod_findings │
                            │             │
                            │ finding_id  │
                            │ risk_id     │
                            │ user_id     │
                            │ roles[]     │
                            │ status      │
                            │ first_seen  │
                            └─────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              ┌──────────┐  ┌──────────┐  ┌──────────┐
              │sod_      │  │sod_      │  │sod_      │
              │mitigations│  │exceptions│  │controls  │
              └──────────┘  └──────────┘  └──────────┘
```

### Core Tables

#### 1. Risk & Rule Definition

```sql
-- Core risks (e.g., "Create Vendor + Pay Vendor")
CREATE TABLE sod_risks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  risk_code VARCHAR(50) NOT NULL, -- OTC-001, P2P-001
  name VARCHAR(255) NOT NULL,
  description TEXT,
  business_process VARCHAR(100), -- OTC, P2P, R2R, H2R
  severity VARCHAR(20) NOT NULL, -- CRITICAL, HIGH, MEDIUM, LOW
  standard_references JSONB, -- {sox: [...], iso27001: [...], nist: [...]}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, risk_code)
);

-- Functions that conflict (e.g., "Create Vendor", "Pay Vendor")
CREATE TABLE sod_functions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  function_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- Master Data, Transaction Processing, Reporting
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, function_code)
);

-- Permissions that enable a function
CREATE TABLE sod_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  source_system VARCHAR(50) NOT NULL, -- S4HC, S4PCE, ECC, BTP, ARIBA, SFX
  source_permission_id VARCHAR(255) NOT NULL, -- Auth object, Business Catalog, Role Collection
  action VARCHAR(255), -- Display, Create, Change, Delete, Approve
  object_type VARCHAR(255), -- Vendor, Customer, PO, Invoice, GL Account
  scope JSONB, -- {company_code: [...], plant: [...], org: [...]}
  canonical_action VARCHAR(100), -- Normalized: CREATE, READ, UPDATE, DELETE, APPROVE
  canonical_object VARCHAR(100), -- Normalized: VENDOR, CUSTOMER, PURCHASE_ORDER
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, source_system, source_permission_id)
);

-- Function-Permission mappings
CREATE TABLE sod_function_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  function_id UUID NOT NULL REFERENCES sod_functions(id),
  permission_id UUID NOT NULL REFERENCES sod_permissions(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, function_id, permission_id)
);

-- Rulesets (versioned)
CREATE TABLE sod_rulesets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  version VARCHAR(20) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  status VARCHAR(20) NOT NULL, -- DRAFT, ACTIVE, ARCHIVED
  rules JSONB NOT NULL, -- Array of rule definitions
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, name, version)
);

-- Individual rules linking risks to conflicting functions
CREATE TABLE sod_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  ruleset_id UUID NOT NULL REFERENCES sod_rulesets(id),
  risk_id UUID NOT NULL REFERENCES sod_risks(id),
  function_a_id UUID NOT NULL REFERENCES sod_functions(id),
  function_b_id UUID NOT NULL REFERENCES sod_functions(id),
  conflict_type VARCHAR(20) NOT NULL, -- AND, OR
  conditions JSONB, -- Threshold, org scope, temporal
  exceptions_allowed BOOLEAN DEFAULT false,
  mitigation_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. Access Graph

```sql
-- Normalized users from all systems
CREATE TABLE access_graph_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  source_system VARCHAR(50) NOT NULL,
  source_user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  email VARCHAR(255),
  display_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  org_attributes JSONB, -- {company_code, plant, dept, manager, ...}
  sync_metadata JSONB, -- {last_sync, source_system_timestamp, ...}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, source_system, source_user_id)
);

-- Normalized roles from all systems
CREATE TABLE access_graph_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  source_system VARCHAR(50) NOT NULL,
  source_role_id VARCHAR(255) NOT NULL,
  role_name VARCHAR(255) NOT NULL,
  role_type VARCHAR(50), -- SINGLE, COMPOSITE, BUSINESS_ROLE, ROLE_COLLECTION
  parent_role_id UUID REFERENCES access_graph_roles(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sync_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, source_system, source_role_id)
);

-- User-Role assignments
CREATE TABLE access_graph_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES access_graph_users(id),
  role_id UUID NOT NULL REFERENCES access_graph_roles(id),
  assignment_type VARCHAR(50), -- DIRECT, INHERITED, EMERGENCY
  assigned_date TIMESTAMP,
  expiry_date TIMESTAMP,
  org_scope JSONB, -- {company_code: [...], plant: [...]}
  sync_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, role_id)
);

-- Role-Permission mappings
CREATE TABLE access_graph_role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  role_id UUID NOT NULL REFERENCES access_graph_roles(id),
  permission_id UUID NOT NULL REFERENCES sod_permissions(id),
  org_scope JSONB,
  constraints JSONB, -- Amount thresholds, time windows, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, role_id, permission_id)
);
```

#### 3. Findings & Violations

```sql
-- SoD violations detected
CREATE TABLE sod_findings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  finding_code VARCHAR(100) NOT NULL, -- Auto-generated or user-defined
  risk_id UUID NOT NULL REFERENCES sod_risks(id),
  user_id UUID NOT NULL REFERENCES access_graph_users(id),
  conflicting_roles UUID[] NOT NULL, -- Array of role IDs
  conflicting_functions UUID[] NOT NULL, -- Array of function IDs
  org_scope JSONB, -- Where conflict applies
  context JSONB, -- Threshold values, temporal info
  severity VARCHAR(20) NOT NULL,
  status VARCHAR(50) NOT NULL, -- OPEN, IN_REVIEW, MITIGATED, EXCEPTION_GRANTED, RESOLVED, FALSE_POSITIVE
  first_detected TIMESTAMP NOT NULL DEFAULT NOW(),
  last_detected TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(255),
  resolution_notes TEXT,
  assigned_to VARCHAR(255),
  due_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Finding events (audit trail)
CREATE TABLE sod_finding_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  finding_id UUID NOT NULL REFERENCES sod_findings(id),
  event_type VARCHAR(50) NOT NULL, -- DETECTED, ASSIGNED, MITIGATED, EXCEPTION_GRANTED, RESOLVED
  actor VARCHAR(255) NOT NULL,
  actor_type VARCHAR(50) NOT NULL, -- USER, SYSTEM
  event_data JSONB,
  occurred_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_findings_tenant_status ON sod_findings(tenant_id, status);
CREATE INDEX idx_findings_tenant_user ON sod_findings(tenant_id, user_id);
CREATE INDEX idx_findings_tenant_risk ON sod_findings(tenant_id, risk_id);
CREATE INDEX idx_findings_first_detected ON sod_findings(first_detected);
```

#### 4. Mitigations & Exceptions

```sql
-- Compensating controls
CREATE TABLE sod_controls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  control_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  control_type VARCHAR(50) NOT NULL, -- DETECTIVE, PREVENTIVE, CORRECTIVE
  test_frequency VARCHAR(50), -- DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUALLY
  test_procedure TEXT,
  control_owner VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, control_code)
);

-- Mitigations applied to findings
CREATE TABLE sod_mitigations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  finding_id UUID NOT NULL REFERENCES sod_findings(id),
  control_id UUID NOT NULL REFERENCES sod_controls(id),
  status VARCHAR(50) NOT NULL, -- ACTIVE, TESTED, FAILED, EXPIRED
  assigned_by VARCHAR(255),
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  test_due_date DATE,
  last_test_date DATE,
  last_test_result VARCHAR(50), -- PASS, FAIL, INCONCLUSIVE
  test_evidence_id UUID, -- FK to evidence_blobs
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Time-bound exceptions
CREATE TABLE sod_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  finding_id UUID NOT NULL REFERENCES sod_findings(id),
  exception_type VARCHAR(50) NOT NULL, -- BUSINESS_NEED, TEMPORARY_ASSIGNMENT, EMERGENCY
  justification TEXT NOT NULL,
  requested_by VARCHAR(255) NOT NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  status VARCHAR(50) NOT NULL, -- PENDING, APPROVED, REJECTED, ACTIVE, EXPIRED
  review_frequency VARCHAR(50), -- MONTHLY, QUARTERLY
  last_reviewed_at TIMESTAMP,
  next_review_date DATE,
  auto_remind BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. Certification

```sql
-- Certification campaigns
CREATE TABLE sod_certification_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  campaign_name VARCHAR(255) NOT NULL,
  campaign_type VARCHAR(50) NOT NULL, -- MANAGER_REVIEW, APP_OWNER_REVIEW, SOX_CERTIFICATION
  scope JSONB NOT NULL, -- {systems: [...], orgs: [...], users: [...]}
  description TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  due_date DATE NOT NULL,
  reminder_days INT[] DEFAULT ARRAY[7, 3, 1], -- Days before due date
  status VARCHAR(50) NOT NULL, -- DRAFT, ACTIVE, COMPLETED, CANCELLED
  completed_at TIMESTAMP,
  completion_rate DECIMAL(5,2), -- Percentage
  evidence_required BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Individual certification tasks
CREATE TABLE sod_certification_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  campaign_id UUID NOT NULL REFERENCES sod_certification_campaigns(id),
  certifier VARCHAR(255) NOT NULL, -- Manager, App Owner, etc.
  subject_type VARCHAR(50) NOT NULL, -- USER, ROLE, PERMISSION
  subject_id UUID NOT NULL, -- FK to users/roles/permissions
  subject_details JSONB, -- Snapshot of access at task creation
  sod_findings UUID[], -- Array of related finding IDs
  decision VARCHAR(50), -- APPROVED, REVOKED, DELEGATED, PENDING
  decision_reason TEXT,
  decided_at TIMESTAMP,
  decided_by VARCHAR(255),
  delegated_to VARCHAR(255),
  evidence_id UUID, -- FK to evidence_blobs
  reminder_sent_at TIMESTAMP[],
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, COMPLETED, OVERDUE, DELEGATED
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 6. Evidence & Audit

```sql
-- Immutable evidence artifacts
CREATE TABLE evidence_blobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  artifact_type VARCHAR(50) NOT NULL, -- REPORT, SCREENSHOT, CONTROL_TEST, CERTIFICATION
  related_entity_type VARCHAR(50), -- FINDING, MITIGATION, CERTIFICATION, CAMPAIGN
  related_entity_id UUID,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  file_size BIGINT,
  storage_path TEXT NOT NULL,
  hash_algorithm VARCHAR(20) NOT NULL DEFAULT 'SHA-256',
  hash_value VARCHAR(255) NOT NULL,
  signer VARCHAR(255),
  signature TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  retention_until DATE NOT NULL, -- 7+ years
  is_deleted BOOLEAN DEFAULT false
);

-- Connector sync logs
CREATE TABLE sod_connector_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  source_system VARCHAR(50) NOT NULL,
  sync_type VARCHAR(50) NOT NULL, -- FULL, DELTA, MANUAL
  status VARCHAR(50) NOT NULL, -- RUNNING, SUCCESS, FAILED, PARTIAL
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_ms BIGINT,
  records_fetched INT,
  records_created INT,
  records_updated INT,
  records_deleted INT,
  errors JSONB,
  metadata JSONB, -- Connector-specific info
  created_at TIMESTAMP DEFAULT NOW()
);

-- System-wide audit log
CREATE TABLE sod_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  actor VARCHAR(255) NOT NULL,
  actor_type VARCHAR(50) NOT NULL, -- USER, SYSTEM, API
  action VARCHAR(100) NOT NULL,
  request_data JSONB,
  response_data JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  correlation_id UUID,
  occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
  hash_chain_prev VARCHAR(255), -- Previous event hash for tamper-evidence
  hash_chain_current VARCHAR(255) -- Hash of this event
);

-- Create index on audit log
CREATE INDEX idx_audit_log_tenant_occurred ON sod_audit_log(tenant_id, occurred_at DESC);
CREATE INDEX idx_audit_log_correlation ON sod_audit_log(correlation_id);
```

### Row-Level Security (RLS)

```sql
-- Enable RLS on all SoD tables
ALTER TABLE sod_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sod_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sod_permissions ENABLE ROW LEVEL SECURITY;
-- ... (repeat for all tables)

-- Create RLS policies
CREATE POLICY tenant_isolation ON sod_risks
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON sod_findings
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ... (repeat for all tables)
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal**: Data model, core infrastructure, basic ingestion

**Deliverables**:
- ✅ Database migrations for all core tables
- ✅ RLS policies for multi-tenancy
- ✅ Seed data: 30+ baseline SoD rules (OTC, P2P, R2R)
- ✅ Base connector interface
- ✅ S/4HANA Cloud connector (read-only)
- ✅ Access graph normalization logic
- ✅ Basic rule engine (snapshot analysis)

**Tests**:
- Migration rollback tests
- RLS enforcement tests
- Connector authentication tests
- Basic rule evaluation tests

---

### Phase 2: Rule Engine & Detection (Week 3-4)
**Goal**: Complete rule evaluation with context awareness

**Deliverables**:
- ✅ Advanced rule engine:
  - AND/OR logic
  - Threshold conditions (amount, count)
  - Organizational scope (company code, plant, purchasing org)
  - Temporal windows
- ✅ Explainability layer (trace path: user → role → permission → object)
- ✅ Snapshot analysis API
- ✅ Delta analysis (detect new violations since last scan)
- ✅ Finding deduplication and grouping
- ✅ Risk scoring algorithm

**Tests**:
- Rule evaluation unit tests (30+ scenarios)
- Context condition tests (threshold, org scope)
- Explainer trace tests
- Performance tests (100k users, 10k roles)

---

### Phase 3: Connectors (Week 5-6)
**Goal**: Full connector coverage for all source systems

**Deliverables**:
- ✅ S/4HANA PCE connector (OData/RFC)
- ✅ ECC connector (BAPI/RFC for AGR*, AUTH*, USR*)
- ✅ BTP connector (Role Collections, Apps via APIs)
- ✅ Ariba connector (role/permission sets)
- ✅ SuccessFactors connector (RBP permissions)
- ✅ Generic SCIM connector
- ✅ Generic OIDC/SAML connector (claims/attributes)
- ✅ Mapping admin UI for unresolved permissions
- ✅ Drift detection (compare current vs. baseline)

**Tests**:
- Connector integration tests (mock APIs)
- Normalization tests (all system types)
- Mapping gap detection tests
- Drift detection tests

---

### Phase 4: Simulation & Workflows (Week 7-8)
**Goal**: What-if analysis, access requests, mitigations

**Deliverables**:
- ✅ Simulation engine:
  - Pre-provisioning SoD checks
  - Multi-system what-if scenarios
  - Risk score delta calculation
  - Alternative role suggestions (least-privilege)
- ✅ Access request workflow:
  - Request form with multi-system selection
  - Simulation integration
  - Approval routing
- ✅ Mitigation management:
  - Control catalog
  - Control assignment to findings
  - Control testing workflow
  - Evidence capture
- ✅ Exception management:
  - Time-bound exceptions
  - Approval workflow
  - Auto-expiry and reminders
  - Exception review

**Tests**:
- Simulation accuracy tests
- Workflow state machine tests
- Exception expiry tests
- Mitigation effectiveness tests

---

### Phase 5: Certification (Week 9-10)
**Goal**: Periodic access certification campaigns

**Deliverables**:
- ✅ Campaign management:
  - Campaign creation wizard
  - Population scoping (by manager, system, org)
  - Reminder scheduling
- ✅ Certification tasks:
  - Task generation
  - Bulk decision UI
  - Delegation
  - Evidence attachment
- ✅ Attestation workflow:
  - Approve/Revoke actions
  - Reason codes
  - SoD conflict preview
- ✅ Campaign reporting:
  - Completion rate
  - Decisions summary
  - Outstanding tasks

**Tests**:
- Campaign lifecycle tests
- Task generation tests
- Bulk decision tests
- Reminder tests

---

### Phase 6: UX Implementation (Week 11-12)
**Goal**: 6 core business-first screens

**Deliverables**:
- ✅ Violations Inbox
- ✅ Risk Workbench (Rule Editor)
- ✅ Access Request + Simulation
- ✅ Certification Console
- ✅ Evidence Vault
- ✅ Connector Health Dashboard
- ✅ i18n (EN/BM)
- ✅ WCAG AA compliance
- ✅ Responsive design
- ✅ Keyboard navigation

**Tests**:
- E2E tests for all screens (Playwright)
- Accessibility tests (axe-core)
- i18n tests
- Mobile responsiveness tests

---

### Phase 7: Evidence & Compliance (Week 13-14)
**Goal**: Audit-grade evidence and reporting

**Deliverables**:
- ✅ Evidence manager:
  - Immutable storage
  - Hash-based tamper detection
  - Optional digital signatures
  - Chain of custody
- ✅ Report generator:
  - SOX-ready findings report
  - Certification attestation report
  - Control testing report
  - Trend analysis charts
- ✅ Evidence vault UI:
  - Search and filter
  - Download evidence packs (ZIP with manifest)
  - Retention policy enforcement
- ✅ Standards mapping:
  - SOX controls matrix
  - ISO 27001 A.5/A.8/A.9 mapping
  - NIST 800-53 AC-5/AC-6 mapping
  - COBIT DSS05/BAI06 mapping

**Tests**:
- Hash chain integrity tests
- Evidence pack generation tests
- Retention policy tests
- Report accuracy tests

---

### Phase 8: Observability & Ops (Week 15)
**Goal**: Production readiness

**Deliverables**:
- ✅ Metrics:
  - Violations detected/day
  - False-positive rate
  - Certification completion rate
  - Connector health
- ✅ Tracing:
  - Correlation IDs across requests
  - Connector sync traces
  - Rule evaluation traces
- ✅ Health checks:
  - Connector availability
  - Database connectivity
  - Rule engine performance
- ✅ Dashboards:
  - Grafana boards (violations, certifications, connectors)
  - Alerting rules

**Tests**:
- Metric emission tests
- Trace correlation tests
- Health check tests
- Alert trigger tests

---

### Phase 9: Testing & Hardening (Week 16)
**Goal**: Comprehensive test coverage

**Deliverables**:
- ✅ Test matrix CSV (50+ scenarios)
- ✅ Integration tests (Testcontainers)
- ✅ E2E tests (Playwright)
- ✅ Load tests (k6):
  - 100k users, 10k roles
  - Full scan <5 minutes
  - Simulation <1 second
- ✅ Fault injection tests:
  - Connector failures
  - Database failures
  - Partial data scenarios
- ✅ Security tests:
  - RLS bypass attempts
  - SQL injection
  - XSS in findings
  - Secrets exposure

**Tests**:
- Full test suite execution
- Code coverage >80%
- Performance benchmarks
- Security scan (OWASP Top 10)

---

### Phase 10: Documentation & Launch (Week 17-18)
**Goal**: Production deployment

**Deliverables**:
- ✅ Documentation:
  - RULES_GUIDE.md
  - CONNECTORS.md
  - CERTIFICATIONS.md
  - MITIGATIONS.md
  - EVIDENCE.md
  - API_REFERENCE.md
- ✅ Deployment guides:
  - Production checklist
  - Runbook
  - Disaster recovery
- ✅ Training materials:
  - User guides
  - Admin guides
  - Video walkthroughs
- ✅ Release notes

**Tests**:
- Smoke tests in staging
- UAT with pilot users
- Production deployment dry run

---

## Seed Ruleset

### Order-to-Cash (OTC)

| Risk Code | Risk Name | Function A | Function B | Severity | Conditions |
|-----------|-----------|------------|------------|----------|------------|
| OTC-001 | Customer Master Creation + Receipt Posting | Create/Change Customer Master | Post Customer Receipts | CRITICAL | Same company code |
| OTC-002 | Sales Order Creation + Pricing Maintenance | Create/Release Sales Order | Maintain Pricing Conditions | HIGH | Same sales org |
| OTC-003 | Delivery + Goods Issue + Billing | Create Delivery | Post Goods Issue | MEDIUM | Same plant |
| OTC-004 | Billing + Payment Posting | Create Billing Document | Post Incoming Payment | CRITICAL | Same company code |
| OTC-005 | Credit Limit + Order Release | Maintain Credit Limits | Release Sales Orders | HIGH | Same customer |

### Procure-to-Pay (P2P)

| Risk Code | Risk Name | Function A | Function B | Severity | Conditions |
|-----------|-----------|------------|------------|----------|------------|
| P2P-001 | Vendor Master + Bank Data | Create/Change Vendor Master | Maintain Vendor Bank Data | CRITICAL | Same vendor |
| P2P-002 | Vendor Creation + Payment | Create Vendor | Post Vendor Payments | CRITICAL | Same company code |
| P2P-003 | PO Creation + Approval | Create Purchase Order | Approve Purchase Order | HIGH | Amount > $10,000 |
| P2P-004 | PO + Pricing Maintenance | Create PO | Maintain Pricing/Source List | HIGH | Same purchasing org |
| P2P-005 | GR + IR + Payment | Post Goods Receipt | Post Invoice Receipt | MEDIUM | Same vendor |
| P2P-006 | Three-Way Match Circumvention | Create PO | Create Vendor | CRITICAL | Same purchasing org |

### Record-to-Report (R2R)

| Risk Code | Risk Name | Function A | Function B | Severity | Conditions |
|-----------|-----------|------------|------------|----------|------------|
| R2R-001 | GL Master + Journal Entry | Maintain GL Accounts | Post Journal Entries | CRITICAL | Same company code |
| R2R-002 | Journal Entry + Period Close | Post Manual Journals | Close Accounting Periods | HIGH | Same fiscal year |
| R2R-003 | Period Open/Close + Adjustments | Open/Close Periods | Post Period-End Adjustments | HIGH | Same company code |
| R2R-004 | Asset Master + Depreciation | Maintain Asset Master | Post Asset Depreciation | MEDIUM | Same asset class |

### Hire-to-Retire (H2R)

| Risk Code | Risk Name | Function A | Function B | Severity | Conditions |
|-----------|-----------|------------|------------|----------|------------|
| H2R-001 | Employee Master + Payroll | Maintain Employee Master | Approve Payroll | CRITICAL | Same personnel area |
| H2R-002 | Employee Hire/Term + Bank Data | Hire/Terminate Employee | Maintain Employee Bank Details | HIGH | Same employee |
| H2R-003 | Payroll Schema + Execution | Maintain Payroll Schemas | Execute Payroll Run | HIGH | Same payroll area |
| H2R-004 | Time Entry + Approval | Enter Time Data | Approve Time Sheets | MEDIUM | Same employee |

### Treasury/Banking

| Risk Code | Risk Name | Function A | Function B | Severity | Conditions |
|-----------|-----------|------------|------------|----------|------------|
| TRE-001 | Bank Master + Payment Execution | Maintain House Bank/Signatories | Execute Payments | CRITICAL | Same house bank |
| TRE-002 | Payment Proposal + Approval | Create Payment Proposal | Approve Payments | CRITICAL | Amount > $50,000 |
| TRE-003 | Bank Account + Cash Journal | Maintain Bank Accounts | Post Cash Journal Entries | HIGH | Same company code |

### Manufacturing/Inventory

| Risk Code | Risk Name | Function A | Function B | Severity | Conditions |
|-----------|-----------|------------|------------|----------|------------|
| MFG-001 | Material Master + Inventory Adjustment | Create/Change Material Master | Post Inventory Adjustments | HIGH | Same plant |
| MFG-002 | Production Order + Goods Movement | Release Production Order | Confirm Goods Movements | MEDIUM | Same plant |
| MFG-003 | Material Valuation + Backflush | Maintain Material Valuation | Backflush Materials | MEDIUM | Same valuation area |

### Cross-Application (BTP/UI/API)

| Risk Code | Risk Name | Function A | Function B | Severity | Conditions |
|-----------|-----------|------------|------------|----------|------------|
| BTP-001 | Role Collection Admin + Config Admin | Administer Role Collections | Configure Application Secrets | CRITICAL | Same subaccount |
| BTP-002 | API Key Admin + Transport | Manage API Keys/Service Bindings | Deploy Transport/Admin Deploy | HIGH | Same space |
| BTP-003 | User Management + Security Admin | Manage Users | Manage Security Settings | HIGH | Same subaccount |

---

## API Endpoints

### Analysis & Detection

```
POST   /sod/analyze
       - Body: { mode: 'snapshot' | 'delta' | 'continuous', scope: {...} }
       - Returns: { findings: [...], stats: {...} }

GET    /sod/findings
       - Query: status, severity, user_id, risk_id, org_scope
       - Returns: Paginated findings list

GET    /sod/findings/:id
       - Returns: Detailed finding with root cause trace

PUT    /sod/findings/:id
       - Body: { status, assigned_to, notes }
       - Returns: Updated finding
```

### Simulation

```
POST   /sod/simulate
       - Body: { user_id, requested_roles: [...], systems: [...] }
       - Returns: { conflicts: [...], risk_score_delta, alternatives: [...] }

POST   /sod/simulate/bulk
       - Body: { requests: [{user, roles}] }
       - Returns: Batch simulation results
```

### Rules Management

```
GET    /sod/rules
       - Query: ruleset_id, status, process
       - Returns: Paginated rules list

POST   /sod/rules
       - Body: Rule definition
       - Returns: Created rule

PUT    /sod/rules/:id
       - Body: Updated rule
       - Returns: Updated rule

POST   /sod/rulesets
       - Body: { name, version, rules: [...] }
       - Returns: Created ruleset

POST   /sod/rulesets/:id/publish
       - Transition ruleset from DRAFT to ACTIVE
       - Returns: Published ruleset
```

### Mitigations & Exceptions

```
POST   /sod/findings/:id/mitigations
       - Body: { control_id, test_due_date, notes }
       - Returns: Created mitigation

PUT    /sod/mitigations/:id/test
       - Body: { result: 'PASS' | 'FAIL', evidence_id, notes }
       - Returns: Updated mitigation

POST   /sod/findings/:id/exceptions
       - Body: { type, justification, valid_from, valid_to }
       - Returns: Created exception request

PUT    /sod/exceptions/:id/approve
       - Body: { approved_by, notes }
       - Returns: Approved exception
```

### Certification

```
POST   /sod/certifications/campaigns
       - Body: Campaign definition
       - Returns: Created campaign

GET    /sod/certifications/campaigns/:id/tasks
       - Returns: Tasks for campaign

PUT    /sod/certifications/tasks/:id/decide
       - Body: { decision: 'APPROVED' | 'REVOKED', reason, evidence_id }
       - Returns: Updated task

POST   /sod/certifications/tasks/bulk-decide
       - Body: { task_ids: [...], decision, reason }
       - Returns: Bulk decision results
```

### Connectors

```
GET    /sod/connectors
       - Returns: List of configured connectors with health status

GET    /sod/connectors/:system/health
       - Returns: Detailed connector health

POST   /sod/connectors/:system/sync
       - Body: { sync_type: 'FULL' | 'DELTA' }
       - Returns: Sync job ID

GET    /sod/connectors/:system/logs
       - Query: start_date, end_date, status
       - Returns: Sync logs

POST   /sod/connectors/:system/mappings
       - Body: { source_permission, canonical_action, canonical_object }
       - Returns: Created mapping
```

### Evidence & Reporting

```
POST   /sod/evidence
       - Body: Multipart file upload
       - Returns: Evidence ID and hash

GET    /sod/evidence/:id
       - Returns: Evidence metadata and download link

POST   /sod/reports/generate
       - Body: { report_type, filters, format: 'PDF' | 'CSV' | 'XLSX' }
       - Returns: Report job ID

GET    /sod/reports/:job_id/download
       - Returns: Generated report file

POST   /sod/evidence/packs
       - Body: { entity_type, entity_id, include: [...] }
       - Returns: Evidence pack (ZIP with manifest + hashes)
```

---

## UI Screens (Detailed Specs)

### 1. Violations Inbox

**Route**: `/sod/violations`

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Violations Inbox                                    🔍 Search│
├─────────────────────────────────────────────────────────────┤
│ Filters: [Risk ▼] [Severity ▼] [System ▼] [Org ▼] [Status ▼]│
│                                                               │
│ ┌─Stats Cards──────────────────────────────────────────────┐│
│ │ Total: 127 │ Critical: 23 │ High: 45 │ Open: 89          ││
│ └───────────────────────────────────────────────────────────┘│
│                                                               │
│ ☑ Select All   [Assign Owner] [Export CSV]                  │
│                                                               │
│ ┌─Table────────────────────────────────────────────────────┐│
│ │☑│Risk       │User    │System│Org  │Severity│Age │Action ││
│ │─┼───────────┼────────┼──────┼─────┼────────┼────┼───────││
│ │☐│P2P-002    │john.doe│S4HC  │1000 │CRITICAL│12d │[View] ││
│ │☐│OTC-001    │jane.sm.│ECC   │2000 │HIGH    │5d  │[View] ││
│ │☐│R2R-001    │bob.lee │S4HC  │1000 │HIGH    │3d  │[View] ││
│ └───────────────────────────────────────────────────────────┘│
│                                                               │
│ Showing 1-25 of 127                      [< 1 2 3 4 5 6 >]  │
└─────────────────────────────────────────────────────────────┘
```

**Detail Panel** (opens when clicking View):
```
┌─────────────────────────────────────────────────────────────┐
│ Violation Detail: P2P-002                              [✕]   │
├─────────────────────────────────────────────────────────────┤
│ Risk: Vendor Creation + Payment                             │
│ Severity: CRITICAL                                          │
│ User: john.doe@company.com (John Doe)                       │
│ System: S/4HANA Cloud (PRD)                                 │
│ Org Scope: Company Code 1000, Purchasing Org 1000          │
│ First Detected: 2025-09-26                                  │
│ Status: OPEN                                                │
│                                                             │
│ ┌─Root Cause Trace──────────────────────────────────────┐  │
│ │ User: john.doe                                         │  │
│ │   ↓ has role                                          │  │
│ │ Role: Z_VENDOR_ADMIN (S/4HANA Cloud)                  │  │
│ │   ↓ grants                                            │  │
│ │ Business Catalog: SAP_MM_BC_PUR_VENDOR_PC             │  │
│ │   ↓ enables                                           │  │
│ │ Function A: Create/Change Vendor Master               │  │
│ │                                                        │  │
│ │ User: john.doe                                         │  │
│ │   ↓ has role                                          │  │
│ │ Role: Z_AP_PROCESSOR (S/4HANA Cloud)                  │  │
│ │   ↓ grants                                            │  │
│ │ Business Catalog: SAP_FI_BC_AP_PAYMENT                │  │
│ │   ↓ enables                                           │  │
│ │ Function B: Post Vendor Payments                      │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌─Proposed Fix───────────────────────────────────────────┐  │
│ │ Remove one of the following roles:                     │  │
│ │ • Z_VENDOR_ADMIN (least privilege impact: 23 perms)    │  │
│ │ • Z_AP_PROCESSOR (least privilege impact: 45 perms)    │  │
│ │                                                        │  │
│ │ Alternative: Apply compensating control               │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                             │
│ [Assign Mitigation] [Grant Exception] [Mark False Positive]│
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Risk Workbench (Rule Editor)

**Route**: `/sod/rules`

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Risk Workbench                           [+ New Rule]        │
├─────────────────────────────────────────────────────────────┤
│ ┌─Rulesets──────┬─────────────────────────────────────────┐ │
│ │ Production v3 │ Risk: P2P-002                           │ │
│ │ • OTC (5)     │ Name: Vendor Creation + Payment         │ │
│ │ • P2P (6) ✓   │ Process: Procure-to-Pay                 │ │
│ │ • R2R (4)     │ Severity: [CRITICAL ▼]                  │ │
│ │ • H2R (3)     │                                         │ │
│ │ • TRE (3)     │ ┌─Conflicting Functions───────────────┐ │ │
│ │ • MFG (3)     │ │ Function A: Create/Change Vendor    │ │ │
│ │               │ │   [Select Function ▼]               │ │ │
│ │ Draft v4      │ │                                     │ │ │
│ │ • (editing)   │ │ Function B: Post Vendor Payments    │ │ │
│ │               │ │   [Select Function ▼]               │ │ │
│ │               │ │                                     │ │ │
│ │               │ │ Conflict Logic: [AND ▼]            │ │ │
│ │               │ └─────────────────────────────────────┘ │ │
│ │               │                                         │ │
│ │               │ ┌─Conditions────────────────────────────┐│
│ │               │ │ ☑ Same Org Scope                     ││
│ │               │ │   Fields: [Company Code] [Purch Org] ││
│ │               │ │                                      ││
│ │               │ │ ☑ Threshold                          ││
│ │               │ │   Field: [Transaction Amount]        ││
│ │               │ │   Operator: [> ▼]                    ││
│ │               │ │   Value: [1000]                      ││
│ │               │ │                                      ││
│ │               │ │ ☐ Temporal Window                    ││
│ │               │ │   Within: [30] days                  ││
│ │               │ └──────────────────────────────────────┘││
│ │               │                                         │ │
│ │               │ ┌─Mitigations & Controls──────────────┐ │ │
│ │               │ │ ☑ Mitigation Required               │ │ │
│ │               │ │ Suggested Controls:                 │ │ │
│ │               │ │ • CTRL-001: Manager Review of       │ │ │
│ │               │ │              Payments >$10k         │ │ │
│ │               │ │ • CTRL-015: Quarterly Vendor Master │ │ │
│ │               │ │              Reconciliation         │ │ │
│ │               │ └─────────────────────────────────────┘ │ │
│ │               │                                         │ │
│ │               │ [Test Rule] [Save Draft] [Publish]     │ │
│ └───────────────┴─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Access Request + Simulation

**Route**: `/sod/access-request`

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Access Request with SoD Simulation                          │
├─────────────────────────────────────────────────────────────┤
│ ┌─Request Details─────────────────────────────────────────┐ │
│ │ User: [john.doe ▼]                                      │ │
│ │ Justification: [Required for AP processing coverage]    │ │
│ │                                                         │ │
│ │ ┌─Requested Access────────────────────────────────────┐ ││
│ │ │ System: [S/4HANA Cloud PRD ▼]  [+ Add System]      │ ││
│ │ │                                                      │ ││
│ │ │ Roles:                                               │ ││
│ │ │ • [Z_AP_PROCESSOR ▼] Scope: CoCd 1000, POrg 1000   │ ││
│ │ │ • [Z_VENDOR_DISPLAY ▼] Scope: CoCd 1000            │ ││
│ │ │   [+ Add Role]                                      │ ││
│ │ └──────────────────────────────────────────────────────┘ ││
│ │                                                         │ │
│ │ [Simulate SoD Impact]                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─Simulation Results──────────────────────────────────────┐ │
│ │ Risk Score: Current: 12 → New: 45 (+33) ⚠️             │ │
│ │                                                         │ │
│ │ ⚠️ 2 NEW CONFLICTS DETECTED                            │ │
│ │                                                         │ │
│ │ ┌─Conflict 1─────────────────────────────────────────┐ ││
│ │ │ Risk: P2P-002 (Vendor Creation + Payment)          │ ││
│ │ │ Severity: CRITICAL                                 │ ││
│ │ │                                                    │ ││
│ │ │ Existing Role: Z_VENDOR_ADMIN                      │ ││
│ │ │   → Function: Create/Change Vendor Master         │ ││
│ │ │                                                    │ ││
│ │ │ Requested Role: Z_AP_PROCESSOR                     │ ││
│ │ │   → Function: Post Vendor Payments                │ ││
│ │ │                                                    │ ││
│ │ │ Org Overlap: Company Code 1000, Purch Org 1000    │ ││
│ │ │                                                    │ ││
│ │ │ Mitigation Options:                                │ ││
│ │ │ • Remove Z_VENDOR_ADMIN from user                  │ ││
│ │ │ • Request Z_VENDOR_DISPLAY instead                 │ ││
│ │ │ • Apply control: Manager Payment Review            │ ││
│ │ └────────────────────────────────────────────────────┘ ││
│ │                                                         │ │
│ │ ℹ️ 1 EXISTING CONFLICT (no change)                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Cancel] [Modify Request] [Submit with Exception Request]  │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Certification Console

**Route**: `/sod/certifications`

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Certification Console                    [+ New Campaign]   │
├─────────────────────────────────────────────────────────────┤
│ ┌─Active Campaigns────────────────────────────────────────┐ │
│ │ Campaign        │Type    │Due Date │Progress │Action    ││
│ │─────────────────┼────────┼─────────┼─────────┼──────────││
│ │ Q4 2025 Manager │Manager │2025-12-15│ 67%    │[Review] ││
│ │ Review          │Review  │         │ (67/100)│         ││
│ │─────────────────┼────────┼─────────┼─────────┼──────────││
│ │ SOX Annual      │SOX     │2025-12-31│ 23%    │[Review] ││
│ │ Certification   │Cert    │         │ (23/100)│         ││
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

Certification Tasks (Q4 2025 Manager Review)
┌─────────────────────────────────────────────────────────────┐
│ Your Tasks (12)                          [Bulk Approve ▼]   │
├─────────────────────────────────────────────────────────────┤
│ Filters: [Status ▼] [SoD Conflicts ▼]                       │
│                                                             │
│ ☑ Select All   [Bulk Approve] [Bulk Revoke] [Delegate]     │
│                                                             │
│ ┌─Table────────────────────────────────────────────────────┐│
│ │☑│User       │Roles │Systems│SoD │Status  │Due  │Action  ││
│ │─┼───────────┼──────┼───────┼────┼────────┼─────┼────────││
│ │☐│john.doe   │8     │S4HC   │⚠️2│PENDING │12/15│[Review]││
│ │☐│jane.smith │5     │ECC    │✓ 0│PENDING │12/15│[Review]││
│ │☐│bob.lee    │12    │S4HC   │⚠️1│PENDING │12/15│[Review]││
│ └───────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘

Task Detail Panel (john.doe)
┌─────────────────────────────────────────────────────────────┐
│ Certification Task: john.doe@company.com                [✕] │
├─────────────────────────────────────────────────────────────┤
│ Employee: John Doe (ID: 12345)                              │
│ Manager: You (jane.manager@company.com)                     │
│ As of: 2025-10-01                                           │
│                                                             │
│ ┌─Access Summary───────────────────────────────────────────┐│
│ │ System         │Roles │Permissions│Last Used │          ││
│ │────────────────┼──────┼───────────┼──────────│          ││
│ │ S/4HANA Cloud  │ 8    │ 234       │2025-09-30│          ││
│ │ SAP ECC        │ 3    │ 67        │2025-09-28│          ││
│ └─────────────────────────────────────────────────────────┘││
│                                                             │
│ ⚠️ SoD Conflicts (2)                                       │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ • P2P-002: Vendor Creation + Payment (CRITICAL)         ││
│ │   Roles: Z_VENDOR_ADMIN + Z_AP_PROCESSOR                ││
│ │   Mitigation: CTRL-001 (Manager Review) - ACTIVE        ││
│ │                                                         ││
│ │ • OTC-001: Customer Master + Receipt (HIGH)             ││
│ │   Roles: Z_CUSTOMER_ADMIN + Z_AR_PROCESSOR              ││
│ │   Exception: Granted until 2025-12-31                   ││
│ └─────────────────────────────────────────────────────────┘││
│                                                             │
│ ┌─Decision────────────────────────────────────────────────┐│
│ │ ○ Approve all access                                    ││
│ │ ○ Approve with modifications (select roles to revoke)   ││
│ │ ○ Revoke all access                                     ││
│ │ ○ Delegate to: [Select User ▼]                          ││
│ │                                                         ││
│ │ Reason: [Required for AP processing, mitigations active]││
│ │                                                         ││
│ │ Attach Evidence: [Browse Files] or [Take Screenshot]    ││
│ └─────────────────────────────────────────────────────────┘││
│                                                             │
│ [Cancel] [Submit Decision]                                 │
└─────────────────────────────────────────────────────────────┘
```

---

### 5. Evidence Vault

**Route**: `/sod/evidence`

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Evidence Vault                              [+ Upload]       │
├─────────────────────────────────────────────────────────────┤
│ 🔍 Search: [                            ] [Search]          │
│ Filters: [Type ▼] [Entity ▼] [Date Range ▼] [Retention ▼]  │
│                                                             │
│ ┌─Stats────────────────────────────────────────────────────┐│
│ │ Total: 1,234 │ Reports: 567 │ Screenshots: 234 │ Tests: 433││
│ └─────────────────────────────────────────────────────────┘││
│                                                             │
│ ┌─Table────────────────────────────────────────────────────┐│
│ │ Type      │File Name      │Entity     │Date    │Actions  ││
│ │───────────┼───────────────┼───────────┼────────┼─────────││
│ │ 📄 Report │SOX_Q4_2025.pdf│Campaign   │12/01/25│[View]   ││
│ │           │               │Q4-CERT    │        │[Download]││
│ │           │               │           │        │[Verify] ││
│ │───────────┼───────────────┼───────────┼────────┼─────────││
│ │ 🖼️ Screen │mitigation_    │Mitigation │11/15/25│[View]   ││
│ │           │evidence_123   │MIT-123    │        │[Download]││
│ │───────────┼───────────────┼───────────┼────────┼─────────││
│ │ 📊 Test   │control_test_  │Control    │11/10/25│[View]   ││
│ │           │CTRL001.xlsx   │CTRL-001   │        │[Download]││
│ └─────────────────────────────────────────────────────────┘││
│                                                             │
│ [Download Selected] [Create Evidence Pack]                  │
└─────────────────────────────────────────────────────────────┘

Evidence Detail Panel
┌─────────────────────────────────────────────────────────────┐
│ Evidence: SOX_Q4_2025.pdf                              [✕]  │
├─────────────────────────────────────────────────────────────┤
│ Type: Report                                                │
│ Related Entity: Certification Campaign Q4-CERT              │
│ File Size: 2.4 MB                                           │
│ Uploaded By: jane.auditor@company.com                       │
│ Uploaded At: 2025-12-01 14:32:15 UTC                        │
│                                                             │
│ ┌─Integrity──────────────────────────────────────────────┐ │
│ │ Hash Algorithm: SHA-256                                │ │
│ │ Hash Value: a3f8b9c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7... │ │
│ │ Status: ✓ Verified                                     │ │
│ │                                                        │ │
│ │ Digital Signature: ✓ Signed                            │ │
│ │ Signer: jane.auditor@company.com                       │ │
│ │ Signed At: 2025-12-01 14:32:20 UTC                     │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─Retention──────────────────────────────────────────────┐ │
│ │ Retention Until: 2032-12-01 (7 years)                  │ │
│ │ Auto-Delete: Enabled                                   │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─Chain of Custody───────────────────────────────────────┐ │
│ │ 2025-12-01 14:32:15 - Uploaded by jane.auditor         │ │
│ │ 2025-12-01 14:32:20 - Signed by jane.auditor           │ │
│ │ 2025-12-05 09:15:42 - Downloaded by john.auditor       │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Download] [Verify Hash] [View Certificate]                │
└─────────────────────────────────────────────────────────────┘
```

---

### 6. Connector Health Dashboard

**Route**: `/sod/connectors`

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Connector Health Dashboard                                  │
├─────────────────────────────────────────────────────────────┤
│ Last Refresh: 2025-10-08 15:42:00      [Refresh All]        │
│                                                             │
│ ┌─S/4HANA Cloud (PRD)─────────────────────────────────────┐│
│ │ Status: ✓ Healthy                                       ││
│ │ Last Sync: 2025-10-08 02:00:15 (13h ago)                ││
│ │ Sync Type: DELTA                                        ││
│ │ Duration: 2m 34s                                        ││
│ │                                                         ││
│ │ Records: +12 created, ~45 updated, -3 deleted           ││
│ │ Errors: 0                                               ││
│ │ Drift Alerts: 0                                         ││
│ │                                                         ││
│ │ [Resync Now] [View Logs] [View Mappings]               ││
│ └─────────────────────────────────────────────────────────┘││
│                                                             │
│ ┌─SAP ECC (ECC PRD)───────────────────────────────────────┐│
│ │ Status: ⚠️ Warning - Drift Detected                     ││
│ │ Last Sync: 2025-10-08 02:05:42 (13h ago)                ││
│ │ Sync Type: DELTA                                        ││
│ │ Duration: 5m 12s                                        ││
│ │                                                         ││
│ │ Records: +3 created, ~15 updated, -1 deleted            ││
│ │ Errors: 0                                               ││
│ │ Drift Alerts: 3                                         ││
│ │  • Role AGR_Z_VENDOR changed (5 new transactions)       ││
│ │  • Auth object P_ORGIN added to role AGR_Z_AP           ││
│ │  • User deletion: JDOE (needs unmapping)                ││
│ │                                                         ││
│ │ [Review Drift] [Resync] [View Logs]                     ││
│ └─────────────────────────────────────────────────────────┘││
│                                                             │
│ ┌─SAP BTP (Trial Subaccount)──────────────────────────────┐│
│ │ Status: ✓ Healthy                                       ││
│ │ Last Sync: 2025-10-08 01:30:00 (14h ago)                ││
│ │ Sync Type: FULL                                         ││
│ │ Duration: 1m 08s                                        ││
│ │                                                         ││
│ │ Records: 45 total (0 changes)                           ││
│ │ Errors: 0                                               ││
│ │ Drift Alerts: 0                                         ││
│ │                                                         ││
│ │ [Resync Now] [View Logs] [View Mappings]               ││
│ └─────────────────────────────────────────────────────────┘││
│                                                             │
│ ┌─SAP Ariba (Production)──────────────────────────────────┐│
│ │ Status: ❌ Error                                         ││
│ │ Last Sync: 2025-10-07 02:00:00 (37h ago)                ││
│ │ Sync Type: DELTA (FAILED)                               ││
│ │ Duration: 0m 15s                                        ││
│ │                                                         ││
│ │ Errors: 1                                               ││
│ │  • Authentication failed: Invalid client credentials    ││
│ │                                                         ││
│ │ [Fix Credentials] [Retry] [View Logs]                   ││
│ └─────────────────────────────────────────────────────────┘││
│                                                             │
│ ┌─Unmapped Permissions (Requires Admin Action)────────────┐│
│ │ Total: 23 unmapped permissions awaiting review          ││
│ │                                                         ││
│ │ Source System │Permission ID          │Count │Action   ││
│ │───────────────┼───────────────────────┼──────┼─────────││
│ │ S/4HANA Cloud │SAP_MM_BC_PUR_NEW_CAT  │ 12   │[Map]    ││
│ │ ECC           │S_TCODE:ME21N          │ 8    │[Map]    ││
│ │ Ariba         │ARIBA_BUYER_ADVANCED   │ 3    │[Map]    ││
│ └─────────────────────────────────────────────────────────┘││
└─────────────────────────────────────────────────────────────┘
```

---

## Compliance Standards Mapping

| Feature | SOX | ISO 27001 | NIST 800-53 | COBIT 5 | PDPA |
|---------|-----|-----------|-------------|---------|------|
| **Access Control** | Internal Control 17 | A.9.1.1, A.9.2.1 | AC-5, AC-6 | DSS05.04 | Principle 1 (Consent) |
| **Segregation of Duties** | COSO Principle 3 | A.9.4.4 | AC-5 (SoD) | DSS05.03 | - |
| **Access Reviews/Certification** | SOX 404 | A.9.2.5 | AC-2 (Account Management) | DSS05.05 | Principle 5 (Accuracy) |
| **Audit Logging** | SOX IT Controls | A.12.4.1, A.12.4.3 | AU-2, AU-6, AU-12 | DSS05.07 | Principle 3 (Purpose) |
| **Evidence Retention** | 7 years | A.12.3.1 | AU-11 | DSS05.06 | Principle 6 (Retention) |
| **Change Management** | IT General Controls | A.14.2.2 | CM-3 | BAI06.01 | - |
| **Incident Response** | SOX ITGC | A.16.1.4 | IR-4, IR-5 | DSS02.01 | Principle 7 (Security) |
| **User Provisioning** | SOX Access Controls | A.9.2.1 | AC-2 | DSS05.04 | Principle 1 (Consent) |
| **Exception Management** | COSO Control Activities | A.9.4.1 | AC-3 (Access Enforcement) | DSS05.04 | - |
| **Continuous Monitoring** | SOX 404(b) | A.18.2.2 | CA-7 | MEA02.01 | - |

---

## Technology Stack

### Backend
- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL 15 with Row-Level Security
- **ORM**: Knex.js for migrations, raw SQL for queries
- **Validation**: Zod schemas
- **Testing**: Jest (unit), Testcontainers (integration)

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **State**: React Query (TanStack Query)
- **Forms**: React Hook Form + Zod
- **UI Components**: Custom component library (built in earlier phases)
- **Charts**: Recharts
- **i18n**: next-intl (EN/BM)
- **Accessibility**: WCAG AA compliant
- **Testing**: Playwright (E2E)

### Connectors
- **S/4HANA Cloud**: OData v4, Communication Arrangement APIs
- **S/4HANA PCE**: OData v2/v4, BAPI/RFC via SAP Cloud Connector
- **ECC**: RFC/BAPI (BAPI_USER_GET_DETAIL, BAPI_AGR_GET_*)
- **BTP**: BTP APIs (Authorization, XSUAA)
- **Ariba**: Ariba Network APIs
- **SuccessFactors**: OData API v2
- **SCIM**: SCIM 2.0 protocol
- **OIDC/SAML**: JWT parsing, SAML assertion parsing

### Observability
- **Logging**: Winston (structured JSON)
- **Metrics**: Prometheus client
- **Tracing**: OpenTelemetry
- **Dashboards**: Grafana

---

## Next Steps

1. **Review and Approve Plan**: Stakeholder sign-off on architecture and scope
2. **Provision Infrastructure**: Database, API endpoints, development environments
3. **Begin Phase 1**: Data model implementation and seed rules
4. **Weekly Check-ins**: Review progress, adjust plan as needed
5. **Pilot Testing**: Identify 2-3 early adopters for UAT

---

**End of SOD_PLAN.md**
