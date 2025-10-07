/**
 * SAP Ariba Connector
 *
 * Connects to SAP Ariba Procurement using REST APIs
 * Supports supplier management, purchase orders, contracts, and invoices
 *
 * Authentication: API Key (Application Key)
 * Rate Limits: 1000 requests/hour per realm
 *
 * @see https://developer.ariba.com/api
 */

import { BaseSAPConnector, SAPConnectorConfig } from '../base/BaseSAPConnector';
import { FrameworkError, AuthenticationError, ConnectorError } from '../../errors';
import {
  AribaPurchaseOrder,
  AribaSupplier,
  AribaContract,
  AribaInvoice,
  AribaUser,
  AribaODataResponse,
} from './types';

export interface AribaConnectorConfig extends SAPConnectorConfig {
  ariba: {
    realm: string;          // Ariba realm (e.g., 's1-sourcing')
    apiKey: string;          // Application key
    approvalsUrl?: string;   // Optional approvals API URL
  };
}

/**
 * Ariba API endpoints
 * @see https://developer.ariba.com/api/apis
 */
const ARIBA_ENDPOINTS = {
  SUPPLIERS: '/api/suppliers',
  PURCHASE_ORDERS: '/api/purchase-orders',
  CONTRACTS: '/api/contracts',
  INVOICES: '/api/invoices',
  USERS: '/api/users',
  APPROVALS: '/api/approvals',
  SOURCING_PROJECTS: '/api/sourcing-projects',
};

export class AribaConnector extends BaseSAPConnector {
  protected declare config: AribaConnectorConfig;

  constructor(config: AribaConnectorConfig) {
    super(config);
  }

  /**
   * Get suppliers from Ariba
   *
   * @param options Filter options
   * @returns List of suppliers
   */
  async getSuppliers(options?: {
    status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
    riskLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
    limit?: number;
    offset?: number;
  }): Promise<AribaSupplier[]> {
    try {
      const params: Record<string, string> = {
        realm: this.config.ariba.realm,
      };

      if (options?.status) {
        params.$filter = `Status eq '${options.status}'`;
      }

      if (options?.limit) {
        params.$top = options.limit.toString();
      }

      if (options?.offset) {
        params.$skip = options.offset.toString();
      }

      const response = await this.request<AribaODataResponse<AribaSupplier>>({
        method: 'GET',
        url: ARIBA_ENDPOINTS.SUPPLIERS,
        params,
      });

      return response.d?.results || response.Records || [];
    } catch (error: unknown) {
      throw this.mapAribaError(error);
    }
  }

  /**
   * Get purchase orders
   *
   * @param options Filter options
   * @returns List of purchase orders
   */
  async getPurchaseOrders(options?: {
    status?: string;
    fromDate?: Date;
    toDate?: Date;
    supplier?: string;
    limit?: number;
  }): Promise<AribaPurchaseOrder[]> {
    try {
      const params: Record<string, string> = {
        realm: this.config.ariba.realm,
      };

      const filters: string[] = [];

      if (options?.status) {
        filters.push(`Status eq '${options.status}'`);
      }

      if (options?.fromDate) {
        filters.push(`OrderDate ge ${options.fromDate.toISOString()}`);
      }

      if (options?.toDate) {
        filters.push(`OrderDate le ${options.toDate.toISOString()}`);
      }

      if (options?.supplier) {
        filters.push(`Supplier eq '${options.supplier}'`);
      }

      if (filters.length > 0) {
        params.$filter = filters.join(' and ');
      }

      if (options?.limit) {
        params.$top = options.limit.toString();
      }

      const response = await this.request<AribaODataResponse<AribaPurchaseOrder>>({
        method: 'GET',
        url: ARIBA_ENDPOINTS.PURCHASE_ORDERS,
        params,
      });

      return response.d?.results || response.Records || [];
    } catch (error: unknown) {
      throw this.mapAribaError(error);
    }
  }

  /**
   * Get contracts
   *
   * @param options Filter options
   * @returns List of contracts
   */
  async getContracts(options?: {
    active?: boolean;
    expiringDays?: number;
    limit?: number;
  }): Promise<AribaContract[]> {
    try {
      const params: Record<string, string> = {
        realm: this.config.ariba.realm,
      };

      const filters: string[] = [];

      if (options?.active !== undefined) {
        const now = new Date().toISOString();
        filters.push(`StartDate le ${now} and EndDate ge ${now}`);
      }

      if (options?.expiringDays) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + options.expiringDays);
        filters.push(`EndDate le ${futureDate.toISOString()}`);
      }

      if (filters.length > 0) {
        params.$filter = filters.join(' and ');
      }

      if (options?.limit) {
        params.$top = options.limit.toString();
      }

      const response = await this.request<AribaODataResponse<AribaContract>>({
        method: 'GET',
        url: ARIBA_ENDPOINTS.CONTRACTS,
        params,
      });

      return response.d?.results || response.Records || [];
    } catch (error: unknown) {
      throw this.mapAribaError(error);
    }
  }

  /**
   * Get invoices
   *
   * @param options Filter options
   * @returns List of invoices
   */
  async getInvoices(options?: {
    status?: string;
    poReference?: string;
    limit?: number;
  }): Promise<AribaInvoice[]> {
    try {
      const params: Record<string, string> = {
        realm: this.config.ariba.realm,
      };

      const filters: string[] = [];

      if (options?.status) {
        filters.push(`Status eq '${options.status}'`);
      }

      if (options?.poReference) {
        filters.push(`POReference eq '${options.poReference}'`);
      }

      if (filters.length > 0) {
        params.$filter = filters.join(' and ');
      }

      if (options?.limit) {
        params.$top = options.limit.toString();
      }

      const response = await this.request<AribaODataResponse<AribaInvoice>>({
        method: 'GET',
        url: ARIBA_ENDPOINTS.INVOICES,
        params,
      });

      return response.d?.results || response.Records || [];
    } catch (error: unknown) {
      throw this.mapAribaError(error);
    }
  }

  /**
   * Get users (for SoD analysis)
   *
   * @param options Filter options
   * @returns List of users with roles
   */
  async getUsers(options?: {
    active?: boolean;
    department?: string;
    limit?: number;
  }): Promise<AribaUser[]> {
    try {
      const params: Record<string, string> = {
        realm: this.config.ariba.realm,
      };

      const filters: string[] = [];

      if (options?.active !== undefined) {
        filters.push(`Status eq '${options.active ? 'ACTIVE' : 'INACTIVE'}'`);
      }

      if (options?.department) {
        filters.push(`Department eq '${options.department}'`);
      }

      if (filters.length > 0) {
        params.$filter = filters.join(' and ');
      }

      if (options?.limit) {
        params.$top = options.limit.toString();
      }

      const response = await this.request<AribaODataResponse<AribaUser>>({
        method: 'GET',
        url: ARIBA_ENDPOINTS.USERS,
        params,
      });

      return response.d?.results || response.Records || [];
    } catch (error: unknown) {
      throw this.mapAribaError(error);
    }
  }

  /**
   * Get roles for a user (for SoD analysis)
   *
   * @param userId User ID
   * @returns User roles and permissions
   */
  async getUserRoles(userId: string): Promise<string[]> {
    try {
      const users = await this.getUsers();
      const user = users.find((u) => u.UserID === userId);

      if (!user) {
        throw new ConnectorError(
          `User ${userId} not found`,
          'ARIBA_USER_NOT_FOUND',
          404,
          false
        );
      }

      return user.Roles || [];
    } catch (error: unknown) {
      throw this.mapAribaError(error);
    }
  }

  /**
   * Authentication: Ariba uses Application Key in header
   */
  protected async getAuthToken(): Promise<string> {
    return this.config.ariba.apiKey;
  }

  /**
   * Override request to add Ariba-specific headers
   */
  protected async request<T>(options: any): Promise<T> {
    // Add Ariba-specific headers
    options.headers = {
      ...options.headers,
      'apiKey': this.config.ariba.apiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    return super.request(options);
  }

  /**
   * Map Ariba-specific errors
   */
  private mapAribaError(error: unknown): FrameworkError {
    const err = error as {
      response?: {
        status?: number;
        data?: {
          error?: {
            code?: string;
            message?: string;
          };
        };
      };
      message?: string;
    };

    const status = err.response?.status;
    const aribaError = err.response?.data?.error;

    if (status === 401 || status === 403) {
      return new AuthenticationError(
        'Invalid Ariba API key or insufficient permissions',
        aribaError
      );
    }

    if (status === 429) {
      return new ConnectorError(
        'Ariba rate limit exceeded (1000 req/hour)',
        'ARIBA_RATE_LIMIT',
        429,
        true // Retryable after backoff
      );
    }

    if (status === 404) {
      return new ConnectorError(
        'Ariba resource not found',
        'ARIBA_NOT_FOUND',
        404,
        false
      );
    }

    return new FrameworkError(
      aribaError?.message || err.message || 'Ariba API error',
      aribaError?.code || 'ARIBA_ERROR',
      status || 500,
      [500, 502, 503, 504].includes(status || 0),
      aribaError
    );
  }

  /**
   * Required by BaseSAPConnector
   */
  protected mapSAPError(error: unknown): FrameworkError {
    return this.mapAribaError(error);
  }

  /**
   * Health check endpoint
   */
  protected getHealthCheckEndpoint(): string {
    return '/api/status';
  }
}