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
}