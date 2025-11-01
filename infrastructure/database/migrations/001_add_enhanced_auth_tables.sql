-- Enhanced Authentication System Migration
-- Adds support for:
-- - Multi-factor authentication (TOTP, Passkey/WebAuthn)
-- - Session management with max concurrent sessions
-- - Device fingerprinting and trusted devices
-- - Login attempt tracking and risk analysis
-- - Email confirmation for new logins

-- =============================================================================
-- User MFA Configuration
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_mfa_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- References users(id) - adjust if user table exists
  mfa_enabled BOOLEAN DEFAULT false,

  -- OTP/TOTP Configuration
  totp_secret VARCHAR(255), -- Encrypted TOTP secret
  totp_enabled BOOLEAN DEFAULT false,
  totp_backup_codes TEXT[], -- Array of encrypted one-time backup codes
  totp_setup_at TIMESTAMP,
  totp_last_used_at TIMESTAMP,

  -- Passkey/WebAuthn Configuration
  passkey_enabled BOOLEAN DEFAULT false,
  passkey_setup_at TIMESTAMP,

  -- User Preference (when both MFA methods are enabled)
  preferred_mfa_method VARCHAR(20), -- 'totp' or 'passkey'

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Index for quick user MFA lookup
CREATE INDEX idx_user_mfa_user ON user_mfa_config(user_id);
CREATE INDEX idx_user_mfa_enabled ON user_mfa_config(user_id, mfa_enabled);

-- =============================================================================
-- WebAuthn Credentials (Passkeys)
-- =============================================================================
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- References users(id)

  -- WebAuthn Credential Data
  credential_id TEXT NOT NULL UNIQUE, -- Base64-encoded credential ID
  credential_public_key TEXT NOT NULL, -- Base64-encoded public key
  counter BIGINT DEFAULT 0, -- Signature counter (prevents replay attacks)
  transports TEXT[], -- ['usb', 'nfc', 'ble', 'internal', 'hybrid']

  -- Device Information
  device_name VARCHAR(255), -- User-friendly name (e.g., "iPhone 15", "YubiKey 5")
  device_type VARCHAR(50), -- 'platform' or 'cross-platform'

  -- WebAuthn Metadata
  aaguid TEXT, -- Authenticator Attestation GUID
  attestation_format VARCHAR(50),

  -- Usage Tracking
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  FOREIGN KEY (user_id) REFERENCES user_mfa_config(user_id) ON DELETE CASCADE
);

-- Indexes for credential lookup
CREATE INDEX idx_webauthn_user ON webauthn_credentials(user_id);
CREATE INDEX idx_webauthn_credential ON webauthn_credentials(credential_id);
CREATE INDEX idx_webauthn_last_used ON webauthn_credentials(user_id, last_used_at DESC);

-- =============================================================================
-- User Sessions (Enhanced)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- References users(id)
  session_token VARCHAR(255) NOT NULL UNIQUE,

  -- Device Fingerprint & Info
  device_fingerprint VARCHAR(255), -- Hashed fingerprint
  device_name VARCHAR(255), -- Parsed from user agent
  device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
  browser VARCHAR(100), -- e.g., "Chrome 120.0"
  os VARCHAR(100), -- e.g., "macOS 14.2"

  -- Location Information
  ip_address INET NOT NULL,
  country VARCHAR(2), -- ISO 3166-1 alpha-2
  city VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Security Flags
  is_trusted_device BOOLEAN DEFAULT false,
  mfa_verified BOOLEAN DEFAULT false,
  risk_score INTEGER DEFAULT 0, -- 0-100

  -- Session Lifecycle
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  revocation_reason VARCHAR(100), -- 'manual', 'password_change', 'max_sessions', 'security_event'

  -- User Agent (full string for audit)
  user_agent TEXT
);

-- Indexes for session management
CREATE INDEX idx_session_user ON user_sessions(user_id);
CREATE INDEX idx_session_token ON user_sessions(session_token);
CREATE INDEX idx_active_sessions ON user_sessions(user_id, revoked_at, expires_at)
  WHERE revoked_at IS NULL;
CREATE INDEX idx_session_activity ON user_sessions(last_activity_at DESC);
CREATE INDEX idx_session_fingerprint ON user_sessions(user_id, device_fingerprint);

-- =============================================================================
-- Login Attempts & Security Events
-- =============================================================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID, -- References users(id), nullable for failed attempts on non-existent users
  email VARCHAR(255) NOT NULL,

  -- Attempt Status
  status VARCHAR(50) NOT NULL, -- 'success', 'failed_password', 'failed_mfa', 'blocked', 'requires_confirmation'
  failure_reason TEXT,

  -- Device & Location
  ip_address INET NOT NULL,
  device_fingerprint VARCHAR(255),
  user_agent TEXT,
  country VARCHAR(2),
  city VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Risk Analysis
  is_new_device BOOLEAN DEFAULT false,
  is_new_location BOOLEAN DEFAULT false,
  is_suspicious BOOLEAN DEFAULT false,
  risk_score INTEGER DEFAULT 0, -- 0-100
  risk_factors JSONB, -- Array of risk indicators

  -- Email Confirmation (for new logins)
  requires_confirmation BOOLEAN DEFAULT false,
  confirmation_token VARCHAR(255) UNIQUE,
  confirmation_sent_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  denied_at TIMESTAMP,

  -- MFA Details
  mfa_method VARCHAR(20), -- 'totp', 'passkey', 'none'
  mfa_verified BOOLEAN DEFAULT false,

  -- Session Created
  session_id UUID, -- References user_sessions(id)

  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for security analysis
CREATE INDEX idx_login_user ON login_attempts(user_id);
CREATE INDEX idx_login_email ON login_attempts(email);
CREATE INDEX idx_login_status ON login_attempts(status, created_at DESC);
CREATE INDEX idx_login_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_suspicious ON login_attempts(is_suspicious, created_at DESC);
CREATE INDEX idx_login_confirmation ON login_attempts(confirmation_token)
  WHERE confirmation_token IS NOT NULL;
CREATE INDEX idx_login_time ON login_attempts(created_at DESC);

-- =============================================================================
-- Trusted Devices
-- =============================================================================
CREATE TABLE IF NOT EXISTS trusted_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- References users(id)
  device_fingerprint VARCHAR(255) NOT NULL,

  -- Device Info
  device_name VARCHAR(255),
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),

  -- Trust Metadata
  first_seen_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW(),
  trusted_at TIMESTAMP DEFAULT NOW(),
  trust_expires_at TIMESTAMP, -- Optional: expire trust after N days (e.g., 90 days)

  -- Location (from first trusted login)
  ip_address INET,
  country VARCHAR(2),
  city VARCHAR(100),

  -- Revocation
  revoked_at TIMESTAMP,
  revocation_reason VARCHAR(100),

  UNIQUE(user_id, device_fingerprint)
);

-- Indexes for device trust lookup
CREATE INDEX idx_trusted_device_user ON trusted_devices(user_id);
CREATE INDEX idx_trusted_device_fingerprint ON trusted_devices(user_id, device_fingerprint);
CREATE INDEX idx_trusted_device_active ON trusted_devices(user_id, revoked_at)
  WHERE revoked_at IS NULL;

-- =============================================================================
-- Security Events Log (Audit Trail)
-- =============================================================================
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID, -- References users(id), nullable for system events

  -- Event Details
  event_type VARCHAR(100) NOT NULL, -- 'password_change', 'mfa_enabled', 'mfa_disabled', 'session_revoked', 'suspicious_login', etc.
  event_category VARCHAR(50) NOT NULL, -- 'auth', 'mfa', 'session', 'security'
  severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'critical'

  -- Event Data
  description TEXT NOT NULL,
  metadata JSONB, -- Additional event-specific data

  -- Source
  ip_address INET,
  device_fingerprint VARCHAR(255),
  user_agent TEXT,

  -- Context
  session_id UUID, -- References user_sessions(id)
  triggered_by VARCHAR(50), -- 'user', 'system', 'admin'

  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for security event analysis
CREATE INDEX idx_security_event_user ON security_events(user_id);
CREATE INDEX idx_security_event_type ON security_events(event_type, created_at DESC);
CREATE INDEX idx_security_event_severity ON security_events(severity, created_at DESC);
CREATE INDEX idx_security_event_time ON security_events(created_at DESC);

-- =============================================================================
-- MFA Rate Limiting
-- =============================================================================
CREATE TABLE IF NOT EXISTS mfa_rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- References users(id)

  -- Rate Limit Type
  limit_type VARCHAR(50) NOT NULL, -- 'totp_attempts', 'passkey_attempts', 'backup_code_attempts'

  -- Counter
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP DEFAULT NOW(),

  -- Lockout
  locked_until TIMESTAMP,

  -- Reset window (for rate limiting)
  window_start TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, limit_type)
);

CREATE INDEX idx_mfa_rate_limit_user ON mfa_rate_limits(user_id);
CREATE INDEX idx_mfa_rate_limit_locked ON mfa_rate_limits(user_id, locked_until)
  WHERE locked_until IS NOT NULL;

-- =============================================================================
-- Triggers for automatic timestamp updates
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to user_mfa_config
CREATE TRIGGER update_user_mfa_config_updated_at
  BEFORE UPDATE ON user_mfa_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Comments for documentation
-- =============================================================================

COMMENT ON TABLE user_mfa_config IS 'Multi-factor authentication configuration per user';
COMMENT ON TABLE webauthn_credentials IS 'WebAuthn/FIDO2 credentials (passkeys) registered by users';
COMMENT ON TABLE user_sessions IS 'Active and historical user sessions with device and location tracking';
COMMENT ON TABLE login_attempts IS 'All login attempts with risk analysis and confirmation tracking';
COMMENT ON TABLE trusted_devices IS 'User-approved trusted devices that skip certain security checks';
COMMENT ON TABLE security_events IS 'Audit trail of security-related events';
COMMENT ON TABLE mfa_rate_limits IS 'Rate limiting for MFA attempts to prevent brute force';

COMMENT ON COLUMN user_sessions.session_token IS 'JWT token or session identifier (indexed for fast lookup)';
COMMENT ON COLUMN user_sessions.device_fingerprint IS 'Hashed device fingerprint for identifying returning devices';
COMMENT ON COLUMN user_sessions.mfa_verified IS 'Whether this session passed MFA challenge';
COMMENT ON COLUMN login_attempts.risk_score IS 'Calculated risk score (0-100) based on multiple factors';
COMMENT ON COLUMN login_attempts.confirmation_token IS 'Token sent via email for confirming new logins';
COMMENT ON COLUMN trusted_devices.trust_expires_at IS 'Optional expiration for device trust (e.g., 90 days)';
