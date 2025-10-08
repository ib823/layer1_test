-- Migration 010: Add SoD Certification and Evidence Tables
-- Date: 2025-10-08
-- Description: Tables for access certification campaigns, evidence vault, and compliance reporting

-- ============================================================================
-- CERTIFICATION CAMPAIGNS
-- ============================================================================

-- Certification Campaigns
CREATE TABLE sod_certification_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Campaign Details
  campaign_code VARCHAR(50) NOT NULL,
  campaign_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Campaign Type & Scope
  campaign_type VARCHAR(50) NOT NULL, -- USER_ACCESS_REVIEW, ROLE_REVIEW, SOD_REVIEW, EMERGENCY_ACCESS_REVIEW
  scope JSONB, -- {systems: [...], org_units: [...], user_types: [...]}

  -- Schedule
  frequency VARCHAR(50), -- QUARTERLY, ANNUAL, AD_HOC
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reminder_frequency VARCHAR(50), -- DAILY, WEEKLY

  -- Reviewers
  primary_reviewer VARCHAR(255),
  secondary_reviewer VARCHAR(255),
  escalation_reviewer VARCHAR(255),

  -- Campaign Owner
  campaign_owner VARCHAR(255) NOT NULL,

  -- Statistics
  total_items INTEGER DEFAULT 0,
  reviewed_items INTEGER DEFAULT 0,
  approved_items INTEGER DEFAULT 0,
  revoked_items INTEGER DEFAULT 0,
  pending_items INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, ACTIVE, COMPLETED, CANCELLED, EXPIRED

  -- Completion
  completed_at TIMESTAMP,
  completion_rate DECIMAL(5,2), -- Percentage 0-100

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,

  -- Constraints
  CONSTRAINT unique_campaign_code UNIQUE (tenant_id, campaign_code),
  CONSTRAINT check_campaign_type CHECK (campaign_type IN ('USER_ACCESS_REVIEW', 'ROLE_REVIEW', 'SOD_REVIEW', 'EMERGENCY_ACCESS_REVIEW', 'PRIVILEGED_ACCESS_REVIEW', 'ORPHANED_ACCOUNTS')),
  CONSTRAINT check_campaign_frequency CHECK (frequency IN ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'AD_HOC')),
  CONSTRAINT check_campaign_status CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'PAUSED'))
);

-- Certification Items (individual access to be reviewed)
CREATE TABLE sod_certification_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Campaign
  campaign_id UUID NOT NULL REFERENCES sod_certification_campaigns(id) ON DELETE CASCADE,

  -- Access Details
  user_id UUID NOT NULL REFERENCES access_graph_users(id),
  role_id UUID REFERENCES access_graph_roles(id),
  finding_id UUID REFERENCES sod_findings(id),

  -- Item Details
  item_type VARCHAR(50) NOT NULL, -- USER_ROLE, SOD_VIOLATION, EMERGENCY_ACCESS, PERMISSION
  access_description TEXT,

  -- Risk Assessment
  risk_level VARCHAR(20), -- CRITICAL, HIGH, MEDIUM, LOW
  sod_conflicts JSONB, -- Related SoD violations

  -- Review
  reviewer VARCHAR(255) NOT NULL,
  review_status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REVOKED, DELEGATED, EXCEPTION_GRANTED
  review_decision VARCHAR(50), -- APPROVE, REVOKE, MODIFY, EXCEPTION
  review_comment TEXT,
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR(255),

  -- Evidence
  evidence_ids UUID[], -- References to sod_evidence

  -- Escalation
  escalated BOOLEAN DEFAULT FALSE,
  escalated_to VARCHAR(255),
  escalated_at TIMESTAMP,
  escalation_reason TEXT,

  -- Due Date
  due_date DATE,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_item_type CHECK (item_type IN ('USER_ROLE', 'SOD_VIOLATION', 'EMERGENCY_ACCESS', 'PERMISSION', 'ORPHANED_ACCOUNT', 'PRIVILEGED_ACCESS')),
  CONSTRAINT check_review_status CHECK (review_status IN ('PENDING', 'APPROVED', 'REVOKED', 'DELEGATED', 'EXCEPTION_GRANTED', 'MODIFIED')),
  CONSTRAINT check_review_decision CHECK (review_decision IN ('APPROVE', 'REVOKE', 'MODIFY', 'EXCEPTION', 'DELEGATE'))
);

-- Certification Actions (audit trail of all certification decisions)
CREATE TABLE sod_certification_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Related Entities
  campaign_id UUID NOT NULL REFERENCES sod_certification_campaigns(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES sod_certification_items(id) ON DELETE CASCADE,

  -- Action
  action VARCHAR(50) NOT NULL, -- REVIEWED, APPROVED, REVOKED, DELEGATED, ESCALATED, COMMENTED, BULK_APPROVED
  actor VARCHAR(255) NOT NULL,
  action_at TIMESTAMP DEFAULT NOW(),

  -- Details
  comment TEXT,
  from_status VARCHAR(50),
  to_status VARCHAR(50),
  metadata JSONB,

  -- IP & Context
  ip_address VARCHAR(45),
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_cert_action CHECK (action IN ('REVIEWED', 'APPROVED', 'REVOKED', 'DELEGATED', 'ESCALATED', 'COMMENTED', 'BULK_APPROVED', 'BULK_REVOKED', 'EXCEPTION_GRANTED'))
);

-- ============================================================================
-- EVIDENCE VAULT (TAMPER-EVIDENT STORAGE)
-- ============================================================================

-- Evidence Vault
CREATE TABLE sod_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Evidence Metadata
  evidence_code VARCHAR(100) NOT NULL,
  evidence_type VARCHAR(50) NOT NULL, -- CERTIFICATION_REPORT, ANALYSIS_REPORT, AUDIT_TRAIL, MITIGATION_PROOF, COMPLIANCE_REPORT
  evidence_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Related Entities
  campaign_id UUID REFERENCES sod_certification_campaigns(id),
  finding_id UUID REFERENCES sod_findings(id),
  mitigation_id UUID REFERENCES sod_mitigations(id),
  analysis_run_id UUID REFERENCES sod_analysis_runs(id),

  -- Storage
  storage_location VARCHAR(500), -- S3, Azure Blob, file path
  file_name VARCHAR(255),
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),

  -- Tamper Detection
  file_hash VARCHAR(64) NOT NULL, -- SHA-256
  hash_algorithm VARCHAR(20) DEFAULT 'SHA256',
  previous_evidence_id UUID REFERENCES sod_evidence(id), -- Chain of custody
  chain_hash VARCHAR(64), -- Hash including previous evidence hash

  -- Digital Signature (optional)
  is_signed BOOLEAN DEFAULT FALSE,
  signature_data TEXT, -- Digital signature
  signed_by VARCHAR(255),
  signed_at TIMESTAMP,
  signature_algorithm VARCHAR(50), -- RSA, ECDSA

  -- Retention
  retention_period_years INTEGER DEFAULT 7, -- SOX, ISO 27001 compliance
  retention_expires_at DATE,
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMP,

  -- Access Control
  access_level VARCHAR(50) DEFAULT 'INTERNAL', -- PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED
  allowed_viewers TEXT[], -- User IDs who can view

  -- Compliance Tags
  compliance_standards TEXT[], -- SOX, ISO27001, NIST, COBIT, PDPA
  business_process VARCHAR(100), -- OTC, P2P, R2R

  -- Verification
  verified_at TIMESTAMP,
  verified_by VARCHAR(255),
  verification_status VARCHAR(50), -- VERIFIED, TAMPERED, PENDING, FAILED

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,

  -- Constraints
  CONSTRAINT unique_evidence_code UNIQUE (tenant_id, evidence_code),
  CONSTRAINT check_evidence_type CHECK (evidence_type IN ('CERTIFICATION_REPORT', 'ANALYSIS_REPORT', 'AUDIT_TRAIL', 'MITIGATION_PROOF', 'COMPLIANCE_REPORT', 'SNAPSHOT', 'WORKFLOW_APPROVAL')),
  CONSTRAINT check_access_level CHECK (access_level IN ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED')),
  CONSTRAINT check_verification_status CHECK (verification_status IN ('VERIFIED', 'TAMPERED', 'PENDING', 'FAILED', 'NOT_VERIFIED'))
);

-- Evidence Access Log (who accessed what evidence)
CREATE TABLE sod_evidence_access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  evidence_id UUID NOT NULL REFERENCES sod_evidence(id) ON DELETE CASCADE,

  -- Access Details
  accessed_by VARCHAR(255) NOT NULL,
  access_type VARCHAR(50) NOT NULL, -- VIEW, DOWNLOAD, VERIFY, EXPORT, DELETE
  access_at TIMESTAMP DEFAULT NOW(),

  -- Context
  ip_address VARCHAR(45),
  user_agent TEXT,
  access_reason TEXT,

  -- Result
  access_granted BOOLEAN DEFAULT TRUE,
  denial_reason TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_access_type CHECK (access_type IN ('VIEW', 'DOWNLOAD', 'VERIFY', 'EXPORT', 'DELETE', 'MODIFY', 'SIGN'))
);

-- ============================================================================
-- COMPLIANCE REPORTS
-- ============================================================================

-- Compliance Reports
CREATE TABLE sod_compliance_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Report Details
  report_code VARCHAR(100) NOT NULL,
  report_name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50) NOT NULL, -- SOX_404, ISO27001_A92, NIST_AC5, COBIT_DSS05, PDPA_PRINCIPLE1

  -- Compliance Standard
  compliance_standard VARCHAR(50) NOT NULL, -- SOX, ISO27001, NIST, COBIT, PDPA
  control_reference VARCHAR(100), -- Specific control (e.g., SOX-IC-17, ISO-A.9.2.1)

  -- Reporting Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Report Content
  summary TEXT,
  findings_summary JSONB, -- {total: 50, critical: 5, high: 15, medium: 20, low: 10}
  recommendations TEXT[],

  -- Evidence
  evidence_ids UUID[], -- References to sod_evidence

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, FINAL, SUBMITTED, APPROVED
  finalized_at TIMESTAMP,
  finalized_by VARCHAR(255),
  submitted_to VARCHAR(255),
  submitted_at TIMESTAMP,

  -- Export
  export_formats TEXT[], -- PDF, CSV, JSON, XML
  last_exported_at TIMESTAMP,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,

  -- Constraints
  CONSTRAINT unique_report_code UNIQUE (tenant_id, report_code),
  CONSTRAINT check_report_type CHECK (report_type IN ('SOX_404', 'ISO27001_A92', 'NIST_AC5', 'COBIT_DSS05', 'PDPA_PRINCIPLE1', 'CUSTOM')),
  CONSTRAINT check_compliance_standard CHECK (compliance_standard IN ('SOX', 'ISO27001', 'NIST', 'COBIT', 'PDPA', 'CUSTOM')),
  CONSTRAINT check_report_status CHECK (status IN ('DRAFT', 'FINAL', 'SUBMITTED', 'APPROVED', 'REJECTED'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Campaign indexes
CREATE INDEX idx_campaigns_tenant ON sod_certification_campaigns(tenant_id);
CREATE INDEX idx_campaigns_code ON sod_certification_campaigns(tenant_id, campaign_code);
CREATE INDEX idx_campaigns_status ON sod_certification_campaigns(status);
CREATE INDEX idx_campaigns_dates ON sod_certification_campaigns(start_date, end_date);

-- Certification items indexes
CREATE INDEX idx_cert_items_campaign ON sod_certification_items(campaign_id);
CREATE INDEX idx_cert_items_user ON sod_certification_items(user_id);
CREATE INDEX idx_cert_items_reviewer ON sod_certification_items(reviewer) WHERE review_status = 'PENDING';
CREATE INDEX idx_cert_items_status ON sod_certification_items(review_status);
CREATE INDEX idx_cert_items_due_date ON sod_certification_items(due_date) WHERE review_status = 'PENDING';

-- Certification actions indexes
CREATE INDEX idx_cert_actions_campaign ON sod_certification_actions(campaign_id);
CREATE INDEX idx_cert_actions_item ON sod_certification_actions(item_id);
CREATE INDEX idx_cert_actions_actor ON sod_certification_actions(actor);

-- Evidence indexes
CREATE INDEX idx_evidence_tenant ON sod_evidence(tenant_id);
CREATE INDEX idx_evidence_code ON sod_evidence(tenant_id, evidence_code);
CREATE INDEX idx_evidence_type ON sod_evidence(evidence_type);
CREATE INDEX idx_evidence_campaign ON sod_evidence(campaign_id);
CREATE INDEX idx_evidence_finding ON sod_evidence(finding_id);
CREATE INDEX idx_evidence_hash ON sod_evidence(file_hash);
CREATE INDEX idx_evidence_retention ON sod_evidence(retention_expires_at) WHERE is_archived = FALSE;
CREATE INDEX idx_evidence_compliance ON sod_evidence USING GIN(compliance_standards);

-- Evidence access log indexes
CREATE INDEX idx_evidence_access_evidence ON sod_evidence_access_log(evidence_id);
CREATE INDEX idx_evidence_access_user ON sod_evidence_access_log(accessed_by);
CREATE INDEX idx_evidence_access_time ON sod_evidence_access_log(access_at DESC);

-- Compliance reports indexes
CREATE INDEX idx_reports_tenant ON sod_compliance_reports(tenant_id);
CREATE INDEX idx_reports_code ON sod_compliance_reports(tenant_id, report_code);
CREATE INDEX idx_reports_type ON sod_compliance_reports(report_type);
CREATE INDEX idx_reports_standard ON sod_compliance_reports(compliance_standard);
CREATE INDEX idx_reports_period ON sod_compliance_reports(period_start, period_end);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE sod_certification_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sod_certification_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sod_certification_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sod_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE sod_evidence_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sod_compliance_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaigns_tenant_isolation ON sod_certification_campaigns
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY cert_items_tenant_isolation ON sod_certification_items
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY cert_actions_tenant_isolation ON sod_certification_actions
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY evidence_tenant_isolation ON sod_evidence
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY evidence_access_tenant_isolation ON sod_evidence_access_log
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY reports_tenant_isolation ON sod_compliance_reports
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER campaigns_update_timestamp
  BEFORE UPDATE ON sod_certification_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_sod_timestamp();

CREATE TRIGGER cert_items_update_timestamp
  BEFORE UPDATE ON sod_certification_items
  FOR EACH ROW
  EXECUTE FUNCTION update_sod_timestamp();

CREATE TRIGGER reports_update_timestamp
  BEFORE UPDATE ON sod_compliance_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_sod_timestamp();

-- Trigger to log evidence access
CREATE OR REPLACE FUNCTION log_evidence_access()
RETURNS TRIGGER AS $$
BEGIN
  -- This function would be called by application code, not automatically
  -- Kept here for reference
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to verify evidence chain
CREATE OR REPLACE FUNCTION verify_evidence_chain()
RETURNS TRIGGER AS $$
BEGIN
  -- Verify chain_hash includes previous evidence hash
  IF NEW.previous_evidence_id IS NOT NULL THEN
    -- Chain verification logic would go here
    -- For now, we'll just ensure chain_hash is set
    IF NEW.chain_hash IS NULL THEN
      RAISE EXCEPTION 'chain_hash must be set when previous_evidence_id is specified';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evidence_chain_verification
  BEFORE INSERT OR UPDATE ON sod_evidence
  FOR EACH ROW
  EXECUTE FUNCTION verify_evidence_chain();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE sod_certification_campaigns IS 'Access certification campaigns for periodic user access reviews';
COMMENT ON TABLE sod_certification_items IS 'Individual access items to be reviewed in certification campaigns';
COMMENT ON TABLE sod_certification_actions IS 'Audit trail of all certification decisions and actions';
COMMENT ON TABLE sod_evidence IS 'Tamper-evident evidence vault with SHA-256 hashing and optional digital signatures';
COMMENT ON TABLE sod_evidence_access_log IS 'Audit log of all evidence access for compliance and security';
COMMENT ON TABLE sod_compliance_reports IS 'Compliance reports for SOX, ISO 27001, NIST, COBIT, PDPA';

COMMENT ON COLUMN sod_evidence.file_hash IS 'SHA-256 hash of evidence file for tamper detection';
COMMENT ON COLUMN sod_evidence.chain_hash IS 'Chained hash including previous evidence hash for audit trail integrity';
COMMENT ON COLUMN sod_evidence.retention_period_years IS 'Retention period in years (default 7 for SOX compliance)';
COMMENT ON COLUMN sod_certification_items.sod_conflicts IS 'Related SoD violations as JSONB: [{finding_id: "...", risk_code: "P2P-001", severity: "CRITICAL"}]';
COMMENT ON COLUMN sod_compliance_reports.findings_summary IS 'Summary statistics as JSONB: {total: 50, critical: 5, high: 15, medium: 20, low: 10, resolved: 30}';
