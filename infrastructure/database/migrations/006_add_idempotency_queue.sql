-- Migration 006: Add Idempotency, Queue, and Event Sourcing Tables
-- Date: 2025-10-08
-- Description: Production-grade resilience infrastructure for LHDN e-invoicing
-- Phase: 5 (Idempotency & Resilience Foundation)

-- ============================================================================
-- IDEMPOTENCY: Prevent duplicate submissions
-- ============================================================================

CREATE TABLE lhdn_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Idempotency Key (canonical payload hash)
  idempotency_key VARCHAR(64) NOT NULL, -- SHA-256 hash (hex)

  -- Source Document References
  sap_billing_document VARCHAR(255) NOT NULL,
  sap_company_code VARCHAR(4) NOT NULL,

  -- Canonical Payload (for debugging)
  canonical_payload JSONB NOT NULL,

  -- Result Reference
  invoice_id UUID REFERENCES lhdn_einvoices(id) ON DELETE SET NULL,

  -- Status
  status VARCHAR(50) NOT NULL, -- 'PROCESSING', 'SUCCESS', 'FAILED'

  -- Response (cached for idempotent replay)
  response_data JSONB,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL, -- TTL for cleanup (7 days)

  -- Constraints
  CONSTRAINT unique_idempotency_key UNIQUE (tenant_id, idempotency_key),
  CONSTRAINT check_status CHECK (status IN ('PROCESSING', 'SUCCESS', 'FAILED'))
);

-- Indexes
CREATE INDEX idx_idem_keys_tenant ON lhdn_idempotency_keys(tenant_id);
CREATE INDEX idx_idem_keys_expires ON lhdn_idempotency_keys(expires_at) WHERE status = 'SUCCESS';
CREATE INDEX idx_idem_keys_sap_doc ON lhdn_idempotency_keys(tenant_id, sap_billing_document);

-- TTL Cleanup Function (called by cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM lhdn_idempotency_keys
  WHERE expires_at < NOW() AND status = 'SUCCESS';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE lhdn_idempotency_keys IS 'Idempotency keys for deduplication (7-day retention)';
COMMENT ON COLUMN lhdn_idempotency_keys.idempotency_key IS 'SHA-256 hash of canonical payload';
COMMENT ON COLUMN lhdn_idempotency_keys.canonical_payload IS 'Deterministic JSON payload for debugging';

-- ============================================================================
-- SUBMISSION QUEUE: Async processing with retry
-- ============================================================================

CREATE TABLE lhdn_submission_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Job Metadata
  job_type VARCHAR(50) NOT NULL, -- 'SUBMIT_INVOICE', 'QUERY_STATUS', 'CANCEL_INVOICE', 'SUBMIT_CN', 'SUBMIT_DN'
  priority INTEGER NOT NULL DEFAULT 5, -- 1=highest, 10=lowest

  -- Payload
  payload JSONB NOT NULL,

  -- Idempotency
  idempotency_key VARCHAR(64),

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DLQ'

  -- Retry Logic
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMP,

  -- Error Tracking
  last_error TEXT,
  last_error_at TIMESTAMP,

  -- References
  invoice_id UUID REFERENCES lhdn_einvoices(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Constraints
  CONSTRAINT check_priority CHECK (priority BETWEEN 1 AND 10),
  CONSTRAINT check_attempts CHECK (attempt_count <= max_attempts),
  CONSTRAINT check_status CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DLQ'))
);

-- Indexes for queue processing
CREATE INDEX idx_queue_tenant ON lhdn_submission_queue(tenant_id);
CREATE INDEX idx_queue_status_priority ON lhdn_submission_queue(status, priority, next_retry_at) WHERE status = 'PENDING';
CREATE INDEX idx_queue_processing ON lhdn_submission_queue(status, started_at) WHERE status = 'PROCESSING';
CREATE INDEX idx_queue_job_type ON lhdn_submission_queue(job_type);
CREATE INDEX idx_queue_invoice ON lhdn_submission_queue(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX idx_queue_idem_key ON lhdn_submission_queue(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Update trigger
CREATE TRIGGER lhdn_queue_updated_at
  BEFORE UPDATE ON lhdn_submission_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_lhdn_updated_at();

COMMENT ON TABLE lhdn_submission_queue IS 'Job queue for async invoice processing with retry';
COMMENT ON COLUMN lhdn_submission_queue.priority IS '1=highest priority (urgent), 10=lowest (batch)';
COMMENT ON COLUMN lhdn_submission_queue.next_retry_at IS 'Next retry timestamp (exponential backoff)';

-- ============================================================================
-- DEAD-LETTER QUEUE: Failed jobs for manual intervention
-- ============================================================================

CREATE TABLE lhdn_dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Original Queue Job
  original_job_id UUID NOT NULL,
  job_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,

  -- Failure Details
  failure_reason TEXT NOT NULL,
  failure_count INTEGER NOT NULL,
  first_failed_at TIMESTAMP NOT NULL,
  last_failed_at TIMESTAMP NOT NULL,

  -- Error Classification
  error_category VARCHAR(50), -- 'VALIDATION', 'MAPPING', 'TRANSPORT', 'LHDN_REJECT', 'SAP_ERROR', 'UNKNOWN'
  error_code VARCHAR(50),

  -- Recovery Status
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'INVESTIGATING', 'RESOLVED', 'ABANDONED'
  assigned_to VARCHAR(255),
  resolution_notes TEXT,

  -- References
  invoice_id UUID REFERENCES lhdn_einvoices(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,

  -- Constraints
  CONSTRAINT check_dlq_status CHECK (status IN ('PENDING', 'INVESTIGATING', 'RESOLVED', 'ABANDONED'))
);

-- Indexes
CREATE INDEX idx_dlq_tenant ON lhdn_dead_letter_queue(tenant_id);
CREATE INDEX idx_dlq_status ON lhdn_dead_letter_queue(status) WHERE status IN ('PENDING', 'INVESTIGATING');
CREATE INDEX idx_dlq_category ON lhdn_dead_letter_queue(error_category);
CREATE INDEX idx_dlq_created ON lhdn_dead_letter_queue(created_at DESC);
CREATE INDEX idx_dlq_invoice ON lhdn_dead_letter_queue(invoice_id) WHERE invoice_id IS NOT NULL;

COMMENT ON TABLE lhdn_dead_letter_queue IS 'Failed jobs requiring manual intervention';
COMMENT ON COLUMN lhdn_dead_letter_queue.error_category IS 'Classification for Exception Inbox UI';

-- ============================================================================
-- EVENT SOURCING: Immutable state transition log
-- ============================================================================

CREATE TABLE lhdn_doc_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES lhdn_einvoices(id) ON DELETE CASCADE,

  -- Event Metadata
  event_type VARCHAR(50) NOT NULL, -- 'CREATED', 'VALIDATED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'CANCELLED', etc.
  event_version INTEGER NOT NULL DEFAULT 1, -- Event schema version

  -- State Transition
  previous_state VARCHAR(50),
  new_state VARCHAR(50) NOT NULL,

  -- Event Data
  event_data JSONB NOT NULL,

  -- Actor & Context
  actor VARCHAR(255) NOT NULL, -- User ID or 'system'
  actor_type VARCHAR(50) NOT NULL DEFAULT 'USER', -- 'USER', 'SYSTEM', 'API', 'CRON'
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Request Context
  request_id VARCHAR(255),
  correlation_id VARCHAR(255), -- For distributed tracing

  -- Timestamp (immutable)
  occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_event_type CHECK (event_type IN (
    'CREATED', 'VALIDATED', 'MAPPING_FAILED', 'VALIDATION_FAILED',
    'QUEUED', 'SUBMITTED', 'SUBMISSION_FAILED',
    'ACCEPTED', 'REJECTED', 'CANCELLED',
    'CN_ISSUED', 'DN_ISSUED', 'QR_GENERATED', 'NOTIFIED'
  ))
);

-- Indexes for event queries
CREATE INDEX idx_events_tenant ON lhdn_doc_events(tenant_id);
CREATE INDEX idx_events_invoice ON lhdn_doc_events(invoice_id);
CREATE INDEX idx_events_type ON lhdn_doc_events(event_type);
CREATE INDEX idx_events_occurred ON lhdn_doc_events(occurred_at DESC);
CREATE INDEX idx_events_invoice_occurred ON lhdn_doc_events(invoice_id, occurred_at DESC);
CREATE INDEX idx_events_correlation ON lhdn_doc_events(correlation_id) WHERE correlation_id IS NOT NULL;

-- Prevent UPDATE/DELETE on events (immutable)
CREATE OR REPLACE FUNCTION prevent_event_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Events are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_events_update
  BEFORE UPDATE ON lhdn_doc_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_event_modification();

CREATE TRIGGER prevent_events_delete
  BEFORE DELETE ON lhdn_doc_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_event_modification();

COMMENT ON TABLE lhdn_doc_events IS 'Immutable event sourcing log for invoice state transitions';
COMMENT ON COLUMN lhdn_doc_events.correlation_id IS 'For distributed tracing (OpenTelemetry trace ID)';
COMMENT ON TRIGGER prevent_events_update ON lhdn_doc_events IS 'Enforces event immutability';

-- ============================================================================
-- CIRCUIT BREAKER STATE: Track service health
-- ============================================================================

CREATE TABLE lhdn_circuit_breaker_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Service Identifier
  service_name VARCHAR(100) NOT NULL UNIQUE, -- 'LHDN_API', 'SAP_ODATA', 'ARIBA_API', 'SFSF_API'

  -- Circuit State
  state VARCHAR(20) NOT NULL DEFAULT 'CLOSED', -- 'CLOSED', 'OPEN', 'HALF_OPEN'

  -- Failure Tracking
  failure_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMP,
  last_success_at TIMESTAMP,

  -- Thresholds
  failure_threshold INTEGER NOT NULL DEFAULT 5, -- Open after 5 failures
  success_threshold INTEGER NOT NULL DEFAULT 2, -- Close after 2 successes in half-open
  timeout_ms INTEGER NOT NULL DEFAULT 30000, -- Open for 30s before half-open

  -- State Change
  opened_at TIMESTAMP,
  half_opened_at TIMESTAMP,
  closed_at TIMESTAMP,

  -- Timestamps
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_cb_state CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN'))
);

-- Index
CREATE INDEX idx_cb_service ON lhdn_circuit_breaker_state(service_name);

-- Update trigger
CREATE OR REPLACE FUNCTION update_circuit_breaker_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cb_updated_at
  BEFORE UPDATE ON lhdn_circuit_breaker_state
  FOR EACH ROW
  EXECUTE FUNCTION update_circuit_breaker_timestamp();

COMMENT ON TABLE lhdn_circuit_breaker_state IS 'Circuit breaker state for external service resilience';
COMMENT ON COLUMN lhdn_circuit_breaker_state.state IS 'CLOSED=healthy, OPEN=failing, HALF_OPEN=testing recovery';

-- Seed initial circuit breaker states
INSERT INTO lhdn_circuit_breaker_state (service_name) VALUES
  ('LHDN_API'),
  ('SAP_ODATA'),
  ('ARIBA_API'),
  ('SFSF_API')
ON CONFLICT (service_name) DO NOTHING;

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View: Queue Summary by Status
CREATE OR REPLACE VIEW lhdn_queue_summary AS
SELECT
  tenant_id,
  job_type,
  status,
  COUNT(*) as job_count,
  AVG(attempt_count) as avg_attempts,
  MIN(created_at) as oldest_job,
  MAX(created_at) as newest_job
FROM lhdn_submission_queue
GROUP BY tenant_id, job_type, status;

COMMENT ON VIEW lhdn_queue_summary IS 'Summary of queue jobs by tenant, type, and status';

-- View: DLQ by Error Category
CREATE OR REPLACE VIEW lhdn_dlq_summary AS
SELECT
  tenant_id,
  error_category,
  status,
  COUNT(*) as error_count,
  MIN(first_failed_at) as oldest_error,
  MAX(last_failed_at) as latest_error
FROM lhdn_dead_letter_queue
GROUP BY tenant_id, error_category, status;

COMMENT ON VIEW lhdn_dlq_summary IS 'Summary of dead-letter queue by error category';

-- View: Recent Events by Invoice
CREATE OR REPLACE VIEW lhdn_recent_events AS
SELECT
  e.id,
  e.tenant_id,
  e.invoice_id,
  i.invoice_number,
  e.event_type,
  e.new_state,
  e.actor,
  e.occurred_at,
  e.event_data
FROM lhdn_doc_events e
JOIN lhdn_einvoices i ON e.invoice_id = i.id
ORDER BY e.occurred_at DESC
LIMIT 1000;

COMMENT ON VIEW lhdn_recent_events IS 'Last 1000 events across all invoices (for Audit Explorer)';

-- ============================================================================
-- ROLLBACK SCRIPT (for migration down)
-- ============================================================================

-- Save this as 006_rollback.sql
/*
DROP VIEW IF EXISTS lhdn_recent_events;
DROP VIEW IF EXISTS lhdn_dlq_summary;
DROP VIEW IF EXISTS lhdn_queue_summary;

DROP TABLE IF EXISTS lhdn_circuit_breaker_state CASCADE;
DROP TABLE IF EXISTS lhdn_doc_events CASCADE;
DROP TABLE IF EXISTS lhdn_dead_letter_queue CASCADE;
DROP TABLE IF EXISTS lhdn_submission_queue CASCADE;
DROP TABLE IF EXISTS lhdn_idempotency_keys CASCADE;

DROP FUNCTION IF EXISTS cleanup_expired_idempotency_keys();
DROP FUNCTION IF EXISTS prevent_event_modification();
DROP FUNCTION IF EXISTS update_circuit_breaker_timestamp();
*/
