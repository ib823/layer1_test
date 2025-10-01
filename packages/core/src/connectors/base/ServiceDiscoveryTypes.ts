/**
 * Service Discovery Types
 */

export interface ODataService {
  name: string;
  technicalName: string;
  version: string;
  endpoint: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  type: 'ODATA_V2' | 'ODATA_V4';
}

export interface TenantCapabilityProfile {
  tenantId: string;
  sapVersion: 'ECC6' | 'S4_ON_PREM' | 'S4_CLOUD' | 'UNKNOWN';
  discoveredAt: Date;
  availableServices: ODataService[];
  customFields: CustomFieldMapping[];
  capabilities: TenantCapabilities;
  missingServices: string[];
  recommendedActions: RecommendedAction[];
}

export interface CustomFieldMapping {
  table: string;
  fields: { [key: string]: string };
  description: string;
}

export interface TenantCapabilities {
  canDoSoD: boolean;
  canDoInvoiceMatching: boolean;
  canDoAnomalyDetection: boolean;
  canDoInventoryOptimization: boolean;
  canDoExpenseAnalysis: boolean;
  customCapabilities: { [key: string]: boolean };
}

export interface RecommendedAction {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  service: string;
  reason: string;
  instructions: string[];
  estimatedTimeHours: number;
  requiredAuthorizations: string[];
}

export interface PermissionTestResult {
  service: string;
  accessible: boolean;
  errorCode?: string;
  errorMessage?: string;
  requiredAuthorizations?: string[];
}

export interface DiscoveryResult {
  success: boolean;
  version: string;
  services: ODataService[];
  permissionTests: PermissionTestResult[];
  customFields: CustomFieldMapping[];
  capabilities: TenantCapabilities;
  errors: string[];
}

export interface ServiceMetadata {
  entityTypes: any[];
  associations: any[];
}