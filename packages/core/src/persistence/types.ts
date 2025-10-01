import { DiscoveryResult } from '../connectors/base/ServiceDiscoveryTypes';

export interface TenantRecord {
  id: string;
  tenant_id: string;
  company_name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  created_at: Date;
  updated_at: Date;
}

export interface TenantSAPConnection {
  id: string;
  tenant_id: string;
  connection_type: 'S4HANA' | 'IPS' | 'ARIBA' | 'SF' | 'CONCUR';
  base_url: string;
  auth_type: 'OAUTH' | 'BASIC' | 'CERTIFICATE';
  auth_credentials: any;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TenantModuleActivation {
  id: string;
  tenant_id: string;
  module_name: string;
  is_active: boolean;
  activation_reason?: string;
  activated_at: Date;
  deactivated_at?: Date;
}

export interface DiscoveryHistoryRecord {
  id: string;
  tenant_id: string;
  discovery_result: DiscoveryResult;
  services_count: number;
  success: boolean;
  errors: string[];
  discovered_at: Date;
}