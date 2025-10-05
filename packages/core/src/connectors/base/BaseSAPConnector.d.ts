import { AxiosInstance, AxiosRequestConfig } from 'axios';
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
export declare abstract class BaseSAPConnector extends EventEmitter {
    protected config: SAPConnectorConfig;
    protected client: AxiosInstance;
    constructor(config: SAPConnectorConfig);
    private setupInterceptors;
    protected request<T>(config: AxiosRequestConfig): Promise<T>;
    /**
     * Public method for external classes (like ServiceDiscovery) to make requests
     */
    executeRequest<T = any>(config: AxiosRequestConfig): Promise<T>;
    protected abstract getAuthToken(): Promise<string>;
    protected abstract mapSAPError(error: any): FrameworkError;
    protected abstract getHealthCheckEndpoint(): string;
    healthCheck(): Promise<HealthCheckResult>;
}
//# sourceMappingURL=BaseSAPConnector.d.ts.map