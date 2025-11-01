/**
 * Oracle Cloud ERP Connector
 *
 * Supports: Oracle Fusion Cloud ERP, Oracle Cloud EBS
 * Authentication: OAuth 2.0 (Oracle Identity Cloud Service)
 * Protocol: REST API
 *
 * @module connectors/oracle
 */

import {
  BaseERPConnector,
  ERPConnectorConfig,
  ERPSystem,
  ERPVersion,
  ERPUser,
  ERPRole,
  ERPPermission,
  ERPUserFilter,
  ERPGLEntry,
  GLEntryFilter,
  ERPInvoice,
  InvoiceFilter,
  ERPPurchaseOrder,
  PurchaseOrderFilter,
  ERPVendor,
  VendorFilter,
  ServiceCatalog,
} from '../base/BaseERPConnector';
import { erpDataNormalizer } from '../../normalizers/ERPDataNormalizer';
import {
  AuthenticationError,
  ValidationError,
  NotFoundError,
  FrameworkError,
} from '../../errors';
import { HealthCheckResult } from '../../types';
import { RetryStrategy } from '../../utils/retry';
import { CircuitBreaker } from '../../utils/circuitBreaker';

export interface OracleCloudConnectorConfig extends ERPConnectorConfig {
  /**
   * Oracle-specific configuration
   */
  oracle?: {
    /** Oracle Identity Cloud Service (IDCS) domain */
    idcsDomain?: string;
    /** Scope for access token */
    scope?: string;
    /** Cloud deployment type */
    cloudType?: 'FUSION' | 'EBS' | 'PEOPLESOFT';
  };
}

/**
 * Oracle Cloud ERP Connector
 */
export class OracleCloudConnector extends BaseERPConnector {
  protected declare config: OracleCloudConnectorConfig;
  private retryStrategy: RetryStrategy;
  private circuitBreaker: CircuitBreaker;

  constructor(config: OracleCloudConnectorConfig) {
    super(config);

    this.retryStrategy = new RetryStrategy();
    this.circuitBreaker = new CircuitBreaker(
      config.circuitBreaker || {
        failureThreshold: 5,
        successThreshold: 2,
        resetTimeout: 60000,
        name: 'Oracle',
      }
    );
  }

  // ============================================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ============================================

  getSystemType(): 'Oracle' {
    return 'Oracle';
  }

  async getSystemVersion(): Promise<ERPVersion> {
    try {
      const response = await this.request<any>({
        method: 'GET',
        url: '/fscmRestApi/resources/latest/about',
      });

      // Parse version from Oracle response
      // Example: "22.1.3.0.0"
      const versionParts = response.version?.split('.') || [];

      return {
        major: versionParts[0] || '22',
        minor: versionParts[1] || '1',
        patch: versionParts[2] || '0',
        build: versionParts[3] || '0',
      };
    } catch (error) {
      // Fallback version if API not available
      return {
        major: '22',
        minor: '1',
      };
    }
  }

  protected async getAuthToken(): Promise<string> {
    // Check cache first
    if (this.tokenCache && !this.isTokenExpired()) {
      return this.tokenCache.token;
    }

    // Oracle uses OAuth 2.0 client credentials flow
    const { credentials, endpoints } = this.config.auth;

    if (!endpoints?.tokenUrl) {
      throw new AuthenticationError(
        'Oracle token URL not configured',
        'MISSING_TOKEN_URL'
      );
    }

    try {
      const response = await this.client.post(
        endpoints.tokenUrl,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: credentials.clientId as string,
          client_secret: credentials.clientSecret as string,
          scope: this.config.oracle?.scope || 'urn:opc:resource:consumer::all',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          // Skip auth interceptor for token request
          transformRequest: [(data) => data],
        }
      );

      const { access_token, expires_in } = response.data;

      // Cache token
      this.tokenCache = {
        token: access_token,
        expiry: Date.now() + expires_in * 1000,
      };

      return access_token;
    } catch (error: any) {
      throw new AuthenticationError(
        `Oracle authentication failed: ${error.message}`,
        error
      );
    }
  }

  protected getAuthHeaderName(): string {
    return 'Authorization';
  }

  protected formatAuthToken(token: string): string {
    return `Bearer ${token}`;
  }

  protected mapError(error: any): FrameworkError {
    const status = error.response?.status;
    const message = error.response?.data?.title || error.message;

    if (status === 401) {
      return new AuthenticationError(message, error);
    }

    if (status === 404) {
      return new NotFoundError(message, error);
    }

    if (status === 400) {
      return new ValidationError(message, error);
    }

    return new FrameworkError(
      message,
      'ORACLE_ERROR',
      status || 500,
      true,
      { originalError: error }
    );
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      // Oracle health check endpoint
      await this.request({
        method: 'GET',
        url: '/fscmRestApi/resources/latest/about',
        timeout: 5000,
      });

      return {
        status: 'healthy',
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: Date.now(),
        details: error,
      };
    }
  }

  async discoverServices(): Promise<ServiceCatalog> {
    try {
      // Oracle REST API discovery
      const response = await this.request<any>({
        method: 'GET',
        url: '/fscmRestApi/resources/latest',
      });

      const version = await this.getSystemVersion();

      const services = (response.resources || []).map((resource: any) => ({
        id: resource.name,
        name: resource.name,
        description: resource.kind,
        endpoint: resource.href,
        protocol: 'REST' as const,
        version: resource.version,
        isAvailable: true,
      }));

      // Determine capabilities based on available services
      const capabilities = [];

      if (services.some((s: any) => s.name.includes('generalLedger'))) {
        capabilities.push({
          id: 'gl-analytics',
          name: 'General Ledger Analytics',
          category: 'FINANCIAL' as const,
          requiredServices: ['generalLedgerBalances'],
          isAvailable: true,
        });
      }

      if (services.some((s: any) => s.name.includes('payables'))) {
        capabilities.push({
          id: 'ap-management',
          name: 'Accounts Payable Management',
          category: 'FINANCIAL' as const,
          requiredServices: ['invoices', 'suppliers'],
          isAvailable: true,
        });
      }

      if (services.some((s: any) => s.name.includes('purchaseOrders'))) {
        capabilities.push({
          id: 'procurement',
          name: 'Procurement Management',
          category: 'PROCUREMENT' as const,
          requiredServices: ['purchaseOrders', 'requisitions'],
          isAvailable: true,
        });
      }

      return {
        erpSystem: 'Oracle',
        version,
        discoveredAt: new Date(),
        services,
        capabilities,
      };
    } catch (error) {
      throw new FrameworkError(
        `Failed to discover Oracle services: ${(error as Error).message}`,
        'DISCOVERY_FAILED',
        500,
        true,
        error
      );
    }
  }

  // ============================================
  // USER & ROLE METHODS
  // ============================================

  async getUsers(filter: ERPUserFilter): Promise<ERPUser[]> {
    const queryParams: string[] = [];

    // Build Oracle REST query
    if (filter.activeOnly) {
      queryParams.push("ActiveFlag = 'Y'");
    }

    if (filter.userIds && filter.userIds.length > 0) {
      const userFilter = filter.userIds
        .map((id) => `UserId = ${id}`)
        .join(' OR ');
      queryParams.push(`(${userFilter})`);
    }

    if (filter.searchTerm) {
      queryParams.push(
        `(Username LIKE '%${filter.searchTerm}%' OR DisplayName LIKE '%${filter.searchTerm}%')`
      );
    }

    const query = queryParams.length > 0 ? `?q=${queryParams.join(' AND ')}` : '';
    const limit = filter.limit ? `&limit=${filter.limit}` : '';
    const offset = filter.offset ? `&offset=${filter.offset}` : '';

    try {
      const response = await this.request<any>({
        method: 'GET',
        url: `/hcmRestApi/resources/11.13.18.05/users${query}${limit}${offset}`,
      });

      const users = response.items || response.Users || [];
      return users.map((u: any) => erpDataNormalizer.normalizeUser(u, 'Oracle'));
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async getUserById(userId: string): Promise<ERPUser> {
    try {
      const response = await this.request<any>({
        method: 'GET',
        url: `/hcmRestApi/resources/11.13.18.05/users/${userId}`,
      });

      return erpDataNormalizer.normalizeUser(response, 'Oracle');
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async getUserRoles(userId: string): Promise<ERPRole[]> {
    try {
      const response = await this.request<any>({
        method: 'GET',
        url: `/hcmRestApi/resources/11.13.18.05/users/${userId}/child/roles`,
      });

      const roles = response.items || response.Roles || [];
      return roles.map((r: any) => erpDataNormalizer.normalizeRole(r, 'Oracle'));
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async getUserPermissions(userId: string): Promise<ERPPermission[]> {
    try {
      // Oracle permissions come through roles
      const roles = await this.getUserRoles(userId);
      const permissions: ERPPermission[] = [];

      for (const role of roles) {
        permissions.push(...role.permissions);
      }

      return permissions;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async getAllRoles(): Promise<ERPRole[]> {
    try {
      const response = await this.request<any>({
        method: 'GET',
        url: '/hcmRestApi/resources/11.13.18.05/roles?limit=1000',
      });

      const roles = response.items || response.Roles || [];
      return roles.map((r: any) => erpDataNormalizer.normalizeRole(r, 'Oracle'));
    } catch (error) {
      throw this.mapError(error);
    }
  }

  // ============================================
  // FINANCIAL DATA METHODS
  // ============================================

  async getGLEntries(filter: GLEntryFilter): Promise<ERPGLEntry[]> {
    const queryParams: string[] = [];

    if (filter.fromDate) {
      queryParams.push(`EffectiveDate >= '${filter.fromDate.toISOString()}'`);
    }

    if (filter.toDate) {
      queryParams.push(`EffectiveDate <= '${filter.toDate.toISOString()}'`);
    }

    if (filter.accountCodes && filter.accountCodes.length > 0) {
      const accountFilter = filter.accountCodes
        .map((code) => `AccountCombination = '${code}'`)
        .join(' OR ');
      queryParams.push(`(${accountFilter})`);
    }

    const query = queryParams.length > 0 ? `?q=${queryParams.join(' AND ')}` : '';
    const limit = filter.limit ? `&limit=${filter.limit}` : '';
    const offset = filter.offset ? `&offset=${filter.offset}` : '';

    try {
      const response = await this.request<any>({
        method: 'GET',
        url: `/fscmRestApi/resources/11.13.18.05/generalLedgerJournalLines${query}${limit}${offset}`,
      });

      const entries = response.items || response.JournalLines || [];
      return entries.map((e: any) => erpDataNormalizer.normalizeGLEntry(e, 'Oracle'));
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async getInvoices(filter: InvoiceFilter): Promise<ERPInvoice[]> {
    const queryParams: string[] = [];

    if (filter.fromDate) {
      queryParams.push(`InvoiceDate >= '${filter.fromDate.toISOString()}'`);
    }

    if (filter.toDate) {
      queryParams.push(`InvoiceDate <= '${filter.toDate.toISOString()}'`);
    }

    if (filter.vendorIds && filter.vendorIds.length > 0) {
      const vendorFilter = filter.vendorIds
        .map((id) => `SupplierId = ${id}`)
        .join(' OR ');
      queryParams.push(`(${vendorFilter})`);
    }

    const query = queryParams.length > 0 ? `?q=${queryParams.join(' AND ')}` : '';
    const limit = filter.limit ? `&limit=${filter.limit}` : '';
    const offset = filter.offset ? `&offset=${filter.offset}` : '';

    try {
      const response = await this.request<any>({
        method: 'GET',
        url: `/fscmRestApi/resources/11.13.18.05/invoices${query}${limit}${offset}`,
      });

      const invoices = response.items || response.Invoices || [];

      // Note: Full normalization would be in ERPDataNormalizer
      // This is a simplified version
      return invoices.map((inv: any) => ({
        invoiceId: inv.InvoiceId.toString(),
        invoiceNumber: inv.InvoiceNum,
        invoiceDate: new Date(inv.InvoiceDate),
        vendorId: inv.SupplierId.toString(),
        vendorName: inv.SupplierName,
        amount: parseFloat(inv.InvoiceAmount),
        totalAmount: parseFloat(inv.InvoiceAmount),
        currency: inv.InvoiceCurrencyCode,
        status: inv.InvoiceStatus,
        lineItems: [],
        erpSystem: 'Oracle' as const,
        erpSpecificData: inv,
      }));
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async getPurchaseOrders(filter: PurchaseOrderFilter): Promise<ERPPurchaseOrder[]> {
    const queryParams: string[] = [];

    if (filter.fromDate) {
      queryParams.push(`CreationDate >= '${filter.fromDate.toISOString()}'`);
    }

    if (filter.toDate) {
      queryParams.push(`CreationDate <= '${filter.toDate.toISOString()}'`);
    }

    const query = queryParams.length > 0 ? `?q=${queryParams.join(' AND ')}` : '';
    const limit = filter.limit ? `&limit=${filter.limit}` : '';

    try {
      const response = await this.request<any>({
        method: 'GET',
        url: `/fscmRestApi/resources/11.13.18.05/purchaseOrders${query}${limit}`,
      });

      const pos = response.items || response.PurchaseOrders || [];

      return pos.map((po: any) => ({
        poId: po.POHeaderId.toString(),
        poNumber: po.OrderNumber,
        poDate: new Date(po.CreationDate),
        vendorId: po.SupplierId.toString(),
        vendorName: po.SupplierName,
        totalAmount: parseFloat(po.Total),
        currency: po.CurrencyCode,
        status: po.Status,
        lineItems: [],
        erpSystem: 'Oracle' as const,
        erpSpecificData: po,
      }));
    } catch (error) {
      throw this.mapError(error);
    }
  }

  // ============================================
  // VENDOR METHODS
  // ============================================

  async getVendors(filter: VendorFilter): Promise<ERPVendor[]> {
    const queryParams: string[] = [];

    if (filter.activeOnly) {
      queryParams.push("EnabledFlag = 'Y'");
    }

    if (filter.searchTerm) {
      queryParams.push(`SupplierName LIKE '%${filter.searchTerm}%'`);
    }

    const query = queryParams.length > 0 ? `?q=${queryParams.join(' AND ')}` : '';
    const limit = filter.limit ? `&limit=${filter.limit}` : '';

    try {
      const response = await this.request<any>({
        method: 'GET',
        url: `/fscmRestApi/resources/11.13.18.05/suppliers${query}${limit}`,
      });

      const vendors = response.items || response.Suppliers || [];

      return vendors.map((v: any) => ({
        vendorId: v.SupplierId.toString(),
        vendorCode: v.SupplierNumber,
        vendorName: v.SupplierName,
        isActive: v.EnabledFlag === 'Y',
        erpSystem: 'Oracle' as const,
        erpSpecificData: v,
      }));
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async getVendorById(vendorId: string): Promise<ERPVendor> {
    try {
      const response = await this.request<any>({
        method: 'GET',
        url: `/fscmRestApi/resources/11.13.18.05/suppliers/${vendorId}`,
      });

      return {
        vendorId: response.SupplierId.toString(),
        vendorCode: response.SupplierNumber,
        vendorName: response.SupplierName,
        isActive: response.EnabledFlag === 'Y',
        erpSystem: 'Oracle',
        erpSpecificData: response,
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }
}
