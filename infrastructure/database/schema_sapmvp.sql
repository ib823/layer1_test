CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants (no RLS so we can bootstrap)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users (RLS protected)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

-- Service accounts (RLS protected; future use)
CREATE TABLE IF NOT EXISTS service_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log (RLS protected)
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  path TEXT NOT NULL,
  ip INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Magic links (single-use)
CREATE TABLE IF NOT EXISTS magic_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links (tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links (token_hash);

-- RLS enablement
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Create app schema for functions
CREATE SCHEMA IF NOT EXISTS app;

-- Request-scoped tenant binding
CREATE OR REPLACE FUNCTION app.current_tenant() RETURNS uuid
LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.current_tenant', true), '')::uuid $$;

-- Users policies
CREATE POLICY users_isolated_sel ON users FOR SELECT USING (tenant_id = app.current_tenant());
CREATE POLICY users_isolated_ins ON users FOR INSERT WITH CHECK (tenant_id = app.current_tenant());
CREATE POLICY users_isolated_upd ON users FOR UPDATE USING (tenant_id = app.current_tenant()) WITH CHECK (tenant_id = app.current_tenant());
CREATE POLICY users_isolated_del ON users FOR DELETE USING (tenant_id = app.current_tenant());

-- Service accounts policies
CREATE POLICY svc_isolated_sel ON service_accounts FOR SELECT USING (tenant_id = app.current_tenant());
CREATE POLICY svc_isolated_ins ON service_accounts FOR INSERT WITH CHECK (tenant_id = app.current_tenant());
CREATE POLICY svc_isolated_upd ON service_accounts FOR UPDATE USING (tenant_id = app.current_tenant()) WITH CHECK (tenant_id = app.current_tenant());
CREATE POLICY svc_isolated_del ON service_accounts FOR DELETE USING (tenant_id = app.current_tenant());

-- Audit policies
CREATE POLICY audit_tenant_read ON audit_log FOR SELECT USING (tenant_id IS NULL OR tenant_id = app.current_tenant());
CREATE POLICY audit_tenant_ins ON audit_log FOR INSERT WITH CHECK (tenant_id IS NULL OR tenant_id = app.current_tenant());
