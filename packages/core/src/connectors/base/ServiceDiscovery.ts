import { BaseSAPConnector } from './BaseSAPConnector';
import {
  ODataService,
  TenantCapabilityProfile,
  DiscoveryResult,
  PermissionTestResult,
  TenantCapabilities,
} from './ServiceDiscoveryTypes';

export class ServiceDiscovery {
  private connector: BaseSAPConnector;

  constructor(connector: BaseSAPConnector) {
    this.connector = connector;
  }

  async discoverServices(): Promise<DiscoveryResult> {
    const errors: string[] = [];
    const services: ODataService[] = [];

    try {
      const catalogResponse = await this.connector.executeRequest<any>({
        method: 'GET',
        url: '/sap/opu/odata/iwfnd/catalogservice;v=2/ServiceCollection',
      });

      if (catalogResponse.d?.results) {
        for (const svc of catalogResponse.d.results) {
          services.push({
            name: svc.Title || svc.TechnicalServiceName,
            technicalName: svc.TechnicalServiceName,
            version: svc.TechnicalServiceVersion || 'v1',
            endpoint: svc.ServiceUrl,
            status: this.mapStatus(svc.Status),
            type: svc.ServiceUrl?.includes('v4') ? 'ODATA_V4' : 'ODATA_V2',
          });
        }
      }
    } catch (error: any) {
      errors.push(`Discovery failed: ${error.message}`);
    }

    const permissionTests = await this.testPermissions(services);
    const capabilities = this.assessCapabilities(services, permissionTests);

    return {
      success: errors.length === 0,
      version: 'UNKNOWN',
      services: services.filter(s => s.status === 'ACTIVE'),
      permissionTests,
      customFields: [],
      capabilities,
      errors,
    };
  }

  async generateTenantProfile(tenantId: string): Promise<TenantCapabilityProfile> {
    const discovery = await this.discoverServices();
    return {
      tenantId,
      sapVersion: 'UNKNOWN',
      discoveredAt: new Date(),
      availableServices: discovery.services,
      customFields: [],
      capabilities: discovery.capabilities,
      missingServices: this.findMissing(discovery.services),
      recommendedActions: [],
    };
  }

  private async testPermissions(services: ODataService[]): Promise<PermissionTestResult[]> {
    const results: PermissionTestResult[] = [];
    for (const svc of services) {
      try {
        await this.connector.executeRequest({ method: 'GET', url: svc.endpoint });
        results.push({ service: svc.technicalName, accessible: true });
      } catch (error: any) {
        results.push({
          service: svc.technicalName,
          accessible: false,
          errorCode: error.response?.status?.toString(),
        });
      }
    }
    return results;
  }

  private assessCapabilities(
    services: ODataService[],
    tests: PermissionTestResult[]
  ): TenantCapabilities {
    const has = (name: string) =>
      services.some(s => s.technicalName === name && s.status === 'ACTIVE') &&
      tests.some(t => t.service === name && t.accessible);

    return {
      canDoSoD: has('API_USER_SRV') && has('API_ROLE_SRV'),
      canDoInvoiceMatching: has('API_PURCHASEORDER_SRV'),
      canDoAnomalyDetection: has('API_GLACCOUNTLINEITEM_SRV'),
      canDoInventoryOptimization: has('API_MATERIAL_SRV'),
      canDoExpenseAnalysis: has('API_GLACCOUNTLINEITEM_SRV'),
      customCapabilities: {},
    };
  }

  private findMissing(services: ODataService[]): string[] {
    const needed = ['API_USER_SRV', 'API_ROLE_SRV', 'API_PURCHASEORDER_SRV'];
    const available = new Set(services.map(s => s.technicalName));
    return needed.filter(n => !available.has(n));
  }

  private mapStatus(status: string): 'ACTIVE' | 'INACTIVE' | 'ERROR' {
    if (!status) return 'INACTIVE';
    if (status.toUpperCase().includes('ACTIVE')) return 'ACTIVE';
    return 'INACTIVE';
  }
}