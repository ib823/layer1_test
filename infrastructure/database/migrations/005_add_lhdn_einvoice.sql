-- Migration 005: Add LHDN e-Invoice Tables
-- Date: 2025-10-08
-- Description: Tables for Malaysia LHDN MyInvois e-invoicing system

-- LHDN e-Invoice documents
CREATE TABLE lhdn_einvoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Invoice Identifiers
  invoice_number VARCHAR(255) NOT NULL,
  document_type VARCHAR(2) NOT NULL, -- '01'=Invoice, '02'=Credit Note, etc.
  status VARCHAR(50) NOT NULL, -- 'DRAFT', 'VALIDATED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'CANCELLED'

  -- Dates
  invoice_date TIMESTAMP NOT NULL,
  due_date TIMESTAMP,

  -- Currency
  currency VARCHAR(3) NOT NULL DEFAULT 'MYR',

  -- Parties (stored as JSONB)
  supplier JSONB NOT NULL,
  buyer JSONB NOT NULL,

  -- Line Items (array of line items)
  line_items JSONB NOT NULL,

  -- Amounts
  subtotal_amount DECIMAL(15,2) NOT NULL,
  total_tax_amount DECIMAL(15,2) NOT NULL,
  total_discount_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,

  -- Payment
  payment_mode VARCHAR(50),
  payment_terms VARCHAR(255),

  -- SAP References
  sap_billing_document VARCHAR(255) NOT NULL,
  sap_company_code VARCHAR(4) NOT NULL,
  purchase_order_ref VARCHAR(255),

  -- LHDN Response Data
  submission_uid VARCHAR(255), -- LHDN submission UID
  lhdn_reference_number VARCHAR(255), -- LHDN long ID
  qr_code_data TEXT, -- Base64 encoded QR code

  -- Status Timestamps
  submitted_at TIMESTAMP,
  accepted_at TIMESTAMP,
  rejected_at TIMESTAMP,

  -- Rejection Details
  rejection_reasons JSONB,

  -- Validation
  validated_at TIMESTAMP,
  validation_errors JSONB,
  validation_warnings JSONB,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,

  -- Constraints
  CONSTRAINT unique_invoice_per_tenant UNIQUE (tenant_id, invoice_number),
  CONSTRAINT check_document_type CHECK (document_type IN ('01', '02', '03', '04', '11')),
  CONSTRAINT check_status CHECK (status IN ('DRAFT', 'VALIDATED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
  CONSTRAINT check_currency CHECK (currency = 'MYR'),
  CONSTRAINT check_amounts CHECK (total_amount >= 0 AND subtotal_amount >= 0 AND total_tax_amount >= 0)
);

-- LHDN audit log (immutable log of all actions)
CREATE TABLE lhdn_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES lhdn_einvoices(id) ON DELETE SET NULL,

  -- Action details
  action VARCHAR(50) NOT NULL, -- 'CREATED', 'VALIDATED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'CANCELLED'
  actor VARCHAR(255) NOT NULL, -- User ID or system

  -- Request/Response
  request_data JSONB,
  response_data JSONB,

  -- Status
  success BOOLEAN NOT NULL,
  error_message TEXT,

  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_id VARCHAR(255),

  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

-- LHDN tenant configuration
CREATE TABLE lhdn_tenant_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- LHDN MyInvois API Credentials (encrypted)
  client_id_encrypted TEXT NOT NULL,
  client_secret_encrypted TEXT NOT NULL,
  api_base_url VARCHAR(255) NOT NULL,
  environment VARCHAR(20) NOT NULL, -- 'SANDBOX' or 'PRODUCTION'

  -- Company Details
  company_tin VARCHAR(20) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  company_address JSONB NOT NULL,
  company_contact JSONB,

  -- Invoice Settings
  invoice_prefix VARCHAR(20),
  auto_submit BOOLEAN DEFAULT false,
  validate_before_post BOOLEAN DEFAULT true,
  generate_qr_code BOOLEAN DEFAULT true,

  -- Notification
  notification_emails TEXT[],
  webhook_url TEXT,

  -- Tax Code Mapping (SAP Tax Code → LHDN Tax Type)
  tax_code_mapping JSONB NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_tenant_config UNIQUE (tenant_id),
  CONSTRAINT check_environment CHECK (environment IN ('SANDBOX', 'PRODUCTION'))
);

-- Indexes for performance
CREATE INDEX idx_lhdn_einvoices_tenant ON lhdn_einvoices(tenant_id);
CREATE INDEX idx_lhdn_einvoices_status ON lhdn_einvoices(status);
CREATE INDEX idx_lhdn_einvoices_invoice_date ON lhdn_einvoices(invoice_date DESC);
CREATE INDEX idx_lhdn_einvoices_sap_doc ON lhdn_einvoices(sap_billing_document);
CREATE INDEX idx_lhdn_einvoices_submission_uid ON lhdn_einvoices(submission_uid) WHERE submission_uid IS NOT NULL;
CREATE INDEX idx_lhdn_einvoices_lhdn_ref ON lhdn_einvoices(lhdn_reference_number) WHERE lhdn_reference_number IS NOT NULL;

CREATE INDEX idx_lhdn_audit_tenant ON lhdn_audit_log(tenant_id);
CREATE INDEX idx_lhdn_audit_invoice ON lhdn_audit_log(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX idx_lhdn_audit_action ON lhdn_audit_log(action);
CREATE INDEX idx_lhdn_audit_created ON lhdn_audit_log(created_at DESC);

CREATE INDEX idx_lhdn_config_tenant ON lhdn_tenant_config(tenant_id);

-- Composite indexes for common queries
CREATE INDEX idx_lhdn_einvoices_tenant_status_date ON lhdn_einvoices(tenant_id, status, invoice_date DESC);
CREATE INDEX idx_lhdn_einvoices_tenant_doc_type ON lhdn_einvoices(tenant_id, document_type);

-- Update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_lhdn_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lhdn_einvoices_updated_at
  BEFORE UPDATE ON lhdn_einvoices
  FOR EACH ROW
  EXECUTE FUNCTION update_lhdn_updated_at();

CREATE TRIGGER lhdn_config_updated_at
  BEFORE UPDATE ON lhdn_tenant_config
  FOR EACH ROW
  EXECUTE FUNCTION update_lhdn_updated_at();

-- Comments for documentation
COMMENT ON TABLE lhdn_einvoices IS 'Malaysia LHDN MyInvois e-invoice documents';
COMMENT ON TABLE lhdn_audit_log IS 'Immutable audit trail of all LHDN e-invoice actions';
COMMENT ON TABLE lhdn_tenant_config IS 'Tenant-specific LHDN MyInvois configuration';

COMMENT ON COLUMN lhdn_einvoices.document_type IS '01=Invoice, 02=Credit Note, 03=Debit Note, 04=Refund Note, 11=Self-Billed Invoice';
COMMENT ON COLUMN lhdn_einvoices.submission_uid IS 'LHDN-assigned submission UID (short ID)';
COMMENT ON COLUMN lhdn_einvoices.lhdn_reference_number IS 'LHDN-assigned long ID for accepted invoices';
COMMENT ON COLUMN lhdn_einvoices.qr_code_data IS 'Base64-encoded QR code for invoice validation';

COMMENT ON COLUMN lhdn_tenant_config.tax_code_mapping IS 'Maps SAP tax codes to LHDN tax types (SR, ZP, TX, E, DS)';
COMMENT ON COLUMN lhdn_tenant_config.environment IS 'SANDBOX for testing, PRODUCTION for live submission';
