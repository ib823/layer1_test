/**
 * Base Connector Class
 *
 * Abstract base class for all system connectors.
 * Provides common functionality for authentication, error handling, and logging.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  SystemType,
  ISystemConnector,
  ConnectorOptions,
  CanonicalUser,
  CanonicalRole,
  CanonicalPermission,
  UserRoleAssignment,
  SyncResult,
} from '../types';

export abstract class BaseConnector implements ISystemConnector {
  protected readonly client: AxiosInstance;
  private readonly systemType: SystemType;
  protected readonly baseUrl: string;
  protected readonly authConfig: ConnectorOptions['authConfig'];

  constructor(
    systemType: SystemType,
    options: ConnectorOptions
  ) {
    this.systemType = systemType;
    this.baseUrl = options.baseUrl;
    this.authConfig = options.authConfig;

    // Create axios instance with base configuration
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: options.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => this.addAuthHeaders(config),
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    );
  }

  /**
   * Get system type
   */
  public getSystemType(): SystemType {
    return this.systemType;
  }

  /**
   * Add authentication headers to request
   */
  protected async addAuthHeaders(config: any): Promise<any> {
    switch (this.authConfig.type) {
      case 'BASIC':
        if (this.authConfig.credentials.username && this.authConfig.credentials.password) {
          const auth = Buffer.from(
            `${this.authConfig.credentials.username}:${this.authConfig.credentials.password}`
          ).toString('base64');
          config.headers = {
            ...config.headers,
            Authorization: `Basic ${auth}`,
          };
        }
        break;

      case 'OAUTH2':
        const token = await this.getOAuth2Token();
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
        break;

      case 'API_KEY':
        config.headers = {
          ...config.headers,
          'X-API-Key': this.authConfig.credentials.apiKey,
        };
        break;

      case 'CERTIFICATE':
        // Certificate-based auth would be configured at axios instance level
        break;
    }

    return config;
  }

  /**
   * Get OAuth2 access token
   * Override this method in subclasses for system-specific token acquisition
   */
  protected async getOAuth2Token(): Promise<string> {
    const { clientId, clientSecret, tokenUrl } = this.authConfig.credentials;

    if (!tokenUrl) {
      throw new Error('Token URL is required for OAuth2 authentication');
    }

    try {
      const response = await axios.post(
        tokenUrl,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data.access_token;
    } catch (error) {
      throw new Error(`Failed to obtain OAuth2 token: ${error}`);
    }
  }

  /**
   * Handle API errors
   */
  protected handleError(error: any): Promise<never> {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      throw new Error(
        `API Error (${status}): ${JSON.stringify(data)}`
      );
    } else if (error.request) {
      // No response received
      throw new Error('No response from server');
    } else {
      // Request setup error
      throw new Error(`Request error: ${error.message}`);
    }
  }

  /**
   * Test connection to the system
   */
  public abstract testConnection(): Promise<boolean>;

  /**
   * Extract users from the system
   */
  public abstract extractUsers(): Promise<CanonicalUser[]>;

  /**
   * Extract roles from the system
   */
  public abstract extractRoles(): Promise<CanonicalRole[]>;

  /**
   * Extract permissions from the system
   */
  public abstract extractPermissions(): Promise<CanonicalPermission[]>;

  /**
   * Extract user-to-role assignments
   */
  public abstract extractAssignments(): Promise<UserRoleAssignment[]>;

  /**
   * Full synchronization of access data
   */
  public async syncAll(): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Test connection first
      const isConnected = await this.testConnection();
      if (!isConnected) {
        throw new Error('Connection test failed');
      }

      // Extract all data in parallel
      const [users, roles, permissions, assignments] = await Promise.allSettled([
        this.extractUsers(),
        this.extractRoles(),
        this.extractPermissions(),
        this.extractAssignments(),
      ]);

      // Collect results and errors
      const totalUsers = users.status === 'fulfilled' ? users.value.length : 0;
      const totalRoles = roles.status === 'fulfilled' ? roles.value.length : 0;
      const totalPermissions = permissions.status === 'fulfilled' ? permissions.value.length : 0;
      const totalAssignments = assignments.status === 'fulfilled' ? assignments.value.length : 0;

      if (users.status === 'rejected') errors.push(`Users: ${users.reason}`);
      if (roles.status === 'rejected') errors.push(`Roles: ${roles.reason}`);
      if (permissions.status === 'rejected') errors.push(`Permissions: ${permissions.reason}`);
      if (assignments.status === 'rejected') errors.push(`Assignments: ${assignments.reason}`);

      const syncDuration = Date.now() - startTime;

      return {
        success: errors.length === 0,
        totalUsers,
        totalRoles,
        totalPermissions,
        totalAssignments,
        errors,
        syncDuration,
      };
    } catch (error: any) {
      errors.push(error.message);
      return {
        success: false,
        totalUsers: 0,
        totalRoles: 0,
        totalPermissions: 0,
        totalAssignments: 0,
        errors,
        syncDuration: Date.now() - startTime,
      };
    }
  }

  /**
   * Log information (override in subclass for custom logging)
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.systemType}] [${level.toUpperCase()}] ${message}`;

    switch (level) {
      case 'info':
        console.log(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'error':
        console.error(logMessage, data || '');
        break;
    }
  }
}
