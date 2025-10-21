/**
 * S/4HANA Connector - SAP S/4HANA Cloud/On-Premise
 */

import { BaseSAPConnector, SAPConnectorConfig } from '../base/BaseSAPConnector';
import {
  S4HANAUser,
  S4HANARole,
  S4HANAUserRole,
  S4HANAODataResponse,
  S4HANABatchRequest,
  S4HANABatchResponse,
} from './types';
import { ODataQueryBuilder, escapeODataString } from '../../utils/odata';
import { RetryStrategy, RetryConfig } from '../../utils/retry';
import { CircuitBreaker, CircuitBreakerConfig } from '../../utils/circuitBreaker';
import {
  AuthenticationError,
  ValidationError,
  NotFoundError,
  FrameworkError,
} from '../../errors';

export interface S4HANAConnectorConfig extends SAPConnectorConfig {
  odata?: {
    useBatch?: boolean;
    batchSize?: number;
  };
  retry?: RetryConfig;
  circuitBreaker?: CircuitBreakerConfig;
}

export class S4HANAConnector extends BaseSAPConnector {
  protected declare config: S4HANAConnectorConfig;
  
  private retryStrategy: RetryStrategy;
  private circuitBreaker: CircuitBreaker;
  private tokenCache: { token: string; expiry: number } | null = null;

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

  async getUserRoles(options: {
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

  async getUsers(options: {
    activeOnly?: boolean;
    userIds?: string[];
  }): Promise<S4HANAUser[]> {
    const query = new ODataQueryBuilder();

    if (options.activeOnly) {
      query.filter("IsLocked eq false");
    }

    if (options.userIds && options.userIds.length > 0) {
      const userFilter = options.userIds
        .map((id) => `UserID eq ${escapeODataString(id)}`)
        .join(' or ');
      query.filter(`(${userFilter})`);
    }

    return await this.executeQuery<S4HANAUser>(
      '/sap/opu/odata/sap/API_USER_SRV/Users',
      query
    );
  }

  async getRoles(options: {
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
   * Get Purchase Orders
   */
  async getPurchaseOrders(options: {
    poNumbers?: string[];
    suppliers?: string[];
    fromDate?: Date;
    toDate?: Date;
    status?: string;
  }): Promise<import('./types').S4HANAPurchaseOrder[]> {
    const query = new ODataQueryBuilder();

    const filters: string[] = [];

    if (options.poNumbers && options.poNumbers.length > 0) {
      const poFilter = options.poNumbers
        .map((po) => `PurchaseOrder eq ${escapeODataString(po)}`)
        .join(' or ');
      filters.push(`(${poFilter})`);
    }

    if (options.suppliers && options.suppliers.length > 0) {
      const supplierFilter = options.suppliers
        .map((sup) => `Supplier eq ${escapeODataString(sup)}`)
        .join(' or ');
      filters.push(`(${supplierFilter})`);
    }

    if (options.fromDate) {
      const dateStr = options.fromDate.toISOString().split('T')[0];
      filters.push(`PurchaseOrderDate ge datetime'${dateStr}'`);
    }

    if (options.toDate) {
      const dateStr = options.toDate.toISOString().split('T')[0];
      filters.push(`PurchaseOrderDate le datetime'${dateStr}'`);
    }

    if (options.status) {
      filters.push(`PurchasingDocumentStatus eq ${escapeODataString(options.status)}`);
    }

    filters.forEach((f) => query.filter(f));

    return await this.executeQuery<import('./types').S4HANAPurchaseOrder>(
      '/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder',
      query
    );
  }

  /**
   * Get Goods Receipts (Material Documents)
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
   * Get Supplier Invoices
   */
  async getSupplierInvoices(options: {
    invoiceNumbers?: string[];
    suppliers?: string[];
    poNumbers?: string[];
    fromDate?: Date;
    toDate?: Date;
    status?: string;
  }): Promise<import('./types').S4HANASupplierInvoice[]> {
    const query = new ODataQueryBuilder();

    const filters: string[] = [];

    if (options.invoiceNumbers && options.invoiceNumbers.length > 0) {
      const invFilter = options.invoiceNumbers
        .map((inv) => `SupplierInvoice eq ${escapeODataString(inv)}`)
        .join(' or ');
      filters.push(`(${invFilter})`);
    }

    if (options.suppliers && options.suppliers.length > 0) {
      const supplierFilter = options.suppliers
        .map((sup) => `Supplier eq ${escapeODataString(sup)}`)
        .join(' or ');
      filters.push(`(${supplierFilter})`);
    }

    if (options.poNumbers && options.poNumbers.length > 0) {
      const poFilter = options.poNumbers
        .map((po) => `PurchaseOrder eq ${escapeODataString(po)}`)
        .join(' or ');
      filters.push(`(${poFilter})`);
    }

    if (options.fromDate) {
      const dateStr = options.fromDate.toISOString().split('T')[0];
      filters.push(`InvoicingDate ge datetime'${dateStr}'`);
    }

    if (options.toDate) {
      const dateStr = options.toDate.toISOString().split('T')[0];
      filters.push(`InvoicingDate le datetime'${dateStr}'`);
    }

    if (options.status) {
      filters.push(`SupplierInvoiceStatus eq ${escapeODataString(options.status)}`);
    }

    filters.forEach((f) => query.filter(f));

    return await this.executeQuery<import('./types').S4HANASupplierInvoice>(
      '/sap/opu/odata/sap/API_SUPPLIERINVOICE_PROCESS_SRV/A_SupplierInvoice',
      query
    );
  }

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

  // Shadow parent config with correct type
  
  protected async getAuthToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiry) {
      return this.tokenCache.token;
    }

    try {
      const tokenResponse = await this.acquireOAuthToken();

      this.tokenCache = {
        token: tokenResponse.access_token,
        expiry: Date.now() + (tokenResponse.expires_in - 300) * 1000,
      };

      return tokenResponse.access_token;
    } catch (error) {
      throw new AuthenticationError('Failed to acquire OAuth token', error);
    }
  }

  private async acquireOAuthToken(): Promise<{
    access_token: string;
    expires_in: number;
  }> {
    const { type } = this.config.auth;

    if (type === 'OAUTH') {
      throw new Error('OAuth token acquisition not implemented');
    }

    throw new AuthenticationError(`Unsupported auth type: ${type}`);
  }

  protected mapSAPError(error: unknown): FrameworkError {
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

  protected getHealthCheckEndpoint(): string {
    return '/sap/opu/odata/iwfnd/catalogservice;v=2';
  }

  private getRetryConfig(): RetryConfig {
    const defaults: RetryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      backoffStrategy: 'EXPONENTIAL',
      timeout: 30000,
    };

    return {
      ...defaults,
      ...this.config.retry,
    };
  }

  getCircuitBreakerState() {
    return this.circuitBreaker.getMetrics();
  }

  resetCircuitBreaker() {
    this.circuitBreaker.reset();
  }

  /**
   * Get GL line items
   * Uses API_JOURNALENTRY_SRV OData service
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

  /**
   * Get business partners (vendors)
   * Uses API_BUSINESS_PARTNER OData service
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
}