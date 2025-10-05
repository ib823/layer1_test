/**
 * SAP Gateway Service Discovery
 * Automatically discovers available OData services in tenant's SAP system
 */
import { BaseSAPConnector } from './BaseSAPConnector';
import { ServiceMetadata, TenantCapabilityProfile, DiscoveryResult } from './ServiceDiscoveryTypes';
export declare class ServiceDiscovery {
    private connector;
    constructor(connector: BaseSAPConnector);
    /**
     * Discover all available OData services in the SAP system
     */
    discoverServices(): Promise<DiscoveryResult>;
    /**
     * Get detailed metadata for a specific service
     */
    getServiceMetadata(serviceUrl: string): Promise<ServiceMetadata | null>;
    /**
     * Test if current user has permission to access each service
     */
    private testServicePermissions;
    /**
     * Detect custom fields (Z-tables and custom fields)
     */
    private detectCustomFields;
    /**
     * Assess what capabilities this tenant has based on available services
     */
    private assessCapabilities;
    /**
     * Detect SAP system version
     */
    private detectSAPVersion;
    /**
     * Generate tenant capability profile for storage
     */
    generateTenantProfile(tenantId: string): Promise<TenantCapabilityProfile>;
    /**
     * Identify which commonly-needed services are missing
     */
    private identifyMissingServices;
    /**
     * Generate recommended actions for missing services
     */
    private generateRecommendedActions;
    private mapServiceStatus;
    private detectODataVersion;
    private parseMetadataXML;
    private inferRequiredAuths;
    private mapVersion;
    private getPriority;
    private getReason;
    private getActivationInstructions;
}
//# sourceMappingURL=ServiceDiscovery.d.ts.map