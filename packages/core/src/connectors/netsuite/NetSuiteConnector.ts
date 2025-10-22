/**
 * NetSuite ERP Connector
 *
 * Supports: NetSuite ERP, NetSuite OneWorld
 * Authentication: Token-Based Authentication (TBA)
 * Protocol: REST API, SuiteQL
 *
 * @module connectors/netsuite
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
import * as crypto from 'crypto';
import {
  NetSuiteUser,
  NetSuiteRole,
  NetSuiteGLEntry,
  NetSuiteInvoice,
  NetSuitePurchaseOrder,
  NetSuiteVendor,
  NetSuiteRESTResponse,
  NetSuiteSuiteQLResponse,
} from './types';

export interface NetSuiteConnectorConfig extends ERPConnectorConfig {
  /**
   * NetSuite specific configuration
   */
  netsuite?: {
    /** NetSuite Account ID */
    accountId: string;
    /** Consumer Key (from Integration Record) */
    consumerKey: string;
    /** Consumer Secret (from Integration Record) */
    consumerSecret: string;
    /** Token ID (from Access Token) */
    tokenId: string;
    /** Token Secret (from Access Token) */
    tokenSecret: string;
    /** Subsidiary ID filter (for NetSuite OneWorld) */
    subsidiaryId?: string;
    /** API version */
    apiVersion?: string;
  };
}

/**
 * NetSuite ERP Connector
 */
export class NetSuiteConnector extends BaseERPConnector {
  protected declare config: NetSuiteConnectorConfig;
  private retryStrategy: RetryStrategy;
  private circuitBreaker: CircuitBreaker;

  constructor(config: NetSuiteConnectorConfig) {
    super(config);

    this.retryStrategy = new RetryStrategy();
    this.circuitBreaker = new CircuitBreaker(
      config.circuitBreaker || {
        failureThreshold: 5,
        successThreshold: 2,
        resetTimeout: 60000,
        name: 'NetSuite',
      }
    );
  }

  // ============================================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ============================================

  getSystemType(): ERPSystem {
    return 'NetSuite';
  }

  async getSystemVersion(): Promise<ERPVersion> {
    try {
      // NetSuite version can be queried via SuiteQL or RESTlet
      // For now, return a default version
      const apiVersion = this.config.netsuite?.apiVersion || '2023.2';
      const parts = apiVersion.split('.');

      return {
        major: parts[0] || '2023',
        minor: parts[1] || '2',
      };
    } catch (error) {
      return {
        major: '2023',
        minor: '2',
      };
    }
  }

  protected async getAuthToken(): Promise<string> {
    // NetSuite uses OAuth 1.0 signature-based auth, not token-based
    // We return a placeholder as actual auth is done via request headers
    return 'netsuite-tba';
  }

  protected getAuthHeaderName(): string {
    return 'Authorization';
  }

  protected formatAuthToken(token: string): string {
    // NetSuite uses OAuth 1.0 signature in Authorization header
    // This will be generated per-request in the request interceptor
    return token;
  }

  /**
   * Generate OAuth 1.0 signature for NetSuite TBA
   */
  private generateOAuthSignature(
    method: string,
    url: string,
    timestamp: string,
    nonce: string
  ): string {
    const {
      accountId,
      consumerKey,
      consumerSecret,
      tokenId,
      tokenSecret,
    } = this.config.netsuite!;

    // OAuth 1.0 parameters
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: consumerKey,
      oauth_token: tokenId,
      oauth_signature_method: 'HMAC-SHA256',
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: '1.0',
    };

    // Create base string
    const paramString = Object.keys(oauthParams)
      .sort()
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key])}`)
      .join('&');

    const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;

    // Create signing key
    const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

    // Generate signature
    const signature = crypto
      .createHmac('sha256', signingKey)
      .update(baseString)
      .digest('base64');

    // Build OAuth header
    const authHeader = `OAuth realm="${accountId}",` +
      Object.keys(oauthParams)
        .map((key) => `${key}="${encodeURIComponent(oauthParams[key])}"`)
        .join(',') +
      `,oauth_signature="${encodeURIComponent(signature)}"`;

    return authHeader;
  }

  /**
   * Override request method to add NetSuite-specific OAuth headers
   */
  protected async request<T>(config: any): Promise<T> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const fullUrl = `${this.config.baseUrl}${config.url}`;

    // Generate OAuth signature
    const authHeader = this.generateOAuthSignature(
      config.method || 'GET',
      fullUrl,
      timestamp,
      nonce
    );

    // Override authorization header
    config.headers = {
      ...config.headers,
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    };

    return super.request<T>(config);
  }

  protected mapError(error: any): FrameworkError {
    const status = error.response?.status;
    const message =
      error.response?.data?.['o:errorDetails']?.[0]?.detail ||
      error.response?.data?.message ||
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
      'NETSUITE_ERROR',
      status || 500,
      true,
      { originalError: error }
    );
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      // NetSuite health check via SuiteQL query
      await this.executeSuiteQL('SELECT TOP 1 id FROM employee WHERE ROWNUM <= 1');

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
      // NetSuite doesn't have a formal service discovery API
      // Return common NetSuite services
      const services = [
        {
          id: 'suiteql',
          name: 'SuiteQL Query Service',
          endpoint: '/services/rest/query/v1/suiteql',
          protocol: 'SUITEQL' as const,
          isAvailable: true,
        },
        {
          id: 'rest-record',
          name: 'REST Record API',
          endpoint: '/services/rest/record/v1',
          protocol: 'REST' as const,
          isAvailable: true,
        },
        {
          id: 'rest-metadata',
          name: 'REST Metadata Catalog',
          endpoint: '/services/rest/record/v1/metadata-catalog',
          protocol: 'REST' as const,
          isAvailable: true,
        },
      ];

      const capabilities = [
        {
          id: 'gl-analytics',
          name: 'General Ledger Analytics',
          category: 'FINANCIAL' as const,
          requiredServices: ['suiteql'],
          isAvailable: true,
        },
        {
          id: 'procurement',
          name: 'Procurement Analytics',
          category: 'PROCUREMENT' as const,
          requiredServices: ['suiteql', 'rest-record'],
          isAvailable: true,
        },
      ];

      return {
        erpSystem: 'NetSuite',
        version: await this.getSystemVersion(),
        discoveredAt: new Date(),
        services,
        capabilities,
      };
    } catch (error) {
      throw new FrameworkError(
        `Failed to discover NetSuite services: ${(error as Error).message}`,
        'DISCOVERY_FAILED',
        500,
        true,
        error
      );
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Execute SuiteQL query
   */
  private async executeSuiteQL(query: string, params?: Record<string, any>): Promise<any[]> {
    const response = await this.request<NetSuiteSuiteQLResponse>({
      method: 'POST',
      url: '/services/rest/query/v1/suiteql',
      data: {
        q: query,
        ...(params && { params }),
      },
    });

    return response.items || [];
  }

  // ============================================
  // USER & ROLE METHODS (Universal Interface)
  // ============================================

  async getUsers(filter: ERPUserFilter): Promise<ERPUser[]> {
    const conditions: string[] = [];

    if (filter.activeOnly) {
      conditions.push("isinactive = 'F'");
    }

    if (filter.userIds && filter.userIds.length > 0) {
      const ids = filter.userIds.map((id) => `'${id}'`).join(',');
      conditions.push(`id IN (${ids})`);
    }

    if (filter.searchTerm) {
      conditions.push(
        `(entityid LIKE '%${filter.searchTerm}%' OR email LIKE '%${filter.searchTerm}%')`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = filter.limit ? `LIMIT ${filter.limit}` : '';
    const offsetClause = filter.offset ? `OFFSET ${filter.offset}` : '';

    const query = `
      SELECT id, entityid, firstname, lastname, email, isinactive
      FROM employee
      ${whereClause}
      ${limitClause}
      ${offsetClause}
    `;

    const results = await this.executeSuiteQL(query);

    return results.map((row) => erpDataNormalizer.normalizeUser(row, 'NetSuite'));
  }

  async getUserById(userId: string): Promise<ERPUser> {
    const query = `
      SELECT id, entityid, firstname, lastname, email, isinactive
      FROM employee
      WHERE id = '${userId}'
    `;

    const results = await this.executeSuiteQL(query);

    if (results.length === 0) {
      throw new NotFoundError(`User ${userId} not found`);
    }

    return erpDataNormalizer.normalizeUser(results[0], 'NetSuite');
  }

  async getUserRoles(userId: string): Promise<ERPRole[]> {
    // In NetSuite, roles are queried via role assignments
    const query = `
      SELECT r.id, r.name, r.scriptid, r.isinactive
      FROM role r
      INNER JOIN employeeroles er ON r.id = er.role
      WHERE er.employee = '${userId}'
    `;

    const results = await this.executeSuiteQL(query);

    return results.map((row) => erpDataNormalizer.normalizeRole(row, 'NetSuite'));
  }

  async getUserPermissions(userId: string): Promise<ERPPermission[]> {
    const roles = await this.getUserRoles(userId);

    const permissions: ERPPermission[] = [];
    roles.forEach((role) => {
      permissions.push(...role.permissions);
    });

    return permissions;
  }

  async getAllRoles(): Promise<ERPRole[]> {
    const query = `
      SELECT id, name, scriptid, isinactive
      FROM role
      WHERE isinactive = 'F'
    `;

    const results = await this.executeSuiteQL(query);

    return results.map((row) => erpDataNormalizer.normalizeRole(row, 'NetSuite'));
  }

  // ============================================
  // FINANCIAL DATA METHODS (Universal Interface)
  // ============================================

  async getGLEntries(filter: GLEntryFilter): Promise<ERPGLEntry[]> {
    const conditions: string[] = [];

    if (filter.fromDate) {
      const dateStr = filter.fromDate.toISOString().split('T')[0];
      conditions.push(`trandate >= TO_DATE('${dateStr}', 'YYYY-MM-DD')`);
    }

    if (filter.toDate) {
      const dateStr = filter.toDate.toISOString().split('T')[0];
      conditions.push(`trandate <= TO_DATE('${dateStr}', 'YYYY-MM-DD')`);
    }

    if (filter.accountCodes && filter.accountCodes.length > 0) {
      const accounts = filter.accountCodes.map((acc) => `'${acc}'`).join(',');
      conditions.push(`account IN (${accounts})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = filter.limit ? `LIMIT ${filter.limit}` : '';
    const offsetClause = filter.offset ? `OFFSET ${filter.offset}` : '';

    const query = `
      SELECT tl.transaction, tl.tranid, t.trandate, tl.account, a.displayname as accountname,
             tl.debit, tl.credit, tl.amount, tl.memo
      FROM transactionline tl
      INNER JOIN transaction t ON tl.transaction = t.id
      INNER JOIN account a ON tl.account = a.id
      ${whereClause}
      ${limitClause}
      ${offsetClause}
    `;

    const results = await this.executeSuiteQL(query);

    return results.map((row) => erpDataNormalizer.normalizeGLEntry(row, 'NetSuite'));
  }

  async getInvoices(filter: InvoiceFilter): Promise<ERPInvoice[]> {
    const conditions: string[] = ["type = 'VendBill'"];

    if (filter.documentNumbers && filter.documentNumbers.length > 0) {
      const numbers = filter.documentNumbers.map((num) => `'${num}'`).join(',');
      conditions.push(`tranid IN (${numbers})`);
    }

    if (filter.vendorIds && filter.vendorIds.length > 0) {
      const vendors = filter.vendorIds.map((id) => `'${id}'`).join(',');
      conditions.push(`entity IN (${vendors})`);
    }

    if (filter.fromDate) {
      const dateStr = filter.fromDate.toISOString().split('T')[0];
      conditions.push(`trandate >= TO_DATE('${dateStr}', 'YYYY-MM-DD')`);
    }

    if (filter.toDate) {
      const dateStr = filter.toDate.toISOString().split('T')[0];
      conditions.push(`trandate <= TO_DATE('${dateStr}', 'YYYY-MM-DD')`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = filter.limit ? `LIMIT ${filter.limit}` : '';
    const offsetClause = filter.offset ? `OFFSET ${filter.offset}` : '';

    const query = `
      SELECT id, tranid, trandate, entity, total, status
      FROM transaction
      ${whereClause}
      ${limitClause}
      ${offsetClause}
    `;

    const results = await this.executeSuiteQL(query);

    return results.map((row) => erpDataNormalizer.normalizeInvoice(row, 'NetSuite'));
  }

  async getPurchaseOrders(filter: PurchaseOrderFilter): Promise<ERPPurchaseOrder[]> {
    const conditions: string[] = ["type = 'PurchOrd'"];

    if (filter.poNumbers && filter.poNumbers.length > 0) {
      const numbers = filter.poNumbers.map((num) => `'${num}'`).join(',');
      conditions.push(`tranid IN (${numbers})`);
    }

    if (filter.vendorIds && filter.vendorIds.length > 0) {
      const vendors = filter.vendorIds.map((id) => `'${id}'`).join(',');
      conditions.push(`entity IN (${vendors})`);
    }

    if (filter.fromDate) {
      const dateStr = filter.fromDate.toISOString().split('T')[0];
      conditions.push(`trandate >= TO_DATE('${dateStr}', 'YYYY-MM-DD')`);
    }

    if (filter.toDate) {
      const dateStr = filter.toDate.toISOString().split('T')[0];
      conditions.push(`trandate <= TO_DATE('${dateStr}', 'YYYY-MM-DD')`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = filter.limit ? `LIMIT ${filter.limit}` : '';
    const offsetClause = filter.offset ? `OFFSET ${filter.offset}` : '';

    const query = `
      SELECT id, tranid, trandate, entity, total, status
      FROM transaction
      ${whereClause}
      ${limitClause}
      ${offsetClause}
    `;

    const results = await this.executeSuiteQL(query);

    return results.map((row) => erpDataNormalizer.normalizePurchaseOrder(row, 'NetSuite'));
  }

  // ============================================
  // VENDOR/SUPPLIER METHODS (Universal Interface)
  // ============================================

  async getVendors(filter: VendorFilter): Promise<ERPVendor[]> {
    const conditions: string[] = [];

    if (filter.vendorIds && filter.vendorIds.length > 0) {
      const ids = filter.vendorIds.map((id) => `'${id}'`).join(',');
      conditions.push(`id IN (${ids})`);
    }

    if (filter.searchTerm) {
      conditions.push(
        `(companyname LIKE '%${filter.searchTerm}%' OR entityid LIKE '%${filter.searchTerm}%')`
      );
    }

    if (filter.activeOnly !== undefined) {
      const inactive = filter.activeOnly ? 'F' : 'T';
      conditions.push(`isinactive = '${inactive}'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = filter.limit ? `LIMIT ${filter.limit}` : '';
    const offsetClause = filter.offset ? `OFFSET ${filter.offset}` : '';

    const query = `
      SELECT id, entityid, companyname, email, phone, isinactive
      FROM vendor
      ${whereClause}
      ${limitClause}
      ${offsetClause}
    `;

    const results = await this.executeSuiteQL(query);

    return results.map((row) => erpDataNormalizer.normalizeVendor(row, 'NetSuite'));
  }

  async getVendorById(vendorId: string): Promise<ERPVendor> {
    const query = `
      SELECT id, entityid, companyname, email, phone, isinactive
      FROM vendor
      WHERE id = '${vendorId}'
    `;

    const results = await this.executeSuiteQL(query);

    if (results.length === 0) {
      throw new NotFoundError(`Vendor ${vendorId} not found`);
    }

    return erpDataNormalizer.normalizeVendor(results[0], 'NetSuite');
  }
}
