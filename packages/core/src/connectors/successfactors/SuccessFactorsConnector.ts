/**
 * SAP SuccessFactors Connector
 *
 * Connects to SAP SuccessFactors HCM using OData v2 APIs
 * Supports employee data, organizational units, compensation, and performance reviews
 *
 * Authentication: Basic Auth (API Key + Company ID) or OAuth 2.0 SAML Bearer
 * Rate Limits: 100 calls per 10 seconds (burst), query timeout at 180 seconds
 *
 * @see https://help.sap.com/docs/SAP_SUCCESSFACTORS_PLATFORM/d599f15995d348a1b45ba5603e2aba9b/
 */

import { BaseSAPConnector, SAPConnectorConfig } from '../base/BaseSAPConnector';
import {
  SFEmployee,
  SFOrgUnit,
  SFODataResponse,
  SFCompensation,
  SFPerformanceReview,
} from './types';
import { ODataQueryBuilder, escapeODataString } from '../../utils/odata';
import { FrameworkError, AuthenticationError, ConnectorError } from '../../errors';

export interface SuccessFactorsConnectorConfig extends SAPConnectorConfig {
  successfactors: {
    companyId: string;        // SF company ID (e.g., 'SFPART123456')
    apiKey: string;            // API key or OAuth client ID
    apiSecret?: string;        // For OAuth flows
    dataCenter?: string;       // SF data center (e.g., 'api2', 'api4')
  };
}

/**
 * SuccessFactors API endpoints
 * @see https://help.sap.com/docs/SAP_SUCCESSFACTORS_PLATFORM/d599f15995d348a1b45ba5603e2aba9b/
 */
const SF_ENDPOINTS = {
  USERS: '/odata/v2/User',
  ORG_UNITS: '/odata/v2/FODepartment',
  COMPENSATION: '/odata/v2/EmpCompensation',
  PERFORMANCE_REVIEWS: '/odata/v2/FormReviewInfoSection',
  ROLES: '/odata/v2/RoleEntity',
  PERMISSIONS: '/odata/v2/PermissionRole',
};

/**
 * SuccessFactors uses OData v2 like S/4HANA but with different authentication
 */
export class SuccessFactorsConnector extends BaseSAPConnector {
  protected declare config: SuccessFactorsConnectorConfig;

  constructor(config: SuccessFactorsConnectorConfig) {
    super(config);
  }

  /**
   * Get Employees with filtering and pagination
   *
   * @param options Filter and pagination options
   * @returns List of employees
   */
  async getEmployees(options?: {
    status?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
    department?: string;
    hireDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<SFEmployee[]> {
    try {
      const query = new ODataQueryBuilder();

      const filters: string[] = [];

      if (options?.status) {
        filters.push(`status eq ${escapeODataString(options.status)}`);
      }

      if (options?.department) {
        filters.push(`department eq ${escapeODataString(options.department)}`);
      }

      if (options?.hireDate) {
        filters.push(`hireDate ge datetime'${options.hireDate.toISOString()}'`);
      }

      if (filters.length > 0) {
        query.filter(filters.join(' and '));
      }

      if (options?.limit) {
        query.top(options.limit);
      }

      if (options?.offset) {
        query.skip(options.offset);
      }

      const queryString = query.build();
      const url = queryString ? `${SF_ENDPOINTS.USERS}?${queryString}` : SF_ENDPOINTS.USERS;

      const response = await this.request<SFODataResponse<SFEmployee>>({
        method: 'GET',
        url,
      });

      return response.d.results;
    } catch (error: unknown) {
      throw this.mapSFError(error);
    }
  }

  /**
   * Get Organizational Units with pagination
   *
   * @param options Pagination options
   * @returns List of organizational units
   */
  async getOrgUnits(options?: {
    parentCode?: string;
    limit?: number;
    offset?: number;
  }): Promise<SFOrgUnit[]> {
    try {
      const query = new ODataQueryBuilder();

      if (options?.parentCode) {
        query.filter(`parentCode eq ${escapeODataString(options.parentCode)}`);
      }

      if (options?.limit) {
        query.top(options.limit);
      }

      if (options?.offset) {
        query.skip(options.offset);
      }

      const queryString = query.build();
      const url = queryString ? `${SF_ENDPOINTS.ORG_UNITS}?${queryString}` : SF_ENDPOINTS.ORG_UNITS;

      const response = await this.request<SFODataResponse<SFOrgUnit>>({
        method: 'GET',
        url,
      });

      return response.d.results;
    } catch (error: unknown) {
      throw this.mapSFError(error);
    }
  }

  /**
   * Get employee compensation data
   *
   * @param options Filter options
   * @returns List of compensation records
   */
  async getCompensation(options?: {
    userId?: string;
    effectiveDate?: Date;
    minSalary?: number;
    limit?: number;
  }): Promise<SFCompensation[]> {
    try {
      const query = new ODataQueryBuilder();

      const filters: string[] = [];

      if (options?.userId) {
        filters.push(`userId eq ${escapeODataString(options.userId)}`);
      }

      if (options?.effectiveDate) {
        filters.push(`effectiveDate ge datetime'${options.effectiveDate.toISOString()}'`);
      }

      if (options?.minSalary !== undefined) {
        filters.push(`salary ge ${options.minSalary}`);
      }

      if (filters.length > 0) {
        query.filter(filters.join(' and '));
      }

      if (options?.limit) {
        query.top(options.limit);
      }

      const queryString = query.build();
      const url = queryString ? `${SF_ENDPOINTS.COMPENSATION}?${queryString}` : SF_ENDPOINTS.COMPENSATION;

      const response = await this.request<SFODataResponse<SFCompensation>>({
        method: 'GET',
        url,
      });

      return response.d.results;
    } catch (error: unknown) {
      throw this.mapSFError(error);
    }
  }

  /**
   * Get performance reviews
   *
   * @param options Filter options
   * @returns List of performance reviews
   */
  async getPerformanceReviews(options?: {
    userId?: string;
    fromDate?: Date;
    toDate?: Date;
    minRating?: number;
    limit?: number;
  }): Promise<SFPerformanceReview[]> {
    try {
      const query = new ODataQueryBuilder();

      const filters: string[] = [];

      if (options?.userId) {
        filters.push(`userId eq ${escapeODataString(options.userId)}`);
      }

      if (options?.fromDate) {
        filters.push(`reviewDate ge datetime'${options.fromDate.toISOString()}'`);
      }

      if (options?.toDate) {
        filters.push(`reviewDate le datetime'${options.toDate.toISOString()}'`);
      }

      if (options?.minRating !== undefined) {
        filters.push(`rating ge ${options.minRating}`);
      }

      if (filters.length > 0) {
        query.filter(filters.join(' and '));
      }

      if (options?.limit) {
        query.top(options.limit);
      }

      const queryString = query.build();
      const url = queryString
        ? `${SF_ENDPOINTS.PERFORMANCE_REVIEWS}?${queryString}`
        : SF_ENDPOINTS.PERFORMANCE_REVIEWS;

      const response = await this.request<SFODataResponse<SFPerformanceReview>>({
        method: 'GET',
        url,
      });

      return response.d.results;
    } catch (error: unknown) {
      throw this.mapSFError(error);
    }
  }

  /**
   * Get user roles (for SoD analysis)
   *
   * @param userId User ID
   * @returns User roles and permissions
   */
  async getUserRoles(userId: string): Promise<string[]> {
    try {
      // First, get the employee to verify they exist
      const employees = await this.getEmployees({ limit: 1 });
      const employee = employees.find((e) => e.userId === userId);

      if (!employee) {
        throw new ConnectorError(
          `User ${userId} not found in SuccessFactors`,
          'SF_USER_NOT_FOUND',
          404,
          false
        );
      }

      // Fetch role assignments via RoleEntity
      // Note: In real SF, this would use User navigation property to RoleEntity
      // For now, we return a simplified structure
      const query = new ODataQueryBuilder();
      query.filter(`userId eq ${escapeODataString(userId)}`);

      const queryString = query.build();
      const url = `${SF_ENDPOINTS.ROLES}?${queryString}`;

      const response = await this.request<SFODataResponse<{ roleName: string }>>({
        method: 'GET',
        url,
      });

      return response.d.results.map((r) => r.roleName);
    } catch (error: unknown) {
      throw this.mapSFError(error);
    }
  }

  /**
   * SuccessFactors uses Basic Auth or OAuth
   */
  protected async getAuthToken(): Promise<string> {
    // For Basic Auth: return base64(apiKey + '@' + companyId + ':password)
    const credentials = `${this.config.successfactors.apiKey}@${this.config.successfactors.companyId}`;
    return Buffer.from(credentials).toString('base64');
  }

  /**
   * Map SuccessFactors-specific errors to framework errors
   */
  private mapSFError(error: unknown): FrameworkError {
    const err = error as {
      response?: {
        status?: number;
        data?: {
          error?: {
            code?: string;
            message?: { value?: string } | string;
          };
        };
      };
      message?: string;
      code?: string;
    };

    const status = err.response?.status;
    const sfError = err.response?.data?.error;
    const errorMessage = typeof sfError?.message === 'string'
      ? sfError.message
      : sfError?.message?.value;

    // Authentication errors
    if (status === 401 || status === 403) {
      return new AuthenticationError(
        'Invalid SuccessFactors credentials or insufficient permissions',
        sfError
      );
    }

    // Rate limiting - SF has 100 calls per 10 seconds burst limit
    if (status === 429) {
      return new ConnectorError(
        'SuccessFactors rate limit exceeded (100 calls/10s)',
        'SF_RATE_LIMIT',
        429,
        true // Retryable after backoff
      );
    }

    // Not found errors
    if (status === 404) {
      return new ConnectorError(
        'SuccessFactors resource not found',
        'SF_NOT_FOUND',
        404,
        false
      );
    }

    // Query timeout errors (SF queries timeout at 180 seconds)
    if (status === 504 || err.message?.includes('timeout')) {
      return new ConnectorError(
        'SuccessFactors query timeout (limit: 180s)',
        'SF_TIMEOUT',
        504,
        true // Retryable with smaller dataset
      );
    }

    // Generic SF error
    return new FrameworkError(
      errorMessage || err.message || 'SuccessFactors API error',
      sfError?.code || 'SF_ERROR',
      status || 500,
      [500, 502, 503, 504].includes(status || 0), // Retryable server errors
      sfError
    );
  }

  protected mapSAPError(error: unknown): FrameworkError {
    return this.mapSFError(error);
  }

  protected getHealthCheckEndpoint(): string {
    return '/odata/v2/$metadata';
  }
}