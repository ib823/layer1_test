/**
 * Microsoft Dynamics 365 Finance & Operations Connector
 *
 * Supports: Dynamics 365 F&O, Dynamics 365 Business Central
 * Authentication: Microsoft Entra ID (Azure AD) OAuth 2.0
 * Protocol: OData v4
 *
 * @module connectors/dynamics
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
import {
  DynamicsUser,
  DynamicsRole,
  DynamicsGLEntry,
  DynamicsInvoice,
  DynamicsPurchaseOrder,
  DynamicsVendor,
  DynamicsODataResponse,
} from './types';

export interface Dynamics365ConnectorConfig extends ERPConnectorConfig {
  /**
   * Dynamics 365 specific configuration
   */
  dynamics?: {
    /** Azure AD tenant ID */
    tenantId?: string;
    /** Dynamics 365 instance name */
    instanceName?: string;
    /** Resource URL for token acquisition */
    resource?: string;
    /** Legal entity (company) filter */
    legalEntity?: string;
  };
}

/**
 * Microsoft Dynamics 365 Finance & Operations Connector
 */
export class Dynamics365Connector extends BaseERPConnector {
  protected declare config: Dynamics365ConnectorConfig;
  private retryStrategy: RetryStrategy;
  private circuitBreaker: CircuitBreaker;

  constructor(config: Dynamics365ConnectorConfig) {
    super(config);

    this.retryStrategy = new RetryStrategy();
    this.circuitBreaker = new CircuitBreaker(
      config.circuitBreaker || {
        failureThreshold: 5,
        successThreshold: 2,
        resetTimeout: 60000,
        name: 'Dynamics365',
      }
    );
  }

  // ============================================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ============================================

  getSystemType(): ERPSystem {
    return 'Dynamics';
  }

  async getSystemVersion(): Promise<ERPVersion> {
    try {
      // Query Dynamics version via OData metadata
      const response = await this.request<any>({
        method: 'GET',
        url: '/data/$metadata',
      });

      // Extract version from metadata or headers
      // For now, return default Dynamics 365 version
      return {
        major: '10',
        minor: '0',
        patch: '0',
      };
    } catch (error) {
      // Fallback version
      return {
        major: '10',
        minor: '0',
      };
    }
  }

  protected async getAuthToken(): Promise<string> {
    if (this.tokenCache && !this.isTokenExpired()) {
      return this.tokenCache.token;
    }

    try {
      const { credentials, endpoints } = this.config.auth;
      const tenantId = this.config.dynamics?.tenantId;
      const resource = this.config.dynamics?.resource || this.config.baseUrl;

      // Microsoft Entra ID (Azure AD) OAuth2 token endpoint
      const tokenUrl =
        endpoints?.tokenUrl ||
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

      const response = await this.client.post(
        tokenUrl,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: credentials.clientId as string,
          client_secret: credentials.clientSecret as string,
          scope: `${resource}/.default`,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      const { access_token, expires_in } = response.data;

      this.tokenCache = {
        token: access_token,
        expiry: Date.now() + expires_in * 1000,
      };

      return access_token;
    } catch (error: any) {
      throw new AuthenticationError(
        `Dynamics 365 authentication failed: ${error.message}`,
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
    const message =
      error.response?.data?.error?.message?.value ||
      error.response?.data?.error?.message ||
      error.message;

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
      'DYNAMICS_ERROR',
      status || 500,
      true,
      { originalError: error }
    );
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      // Dynamics 365 health check via OData metadata
      await this.request({
        method: 'GET',
        url: '/data/$metadata',
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
      // Dynamics 365 service discovery via OData metadata
      const response = await this.request<string>({
        method: 'GET',
        url: '/data/$metadata',
      });

      // Parse metadata XML to extract entity sets
      // For now, return common Dynamics entities
      const services = [
        {
          id: 'GeneralLedgerEntries',
          name: 'General Ledger Entries',
          endpoint: '/data/GeneralLedgerEntries',
          protocol: 'ODATA' as const,
          isAvailable: true,
        },
        {
          id: 'VendorInvoices',
          name: 'Vendor Invoices',
          endpoint: '/data/VendorInvoices',
          protocol: 'ODATA' as const,
          isAvailable: true,
        },
        {
          id: 'PurchaseOrders',
          name: 'Purchase Orders',
          endpoint: '/data/PurchaseOrders',
          protocol: 'ODATA' as const,
          isAvailable: true,
        },
        {
          id: 'Vendors',
          name: 'Vendors',
          endpoint: '/data/Vendors',
          protocol: 'ODATA' as const,
          isAvailable: true,
        },
      ];

      const capabilities = [
        {
          id: 'gl-analytics',
          name: 'General Ledger Analytics',
          category: 'FINANCIAL' as const,
          requiredServices: ['GeneralLedgerEntries'],
          isAvailable: true,
        },
        {
          id: 'procurement',
          name: 'Procurement Analytics',
          category: 'PROCUREMENT' as const,
          requiredServices: ['PurchaseOrders', 'VendorInvoices'],
          isAvailable: true,
        },
      ];

      return {
        erpSystem: 'Dynamics',
        version: await this.getSystemVersion(),
        discoveredAt: new Date(),
        services,
        capabilities,
      };
    } catch (error) {
      throw new FrameworkError(
        `Failed to discover Dynamics 365 services: ${(error as Error).message}`,
        'DISCOVERY_FAILED',
        500,
        true,
        error
      );
    }
  }

  // ============================================
  // USER & ROLE METHODS (Universal Interface)
  // ============================================

  async getUsers(filter: ERPUserFilter): Promise<ERPUser[]> {
    const filters: string[] = [];

    if (filter.activeOnly) {
      filters.push('isdisabled eq false');
    }

    if (filter.userIds && filter.userIds.length > 0) {
      const userFilter = filter.userIds
        .map((id) => `systemuserid eq ${id}`)
        .join(' or ');
      filters.push(`(${userFilter})`);
    }

    if (filter.searchTerm) {
      filters.push(
        `(contains(fullname,'${filter.searchTerm}') or contains(domainname,'${filter.searchTerm}'))`
      );
    }

    const queryParams: string[] = [];
    if (filters.length > 0) {
      queryParams.push(`$filter=${filters.join(' and ')}`);
    }
    if (filter.limit) {
      queryParams.push(`$top=${filter.limit}`);
    }
    if (filter.offset) {
      queryParams.push(`$skip=${filter.offset}`);
    }

    const query = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    const response = await this.request<DynamicsODataResponse<DynamicsUser>>({
      method: 'GET',
      url: `/data/SystemUsers${query}`,
    });

    const dynamicsUsers = response.value || [];
    return dynamicsUsers.map((user) => erpDataNormalizer.normalizeUser(user, 'Dynamics'));
  }

  async getUserById(userId: string): Promise<ERPUser> {
    const response = await this.request<DynamicsUser>({
      method: 'GET',
      url: `/data/SystemUsers(${userId})`,
    });

    if (!response) {
      throw new NotFoundError(`User ${userId} not found`);
    }

    return erpDataNormalizer.normalizeUser(response, 'Dynamics');
  }

  async getUserRoles(userId: string): Promise<ERPRole[]> {
    // In Dynamics, roles are associated via systemuserroles_association
    const response = await this.request<DynamicsODataResponse<DynamicsRole>>({
      method: 'GET',
      url: `/data/SystemUsers(${userId})/systemuserroles_association`,
    });

    const dynamicsRoles = response.value || [];
    return dynamicsRoles.map((role) => erpDataNormalizer.normalizeRole(role, 'Dynamics'));
  }

  async getUserPermissions(userId: string): Promise<ERPPermission[]> {
    // In Dynamics, permissions are derived from roles
    const roles = await this.getUserRoles(userId);

    const permissions: ERPPermission[] = [];
    roles.forEach((role) => {
      permissions.push(...role.permissions);
    });

    return permissions;
  }

  async getAllRoles(): Promise<ERPRole[]> {
    const response = await this.request<DynamicsODataResponse<DynamicsRole>>({
      method: 'GET',
      url: '/data/Roles',
    });

    const dynamicsRoles = response.value || [];
    return dynamicsRoles.map((role) => erpDataNormalizer.normalizeRole(role, 'Dynamics'));
  }

  // ============================================
  // FINANCIAL DATA METHODS (Universal Interface)
  // ============================================

  async getGLEntries(filter: GLEntryFilter): Promise<ERPGLEntry[]> {
    const filters: string[] = [];

    if (filter.fromDate) {
      const dateStr = filter.fromDate.toISOString().split('T')[0];
      filters.push(`accountingdate ge ${dateStr}`);
    }

    if (filter.toDate) {
      const dateStr = filter.toDate.toISOString().split('T')[0];
      filters.push(`accountingdate le ${dateStr}`);
    }

    if (filter.accountCodes && filter.accountCodes.length > 0) {
      const accountFilter = filter.accountCodes
        .map((acc) => `accountnumber eq '${acc}'`)
        .join(' or ');
      filters.push(`(${accountFilter})`);
    }

    if (filter.companyCode) {
      filters.push(`dataareaid eq '${filter.companyCode}'`);
    }

    const queryParams: string[] = [];
    if (filters.length > 0) {
      queryParams.push(`$filter=${filters.join(' and ')}`);
    }
    if (filter.limit) {
      queryParams.push(`$top=${filter.limit}`);
    }
    if (filter.offset) {
      queryParams.push(`$skip=${filter.offset}`);
    }

    const query = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    const response = await this.request<DynamicsODataResponse<DynamicsGLEntry>>({
      method: 'GET',
      url: `/data/GeneralLedgerEntries${query}`,
    });

    const dynamicsEntries = response.value || [];
    return dynamicsEntries.map((entry) =>
      erpDataNormalizer.normalizeGLEntry(entry, 'Dynamics')
    );
  }

  async getInvoices(filter: InvoiceFilter): Promise<ERPInvoice[]> {
    const filters: string[] = [];

    if (filter.documentNumbers && filter.documentNumbers.length > 0) {
      const invFilter = filter.documentNumbers
        .map((inv) => `invoicenumber eq '${inv}'`)
        .join(' or ');
      filters.push(`(${invFilter})`);
    }

    if (filter.vendorIds && filter.vendorIds.length > 0) {
      const vendorFilter = filter.vendorIds
        .map((vid) => `_vendoraccount_value eq '${vid}'`)
        .join(' or ');
      filters.push(`(${vendorFilter})`);
    }

    if (filter.fromDate) {
      const dateStr = filter.fromDate.toISOString().split('T')[0];
      filters.push(`invoicedate ge ${dateStr}`);
    }

    if (filter.toDate) {
      const dateStr = filter.toDate.toISOString().split('T')[0];
      filters.push(`invoicedate le ${dateStr}`);
    }

    if (filter.statuses && filter.statuses.length > 0) {
      const statusFilter = filter.statuses
        .map((status) => `invoicestatus eq '${status}'`)
        .join(' or ');
      filters.push(`(${statusFilter})`);
    }

    const queryParams: string[] = [];
    if (filters.length > 0) {
      queryParams.push(`$filter=${filters.join(' and ')}`);
    }
    if (filter.limit) {
      queryParams.push(`$top=${filter.limit}`);
    }
    if (filter.offset) {
      queryParams.push(`$skip=${filter.offset}`);
    }

    const query = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    const response = await this.request<DynamicsODataResponse<DynamicsInvoice>>({
      method: 'GET',
      url: `/data/VendorInvoices${query}`,
    });

    const dynamicsInvoices = response.value || [];
    return dynamicsInvoices.map((inv) =>
      erpDataNormalizer.normalizeInvoice(inv, 'Dynamics')
    );
  }

  async getPurchaseOrders(filter: PurchaseOrderFilter): Promise<ERPPurchaseOrder[]> {
    const filters: string[] = [];

    if (filter.poNumbers && filter.poNumbers.length > 0) {
      const poFilter = filter.poNumbers
        .map((po) => `purchaseordernumber eq '${po}'`)
        .join(' or ');
      filters.push(`(${poFilter})`);
    }

    if (filter.vendorIds && filter.vendorIds.length > 0) {
      const vendorFilter = filter.vendorIds
        .map((vid) => `_vendoraccount_value eq '${vid}'`)
        .join(' or ');
      filters.push(`(${vendorFilter})`);
    }

    if (filter.fromDate) {
      const dateStr = filter.fromDate.toISOString().split('T')[0];
      filters.push(`orderdate ge ${dateStr}`);
    }

    if (filter.toDate) {
      const dateStr = filter.toDate.toISOString().split('T')[0];
      filters.push(`orderdate le ${dateStr}`);
    }

    if (filter.statuses && filter.statuses.length > 0) {
      const statusFilter = filter.statuses
        .map((status) => `purchaseorderstatus eq '${status}'`)
        .join(' or ');
      filters.push(`(${statusFilter})`);
    }

    const queryParams: string[] = [];
    if (filters.length > 0) {
      queryParams.push(`$filter=${filters.join(' and ')}`);
    }
    if (filter.limit) {
      queryParams.push(`$top=${filter.limit}`);
    }
    if (filter.offset) {
      queryParams.push(`$skip=${filter.offset}`);
    }

    const query = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    const response = await this.request<DynamicsODataResponse<DynamicsPurchaseOrder>>({
      method: 'GET',
      url: `/data/PurchaseOrders${query}`,
    });

    const dynamicsPOs = response.value || [];
    return dynamicsPOs.map((po) =>
      erpDataNormalizer.normalizePurchaseOrder(po, 'Dynamics')
    );
  }

  // ============================================
  // VENDOR/SUPPLIER METHODS (Universal Interface)
  // ============================================

  async getVendors(filter: VendorFilter): Promise<ERPVendor[]> {
    const filters: string[] = [];

    if (filter.vendorIds && filter.vendorIds.length > 0) {
      const vendorFilter = filter.vendorIds
        .map((vid) => `vendorid eq '${vid}'`)
        .join(' or ');
      filters.push(`(${vendorFilter})`);
    }

    if (filter.searchTerm) {
      filters.push(
        `(contains(vendorname,'${filter.searchTerm}') or contains(vendoraccountnumber,'${filter.searchTerm}'))`
      );
    }

    if (filter.activeOnly !== undefined) {
      const stateCode = filter.activeOnly ? 0 : 1;
      filters.push(`statecode eq ${stateCode}`);
    }

    const queryParams: string[] = [];
    if (filters.length > 0) {
      queryParams.push(`$filter=${filters.join(' and ')}`);
    }
    if (filter.limit) {
      queryParams.push(`$top=${filter.limit}`);
    }
    if (filter.offset) {
      queryParams.push(`$skip=${filter.offset}`);
    }

    const query = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    const response = await this.request<DynamicsODataResponse<DynamicsVendor>>({
      method: 'GET',
      url: `/data/Vendors${query}`,
    });

    const dynamicsVendors = response.value || [];
    return dynamicsVendors.map((vendor) =>
      erpDataNormalizer.normalizeVendor(vendor, 'Dynamics')
    );
  }

  async getVendorById(vendorId: string): Promise<ERPVendor> {
    const response = await this.request<DynamicsVendor>({
      method: 'GET',
      url: `/data/Vendors(${vendorId})`,
    });

    if (!response) {
      throw new NotFoundError(`Vendor ${vendorId} not found`);
    }

    return erpDataNormalizer.normalizeVendor(response, 'Dynamics');
  }
}
