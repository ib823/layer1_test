-- Multi-tenant schema for SAP Framework
-- Each tenant gets isolated data

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(255) UNIQUE NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tenant SAP connections
CREATE TABLE tenant_sap_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  connection_type VARCHAR(50) NOT NULL, -- 'S4HANA', 'IPS', 'ARIBA', 'SF'
  base_url VARCHAR(500) NOT NULL,
  auth_type VARCHAR(50) NOT NULL,
  auth_credentials JSONB NOT NULL, -- Encrypted credentials
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tenant capability profiles
CREATE TABLE tenant_capability_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  sap_version VARCHAR(50),
  discovered_at TIMESTAMP NOT NULL,
  available_services JSONB NOT NULL, -- Array of ODataService objects
  custom_fields JSONB DEFAULT '[]',
  capabilities JSONB NOT NULL, -- TenantCapabilities object
  missing_services TEXT[] DEFAULT '{}',
  recommended_actions JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id) -- Only one active profile per tenant
);

-- Service discovery history (audit trail)
CREATE TABLE service_discovery_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  discovery_result JSONB NOT NULL,
  services_count INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  errors TEXT[],
  discovered_at TIMESTAMP DEFAULT NOW()
);

-- Module activations per tenant
CREATE TABLE tenant_module_activations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  module_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  activation_reason TEXT,
  activated_at TIMESTAMP DEFAULT NOW(),
  deactivated_at TIMESTAMP,
  UNIQUE(tenant_id, module_name)
);

-- Indexes for performance
CREATE INDEX idx_tenants_tenant_id ON tenants(tenant_id);
CREATE INDEX idx_tenant_connections_tenant_id ON tenant_sap_connections(tenant_id);
CREATE INDEX idx_tenant_profiles_tenant_id ON tenant_capability_profiles(tenant_id);
CREATE INDEX idx_discovery_history_tenant_id ON service_discovery_history(tenant_id);
CREATE INDEX idx_module_activations_tenant_id ON tenant_module_activations(tenant_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON tenant_sap_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();