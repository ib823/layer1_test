-- Migration 004: Add Invoice Matching Tables
-- Date: 2025-10-06
-- Description: Tables for three-way match results, fraud alerts, and vendor patterns

-- Invoice matching analysis runs
CREATE TABLE invoice_matching_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_id VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL, -- 'RUNNING', 'COMPLETED', 'FAILED'
  config JSONB NOT NULL, -- MatchingConfig

  -- Statistics
  total_invoices INTEGER DEFAULT 0,
  fully_matched INTEGER DEFAULT 0,
  partially_matched INTEGER DEFAULT 0,
  not_matched INTEGER DEFAULT 0,
  tolerance_exceeded INTEGER DEFAULT 0,
  blocked INTEGER DEFAULT 0,
  fraud_alerts_count INTEGER DEFAULT 0,
  total_discrepancies INTEGER DEFAULT 0,
  total_amount_processed DECIMAL(15,2) DEFAULT 0,
  total_amount_blocked DECIMAL(15,2) DEFAULT 0,

  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Three-way match results
CREATE TABLE invoice_match_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES invoice_matching_runs(id) ON DELETE CASCADE,
  match_id VARCHAR(255) NOT NULL UNIQUE,

  -- Document references
  po_number VARCHAR(255),
  po_item VARCHAR(50),
  gr_number VARCHAR(255),
  gr_item VARCHAR(50),
  invoice_number VARCHAR(255) NOT NULL,
  invoice_item VARCHAR(50),
  vendor_id VARCHAR(255),
  vendor_name VARCHAR(255),

  -- Match status
  match_status VARCHAR(50) NOT NULL, -- 'FULLY_MATCHED', 'PARTIALLY_MATCHED', etc.
  match_type VARCHAR(50) NOT NULL, -- 'THREE_WAY', 'TWO_WAY', 'NO_MATCH'
  risk_score INTEGER NOT NULL, -- 0-100
  approval_required BOOLEAN DEFAULT false,

  -- Amounts
  invoice_amount DECIMAL(15,2),
  po_amount DECIMAL(15,2),
  variance_amount DECIMAL(15,2),
  variance_percentage DECIMAL(5,2),

  matched_at TIMESTAMP DEFAULT NOW(),
  matched_by VARCHAR(255),
  approved_at TIMESTAMP,
  approved_by VARCHAR(255),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Match discrepancies
CREATE TABLE invoice_match_discrepancies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES invoice_match_results(id) ON DELETE CASCADE,

  discrepancy_type VARCHAR(50) NOT NULL, -- 'QUANTITY', 'PRICE', 'TAX', 'VENDOR', etc.
  severity VARCHAR(50) NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  field VARCHAR(100) NOT NULL,
  expected_value TEXT,
  actual_value TEXT,
  variance DECIMAL(15,4),
  description TEXT NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Tolerance violations
CREATE TABLE invoice_tolerance_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES invoice_match_results(id) ON DELETE CASCADE,

  rule_id VARCHAR(100) NOT NULL,
  rule_name VARCHAR(255) NOT NULL,
  field VARCHAR(50) NOT NULL, -- 'PRICE', 'QUANTITY', 'TAX', 'TOTAL'
  threshold DECIMAL(15,4) NOT NULL,
  actual_variance DECIMAL(15,4) NOT NULL,
  exceeded_by DECIMAL(15,4) NOT NULL,
  requires_approval BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Fraud alerts
CREATE TABLE invoice_fraud_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  match_id UUID REFERENCES invoice_match_results(id) ON DELETE CASCADE,

  alert_id VARCHAR(255) NOT NULL UNIQUE,
  pattern VARCHAR(100) NOT NULL, -- 'DUPLICATE_INVOICE', 'SPLIT_INVOICE', etc.
  severity VARCHAR(50) NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  confidence INTEGER NOT NULL, -- 0-100
  description TEXT NOT NULL,
  evidence JSONB NOT NULL,

  status VARCHAR(50) DEFAULT 'OPEN', -- 'OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'
  investigated_by VARCHAR(255),
  investigated_at TIMESTAMP,
  resolution_notes TEXT,

  triggered_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vendor payment patterns
CREATE TABLE vendor_payment_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  vendor_id VARCHAR(255) NOT NULL,
  vendor_name VARCHAR(255) NOT NULL,

  -- Statistics
  total_invoices INTEGER DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  average_invoice_amount DECIMAL(15,2) DEFAULT 0,
  average_payment_days DECIMAL(10,2) DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  fraud_alert_count INTEGER DEFAULT 0,
  risk_score INTEGER DEFAULT 0, -- 0-100

  first_invoice_date TIMESTAMP,
  last_invoice_date TIMESTAMP,

  -- Pattern metadata
  analysis_period_start TIMESTAMP,
  analysis_period_end TIMESTAMP,
  last_analyzed_at TIMESTAMP DEFAULT NOW(),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id, vendor_id)
);

-- Indexes for performance
CREATE INDEX idx_matching_runs_tenant_id ON invoice_matching_runs(tenant_id);
CREATE INDEX idx_matching_runs_status ON invoice_matching_runs(status);
CREATE INDEX idx_matching_runs_run_id ON invoice_matching_runs(run_id);

CREATE INDEX idx_match_results_tenant_id ON invoice_match_results(tenant_id);
CREATE INDEX idx_match_results_run_id ON invoice_match_results(run_id);
CREATE INDEX idx_match_results_invoice_number ON invoice_match_results(invoice_number);
CREATE INDEX idx_match_results_po_number ON invoice_match_results(po_number);
CREATE INDEX idx_match_results_vendor_id ON invoice_match_results(vendor_id);
CREATE INDEX idx_match_results_match_status ON invoice_match_results(match_status);
CREATE INDEX idx_match_results_risk_score ON invoice_match_results(risk_score DESC);
CREATE INDEX idx_match_results_matched_at ON invoice_match_results(matched_at DESC);

CREATE INDEX idx_discrepancies_match_id ON invoice_match_discrepancies(match_id);
CREATE INDEX idx_discrepancies_type ON invoice_match_discrepancies(discrepancy_type);
CREATE INDEX idx_discrepancies_severity ON invoice_match_discrepancies(severity);

CREATE INDEX idx_violations_match_id ON invoice_tolerance_violations(match_id);
CREATE INDEX idx_violations_rule_id ON invoice_tolerance_violations(rule_id);

CREATE INDEX idx_fraud_alerts_tenant_id ON invoice_fraud_alerts(tenant_id);
CREATE INDEX idx_fraud_alerts_match_id ON invoice_fraud_alerts(match_id);
CREATE INDEX idx_fraud_alerts_pattern ON invoice_fraud_alerts(pattern);
CREATE INDEX idx_fraud_alerts_severity ON invoice_fraud_alerts(severity);
CREATE INDEX idx_fraud_alerts_status ON invoice_fraud_alerts(status);
CREATE INDEX idx_fraud_alerts_triggered_at ON invoice_fraud_alerts(triggered_at DESC);

CREATE INDEX idx_vendor_patterns_tenant_id ON vendor_payment_patterns(tenant_id);
CREATE INDEX idx_vendor_patterns_vendor_id ON vendor_payment_patterns(vendor_id);
CREATE INDEX idx_vendor_patterns_risk_score ON vendor_payment_patterns(risk_score DESC);

-- Composite indexes for common queries
CREATE INDEX idx_match_results_tenant_status ON invoice_match_results(tenant_id, match_status);
CREATE INDEX idx_fraud_alerts_tenant_status ON invoice_fraud_alerts(tenant_id, status);

-- Updated_at triggers
CREATE TRIGGER update_match_results_updated_at BEFORE UPDATE ON invoice_match_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fraud_alerts_updated_at BEFORE UPDATE ON invoice_fraud_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_patterns_updated_at BEFORE UPDATE ON vendor_payment_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE invoice_matching_runs IS 'Tracks invoice matching analysis runs with statistics';
COMMENT ON TABLE invoice_match_results IS 'Stores three-way match results for each invoice';
COMMENT ON TABLE invoice_match_discrepancies IS 'Individual discrepancies found during matching';
COMMENT ON TABLE invoice_tolerance_violations IS 'Tolerance rule violations (price, quantity, tax)';
COMMENT ON TABLE invoice_fraud_alerts IS 'Fraud detection alerts with investigation tracking';
COMMENT ON TABLE vendor_payment_patterns IS 'Vendor payment behavior analysis for risk assessment';
