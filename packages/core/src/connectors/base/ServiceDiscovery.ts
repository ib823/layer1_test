/**
 * SAP Gateway Service Discovery
 * Automatically discovers available OData services in tenant's SAP system
 */

import { BaseSAPConnector } from './BaseSAPConnector';
import {
  ODataService,
  ServiceMetadata,
  TenantCapabilityProfile,
  DiscoveryResult,
  PermissionTestResult,
  TenantCapabilities,
  RecommendedAction,
  CustomFieldMapping,
} from './ServiceDiscoveryTypes';

export class ServiceDiscovery {
  private connector: BaseSAPConnector;

  constructor(connector: BaseSAPConnector) {
    this.connector = connector;
  }

  /**
   * Discover all available OData services in the SAP system
   */
  async discoverServices(): Promise<DiscoveryResult> {
    const errors: string[] = [];
    const services: ODataService[] = [];

    try {
      // Query SAP Gateway Service Catalog
      const catalogResponse = await this.connector.executeRequest<any>({
        method: 'GET',
        url: '/sap/opu/odata/iwfnd/catalogservice;v=2/ServiceCollection',
      });

      // Parse discovered services
      if (catalogResponse.d && catalogResponse.d.results) {
        for (const service of catalogResponse.d.results) {
          services.push({
            name: service.Title || service.TechnicalServiceName,
            technicalName: service.TechnicalServiceName,
            version: service.TechnicalServiceVersion || 'v1',
            endpoint: service.ServiceUrl,
            status: this.mapServiceStatus(service.Status),
            type: this.detectODataVersion(service.ServiceUrl),
          });
        }
      }
    } catch (error: any) {
      errors.push(`Failed to discover services: ${error.message}`);
    }

    // Test permissions for each service
    const permissionTests = await this.testServicePermissions(services);

    // Detect custom fields (Z-tables)
    const customFields = await this.detectCustomFields();

    // Determine tenant capabilities
    const capabilities = this.assessCapabilities(services, permissionTests);

    // Detect SAP version
    const version = await this.detectSAPVersion();

    return {
      success: errors.length === 0,
      version,
      services: services.filter(s => s.status === 'ACTIVE'),
      permissionTests,
      customFields,
      capabilities,
      errors,
    };
  }

  /**
   * Get detailed metadata for a specific service
   */
  async getServiceMetadata(serviceUrl: string): Promise<ServiceMetadata | null> {
    try {
      const metadataUrl = `${serviceUrl}/$metadata`;
      const metadataXML = await this.connector.executeRequest<string>({
        method: 'GET',
        url: metadataUrl,
      });

      // Parse XML metadata (simplified - in production use proper XML parser)
      return this.parseMetadataXML(metadataXML);
    } catch (error) {
      console.error(`Failed to get metadata for ${serviceUrl}:`, error);
      return null;
    }
  }

  /**
   * Test if current user has permission to access each service
   */
  private async testServicePermissions(
    services: ODataService[]
  ): Promise<PermissionTestResult[]> {
    const results: PermissionTestResult[] = [];

    for (const service of services) {
      try {
        // Try a simple GET request to the service root
        await this.connector.executeRequest({
          method: 'GET',
          url: service.endpoint,
        });

        results.push({
          service: service.technicalName,
          accessible: true,
        });
      } catch (error: any) {
        results.push({
          service: service.technicalName,
          accessible: false,
          errorCode: error.response?.status?.toString() || 'UNKNOWN',
          errorMessage: error.message,
          requiredAuthorizations: this.inferRequiredAuths(service.technicalName),
        });
      }
    }

    return results;
  }

  /**
   * Detect custom fields (Z-tables and custom fields)
   */
  private async detectCustomFields(): Promise<CustomFieldMapping[]> {
    const customFields: CustomFieldMapping[] = [];

    // This would query DDIC tables to find Z* tables
    // For now, return empty array (implement based on requirements)

    return customFields;
  }

  /**
   * Assess what capabilities this tenant has based on available services
   */
  private assessCapabilities(
    services: ODataService[],
    permissionTests: PermissionTestResult[]
  ): TenantCapabilities {
    const hasService = (technicalName: string) => {
      return (
        services.some(s => s.technicalName === technicalName && s.status === 'ACTIVE') &&
        permissionTests.some(p => p.service === technicalName && p.accessible)
      );
    };

    return {
      canDoSoD: hasService('API_USER_SRV') && hasService('API_ROLE_SRV'),
      canDoInvoiceMatching:
        hasService('API_PURCHASEORDER_SRV') && hasService('API_INVOICE_SRV'),
      canDoAnomalyDetection: hasService('API_GLACCOUNTLINEITEM_SRV'),
      canDoInventoryOptimization: hasService('API_MATERIAL_SRV'),
      canDoExpenseAnalysis: hasService('API_GLACCOUNTLINEITEM_SRV'),
      customCapabilities: {},
    };
  }

  /**
   * Detect SAP system version
   */
  private async detectSAPVersion(): Promise<string> {
    try {
      // Query system information
      const response = await this.connector.executeRequest<any>({
        method: 'GET',
        url: '/sap/opu/odata/iwfnd/catalogservice;v=2/SystemInfoSet',
      });

      if (response.d?.results?.[0]) {
        const systemInfo = response.d.results[0];
        return systemInfo.SoftwareComponent || 'UNKNOWN';
      }
    } catch (error) {
      // Fallback detection logic
    }

    return 'UNKNOWN';
  }

  /**
   * Generate tenant capability profile for storage
   */
  async generateTenantProfile(tenantId: string): Promise<TenantCapabilityProfile> {
    const discovery = await this.discoverServices();

    return {
      tenantId,
      sapVersion: this.mapVersion(discovery.version),
      discoveredAt: new Date(),
      availableServices: discovery.services,
      customFields: discovery.customFields,
      capabilities: discovery.capabilities,
      missingServices: this.identifyMissingServices(discovery.services),
      recommendedActions: this.generateRecommendedActions(discovery),
    };
  }

  /**
   * Identify which commonly-needed services are missing
   */
  private identifyMissingServices(services: ODataService[]): string[] {
    const commonServices = [
      'API_USER_SRV',
      'API_ROLE_SRV',
      'API_PURCHASEORDER_SRV',
      'API_INVOICE_SRV',
      'API_MATERIAL_SRV',
      'API_GLACCOUNTLINEITEM_SRV',
    ];

    const available = new Set(services.map(s => s.technicalName));
    return commonServices.filter(s => !available.has(s));
  }

  /**
   * Generate recommended actions for missing services
   */
  private generateRecommendedActions(discovery: DiscoveryResult): RecommendedAction[] {
    const actions: RecommendedAction[] = [];

    for (const missingService of this.identifyMissingServices(discovery.services)) {
      actions.push({
        priority: this.getPriority(missingService),
        service: missingService,
        reason: this.getReason(missingService),
        instructions: this.getActivationInstructions(missingService),
        estimatedTimeHours: 2,
        requiredAuthorizations: ['S_SERVICE', 'S_RFC'],
      });
    }

    return actions;
  }

  // Helper methods

  private mapServiceStatus(status: string): 'ACTIVE' | 'INACTIVE' | 'ERROR' {
    if (!status) return 'INACTIVE';
    const upper = status.toUpperCase();
    if (upper.includes('ACTIVE')) return 'ACTIVE';
    if (upper.includes('ERROR')) return 'ERROR';
    return 'INACTIVE';
  }

  private detectODataVersion(url: string): 'ODATA_V2' | 'ODATA_V4' {
    // Simple heuristic - check URL path
    return url.includes('v4') ? 'ODATA_V4' : 'ODATA_V2';
  }

  private parseMetadataXML(xml: string): ServiceMetadata {
    // Simplified - in production use proper XML parser like fast-xml-parser
    return {
      entityTypes: [],
      associations: [],
    };
  }

  private inferRequiredAuths(serviceName: string): string[] {
    // Map common services to required authorizations
    const authMap: { [key: string]: string[] } = {
      API_USER_SRV: ['S_USER_GRP', 'S_USER_VAL'],
      API_ROLE_SRV: ['S_USER_AGR'],
      API_PURCHASEORDER_SRV: ['M_BEST_WRK'],
    };

    return authMap[serviceName] || ['S_SERVICE'];
  }

  private mapVersion(version: string): 'ECC6' | 'S4_ON_PREM' | 'S4_CLOUD' | 'UNKNOWN' {
    if (version.includes('S/4HANA')) {
      return version.includes('Cloud') ? 'S4_CLOUD' : 'S4_ON_PREM';
    }
    if (version.includes('ECC')) return 'ECC6';
    return 'UNKNOWN';
  }

  private getPriority(service: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (service.includes('USER') || service.includes('ROLE')) return 'HIGH';
    if (service.includes('PURCHASEORDER') || service.includes('GLACCOUNT')) return 'MEDIUM';
    return 'LOW';
  }

  private getReason(service: string): string {
    const reasons: { [key: string]: string } = {
      API_USER_SRV: 'Required for SoD Analysis module',
      API_ROLE_SRV: 'Required for SoD Analysis module',
      API_PURCHASEORDER_SRV: 'Required for Invoice Matching module',
      API_GLACCOUNTLINEITEM_SRV: 'Required for Anomaly Detection module',
    };

    return reasons[service] || `Required for additional modules`;
  }

  private getActivationInstructions(service: string): string[] {
    return [
      'Log into SAP GUI with BASIS authorization',
      'Execute transaction /IWFND/MAINT_SERVICE',
      `Add Service: ${service}`,
      'Set to Active status',
      'Assign ICF nodes',
      'Test service endpoint',
    ];
  }
}