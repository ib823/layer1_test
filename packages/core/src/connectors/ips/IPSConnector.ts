import { BaseSAPConnector, SAPConnectorConfig } from '../base/BaseSAPConnector';
import {
  FrameworkError,
  AuthenticationError,
  NotFoundError,
} from '../../errors';
import { RetryStrategy, RetryConfig } from '../../utils/retry';
import { CircuitBreaker } from '../../utils/circuitBreaker';
import {
  IPSUser,
  IPSGroup,
  IPSQueryOptions,
  IPSListResponse,
} from './types';

export interface IPSConnectorConfig extends SAPConnectorConfig {
  scim: {
    version: '2.0';
  };
  retry?: RetryConfig;
}

/**
 * SAP Identity Provisioning Service (IPS) Connector
 * Uses SCIM 2.0 protocol
 */
export class IPSConnector extends BaseSAPConnector {
  // Shadow parent config with correct type
  protected declare config: IPSConnectorConfig;
  
  private retryStrategy: RetryStrategy;
  private circuitBreaker: CircuitBreaker;
  private tokenCache: { token: string; expiry: number } | null = null;

  constructor(config: IPSConnectorConfig) {
    super(config);

    this.retryStrategy = new RetryStrategy();
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      resetTimeout: 60000,
      name: 'IPS',
    });
  }

  // ============================================================
  // USER OPERATIONS
  // ============================================================

  async getUsers(options: IPSQueryOptions = {}): Promise<IPSUser[]> {
    const params = this.buildQueryParams(options);

    return await this.circuitBreaker.execute(async () => {
      return await this.retryStrategy.executeWithRetry(
        async () => {
          const response = await this.request<IPSListResponse<IPSUser>>({
            method: 'GET',
            url: '/Users',
            params,
          });

          return response.Resources;
        },
        this.getRetryConfig()
      );
    });
  }

  async getUser(userId: string): Promise<IPSUser> {
    return await this.circuitBreaker.execute(async () => {
      return await this.retryStrategy.executeWithRetry(
        async () => {
          return await this.request<IPSUser>({
            method: 'GET',
            url: `/Users/${userId}`,
          });
        },
        this.getRetryConfig()
      );
    });
  }

  async getUsersByFilter(filter: string): Promise<IPSUser[]> {
    return await this.getUsers({ filter });
  }

  // ============================================================
  // GROUP OPERATIONS
  // ============================================================

  async getGroups(options: IPSQueryOptions = {}): Promise<IPSGroup[]> {
    const params = this.buildQueryParams(options);

    return await this.circuitBreaker.execute(async () => {
      return await this.retryStrategy.executeWithRetry(
        async () => {
          const response = await this.request<IPSListResponse<IPSGroup>>({
            method: 'GET',
            url: '/Groups',
            params,
          });

          return response.Resources;
        },
        this.getRetryConfig()
      );
    });
  }

  async getGroup(groupId: string): Promise<IPSGroup> {
    return await this.circuitBreaker.execute(async () => {
      return await this.retryStrategy.executeWithRetry(
        async () => {
          return await this.request<IPSGroup>({
            method: 'GET',
            url: `/Groups/${groupId}`,
          });
        },
        this.getRetryConfig()
      );
    });
  }

  async getGroupMembers(groupId: string): Promise<IPSUser[]> {
    const group = await this.getGroup(groupId);

    if (!group.members || group.members.length === 0) {
      return [];
    }

    // Fetch all members
    const memberPromises = group.members.map((member) =>
      this.getUser(member.value)
    );

    return await Promise.all(memberPromises);
  }

  // ============================================================
  // USER-GROUP MAPPING (for SoD analysis)
  // ============================================================

  async getUserGroupMemberships(userId: string): Promise<IPSGroup[]> {
    const user = await this.getUser(userId);

    if (!user.groups || user.groups.length === 0) {
      return [];
    }

    // Fetch all groups
    const groupPromises = user.groups.map((groupId) =>
      this.getGroup(groupId)
    );

    return await Promise.all(groupPromises);
  }

  async getAllUserGroupMemberships(): Promise<Map<string, IPSGroup[]>> {
    const users = await this.getUsers();
    const memberships = new Map<string, IPSGroup[]>();

    for (const user of users) {
      if (user.groups && user.groups.length > 0) {
        const groups = await this.getUserGroupMemberships(user.id);
        memberships.set(user.id, groups);
      }
    }

    return memberships;
  }

  // ============================================================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ============================================================

  protected async getAuthToken(): Promise<string> {
    // Check cache
    if (this.tokenCache && Date.now() < this.tokenCache.expiry) {
      return this.tokenCache.token;
    }

    // Acquire new token (similar to S/4HANA)
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
    // Placeholder - implement based on your IPS OAuth setup
    throw new Error('OAuth token acquisition not implemented');
  }

  protected mapSAPError(error: any): FrameworkError {
    const status = error.response?.status;
    const scimError = error.response?.data;

    switch (status) {
      case 401:
        return new AuthenticationError(
          scimError?.detail || 'Authentication failed',
          scimError
        );

      case 404:
        return new NotFoundError(
          scimError?.detail || 'Resource not found',
          scimError
        );

      default:
        return new FrameworkError(
          scimError?.detail || error.message || 'Unknown error',
          scimError?.scimType || 'UNKNOWN',
          status || 500,
          [500, 502, 503, 504].includes(status),
          scimError
        );
    }
  }

  protected getHealthCheckEndpoint(): string {
    return '/ServiceProviderConfig';
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  private buildQueryParams(options: IPSQueryOptions): Record<string, any> {
    const params: Record<string, any> = {};

    if (options.filter) {
      params.filter = options.filter;
    }

    if (options.attributes && options.attributes.length > 0) {
      params.attributes = options.attributes.join(',');
    }

    if (options.startIndex) {
      params.startIndex = options.startIndex;
    }

    if (options.count) {
      params.count = options.count;
    }

    return params;
  }

  private getRetryConfig(): RetryConfig {
    // Always return complete RetryConfig by merging with defaults
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
}