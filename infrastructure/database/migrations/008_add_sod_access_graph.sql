-- Migration 008: Add SoD Access Graph Tables
-- Date: 2025-10-08
-- Description: Canonical access graph for multi-system SoD analysis (S/4HANA, ECC, BTP, Ariba, SuccessFactors, SCIM, OIDC)

-- ============================================================================
-- CONNECTED SYSTEMS REGISTRY
-- ============================================================================

-- Systems registry (all connected systems for SoD analysis)
CREATE TABLE access_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- System Identifiers
  system_code VARCHAR(50) NOT NULL, -- S4HC_PRD, ECC_DEV, BTP_PROD
  system_name VARCHAR(255) NOT NULL,
  system_type VARCHAR(50) NOT NULL, -- S4HC, S4PCE, ECC, BTP, ARIBA, SFSF, SCIM, OIDC, SAML

  -- Connection Details
  base_url VARCHAR(500),
  connection_config JSONB, -- System-specific connection parameters

  -- Sync Metadata
  last_sync_at TIMESTAMP,
  sync_frequency VARCHAR(50), -- HOURLY, DAILY, WEEKLY
  sync_status VARCHAR(50), -- ACTIVE, PAUSED, ERROR
  last_sync_error TEXT,

  -- Statistics
  total_users INTEGER DEFAULT 0,
  total_roles INTEGER DEFAULT 0,
  total_permissions INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,

  -- Constraints
  CONSTRAINT unique_system_code UNIQUE (tenant_id, system_code),
  CONSTRAINT check_system_type CHECK (system_type IN ('S4HC', 'S4PCE', 'ECC', 'BTP', 'ARIBA', 'SFSF', 'SCIM', 'OIDC', 'SAML')),
  CONSTRAINT check_sync_frequency CHECK (sync_frequency IN ('REALTIME', 'HOURLY', 'DAILY', 'WEEKLY', 'MANUAL')),
  CONSTRAINT check_sync_status CHECK (sync_status IN ('ACTIVE', 'PAUSED', 'ERROR', 'INITIAL'))
);

-- ============================================================================
-- CANONICAL ACCESS GRAPH (NORMALIZED FROM ALL SYSTEMS)
-- ============================================================================

-- Canonical Users (normalized from all systems)
CREATE TABLE access_graph_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- User Identifiers
  user_id VARCHAR(255) NOT NULL, -- Original user ID from source system
  user_name VARCHAR(255),
  email VARCHAR(255),
  full_name VARCHAR(255),

  -- Source System
  source_system_id UUID NOT NULL REFERENCES access_systems(id) ON DELETE CASCADE,

  -- User Attributes
  is_active BOOLEAN DEFAULT TRUE,
  is_locked BOOLEAN DEFAULT FALSE,
  user_type VARCHAR(50), -- EMPLOYEE, CONTRACTOR, SERVICE_ACCOUNT, ADMIN
  department VARCHAR(255),
  position VARCHAR(255),
  org_unit VARCHAR(255),
  cost_center VARCHAR(50),
  manager_id VARCHAR(255),

  -- Technical Metadata
  last_login_at TIMESTAMP,
  password_changed_at TIMESTAMP,
  valid_from TIMESTAMP,
  valid_to TIMESTAMP,

  -- Sync Metadata
  synced_at TIMESTAMP DEFAULT NOW(),
  source_data JSONB, -- Raw data from source system

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_per_system UNIQUE (tenant_id, source_system_id, user_id)
);

-- Canonical Roles (normalized from all systems)
CREATE TABLE access_graph_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Role Identifiers
  role_id VARCHAR(255) NOT NULL, -- Original role ID from source system (e.g., SAP_FI_ACCOUNTANT)
  role_name VARCHAR(255),
  role_description TEXT,

  -- Source System
  source_system_id UUID NOT NULL REFERENCES access_systems(id) ON DELETE CASCADE,

  -- Role Classification
  role_type VARCHAR(50), -- SINGLE, COMPOSITE, DERIVED, PROFILE, ROLE_COLLECTION
  is_technical BOOLEAN DEFAULT FALSE,
  is_critical BOOLEAN DEFAULT FALSE,

  -- Business Context
  business_process VARCHAR(100), -- OTC, P2P, R2R, H2R, TRE, MFG
  risk_level VARCHAR(20), -- CRITICAL, HIGH, MEDIUM, LOW

  -- Parent Role (for composite roles)
  parent_role_id UUID REFERENCES access_graph_roles(id),

  -- Sync Metadata
  synced_at TIMESTAMP DEFAULT NOW(),
  source_data JSONB, -- Raw data from source system

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_role_per_system UNIQUE (tenant_id, source_system_id, role_id),
  CONSTRAINT check_role_type CHECK (role_type IN ('SINGLE', 'COMPOSITE', 'DERIVED', 'PROFILE', 'ROLE_COLLECTION', 'AUTH_OBJECT'))
);

-- User-to-Role Assignments (who has what)
CREATE TABLE access_graph_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Assignment
  user_id UUID NOT NULL REFERENCES access_graph_users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES access_graph_roles(id) ON DELETE CASCADE,

  -- Assignment Context
  assignment_type VARCHAR(50), -- DIRECT, INHERITED, TEMPORARY, EMERGENCY
  org_scope JSONB, -- {company_code: '1000', plant: '0001', sales_org: 'US01'}

  -- Temporal
  valid_from TIMESTAMP,
  valid_to TIMESTAMP,

  -- Assignment Reason
  assigned_by VARCHAR(255),
  assigned_at TIMESTAMP DEFAULT NOW(),
  assignment_reason TEXT,
  ticket_reference VARCHAR(255),

  -- Sync Metadata
  synced_at TIMESTAMP DEFAULT NOW(),

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_role_assignment UNIQUE (tenant_id, user_id, role_id, assignment_type),
  CONSTRAINT check_assignment_type CHECK (assignment_type IN ('DIRECT', 'INHERITED', 'TEMPORARY', 'EMERGENCY', 'COMPOSITE'))
);

-- Role-to-Permission Mappings (what roles grant what permissions)
CREATE TABLE access_graph_role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  role_id UUID NOT NULL REFERENCES access_graph_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES sod_permissions(id) ON DELETE CASCADE,

  -- Context
  scope JSONB, -- Scope restrictions at permission level

  -- Sync Metadata
  synced_at TIMESTAMP DEFAULT NOW(),

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_role_permission UNIQUE (tenant_id, role_id, permission_id)
);

-- ============================================================================
-- SNAPSHOT TABLES (POINT-IN-TIME ANALYSIS)
-- ============================================================================

-- Access Graph Snapshots (for delta analysis and compliance audits)
CREATE TABLE access_graph_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Snapshot Metadata
  snapshot_date TIMESTAMP NOT NULL DEFAULT NOW(),
  snapshot_type VARCHAR(50) NOT NULL, -- SCHEDULED, ON_DEMAND, PRE_CHANGE, POST_CHANGE
  snapshot_reason TEXT,
  triggered_by VARCHAR(255),

  -- Snapshot Statistics
  total_users INTEGER NOT NULL,
  total_roles INTEGER NOT NULL,
  total_assignments INTEGER NOT NULL,
  total_systems INTEGER NOT NULL,

  -- Snapshot Data (compressed JSONB)
  snapshot_data JSONB, -- Full graph state (can be large, consider partitioning)

  -- Hash for tamper detection
  snapshot_hash VARCHAR(64), -- SHA-256 of snapshot_data

  -- Status
  status VARCHAR(50) NOT NULL, -- CREATING, COMPLETED, FAILED
  error_message TEXT,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_snapshot_type CHECK (snapshot_type IN ('SCHEDULED', 'ON_DEMAND', 'PRE_CHANGE', 'POST_CHANGE', 'CERTIFICATION')),
  CONSTRAINT check_snapshot_status CHECK (status IN ('CREATING', 'COMPLETED', 'FAILED'))
);

-- Delta tracking (changes between snapshots)
CREATE TABLE access_graph_deltas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Delta Metadata
  from_snapshot_id UUID REFERENCES access_graph_snapshots(id),
  to_snapshot_id UUID NOT NULL REFERENCES access_graph_snapshots(id),

  -- Change Details
  change_type VARCHAR(50) NOT NULL, -- USER_ADDED, USER_REMOVED, ROLE_ASSIGNED, ROLE_REVOKED, PERMISSION_CHANGED
  entity_type VARCHAR(50) NOT NULL, -- USER, ROLE, ASSIGNMENT, PERMISSION
  entity_id VARCHAR(255) NOT NULL,
  entity_name VARCHAR(255),

  -- Change Data
  old_value JSONB,
  new_value JSONB,

  -- Risk Assessment
  introduces_sod_risk BOOLEAN DEFAULT FALSE,
  risk_assessment JSONB,

  -- Audit
  detected_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_change_type CHECK (change_type IN ('USER_ADDED', 'USER_REMOVED', 'USER_MODIFIED', 'ROLE_ASSIGNED', 'ROLE_REVOKED', 'ROLE_MODIFIED', 'PERMISSION_CHANGED')),
  CONSTRAINT check_entity_type CHECK (entity_type IN ('USER', 'ROLE', 'ASSIGNMENT', 'PERMISSION', 'SYSTEM'))
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Systems indexes
CREATE INDEX idx_access_systems_tenant ON access_systems(tenant_id);
CREATE INDEX idx_access_systems_type ON access_systems(system_type) WHERE is_active = TRUE;
CREATE INDEX idx_access_systems_sync_status ON access_systems(sync_status);

-- Users indexes
CREATE INDEX idx_access_users_tenant ON access_graph_users(tenant_id);
CREATE INDEX idx_access_users_system ON access_graph_users(source_system_id);
CREATE INDEX idx_access_users_email ON access_graph_users(email);
CREATE INDEX idx_access_users_active ON access_graph_users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_access_users_org ON access_graph_users(org_unit);

-- Roles indexes
CREATE INDEX idx_access_roles_tenant ON access_graph_roles(tenant_id);
CREATE INDEX idx_access_roles_system ON access_graph_roles(source_system_id);
CREATE INDEX idx_access_roles_type ON access_graph_roles(role_type);
CREATE INDEX idx_access_roles_critical ON access_graph_roles(is_critical) WHERE is_critical = TRUE;
CREATE INDEX idx_access_roles_process ON access_graph_roles(business_process);

-- Assignments indexes
CREATE INDEX idx_access_assignments_tenant ON access_graph_assignments(tenant_id);
CREATE INDEX idx_access_assignments_user ON access_graph_assignments(user_id);
CREATE INDEX idx_access_assignments_role ON access_graph_assignments(role_id);
CREATE INDEX idx_access_assignments_type ON access_graph_assignments(assignment_type);
CREATE INDEX idx_access_assignments_valid ON access_graph_assignments(valid_from, valid_to);

-- Role-Permission indexes
CREATE INDEX idx_access_role_perms_role ON access_graph_role_permissions(role_id);
CREATE INDEX idx_access_role_perms_perm ON access_graph_role_permissions(permission_id);

-- Snapshot indexes
CREATE INDEX idx_snapshots_tenant ON access_graph_snapshots(tenant_id);
CREATE INDEX idx_snapshots_date ON access_graph_snapshots(snapshot_date DESC);
CREATE INDEX idx_snapshots_type ON access_graph_snapshots(snapshot_type);

-- Delta indexes
CREATE INDEX idx_deltas_tenant ON access_graph_deltas(tenant_id);
CREATE INDEX idx_deltas_from_snapshot ON access_graph_deltas(from_snapshot_id);
CREATE INDEX idx_deltas_to_snapshot ON access_graph_deltas(to_snapshot_id);
CREATE INDEX idx_deltas_sod_risk ON access_graph_deltas(introduces_sod_risk) WHERE introduces_sod_risk = TRUE;
CREATE INDEX idx_deltas_change_type ON access_graph_deltas(change_type);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE access_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_graph_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_graph_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_graph_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_graph_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_graph_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_graph_deltas ENABLE ROW LEVEL SECURITY;

CREATE POLICY access_systems_tenant_isolation ON access_systems
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY access_users_tenant_isolation ON access_graph_users
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY access_roles_tenant_isolation ON access_graph_roles
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY access_assignments_tenant_isolation ON access_graph_assignments
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY access_role_perms_tenant_isolation ON access_graph_role_permissions
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY snapshots_tenant_isolation ON access_graph_snapshots
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY deltas_tenant_isolation ON access_graph_deltas
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER access_systems_update_timestamp
  BEFORE UPDATE ON access_systems
  FOR EACH ROW
  EXECUTE FUNCTION update_sod_timestamp();

CREATE TRIGGER access_users_update_timestamp
  BEFORE UPDATE ON access_graph_users
  FOR EACH ROW
  EXECUTE FUNCTION update_sod_timestamp();

CREATE TRIGGER access_roles_update_timestamp
  BEFORE UPDATE ON access_graph_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_sod_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE access_systems IS 'Registry of all connected systems for SoD analysis (S/4HANA, ECC, BTP, Ariba, SuccessFactors, SCIM, OIDC)';
COMMENT ON TABLE access_graph_users IS 'Canonical users normalized from all connected systems';
COMMENT ON TABLE access_graph_roles IS 'Canonical roles normalized from all connected systems';
COMMENT ON TABLE access_graph_assignments IS 'User-to-role assignments showing who has what access';
COMMENT ON TABLE access_graph_role_permissions IS 'Role-to-permission mappings showing what each role grants';
COMMENT ON TABLE access_graph_snapshots IS 'Point-in-time snapshots of the access graph for delta analysis and compliance audits';
COMMENT ON TABLE access_graph_deltas IS 'Changes detected between access graph snapshots';

COMMENT ON COLUMN access_graph_users.source_data IS 'Raw user data from source system as JSONB for auditability';
COMMENT ON COLUMN access_graph_roles.source_data IS 'Raw role data from source system as JSONB for auditability';
COMMENT ON COLUMN access_graph_assignments.org_scope IS 'Organizational scope as JSONB: {company_code: "1000", plant: "0001", sales_org: "US01"}';
COMMENT ON COLUMN access_graph_snapshots.snapshot_hash IS 'SHA-256 hash of snapshot_data for tamper detection';
