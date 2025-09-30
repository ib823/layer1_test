import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { EventEmitter } from 'events';
import { FrameworkError } from '../../errors';
import { HealthCheckResult } from '../../types';

/**
 * Configuration for SAP Connector
 */
export interface SAPConnectorConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
  
  auth: {
    type: 'OAUTH' | 'BASIC' | 'CERTIFICATE';
    credentials: any;
  };
  
  retry?: {
    maxRetries: number;
    baseDelay: number;
  };
}

/**
 * Base SAP Connector
 * All SAP system connectors inherit from this
 */
export abstract class BaseSAPConnector extends EventEmitter {
  protected client: AxiosInstance;
  
  constructor(protected config: SAPConnectorConfig) {
    super();
    
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });
    
    this.setupInterceptors();
  }
  
  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      async (config) => {
        const token = await this.getAuthToken();
        config.headers.Authorization = `Bearer ${token}`;
        
        this.emit('request', {
          method: config.method,
          url: config.url,
          timestamp: Date.now(),
        });
        
        return config;
      },
      (error) => {
        this.emit('request-error', error);
        return Promise.reject(error);
      }
    );
    
    this.client.interceptors.response.use(
      (response) => {
        this.emit('response', {
          status: response.status,
          url: response.config.url,
          timestamp: Date.now(),
        });
        
        return response;
      },
      (error) => {
        const mappedError = this.mapSAPError(error);
        this.emit('response-error', mappedError);
        return Promise.reject(mappedError);
      }
    );
  }
  
  protected async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }
  
  protected abstract getAuthToken(): Promise<string>;
  
  protected abstract mapSAPError(error: any): FrameworkError;
  
  protected abstract getHealthCheckEndpoint(): string;
  
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      await this.request({
        method: 'GET',
        url: this.getHealthCheckEndpoint(),
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
}