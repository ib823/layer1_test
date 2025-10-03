-- Security and Compliance Tables Migration
-- Audit Logs, Data Residency, GDPR Compliance

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id VARCHAR(255),
  user_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  method VARCHAR(10),
  path VARCHAR(500),
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_id VARCHAR(100),
  status_code INTEGER,
  request_body JSONB,
  response_body JSONB,
  metadata JSONB,
  severity VARCHAR(20) DEFAULT 'INFO', -- INFO, WARNING, ERROR, CRITICAL
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);

-- Tenant Data Residency Configuration
CREATE TABLE IF NOT EXISTS tenant_data_residency (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  region VARCHAR(50) NOT NULL, -- EU, US, APAC, etc.
  country_code VARCHAR(10),
  data_center VARCHAR(100),
  requires_local_storage BOOLEAN DEFAULT false,
  compliance_requirements TEXT[], -- GDPR, HIPAA, SOC2, etc.
  encryption_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_data_residency_tenant_id ON tenant_data_residency(tenant_id);
CREATE INDEX idx_data_residency_region ON tenant_data_residency(region);

-- GDPR Data Subject Requests (Right to be Forgotten, Access, etc.)
CREATE TABLE IF NOT EXISTS gdpr_data_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL, -- FORGET, ACCESS, RECTIFY, PORTABILITY
  subject_type VARCHAR(50) NOT NULL, -- USER, CUSTOMER, EMPLOYEE
  subject_id VARCHAR(255) NOT NULL,
  subject_email VARCHAR(255),
  subject_identifiers JSONB, -- Additional identifiers
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, FAILED
  requested_by VARCHAR(255),
  requested_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  completed_by VARCHAR(255),
  affected_tables TEXT[],
  affected_records INTEGER DEFAULT 0,
  verification_token VARCHAR(255),
  verification_expires_at TIMESTAMP,
  verified_at TIMESTAMP,
  notes TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_gdpr_requests_tenant_id ON gdpr_data_requests(tenant_id);
CREATE INDEX idx_gdpr_requests_subject_id ON gdpr_data_requests(subject_id);
CREATE INDEX idx_gdpr_requests_status ON gdpr_data_requests(status);
CREATE INDEX idx_gdpr_requests_type ON gdpr_data_requests(request_type);

-- GDPR Data Processing Records
CREATE TABLE IF NOT EXISTS gdpr_processing_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  data_category VARCHAR(100) NOT NULL, -- PERSONAL, FINANCIAL, HEALTH, etc.
  processing_purpose TEXT NOT NULL,
  legal_basis VARCHAR(100), -- CONSENT, CONTRACT, LEGAL_OBLIGATION, etc.
  data_subjects VARCHAR(100), -- CUSTOMERS, EMPLOYEES, PARTNERS
  recipients TEXT[], -- Who receives the data
  retention_period VARCHAR(100),
  cross_border_transfers BOOLEAN DEFAULT false,
  transfer_safeguards TEXT,
  security_measures TEXT[],
  dpo_contact VARCHAR(255), -- Data Protection Officer
  last_reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_gdpr_processing_tenant_id ON gdpr_processing_records(tenant_id);

-- Encryption Key Metadata (for key rotation tracking)
CREATE TABLE IF NOT EXISTS encryption_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_id VARCHAR(255) UNIQUE NOT NULL,
  key_version INTEGER DEFAULT 1,
  algorithm VARCHAR(50) NOT NULL,
  key_type VARCHAR(50) NOT NULL, -- MASTER, DATA, BACKUP
  status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, ROTATING, DEPRECATED, REVOKED
  created_at TIMESTAMP DEFAULT NOW(),
  rotated_at TIMESTAMP,
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  revoked_by VARCHAR(255),
  revocation_reason TEXT
);

CREATE INDEX idx_encryption_keys_key_id ON encryption_keys(key_id);
CREATE INDEX idx_encryption_keys_status ON encryption_keys(status);

-- Data Retention Policies
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  table_name VARCHAR(255) NOT NULL,
  retention_days INTEGER NOT NULL,
  auto_delete BOOLEAN DEFAULT false,
  archive_before_delete BOOLEAN DEFAULT true,
  compliance_requirement VARCHAR(100), -- GDPR, HIPAA, SOX, etc.
  last_cleanup_at TIMESTAMP,
  next_cleanup_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_retention_policies_tenant_id ON data_retention_policies(tenant_id);
CREATE INDEX idx_retention_policies_next_cleanup ON data_retention_policies(next_cleanup_at);

-- Consent Management (GDPR)
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  user_email VARCHAR(255),
  consent_type VARCHAR(100) NOT NULL, -- MARKETING, ANALYTICS, DATA_PROCESSING
  consent_version VARCHAR(50),
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMP,
  revoked_at TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  consent_text TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_consents_tenant_id ON user_consents(tenant_id);
CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_type ON user_consents(consent_type);

-- Updated_at triggers for new tables
CREATE TRIGGER update_data_residency_updated_at BEFORE UPDATE ON tenant_data_residency
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gdpr_requests_updated_at BEFORE UPDATE ON gdpr_data_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gdpr_processing_updated_at BEFORE UPDATE ON gdpr_processing_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_retention_policies_updated_at BEFORE UPDATE ON data_retention_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consents_updated_at BEFORE UPDATE ON user_consents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default data retention policies
INSERT INTO data_retention_policies (tenant_id, table_name, retention_days, auto_delete, compliance_requirement)
SELECT
  t.id,
  'audit_logs',
  365,
  true,
  'GDPR'
FROM tenants t
ON CONFLICT DO NOTHING;

INSERT INTO data_retention_policies (tenant_id, table_name, retention_days, auto_delete, compliance_requirement)
SELECT
  t.id,
  'sod_violations',
  2555, -- 7 years
  false,
  'SAP_AUDIT'
FROM tenants t
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system actions';
COMMENT ON TABLE tenant_data_residency IS 'Data residency and compliance requirements per tenant';
COMMENT ON TABLE gdpr_data_requests IS 'GDPR data subject requests (right to be forgotten, access, etc.)';
COMMENT ON TABLE gdpr_processing_records IS 'GDPR Article 30 - Records of processing activities';
COMMENT ON TABLE encryption_keys IS 'Encryption key metadata for key rotation and management';
COMMENT ON TABLE data_retention_policies IS 'Automated data retention and cleanup policies';
COMMENT ON TABLE user_consents IS 'User consent management for GDPR compliance';
