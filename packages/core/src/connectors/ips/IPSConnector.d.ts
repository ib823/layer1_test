import { BaseSAPConnector, SAPConnectorConfig } from '../base/BaseSAPConnector';
import { FrameworkError } from '../../errors';
import { RetryConfig } from '../../utils/retry';
import { IPSUser, IPSGroup, IPSQueryOptions } from './types';
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
export declare class IPSConnector extends BaseSAPConnector {
    protected config: IPSConnectorConfig;
    private retryStrategy;
    private circuitBreaker;
    private tokenCache;
    constructor(config: IPSConnectorConfig);
    getUsers(options?: IPSQueryOptions): Promise<IPSUser[]>;
    getUser(userId: string): Promise<IPSUser>;
    getUsersByFilter(filter: string): Promise<IPSUser[]>;
    getGroups(options?: IPSQueryOptions): Promise<IPSGroup[]>;
    getGroup(groupId: string): Promise<IPSGroup>;
    getGroupMembers(groupId: string): Promise<IPSUser[]>;
    getUserGroupMemberships(userId: string): Promise<IPSGroup[]>;
    getAllUserGroupMemberships(): Promise<Map<string, IPSGroup[]>>;
    protected getAuthToken(): Promise<string>;
    private acquireOAuthToken;
    protected mapSAPError(error: any): FrameworkError;
    protected getHealthCheckEndpoint(): string;
    private buildQueryParams;
    private getRetryConfig;
}
//# sourceMappingURL=IPSConnector.d.ts.map