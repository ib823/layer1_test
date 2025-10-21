-- Migration 007: Add SoD Control Core Tables
-- Date: 2025-10-08
-- Description: Core tables for Segregation of Duties (SoD) audit and control system

-- ============================================================================
-- CORE SOD TABLES
-- ============================================================================

-- SoD Risks (e.g., "Create Vendor + Pay Vendor")
CREATE TABLE sod_risks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Risk Identifiers
  risk_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Classification
  business_process VARCHAR(100), -- OTC, P2P, R2R, H2R, TRE, MFG, BTP
  category VARCHAR(100), -- Financial, Operational, Compliance
  severity VARCHAR(20) NOT NULL, -- CRITICAL, HIGH, MEDIUM, LOW

  -- Compliance Mapping
  standard_references JSONB, -- {sox: [...], iso27001: [...], nist: [...], cobit: [...], pdpa: [...]}

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),

  -- Constraints
  CONSTRAINT unique_risk_code UNIQUE (tenant_id, risk_code),
  CONSTRAINT check_severity CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  CONSTRAINT check_business_process CHECK (business_process IN ('OTC', 'P2P', 'R2R', 'H2R', 'TRE', 'MFG', 'BTP', 'CROSS'))
);

-- SoD Functions (e.g., "Create Vendor", "Pay Vendor")
CREATE TABLE sod_functions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Function Identifiers
  function_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Classification
  category VARCHAR(100), -- Master Data, Transaction Processing, Reporting, Approval
  business_process VARCHAR(100), -- OTC, P2P, R2R, H2R, etc.

  -- Technical Mapping
  system_type VARCHAR(50), -- S4HC, S4PCE, ECC, BTP, ARIBA, SFSF, SCIM, OIDC
  technical_objects JSONB, -- Auth objects, permissions, API scopes

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_function_code UNIQUE (tenant_id, function_code),
  CONSTRAINT check_system_type CHECK (system_type IN ('S4HC', 'S4PCE', 'ECC', 'BTP', 'ARIBA', 'SFSF', 'SCIM', 'OIDC', 'SAML'))
);

-- SoD Permissions (normalized from all systems)
CREATE TABLE sod_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Permission Identifiers
  permission_code VARCHAR(255) NOT NULL,
  permission_name VARCHAR(255),

  -- Source System
  source_system_id UUID REFERENCES access_systems(id),
  source_system_type VARCHAR(50) NOT NULL,

  -- Technical Details
  auth_object VARCHAR(100), -- S_TCODE, F_BKPF_BUK, etc.
  field_values JSONB, -- {ACTVT: ['01', '02'], BUKRS: ['*']}

  -- Normalization
  normalized_action VARCHAR(100), -- CREATE, READ, UPDATE, DELETE, EXECUTE, APPROVE
  normalized_object VARCHAR(100), -- VENDOR, PAYMENT, INVOICE, USER
  scope JSONB, -- {company_code: ['*'], plant: ['1000']}

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_permission UNIQUE (tenant_id, source_system_id, permission_code)
);

-- SoD Rulesets (link risks to conflicting functions)
CREATE TABLE sod_rulesets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Ruleset Identifiers
  risk_id UUID NOT NULL REFERENCES sod_risks(id) ON DELETE CASCADE,

  -- Conflicting Functions
  function_a_id UUID NOT NULL REFERENCES sod_functions(id),
  function_b_id UUID NOT NULL REFERENCES sod_functions(id),

  -- Context Conditions (optional)
  condition_type VARCHAR(50), -- SAME_SCOPE, THRESHOLD, TEMPORAL, ALWAYS
  condition_config JSONB, -- {field: 'company_code', operator: 'same'} or {field: 'amount', operator: 'gt', value: 10000}

  -- Rule Logic
  logic_operator VARCHAR(10) DEFAULT 'AND', -- AND, OR

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,

  -- Constraints
  CONSTRAINT check_different_functions CHECK (function_a_id != function_b_id),
  CONSTRAINT check_condition_type CHECK (condition_type IN ('SAME_SCOPE', 'THRESHOLD', 'TEMPORAL', 'ALWAYS', 'ORG_UNIT')),
  CONSTRAINT check_logic_operator CHECK (logic_operator IN ('AND', 'OR'))
);

-- Function to Permission Mapping
CREATE TABLE sod_function_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  function_id UUID NOT NULL REFERENCES sod_functions(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES sod_permissions(id) ON DELETE CASCADE,

  -- Mapping confidence
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00 (for ML-based mapping)
  mapping_source VARCHAR(50), -- MANUAL, AUTO, ML

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_function_permission UNIQUE (tenant_id, function_id, permission_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Risk indexes
CREATE INDEX idx_sod_risks_tenant ON sod_risks(tenant_id);
CREATE INDEX idx_sod_risks_code ON sod_risks(tenant_id, risk_code);
CREATE INDEX idx_sod_risks_process ON sod_risks(business_process) WHERE is_active = TRUE;
CREATE INDEX idx_sod_risks_severity ON sod_risks(severity) WHERE is_active = TRUE;

-- Function indexes
CREATE INDEX idx_sod_functions_tenant ON sod_functions(tenant_id);
CREATE INDEX idx_sod_functions_code ON sod_functions(tenant_id, function_code);
CREATE INDEX idx_sod_functions_system ON sod_functions(system_type) WHERE is_active = TRUE;
CREATE INDEX idx_sod_functions_category ON sod_functions(category) WHERE is_active = TRUE;

-- Permission indexes
CREATE INDEX idx_sod_permissions_tenant ON sod_permissions(tenant_id);
CREATE INDEX idx_sod_permissions_system ON sod_permissions(source_system_id);
CREATE INDEX idx_sod_permissions_code ON sod_permissions(tenant_id, permission_code);
CREATE INDEX idx_sod_permissions_action ON sod_permissions(normalized_action);

-- Ruleset indexes
CREATE INDEX idx_sod_rulesets_tenant ON sod_rulesets(tenant_id);
CREATE INDEX idx_sod_rulesets_risk ON sod_rulesets(risk_id) WHERE is_active = TRUE;
CREATE INDEX idx_sod_rulesets_functions ON sod_rulesets(function_a_id, function_b_id) WHERE is_active = TRUE;

-- Function-Permission mapping indexes
CREATE INDEX idx_sod_func_perms_function ON sod_function_permissions(function_id);
CREATE INDEX idx_sod_func_perms_permission ON sod_function_permissions(permission_id);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all SoD tables
ALTER TABLE sod_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sod_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sod_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sod_rulesets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sod_function_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access data for their tenant
CREATE POLICY sod_risks_tenant_isolation ON sod_risks
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY sod_functions_tenant_isolation ON sod_functions
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY sod_permissions_tenant_isolation ON sod_permissions
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY sod_rulesets_tenant_isolation ON sod_rulesets
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY sod_func_perms_tenant_isolation ON sod_function_permissions
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_sod_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sod_risks_update_timestamp
  BEFORE UPDATE ON sod_risks
  FOR EACH ROW
  EXECUTE FUNCTION update_sod_timestamp();

CREATE TRIGGER sod_functions_update_timestamp
  BEFORE UPDATE ON sod_functions
  FOR EACH ROW
  EXECUTE FUNCTION update_sod_timestamp();

CREATE TRIGGER sod_permissions_update_timestamp
  BEFORE UPDATE ON sod_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_sod_timestamp();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE sod_risks IS 'SoD risks representing conflicting combinations of functions (e.g., Create Vendor + Pay Vendor)';
COMMENT ON TABLE sod_functions IS 'Business functions that can conflict when assigned together (e.g., Create Vendor, Approve Payment)';
COMMENT ON TABLE sod_permissions IS 'Normalized permissions from all connected systems (SAP, BTP, Ariba, etc.)';
COMMENT ON TABLE sod_rulesets IS 'Rules defining which function combinations constitute SoD violations';
COMMENT ON TABLE sod_function_permissions IS 'Mapping between business functions and technical permissions';

COMMENT ON COLUMN sod_risks.standard_references IS 'Compliance framework references as JSONB: {sox: ["IC-17"], iso27001: ["A.9.4.4"], nist: ["AC-5"]}';
COMMENT ON COLUMN sod_rulesets.condition_config IS 'Context conditions as JSONB: {field: "company_code", operator: "same"} or {field: "amount", operator: "gt", value: 10000}';
COMMENT ON COLUMN sod_permissions.field_values IS 'Auth object field values as JSONB: {ACTVT: ["01", "02"], BUKRS: ["*"]}';
COMMENT ON COLUMN sod_permissions.scope IS 'Normalized scope as JSONB: {company_code: ["*"], plant: ["1000"], org_unit: ["SALES"]}';
