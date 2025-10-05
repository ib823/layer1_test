/**
 * S/4HANA Connector - SAP S/4HANA Cloud/On-Premise
 */
import { BaseSAPConnector, SAPConnectorConfig } from '../base/BaseSAPConnector';
import { S4HANAUser, S4HANARole, S4HANAUserRole, S4HANABatchRequest, S4HANABatchResponse } from './types';
import { ODataQueryBuilder } from '../../utils/odata';
import { RetryConfig } from '../../utils/retry';
import { CircuitBreakerConfig } from '../../utils/circuitBreaker';
import { FrameworkError } from '../../errors';
export interface S4HANAConnectorConfig extends SAPConnectorConfig {
    odata?: {
        useBatch?: boolean;
        batchSize?: number;
    };
    retry?: RetryConfig;
    circuitBreaker?: CircuitBreakerConfig;
}
export declare class S4HANAConnector extends BaseSAPConnector {
    protected config: S4HANAConnectorConfig;
    private retryStrategy;
    private circuitBreaker;
    private tokenCache;
    constructor(config: S4HANAConnectorConfig);
    getUserRoles(options: {
        activeOnly?: boolean;
        userIds?: string[];
        roleIds?: string[];
    }): Promise<S4HANAUserRole[]>;
    getUsers(options: {
        activeOnly?: boolean;
        userIds?: string[];
    }): Promise<S4HANAUser[]>;
    getRoles(options: {
        roleIds?: string[];
        roleType?: string;
    }): Promise<S4HANARole[]>;
    executeQuery<T>(endpoint: string, queryBuilder: ODataQueryBuilder): Promise<T[]>;
    executeBatch(_requests: S4HANABatchRequest[]): Promise<S4HANABatchResponse[]>;
    protected getAuthToken(): Promise<string>;
    private acquireOAuthToken;
    protected mapSAPError(error: any): FrameworkError;
    protected getHealthCheckEndpoint(): string;
    private getRetryConfig;
    getCircuitBreakerState(): {
        state: "CLOSED" | "OPEN" | "HALF_OPEN";
        failureCount: number;
        successCount: number;
        lastFailureTime: number;
    };
    resetCircuitBreaker(): void;
}
//# sourceMappingURL=S4HANAConnector.d.ts.map