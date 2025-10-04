-- Performance Optimization: Composite Indexes
-- Migration 003: Add composite indexes for common query patterns

-- Composite indexes for violation queries (most common filter combinations)
CREATE INDEX IF NOT EXISTS idx_sod_violations_tenant_status
  ON sod_violations(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_sod_violations_tenant_risk
  ON sod_violations(tenant_id, risk_level);

CREATE INDEX IF NOT EXISTS idx_sod_violations_tenant_user
  ON sod_violations(tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_sod_violations_tenant_detected
  ON sod_violations(tenant_id, detected_at DESC);

-- Composite index for filtering by tenant + status + risk level (very common)
CREATE INDEX IF NOT EXISTS idx_sod_violations_tenant_status_risk
  ON sod_violations(tenant_id, status, risk_level);

-- Analysis run lookups
CREATE INDEX IF NOT EXISTS idx_sod_analysis_tenant_status
  ON sod_analysis_runs(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_sod_analysis_tenant_started
  ON sod_analysis_runs(tenant_id, started_at DESC);

-- Module activation lookups (for capability checks)
CREATE INDEX IF NOT EXISTS idx_module_activations_tenant_active
  ON tenant_module_activations(tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_module_activations_tenant_module
  ON tenant_module_activations(tenant_id, module_name)
  WHERE is_active = true;

-- Tenant status lookups (for listing/filtering)
CREATE INDEX IF NOT EXISTS idx_tenants_status
  ON tenants(status);

CREATE INDEX IF NOT EXISTS idx_tenants_created
  ON tenants(created_at DESC);

-- Discovery history lookups (for audit trail)
CREATE INDEX IF NOT EXISTS idx_discovery_tenant_discovered
  ON service_discovery_history(tenant_id, discovered_at DESC);

-- Covering index for violation list queries (includes commonly selected columns)
CREATE INDEX IF NOT EXISTS idx_sod_violations_list
  ON sod_violations(tenant_id, status, risk_level)
  INCLUDE (user_id, user_name, conflict_type, detected_at);

-- Partial index for open violations only (faster for active issues)
CREATE INDEX IF NOT EXISTS idx_sod_violations_open
  ON sod_violations(tenant_id, risk_level, detected_at DESC)
  WHERE status = 'OPEN';

-- Partial index for running analysis (for status checks)
CREATE INDEX IF NOT EXISTS idx_sod_analysis_running
  ON sod_analysis_runs(tenant_id, started_at DESC)
  WHERE status = 'RUNNING';

COMMENT ON INDEX idx_sod_violations_tenant_status IS 'Composite index for tenant + status filters';
COMMENT ON INDEX idx_sod_violations_tenant_risk IS 'Composite index for tenant + risk level filters';
COMMENT ON INDEX idx_sod_violations_list IS 'Covering index for violation list queries';
COMMENT ON INDEX idx_sod_violations_open IS 'Partial index for open violations (most common query)';
