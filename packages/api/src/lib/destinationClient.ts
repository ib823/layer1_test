/**
 * Destination-Aware Client for SAP BTP
 *
 * This module provides utilities to call SAP systems (S/4HANA, Ariba, SuccessFactors)
 * via the BTP Destination service, which handles OAuth2 token exchange and credential management.
 *
 * Key benefits:
 * - No hardcoded URLs or credentials in code
 * - Automatic OAuth2 token management via Destination service
 * - Principal propagation support (user identity flows to SAP systems)
 * - Centralized configuration in BTP Cockpit
 */

import {
  executeHttpRequest,
  HttpResponse,
} from '@sap-cloud-sdk/http-client';
import {
  getDestination,
  DestinationFetchOptions,
  Destination,
} from '@sap-cloud-sdk/connectivity';
import logger from '../utils/logger';

export interface DestinationClientOptions {
  /**
   * Name of the destination configured in BTP Cockpit
   * Examples: 'S4HANA_API', 'ARIBA_API', 'SFSF_API'
   */
  destinationName: string;

  /**
   * Optional JWT token from App Router for principal propagation
   */
  jwt?: string;

  /**
   * Whether to use isolation strategy for multi-tenancy
   */
  useCache?: boolean;
}

export class DestinationClient {
  private destination: Destination | null = null;
  private options: DestinationClientOptions;

  constructor(options: DestinationClientOptions) {
    this.options = options;
  }

  /**
   * Get or retrieve the destination from BTP Destination service
   */
  private async getDestination(): Promise<Destination> {
    if (this.destination && this.options.useCache) {
      return this.destination;
    }

    const destOptions: DestinationFetchOptions = {
      destinationName: this.options.destinationName,
      jwt: this.options.jwt,
      useCache: this.options.useCache !== false,
    };

    try {
      logger.info(`Fetching destination: ${this.options.destinationName}`);
      this.destination = await getDestination(destOptions);

      if (!this.destination) {
        throw new Error(`Destination '${this.options.destinationName}' not found`);
      }

      // Redact sensitive info from logs
      logger.info(`Destination retrieved: ${this.destination.url}`);
      return this.destination;
    } catch (error: any) {
      logger.error(`Failed to get destination '${this.options.destinationName}':`, error);
      throw new Error(`Destination service error: ${error.message}`);
    }
  }

  /**
   * Execute HTTP GET request via Destination
   */
  async get<T = any>(path: string, options?: {
    params?: Record<string, any>;
    headers?: Record<string, string>;
  }): Promise<T> {
    const destination = await this.getDestination();

    if (!destination.url) {
      throw new Error('Destination URL is undefined');
    }

    try {
      const response: HttpResponse = await executeHttpRequest(
        { destinationName: this.options.destinationName, jwt: this.options.jwt },
        {
          method: 'GET',
          url: path,
          params: options?.params,
          headers: options?.headers,
        }
      );

      return response.data as T;
    } catch (error: any) {
      logger.error(`GET ${path} failed:`, error);
      throw error;
    }
  }

  /**
   * Execute HTTP POST request via Destination
   */
  async post<T = any>(path: string, data: any, options?: {
    params?: Record<string, any>;
    headers?: Record<string, string>;
  }): Promise<T> {
    const destination = await this.getDestination();

    if (!destination.url) {
      throw new Error('Destination URL is undefined');
    }

    try {
      const response: HttpResponse = await executeHttpRequest(
        { destinationName: this.options.destinationName, jwt: this.options.jwt },
        {
          method: 'POST',
          url: path,
          data,
          params: options?.params,
          headers: options?.headers,
        }
      );

      return response.data as T;
    } catch (error: any) {
      logger.error(`POST ${path} failed:`, error);
      throw error;
    }
  }

  /**
   * Execute HTTP PUT request via Destination
   */
  async put<T = any>(path: string, data: any, options?: {
    params?: Record<string, any>;
    headers?: Record<string, string>;
  }): Promise<T> {
    const destination = await this.getDestination();

    if (!destination.url) {
      throw new Error('Destination URL is undefined');
    }

    try {
      const response: HttpResponse = await executeHttpRequest(
        { destinationName: this.options.destinationName, jwt: this.options.jwt },
        {
          method: 'PUT',
          url: path,
          data,
          params: options?.params,
          headers: options?.headers,
        }
      );

      return response.data as T;
    } catch (error: any) {
      logger.error(`PUT ${path} failed:`, error);
      throw error;
    }
  }

  /**
   * Execute HTTP DELETE request via Destination
   */
  async delete<T = any>(path: string, options?: {
    params?: Record<string, any>;
    headers?: Record<string, string>;
  }): Promise<T> {
    const destination = await this.getDestination();

    if (!destination.url) {
      throw new Error('Destination URL is undefined');
    }

    try {
      const response: HttpResponse = await executeHttpRequest(
        { destinationName: this.options.destinationName, jwt: this.options.jwt },
        {
          method: 'DELETE',
          url: path,
          params: options?.params,
          headers: options?.headers,
        }
      );

      return response.data as T;
    } catch (error: any) {
      logger.error(`DELETE ${path} failed:`, error);
      throw error;
    }
  }

  /**
   * Get raw destination object (useful for inspecting URL, auth type, etc.)
   */
  async getDestinationInfo(): Promise<Destination> {
    return this.getDestination();
  }
}

/**
 * Factory functions for common SAP destinations
 */

export function createS4HANAClient(jwt?: string): DestinationClient {
  return new DestinationClient({
    destinationName: process.env.S4HANA_DESTINATION || 'S4HANA_API',
    jwt,
    useCache: true,
  });
}

export function createAribaClient(jwt?: string): DestinationClient {
  return new DestinationClient({
    destinationName: process.env.ARIBA_DESTINATION || 'ARIBA_API',
    jwt,
    useCache: true,
  });
}

export function createSuccessFactorsClient(jwt?: string): DestinationClient {
  return new DestinationClient({
    destinationName: process.env.SFSF_DESTINATION || 'SFSF_API',
    jwt,
    useCache: true,
  });
}

/**
 * Helper to extract JWT from Express request
 */
export function extractJWT(req: any): string | undefined {
  // JWT forwarded by App Router in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Or in req.authInfo (set by @sap/xssec middleware)
  if (req.authInfo && req.authInfo.getToken) {
    return req.authInfo.getToken();
  }

  return undefined;
}
