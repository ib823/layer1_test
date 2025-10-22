/**
 * S/4HANA Connector - SAP S/4HANA Cloud/On-Premise
 *
 * Implements BaseERPConnector for SAP S/4HANA systems.
 * Supports OData v2/v4 protocols, OAuth 2.0 authentication, and comprehensive
 * financial and procurement data access.
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
import {
  S4HANAUser,
  S4HANARole,
  S4HANAUserRole,
  S4HANAODataResponse,
  S4HANABatchRequest,
  S4HANABatchResponse,
} from './types';
import { ODataQueryBuilder, escapeODataString } from '../../utils/odata';
import { RetryStrategy, RetryConfig as LocalRetryConfig } from '../../utils/retry';
import { CircuitBreaker, CircuitBreakerConfig } from '../../utils/circuitBreaker';
import {
  AuthenticationError,
  ValidationError,
  NotFoundError,
  FrameworkError,
} from '../../errors';
import { HealthCheckResult } from '../../types';
import { erpDataNormalizer } from '../../normalizers/ERPDataNormalizer';

export interface S4HANAConnectorConfig extends ERPConnectorConfig {
  odata?: {
    useBatch?: boolean;
    batchSize?: number;
  };
  sapSpecific?: {
    client?: string; // SAP client number (e.g., '100')
    language?: string; // SAP language (e.g., 'EN')
  };
}

export class S4HANAConnector extends BaseERPConnector {
  protected declare config: S4HANAConnectorConfig;

  private retryStrategy: RetryStrategy;
  private circuitBreaker: CircuitBreaker;

  constructor(config: S4HANAConnectorConfig) {
    super(config);

    this.retryStrategy = new RetryStrategy();

    this.circuitBreaker = new CircuitBreaker(
      config.circuitBreaker || {
        failureThreshold: 5,
        successThreshold: 2,
        resetTimeout: 60000,
        name: 'S4HANA',
      }
    );
  }

  // ============================================
  // BaseERPConnector Abstract Method Implementations
  // ============================================

  getSystemType(): ERPSystem {
    return 'SAP';
  }

  async getSystemVersion(): Promise<ERPVersion> {
    try {
      // Query SAP system info via OData metadata
      const response = await this.request<any>({
        method: 'GET',
        url: '/sap/opu/odata/iwfnd/catalogservice;v=2/$metadata',
      });

      // SAP version typically in headers or we can infer from available services
      // For now, return a default structure - can be enhanced based on actual response
      return {
        major: '2023', // S/4HANA version year
        minor: '1',
        patch: '0',
      };
    } catch (error) {
      // Fallback version info
      return {
        major: '2023',
        minor: '0',
      };
    }
  }

  protected getAuthHeaderName(): string {
    return 'Authorization';
  }

  protected formatAuthToken(token: string): string {
    return `Bearer ${token}`;
  }

  protected mapError(error: unknown): FrameworkError {
    return this.mapSAPError(error);
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      await this.request({
        method: 'GET',
        url: '/sap/opu/odata/iwfnd/catalogservice;v=2',
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
      const response = await this.request<any>({
        method: 'GET',
        url: '/sap/opu/odata/iwfnd/catalogservice;v=2/ServiceCollection',
      });

      const services = (response.d?.results || []).map((svc: any) => ({
        id: svc.TechnicalServiceName,
        name: svc.Title || svc.TechnicalServiceName,
        description: svc.Description,
        endpoint: `/sap/opu/odata/sap/${svc.TechnicalServiceName}`,
        protocol: 'ODATA' as const,
        version: svc.TechnicalServiceVersion,
        isAvailable: true,
      }));

      const capabilities = [];

      // Detect GL capability
      if (services.some((s: any) => s.id.includes('JOURNALENTRY'))) {
        capabilities.push({
          id: 'gl-analytics',
          name: 'General Ledger Analytics',
          category: 'FINANCIAL' as const,
          requiredServices: ['API_JOURNALENTRY_SRV'],
          isAvailable: true,
        });
      }

      // Detect procurement capability
      if (services.some((s: any) => s.id.includes('PURCHASEORDER'))) {
        capabilities.push({
          id: 'procurement',
          name: 'Procurement Analytics',
          category: 'PROCUREMENT' as const,
          requiredServices: ['API_PURCHASEORDER_PROCESS_SRV'],
          isAvailable: true,
        });
      }

      return {
        erpSystem: 'SAP',
        version: await this.getSystemVersion(),
        discoveredAt: new Date(),
        services,
        capabilities,
      };
    } catch (error) {
      throw new FrameworkError(
        'Failed to discover SAP services',
        'SERVICE_DISCOVERY_ERROR',
        500,
        true,
        error
      );
    }
  }

  // ============================================
  // User & Role Methods (Universal Interface)
  // ============================================

  async getUsers(filter: ERPUserFilter): Promise<ERPUser[]> {
    const query = new ODataQueryBuilder();

    if (filter.activeOnly) {
      query.filter("IsLocked eq false");
    }

    if (filter.userIds && filter.userIds.length > 0) {
      const userFilter = filter.userIds
        .map((id) => `UserID eq ${escapeODataString(id)}`)
        .join(' or ');
      query.filter(`(${userFilter})`);
    }

    if (filter.searchTerm) {
      query.filter(
        `(substringof(${escapeODataString(filter.searchTerm)}, UserName) or ` +
        `substringof(${escapeODataString(filter.searchTerm)}, FirstName) or ` +
        `substringof(${escapeODataString(filter.searchTerm)}, LastName))`
      );
    }

    if (filter.limit) {
      query.top(filter.limit);
    }

    if (filter.offset) {
      query.skip(filter.offset);
    }

    const sapUsers = await this.executeQuery<S4HANAUser>(
      '/sap/opu/odata/sap/API_USER_SRV/Users',
      query
    );

    // Normalize SAP users to universal ERPUser format
    return sapUsers.map((sapUser) => erpDataNormalizer.normalizeUser(sapUser, 'SAP'));
  }

  async getUserById(userId: string): Promise<ERPUser> {
    const query = new ODataQueryBuilder();
    query.filter(`UserID eq ${escapeODataString(userId)}`);

    const sapUsers = await this.executeQuery<S4HANAUser>(
      '/sap/opu/odata/sap/API_USER_SRV/Users',
      query
    );

    if (sapUsers.length === 0) {
      throw new NotFoundError(`User ${userId} not found`);
    }

    return erpDataNormalizer.normalizeUser(sapUsers[0], 'SAP');
  }

  async getUserRoles(userId: string): Promise<ERPRole[]> {
    const query = new ODataQueryBuilder();
    query.filter(`UserID eq ${escapeODataString(userId)}`);

    const userRoles = await this.executeQuery<S4HANAUserRole>(
      '/sap/opu/odata/sap/API_USER_ROLE_SRV/UserRoles',
      query
    );

    // Get full role details
    const roleIds = userRoles.map((ur) => ur.RoleID);
    if (roleIds.length === 0) {
      return [];
    }

    const sapRoles = await this.getSAPRoles({ roleIds });

    // Normalize SAP roles to universal ERPRole format
    return sapRoles.map((sapRole) => erpDataNormalizer.normalizeRole(sapRole, 'SAP'));
  }

  async getUserPermissions(userId: string): Promise<ERPPermission[]> {
    // In SAP, permissions are derived from roles
    // This would require querying role authorizations
    // For now, return empty array - can be enhanced with AGR_1251 table queries
    const roles = await this.getUserRoles(userId);

    // Flatten all permissions from all roles
    const permissions: ERPPermission[] = [];
    roles.forEach((role) => {
      permissions.push(...role.permissions);
    });

    return permissions;
  }

  async getAllRoles(): Promise<ERPRole[]> {
    const query = new ODataQueryBuilder();
    const sapRoles = await this.executeQuery<S4HANARole>(
      '/sap/opu/odata/sap/API_ROLE_SRV/Roles',
      query
    );

    return sapRoles.map((sapRole) => erpDataNormalizer.normalizeRole(sapRole, 'SAP'));
  }

  // ============================================
  // SAP-Specific Helper Methods (Internal)
  // ============================================

  /**
   * Get SAP roles (SAP-specific format, for internal use)
   */
  private async getSAPRoles(options: {
    roleIds?: string[];
    roleType?: string;
  }): Promise<S4HANARole[]> {
    const query = new ODataQueryBuilder();

    if (options.roleIds && options.roleIds.length > 0) {
      const roleFilter = options.roleIds
        .map((id) => `RoleID eq ${escapeODataString(id)}`)
        .join(' or ');
      query.filter(`(${roleFilter})`);
    }

    if (options.roleType) {
      query.filter(`RoleType eq ${escapeODataString(options.roleType)}`);
    }

    return await this.executeQuery<S4HANARole>(
      '/sap/opu/odata/sap/API_ROLE_SRV/Roles',
      query
    );
  }

  /**
   * Get SAP user-role assignments (SAP-specific format, for internal use)
   */
  private async getSAPUserRoles(options: {
    activeOnly?: boolean;
    userIds?: string[];
    roleIds?: string[];
  }): Promise<S4HANAUserRole[]> {
    const query = new ODataQueryBuilder();

    const filters: string[] = [];

    if (options.activeOnly) {
      const now = new Date().toISOString();
      filters.push(`ValidFrom le datetime'${now}'`);
      filters.push(`ValidTo ge datetime'${now}'`);
    }

    if (options.userIds && options.userIds.length > 0) {
      const userFilter = options.userIds
        .map((id) => `UserID eq ${escapeODataString(id)}`)
        .join(' or ');
      filters.push(`(${userFilter})`);
    }

    if (options.roleIds && options.roleIds.length > 0) {
      const roleFilter = options.roleIds
        .map((id) => `RoleID eq ${escapeODataString(id)}`)
        .join(' or ');
      filters.push(`(${roleFilter})`);
    }

    filters.forEach((f) => query.filter(f));

    return await this.executeQuery<S4HANAUserRole>(
      '/sap/opu/odata/sap/API_USER_ROLE_SRV/UserRoles',
      query
    );
  }

  // ============================================
  // Financial Data Methods (Universal Interface)
  // ============================================

  async getGLEntries(filter: GLEntryFilter): Promise<ERPGLEntry[]> {
    const query = new ODataQueryBuilder();
    const filters: string[] = [];

    // Note: SAP requires fiscal year, we'll derive from fromDate or use current year
    const fiscalYear = filter.fromDate
      ? filter.fromDate.getFullYear().toString()
      : new Date().getFullYear().toString();

    filters.push(`FiscalYear eq ${escapeODataString(fiscalYear)}`);

    if (filter.accountCodes && filter.accountCodes.length > 0) {
      const glFilter = filter.accountCodes
        .map((gl) => `GLAccount eq ${escapeODataString(gl)}`)
        .join(' or ');
      filters.push(`(${glFilter})`);
    }

    if (filter.fromDate) {
      const dateStr = filter.fromDate.toISOString().split('T')[0];
      filters.push(`PostingDate ge datetime'${dateStr}'`);
    }

    if (filter.toDate) {
      const dateStr = filter.toDate.toISOString().split('T')[0];
      filters.push(`PostingDate le datetime'${dateStr}'`);
    }

    if (filter.companyCode) {
      filters.push(`CompanyCode eq ${escapeODataString(filter.companyCode)}`);
    }

    if (filter.costCenters && filter.costCenters.length > 0) {
      const ccFilter = filter.costCenters
        .map((cc) => `CostCenter eq ${escapeODataString(cc)}`)
        .join(' or ');
      filters.push(`(${ccFilter})`);
    }

    if (filter.limit) {
      query.top(filter.limit);
    }

    if (filter.offset) {
      query.skip(filter.offset);
    }

    filters.forEach((f) => query.filter(f));

    const sapGLEntries = await this.executeQuery<any>(
      '/sap/opu/odata/sap/API_JOURNALENTRY_SRV/A_JournalEntryItem',
      query
    );

    // Normalize to universal ERPGLEntry format
    return sapGLEntries.map((entry) => erpDataNormalizer.normalizeGLEntry(entry, 'SAP'));
  }

  async getInvoices(filter: InvoiceFilter): Promise<ERPInvoice[]> {
    const query = new ODataQueryBuilder();
    const filters: string[] = [];

    if (filter.documentNumbers && filter.documentNumbers.length > 0) {
      const invFilter = filter.documentNumbers
        .map((inv) => `SupplierInvoice eq ${escapeODataString(inv)}`)
        .join(' or ');
      filters.push(`(${invFilter})`);
    }

    if (filter.vendorIds && filter.vendorIds.length > 0) {
      const supplierFilter = filter.vendorIds
        .map((sup) => `Supplier eq ${escapeODataString(sup)}`)
        .join(' or ');
      filters.push(`(${supplierFilter})`);
    }

    if (filter.fromDate) {
      const dateStr = filter.fromDate.toISOString().split('T')[0];
      filters.push(`InvoicingDate ge datetime'${dateStr}'`);
    }

    if (filter.toDate) {
      const dateStr = filter.toDate.toISOString().split('T')[0];
      filters.push(`InvoicingDate le datetime'${dateStr}'`);
    }

    if (filter.statuses && filter.statuses.length > 0) {
      const statusFilter = filter.statuses
        .map((status) => `SupplierInvoiceStatus eq ${escapeODataString(status)}`)
        .join(' or ');
      filters.push(`(${statusFilter})`);
    }

    if (filter.limit) {
      query.top(filter.limit);
    }

    if (filter.offset) {
      query.skip(filter.offset);
    }

    filters.forEach((f) => query.filter(f));

    const sapInvoices = await this.executeQuery<import('./types').S4HANASupplierInvoice>(
      '/sap/opu/odata/sap/API_SUPPLIERINVOICE_PROCESS_SRV/A_SupplierInvoice',
      query
    );

    // Normalize to universal ERPInvoice format
    return sapInvoices.map((inv) => erpDataNormalizer.normalizeInvoice(inv, 'SAP'));
  }

  async getPurchaseOrders(filter: PurchaseOrderFilter): Promise<ERPPurchaseOrder[]> {
    const query = new ODataQueryBuilder();
    const filters: string[] = [];

    if (filter.poNumbers && filter.poNumbers.length > 0) {
      const poFilter = filter.poNumbers
        .map((po) => `PurchaseOrder eq ${escapeODataString(po)}`)
        .join(' or ');
      filters.push(`(${poFilter})`);
    }

    if (filter.vendorIds && filter.vendorIds.length > 0) {
      const supplierFilter = filter.vendorIds
        .map((sup) => `Supplier eq ${escapeODataString(sup)}`)
        .join(' or ');
      filters.push(`(${supplierFilter})`);
    }

    if (filter.fromDate) {
      const dateStr = filter.fromDate.toISOString().split('T')[0];
      filters.push(`PurchaseOrderDate ge datetime'${dateStr}'`);
    }

    if (filter.toDate) {
      const dateStr = filter.toDate.toISOString().split('T')[0];
      filters.push(`PurchaseOrderDate le datetime'${dateStr}'`);
    }

    if (filter.statuses && filter.statuses.length > 0) {
      const statusFilter = filter.statuses
        .map((status) => `PurchasingDocumentStatus eq ${escapeODataString(status)}`)
        .join(' or ');
      filters.push(`(${statusFilter})`);
    }

    if (filter.limit) {
      query.top(filter.limit);
    }

    if (filter.offset) {
      query.skip(filter.offset);
    }

    filters.forEach((f) => query.filter(f));

    const sapPOs = await this.executeQuery<import('./types').S4HANAPurchaseOrder>(
      '/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder',
      query
    );

    // Normalize to universal ERPPurchaseOrder format
    return sapPOs.map((po) => erpDataNormalizer.normalizePurchaseOrder(po, 'SAP'));
  }

  // ============================================
  // Vendor/Supplier Methods (Universal Interface)
  // ============================================

  async getVendors(filter: VendorFilter): Promise<ERPVendor[]> {
    const query = new ODataQueryBuilder();
    const filters: string[] = [];

    // Filter for vendors only (BusinessPartnerCategory = '2')
    filters.push(`BusinessPartnerCategory eq '2'`);

    if (filter.vendorIds && filter.vendorIds.length > 0) {
      const bpFilter = filter.vendorIds
        .map((bp) => `BusinessPartner eq ${escapeODataString(bp)}`)
        .join(' or ');
      filters.push(`(${bpFilter})`);
    }

    if (filter.searchTerm) {
      filters.push(
        `(substringof(${escapeODataString(filter.searchTerm)}, BusinessPartnerFullName) or ` +
        `substringof(${escapeODataString(filter.searchTerm)}, BusinessPartner))`
      );
    }

    if (filter.activeOnly !== undefined) {
      const isBlocked = !filter.activeOnly;
      filters.push(`IsBlocked eq ${isBlocked ? 'true' : 'false'}`);
    }

    if (filter.limit) {
      query.top(filter.limit);
    }

    if (filter.offset) {
      query.skip(filter.offset);
    }

    filters.forEach((f) => query.filter(f));

    const sapVendors = await this.executeQuery<any>(
      '/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner',
      query
    );

    // Normalize to universal ERPVendor format
    return sapVendors.map((vendor) => erpDataNormalizer.normalizeVendor(vendor, 'SAP'));
  }

  async getVendorById(vendorId: string): Promise<ERPVendor> {
    const query = new ODataQueryBuilder();
    query.filter(`BusinessPartner eq ${escapeODataString(vendorId)}`);
    query.filter(`BusinessPartnerCategory eq '2'`);

    const sapVendors = await this.executeQuery<any>(
      '/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner',
      query
    );

    if (sapVendors.length === 0) {
      throw new NotFoundError(`Vendor ${vendorId} not found`);
    }

    return erpDataNormalizer.normalizeVendor(sapVendors[0], 'SAP');
  }

  // ============================================
  // SAP-Specific Methods (Kept for backward compatibility)
  // ============================================

  /**
   * @deprecated Use getVendors() instead
   * Get business partners (vendors) - SAP-specific format
   */
  async getBusinessPartners(options: {
    businessPartnerIds?: string[];
    countries?: string[];
    isBlocked?: boolean;
  }): Promise<any[]> {
    const query = new ODataQueryBuilder();

    const filters: string[] = [];

    // Filter for vendors only (BusinessPartnerCategory = '2')
    filters.push(`BusinessPartnerCategory eq '2'`);

    if (options.businessPartnerIds && options.businessPartnerIds.length > 0) {
      const bpFilter = options.businessPartnerIds
        .map((bp) => `BusinessPartner eq ${escapeODataString(bp)}`)
        .join(' or ');
      filters.push(`(${bpFilter})`);
    }

    if (options.countries && options.countries.length > 0) {
      const countryFilter = options.countries
        .map((country) => `Country eq ${escapeODataString(country)}`)
        .join(' or ');
      filters.push(`(${countryFilter})`);
    }

    if (options.isBlocked !== undefined) {
      filters.push(`IsBlocked eq ${options.isBlocked ? 'true' : 'false'}`);
    }

    filters.forEach((f) => query.filter(f));

    // API_BUSINESS_PARTNER - A_BusinessPartner entity
    return await this.executeQuery<any>(
      '/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner',
      query
    );
  }

  /**
   * Get Goods Receipts (Material Documents) - SAP-specific
   * Used for 3-way matching (PO-GR-IV)
   */
  async getGoodsReceipts(options: {
    grNumbers?: string[];
    poNumbers?: string[];
    fromDate?: Date;
    toDate?: Date;
    movementType?: string;
  }): Promise<import('./types').S4HANAGoodsReceipt[]> {
    const query = new ODataQueryBuilder();

    const filters: string[] = [];

    if (options.grNumbers && options.grNumbers.length > 0) {
      const grFilter = options.grNumbers
        .map((gr) => `MaterialDocument eq ${escapeODataString(gr)}`)
        .join(' or ');
      filters.push(`(${grFilter})`);
    }

    if (options.poNumbers && options.poNumbers.length > 0) {
      const poFilter = options.poNumbers
        .map((po) => `PurchaseOrder eq ${escapeODataString(po)}`)
        .join(' or ');
      filters.push(`(${poFilter})`);
    }

    if (options.fromDate) {
      const dateStr = options.fromDate.toISOString().split('T')[0];
      filters.push(`PostingDate ge datetime'${dateStr}'`);
    }

    if (options.toDate) {
      const dateStr = options.toDate.toISOString().split('T')[0];
      filters.push(`PostingDate le datetime'${dateStr}'`);
    }

    if (options.movementType) {
      filters.push(`GoodsMovementType eq ${escapeODataString(options.movementType)}`);
    }

    filters.forEach((f) => query.filter(f));

    return await this.executeQuery<import('./types').S4HANAGoodsReceipt>(
      '/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentItem',
      query
    );
  }

  /**
   * @deprecated Use getGLEntries() instead
   * Get GL line items - SAP-specific format
   */
  async getGLLineItems(options: {
    glAccounts?: string[];
    fiscalYear: string;
    fiscalPeriod?: string;
    fromDate?: Date;
    toDate?: Date;
    companyCode?: string;
  }): Promise<any[]> {
    const query = new ODataQueryBuilder();

    const filters: string[] = [];

    // Fiscal year is required
    filters.push(`FiscalYear eq ${escapeODataString(options.fiscalYear)}`);

    if (options.glAccounts && options.glAccounts.length > 0) {
      const glFilter = options.glAccounts
        .map((gl) => `GLAccount eq ${escapeODataString(gl)}`)
        .join(' or ');
      filters.push(`(${glFilter})`);
    }

    if (options.fiscalPeriod) {
      filters.push(`FiscalPeriod eq ${escapeODataString(options.fiscalPeriod)}`);
    }

    if (options.fromDate) {
      const dateStr = options.fromDate.toISOString().split('T')[0];
      filters.push(`PostingDate ge datetime'${dateStr}'`);
    }

    if (options.toDate) {
      const dateStr = options.toDate.toISOString().split('T')[0];
      filters.push(`PostingDate le datetime'${dateStr}'`);
    }

    if (options.companyCode) {
      filters.push(`CompanyCode eq ${escapeODataString(options.companyCode)}`);
    }

    filters.forEach((f) => query.filter(f));

    // API_JOURNALENTRY_SRV - A_JournalEntryItem entity
    return await this.executeQuery<any>(
      '/sap/opu/odata/sap/API_JOURNALENTRY_SRV/A_JournalEntryItem',
      query
    );
  }

  // ============================================
  // Utility Methods
  // ============================================

  async executeQuery<T>(
    endpoint: string,
    queryBuilder: ODataQueryBuilder
  ): Promise<T[]> {
    const queryString = queryBuilder.build();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    return await this.circuitBreaker.execute(async () => {
      return await this.retryStrategy.executeWithRetry(
        async () => {
          const response = await this.request<S4HANAODataResponse<T>>({
            method: 'GET',
            url: url,
          });

          return response.d.results;
        },
        this.getRetryConfig()
      );
    });
  }

  async executeBatch(_requests: S4HANABatchRequest[]): Promise<S4HANABatchResponse[]> {
    if (!this.config.odata?.useBatch) {
      throw new ValidationError('Batch operations not enabled in configuration');
    }

    throw new Error('Batch operations not yet implemented');
  }

  // ============================================
  // Authentication (inherited from BaseERPConnector)
  // ============================================

  protected async getAuthToken(): Promise<string> {
    // Token caching is now handled by BaseERPConnector
    if (this.tokenCache && !this.isTokenExpired()) {
      return this.tokenCache.token;
    }

    try {
      const tokenResponse = await this.acquireOAuthToken();

      this.tokenCache = {
        token: tokenResponse.access_token,
        expiry: Date.now() + tokenResponse.expires_in * 1000,
      };

      return tokenResponse.access_token;
    } catch (error) {
      throw new AuthenticationError('Failed to acquire SAP OAuth token', error);
    }
  }

  private async acquireOAuthToken(): Promise<{
    access_token: string;
    expires_in: number;
  }> {
    const { type, credentials, endpoints } = this.config.auth;

    if (type === 'OAUTH2') {
      // SAP OAuth2 token acquisition
      const response = await this.client.post(
        endpoints?.tokenUrl || '/sap/bc/sec/oauth2/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: credentials.clientId as string,
          client_secret: credentials.clientSecret as string,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      return response.data;
    }

    throw new AuthenticationError(`Unsupported auth type: ${type}`);
  }

  // ============================================
  // Error Handling
  // ============================================

  private mapSAPError(error: unknown): FrameworkError {
    const err = error as {
      response?: {
        status?: number;
        data?: {
          error?: {
            message?: { value?: string };
            code?: string;
          };
        };
      };
      message?: string;
    };
    const status = err.response?.status;
    const sapError = err.response?.data?.error;

    switch (status) {
      case 400:
        return new ValidationError(
          sapError?.message?.value || 'Invalid request',
          sapError
        );

      case 401:
        return new AuthenticationError(
          sapError?.message?.value || 'Authentication failed',
          sapError
        );

      case 403:
        return new ValidationError(
          sapError?.message?.value || 'Insufficient permissions',
          sapError
        );

      case 404:
        return new NotFoundError(
          sapError?.message?.value || 'Resource not found',
          sapError
        );

      case 429:
        return new FrameworkError(
          'Rate limit exceeded',
          'RATE_LIMIT',
          429,
          true,
          sapError
        );

      case 500:
      case 502:
      case 503:
      case 504:
        return new FrameworkError(
          sapError?.message?.value || 'SAP system error',
          'SAP_ERROR',
          status,
          true,
          sapError
        );

      default:
        return new FrameworkError(
          err.message || 'Unknown error',
          'UNKNOWN',
          status || 500,
          false,
          sapError
        );
    }
  }

  private getRetryConfig(): LocalRetryConfig {
    const defaults: LocalRetryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      backoffStrategy: 'EXPONENTIAL',
      timeout: 30000,
    };

    return {
      ...defaults,
      ...(this.config.retry as LocalRetryConfig),
    };
  }

  getCircuitBreakerState() {
    return this.circuitBreaker.getMetrics();
  }

  resetCircuitBreaker() {
    this.circuitBreaker.reset();
  }
}