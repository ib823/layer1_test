-- Migration 009: Add SoD Findings and Mitigation Tables
-- Date: 2025-10-08
-- Description: Tables for SoD violation findings, mitigations, simulations, and workflows

-- ============================================================================
-- SOD FINDINGS (VIOLATIONS)
-- ============================================================================

-- SoD Findings (detected violations)
CREATE TABLE sod_findings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Finding Identifiers
  finding_code VARCHAR(100) NOT NULL, -- e.g., P2P-001-USER123-20250108

  -- Related Entities
  risk_id UUID NOT NULL REFERENCES sod_risks(id),
  user_id UUID NOT NULL REFERENCES access_graph_users(id),
  analysis_run_id UUID REFERENCES sod_analysis_runs(id),

  -- Conflict Details
  conflicting_roles UUID[] NOT NULL, -- Array of role IDs
  conflicting_functions UUID[] NOT NULL, -- Array of function IDs
  conflicting_permissions UUID[], -- Array of permission IDs

  -- Context
  org_scope JSONB, -- {company_code: '1000', plant: '0001'}
  context_data JSONB, -- Threshold values, temporal info, etc.

  -- Severity & Risk
  severity VARCHAR(20) NOT NULL, -- CRITICAL, HIGH, MEDIUM, LOW
  risk_score DECIMAL(5,2), -- Calculated risk score (0-100)

  -- Root Cause Path (explainability)
  trace_path JSONB, -- [{"type":"USER","id":"..."},{"type":"ROLE","id":"..."},{"type":"PERMISSION","id":"..."}]

  -- Status & Workflow
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- OPEN, IN_REVIEW, MITIGATED, EXCEPTION_GRANTED, RESOLVED, FALSE_POSITIVE
  resolution_type VARCHAR(50), -- REVOKE_ROLE, COMPENSATING_CONTROL, EXCEPTION, FALSE_POSITIVE
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(255),

  -- Assignment & Due Date
  assigned_to VARCHAR(255),
  assigned_at TIMESTAMP,
  due_date DATE,

  -- Recurrence
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_count INTEGER DEFAULT 1,
  first_detected TIMESTAMP NOT NULL DEFAULT NOW(),
  last_detected TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_finding_code UNIQUE (tenant_id, finding_code),
  CONSTRAINT check_severity CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  CONSTRAINT check_finding_status CHECK (status IN ('OPEN', 'IN_REVIEW', 'MITIGATED', 'EXCEPTION_GRANTED', 'RESOLVED', 'FALSE_POSITIVE', 'ACCEPTED_RISK')),
  CONSTRAINT check_resolution_type CHECK (resolution_type IN ('REVOKE_ROLE', 'COMPENSATING_CONTROL', 'EXCEPTION', 'FALSE_POSITIVE', 'ACCEPTED_RISK', 'ROLE_MODIFIED'))
);

-- Finding Comments/Notes
CREATE TABLE sod_finding_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  finding_id UUID NOT NULL REFERENCES sod_findings(id) ON DELETE CASCADE,

  comment_text TEXT NOT NULL,
  comment_type VARCHAR(50), -- REVIEW, RESOLUTION, FOLLOWUP, SYSTEM

  -- Attachments
  attachments JSONB, -- [{name: 'doc.pdf', url: '...', hash: '...'}]

  -- Author
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_comment_type CHECK (comment_type IN ('REVIEW', 'RESOLUTION', 'FOLLOWUP', 'SYSTEM', 'ESCALATION'))
);

-- ============================================================================
-- MITIGATIONS & COMPENSATING CONTROLS
-- ============================================================================

-- Mitigations (compensating controls, exceptions)
CREATE TABLE sod_mitigations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Related Finding
  finding_id UUID NOT NULL REFERENCES sod_findings(id) ON DELETE CASCADE,

  -- Mitigation Type
  mitigation_type VARCHAR(50) NOT NULL, -- COMPENSATING_CONTROL, EXCEPTION, SUPERVISED_ACCESS, DUAL_APPROVAL, MONITORING

  -- Mitigation Details
  description TEXT NOT NULL,
  control_objective TEXT,
  implementation_details TEXT,

  -- Compensating Control Specifics
  control_frequency VARCHAR(50), -- DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUAL, CONTINUOUS
  control_owner VARCHAR(255),
  reviewer VARCHAR(255),
  evidence_required BOOLEAN DEFAULT FALSE,

  -- Exception Specifics
  exception_reason TEXT,
  exception_justification TEXT,
  business_justification TEXT,
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  exception_expires_at TIMESTAMP,

  -- Effectiveness
  effectiveness_rating VARCHAR(20), -- EFFECTIVE, PARTIALLY_EFFECTIVE, INEFFECTIVE, NOT_TESTED
  last_tested_at TIMESTAMP,
  test_results TEXT,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, ACTIVE, EXPIRED, REVOKED, INEFFECTIVE

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,

  -- Constraints
  CONSTRAINT check_mitigation_type CHECK (mitigation_type IN ('COMPENSATING_CONTROL', 'EXCEPTION', 'SUPERVISED_ACCESS', 'DUAL_APPROVAL', 'MONITORING', 'SEGREGATION_PROXY')),
  CONSTRAINT check_control_frequency CHECK (control_frequency IN ('REALTIME', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'CONTINUOUS', 'ON_DEMAND')),
  CONSTRAINT check_effectiveness CHECK (effectiveness_rating IN ('EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE', 'NOT_TESTED', 'PENDING')),
  CONSTRAINT check_mitigation_status CHECK (status IN ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED', 'INEFFECTIVE'))
);

-- Mitigation Evidence (documents, logs, approvals)
CREATE TABLE sod_mitigation_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  mitigation_id UUID NOT NULL REFERENCES sod_mitigations(id) ON DELETE CASCADE,

  -- Evidence Details
  evidence_type VARCHAR(50) NOT NULL, -- DOCUMENT, LOG, APPROVAL, SCREENSHOT, AUDIT_TRAIL
  evidence_name VARCHAR(255) NOT NULL,
  evidence_description TEXT,

  -- Storage
  storage_location VARCHAR(500), -- S3 path, file path, etc.
  file_hash VARCHAR(64), -- SHA-256 for tamper detection
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),

  -- Metadata
  collected_at TIMESTAMP DEFAULT NOW(),
  collected_by VARCHAR(255) NOT NULL,

  -- Verification
  verified_at TIMESTAMP,
  verified_by VARCHAR(255),
  verification_notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_evidence_type CHECK (evidence_type IN ('DOCUMENT', 'LOG', 'APPROVAL', 'SCREENSHOT', 'AUDIT_TRAIL', 'EMAIL', 'CERTIFICATE'))
);

-- ============================================================================
-- SIMULATION & WHAT-IF ANALYSIS
-- ============================================================================

-- Simulation Results (what-if analysis)
CREATE TABLE sod_simulation_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Simulation Request
  user_id UUID REFERENCES access_graph_users(id),
  requested_roles UUID[], -- Roles being simulated
  requested_permissions UUID[], -- Or permissions being added
  simulation_type VARCHAR(50) NOT NULL, -- ROLE_ASSIGNMENT, ROLE_REMOVAL, PERMISSION_CHANGE, BULK_CHANGE

  -- Current State
  current_risk_score DECIMAL(5,2),
  current_violations_count INTEGER DEFAULT 0,

  -- Projected State
  projected_risk_score DECIMAL(5,2),
  projected_violations_count INTEGER DEFAULT 0,
  risk_score_delta DECIMAL(5,2), -- Change in risk

  -- New Violations Detected
  new_violations JSONB, -- Array of violation objects with details
  resolved_violations JSONB, -- Violations that would be resolved

  -- Recommendations
  recommendations JSONB, -- [{type: 'ALTERNATIVE_ROLE', role_id: '...', reason: '...'}]
  least_privilege_roles UUID[], -- Recommended minimal roles

  -- Request Metadata
  requested_by VARCHAR(255) NOT NULL,
  requested_at TIMESTAMP DEFAULT NOW(),
  simulation_duration_ms INTEGER,

  -- Status
  status VARCHAR(50) NOT NULL, -- COMPLETED, FAILED, PENDING
  error_message TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_simulation_type CHECK (simulation_type IN ('ROLE_ASSIGNMENT', 'ROLE_REMOVAL', 'PERMISSION_CHANGE', 'BULK_CHANGE', 'ORG_TRANSFER')),
  CONSTRAINT check_simulation_status CHECK (status IN ('COMPLETED', 'FAILED', 'PENDING'))
);

-- ============================================================================
-- WORKFLOW & APPROVALS
-- ============================================================================

-- Workflows (for mitigations, exceptions, access requests)
CREATE TABLE sod_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Workflow Type
  workflow_type VARCHAR(50) NOT NULL, -- MITIGATION_APPROVAL, EXCEPTION_REQUEST, ACCESS_REQUEST, RISK_ACCEPTANCE

  -- Related Entity
  finding_id UUID REFERENCES sod_findings(id),
  mitigation_id UUID REFERENCES sod_mitigations(id),
  simulation_id UUID REFERENCES sod_simulation_results(id),

  -- Workflow Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  justification TEXT,

  -- Requester
  requested_by VARCHAR(255) NOT NULL,
  requested_at TIMESTAMP DEFAULT NOW(),

  -- Approvers
  approvers JSONB, -- [{user_id: '...', name: '...', level: 1, status: 'PENDING'}]
  current_approval_level INTEGER DEFAULT 1,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, CANCELLED, EXPIRED
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  rejected_by VARCHAR(255),
  rejected_at TIMESTAMP,
  rejection_reason TEXT,

  -- Due Date
  due_date TIMESTAMP,
  expires_at TIMESTAMP,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_workflow_type CHECK (workflow_type IN ('MITIGATION_APPROVAL', 'EXCEPTION_REQUEST', 'ACCESS_REQUEST', 'RISK_ACCEPTANCE', 'ROLE_ASSIGNMENT', 'REMEDIATION')),
  CONSTRAINT check_workflow_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'IN_REVIEW'))
);

-- Workflow History (audit trail of workflow actions)
CREATE TABLE sod_workflow_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  workflow_id UUID NOT NULL REFERENCES sod_workflows(id) ON DELETE CASCADE,

  -- Action
  action VARCHAR(50) NOT NULL, -- SUBMITTED, APPROVED, REJECTED, ESCALATED, COMMENTED, CANCELLED
  actor VARCHAR(255) NOT NULL,
  action_at TIMESTAMP DEFAULT NOW(),

  -- Details
  comment TEXT,
  from_status VARCHAR(50),
  to_status VARCHAR(50),
  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_workflow_action CHECK (action IN ('SUBMITTED', 'APPROVED', 'REJECTED', 'ESCALATED', 'COMMENTED', 'CANCELLED', 'DELEGATED', 'EXPIRED'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Findings indexes
CREATE INDEX idx_sod_findings_tenant ON sod_findings(tenant_id);
CREATE INDEX idx_sod_findings_code ON sod_findings(tenant_id, finding_code);
CREATE INDEX idx_sod_findings_risk ON sod_findings(risk_id);
CREATE INDEX idx_sod_findings_user ON sod_findings(user_id);
CREATE INDEX idx_sod_findings_status ON sod_findings(status);
CREATE INDEX idx_sod_findings_severity ON sod_findings(severity);
CREATE INDEX idx_sod_findings_assigned ON sod_findings(assigned_to) WHERE status IN ('OPEN', 'IN_REVIEW');
CREATE INDEX idx_sod_findings_due_date ON sod_findings(due_date) WHERE status IN ('OPEN', 'IN_REVIEW');
CREATE INDEX idx_sod_findings_detected ON sod_findings(first_detected DESC);

-- Finding comments indexes
CREATE INDEX idx_finding_comments_finding ON sod_finding_comments(finding_id);
CREATE INDEX idx_finding_comments_created ON sod_finding_comments(created_at DESC);

-- Mitigations indexes
CREATE INDEX idx_mitigations_tenant ON sod_mitigations(tenant_id);
CREATE INDEX idx_mitigations_finding ON sod_mitigations(finding_id);
CREATE INDEX idx_mitigations_type ON sod_mitigations(mitigation_type);
CREATE INDEX idx_mitigations_status ON sod_mitigations(status);
CREATE INDEX idx_mitigations_owner ON sod_mitigations(control_owner) WHERE status = 'ACTIVE';

-- Evidence indexes
CREATE INDEX idx_evidence_mitigation ON sod_mitigation_evidence(mitigation_id);
CREATE INDEX idx_evidence_type ON sod_mitigation_evidence(evidence_type);

-- Simulation indexes
CREATE INDEX idx_simulation_tenant ON sod_simulation_results(tenant_id);
CREATE INDEX idx_simulation_user ON sod_simulation_results(user_id);
CREATE INDEX idx_simulation_requested_by ON sod_simulation_results(requested_by);
CREATE INDEX idx_simulation_created ON sod_simulation_results(created_at DESC);

-- Workflow indexes
CREATE INDEX idx_workflows_tenant ON sod_workflows(tenant_id);
CREATE INDEX idx_workflows_type ON sod_workflows(workflow_type);
CREATE INDEX idx_workflows_status ON sod_workflows(status);
CREATE INDEX idx_workflows_finding ON sod_workflows(finding_id);
CREATE INDEX idx_workflows_requested_by ON sod_workflows(requested_by);
CREATE INDEX idx_workflows_due_date ON sod_workflows(due_date) WHERE status = 'PENDING';

-- Workflow history indexes
CREATE INDEX idx_workflow_history_workflow ON sod_workflow_history(workflow_id);
CREATE INDEX idx_workflow_history_action ON sod_workflow_history(action);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE sod_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sod_finding_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sod_mitigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sod_mitigation_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE sod_simulation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sod_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE sod_workflow_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY findings_tenant_isolation ON sod_findings
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY finding_comments_tenant_isolation ON sod_finding_comments
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY mitigations_tenant_isolation ON sod_mitigations
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY evidence_tenant_isolation ON sod_mitigation_evidence
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY simulation_tenant_isolation ON sod_simulation_results
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY workflows_tenant_isolation ON sod_workflows
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY workflow_history_tenant_isolation ON sod_workflow_history
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER sod_findings_update_timestamp
  BEFORE UPDATE ON sod_findings
  FOR EACH ROW
  EXECUTE FUNCTION update_sod_timestamp();

CREATE TRIGGER sod_mitigations_update_timestamp
  BEFORE UPDATE ON sod_mitigations
  FOR EACH ROW
  EXECUTE FUNCTION update_sod_timestamp();

CREATE TRIGGER sod_workflows_update_timestamp
  BEFORE UPDATE ON sod_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_sod_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE sod_findings IS 'SoD violations detected during analysis with full explainability trace';
COMMENT ON TABLE sod_finding_comments IS 'Comments and notes on SoD findings for collaboration';
COMMENT ON TABLE sod_mitigations IS 'Compensating controls and exceptions for SoD violations';
COMMENT ON TABLE sod_mitigation_evidence IS 'Evidence documents supporting mitigation controls';
COMMENT ON TABLE sod_simulation_results IS 'What-if analysis results for access change impact assessment';
COMMENT ON TABLE sod_workflows IS 'Approval workflows for mitigations, exceptions, and access requests';
COMMENT ON TABLE sod_workflow_history IS 'Audit trail of all workflow actions and state changes';

COMMENT ON COLUMN sod_findings.trace_path IS 'Root cause trace path as JSONB array: [{"type":"USER","id":"..."},{"type":"ROLE","id":"..."},{"type":"PERMISSION","id":"..."},{"type":"FUNCTION","id":"..."}]';
COMMENT ON COLUMN sod_findings.context_data IS 'Context conditions as JSONB: {amount_threshold: 10000, same_company_code: "1000", temporal_window_days: 7}';
COMMENT ON COLUMN sod_simulation_results.recommendations IS 'Alternative recommendations as JSONB: [{type: "ALTERNATIVE_ROLE", role_id: "...", role_name: "...", reason: "Lower risk, same capabilities"}]';
COMMENT ON COLUMN sod_workflows.approvers IS 'Approval chain as JSONB: [{user_id: "...", name: "...", level: 1, status: "PENDING", approved_at: null}]';
