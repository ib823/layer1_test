/**
 * Service Discovery Types
 * Types for SAP Gateway Service Catalog discovery
 */
export interface ODataService {
    name: string;
    technicalName: string;
    version: string;
    endpoint: string;
    status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
    type: 'ODATA_V2' | 'ODATA_V4';
    metadata?: ServiceMetadata;
}
export interface ServiceMetadata {
    entityTypes: EntityType[];
    associations: Association[];
    functionImports?: FunctionImport[];
}
export interface EntityType {
    name: string;
    properties: Property[];
    navigationProperties: NavigationProperty[];
    keys: string[];
}
export interface Property {
    name: string;
    type: string;
    nullable: boolean;
    maxLength?: number;
}
export interface NavigationProperty {
    name: string;
    relationship: string;
    fromRole: string;
    toRole: string;
}
export interface Association {
    name: string;
    end1: AssociationEnd;
    end2: AssociationEnd;
}
export interface AssociationEnd {
    type: string;
    multiplicity: '1' | '0..1' | '*';
    role: string;
}
export interface FunctionImport {
    name: string;
    returnType: string;
    parameters: Parameter[];
}
export interface Parameter {
    name: string;
    type: string;
    mode: 'In' | 'Out' | 'InOut';
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
    fields: {
        [key: string]: string;
    };
    description: string;
}
export interface TenantCapabilities {
    canDoSoD: boolean;
    canDoInvoiceMatching: boolean;
    canDoAnomalyDetection: boolean;
    canDoInventoryOptimization: boolean;
    canDoExpenseAnalysis: boolean;
    customCapabilities: {
        [key: string]: boolean;
    };
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
//# sourceMappingURL=ServiceDiscoveryTypes.d.ts.map