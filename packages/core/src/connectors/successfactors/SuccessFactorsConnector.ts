/**
 * SAP SuccessFactors Connector
 * Uses OData v2 with OAuth 2.0 SAML Bearer Assertion flow
 */

import { BaseSAPConnector, SAPConnectorConfig } from '../base/BaseSAPConnector';
import {
  SFEmployee,
  SFOrgUnit,
  SFCompensation,
  SFPerformanceReview,
  SFODataResponse,
} from './types';
import { ODataQueryBuilder, escapeODataString } from '../../utils/odata';
import { FrameworkError, AuthenticationError } from '../../errors';

export interface SuccessFactorsConnectorConfig extends SAPConnectorConfig {
  successfactors: {
    companyId: string;
    apiKey: string;
  };
}

/**
 * SuccessFactors uses OData v2 like S/4HANA but with different authentication
 */
export class SuccessFactorsConnector extends BaseSAPConnector {
  protected declare config: SuccessFactorsConnectorConfig;

  constructor(config: SuccessFactorsConnectorConfig) {
    super(config);
  }

  /**
   * Get Employees
   */
  async getEmployees(options?: {
    status?: string;
    department?: string;
  }): Promise<SFEmployee[]> {
    const query = new ODataQueryBuilder();

    if (options?.status) {
      query.filter(`status eq ${escapeODataString(options.status)}`);
    }

    if (options?.department) {
      query.filter(`department eq ${escapeODataString(options.department)}`);
    }

    const queryString = query.build();
    const url = queryString
      ? `/odata/v2/User?${queryString}`
      : '/odata/v2/User';

    try {
      const response = await this.request<SFODataResponse<SFEmployee>>({
        method: 'GET',
        url,
      });

      return response.d.results;
    } catch (error: any) {
      throw this.mapSFError(error);
    }
  }

  /**
   * Get Organizational Units
   */
  async getOrgUnits(): Promise<SFOrgUnit[]> {
    try {
      const response = await this.request<SFODataResponse<SFOrgUnit>>({
        method: 'GET',
        url: '/odata/v2/FODepartment',
      });

      return response.d.results;
    } catch (error: any) {
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

  private mapSFError(error: any): FrameworkError {
    const status = error.response?.status;
    const sfError = error.response?.data?.error;

    if (status === 401) {
      return new AuthenticationError('Invalid SuccessFactors credentials', sfError);
    }

    return new FrameworkError(
      sfError?.message?.value || error.message || 'SuccessFactors API error',
      'SF_ERROR',
      status || 500,
      [500, 502, 503].includes(status),
      sfError
    );
  }

  protected mapSAPError(error: any): FrameworkError {
    return this.mapSFError(error);
  }

  protected getHealthCheckEndpoint(): string {
    return '/odata/v2/$metadata';
  }
}