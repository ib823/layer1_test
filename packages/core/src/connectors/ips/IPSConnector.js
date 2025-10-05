"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPSConnector = void 0;
const BaseSAPConnector_1 = require("../base/BaseSAPConnector");
const errors_1 = require("../../errors");
const retry_1 = require("../../utils/retry");
const circuitBreaker_1 = require("../../utils/circuitBreaker");
/**
 * SAP Identity Provisioning Service (IPS) Connector
 * Uses SCIM 2.0 protocol
 */
class IPSConnector extends BaseSAPConnector_1.BaseSAPConnector {
    retryStrategy;
    circuitBreaker;
    tokenCache = null;
    constructor(config) {
        super(config);
        this.retryStrategy = new retry_1.RetryStrategy();
        this.circuitBreaker = new circuitBreaker_1.CircuitBreaker({
            failureThreshold: 5,
            successThreshold: 2,
            resetTimeout: 60000,
            name: 'IPS',
        });
    }
    // ============================================================
    // USER OPERATIONS
    // ============================================================
    async getUsers(options = {}) {
        const params = this.buildQueryParams(options);
        return await this.circuitBreaker.execute(async () => {
            return await this.retryStrategy.executeWithRetry(async () => {
                const response = await this.request({
                    method: 'GET',
                    url: '/Users',
                    params,
                });
                return response.Resources;
            }, this.getRetryConfig());
        });
    }
    async getUser(userId) {
        return await this.circuitBreaker.execute(async () => {
            return await this.retryStrategy.executeWithRetry(async () => {
                return await this.request({
                    method: 'GET',
                    url: `/Users/${userId}`,
                });
            }, this.getRetryConfig());
        });
    }
    async getUsersByFilter(filter) {
        return await this.getUsers({ filter });
    }
    // ============================================================
    // GROUP OPERATIONS
    // ============================================================
    async getGroups(options = {}) {
        const params = this.buildQueryParams(options);
        return await this.circuitBreaker.execute(async () => {
            return await this.retryStrategy.executeWithRetry(async () => {
                const response = await this.request({
                    method: 'GET',
                    url: '/Groups',
                    params,
                });
                return response.Resources;
            }, this.getRetryConfig());
        });
    }
    async getGroup(groupId) {
        return await this.circuitBreaker.execute(async () => {
            return await this.retryStrategy.executeWithRetry(async () => {
                return await this.request({
                    method: 'GET',
                    url: `/Groups/${groupId}`,
                });
            }, this.getRetryConfig());
        });
    }
    async getGroupMembers(groupId) {
        const group = await this.getGroup(groupId);
        if (!group.members || group.members.length === 0) {
            return [];
        }
        // Fetch all members
        const memberPromises = group.members.map((member) => this.getUser(member.value));
        return await Promise.all(memberPromises);
    }
    // ============================================================
    // USER-GROUP MAPPING (for SoD analysis)
    // ============================================================
    async getUserGroupMemberships(userId) {
        const user = await this.getUser(userId);
        if (!user.groups || user.groups.length === 0) {
            return [];
        }
        // Fetch all groups
        const groupPromises = user.groups.map((groupId) => this.getGroup(groupId));
        return await Promise.all(groupPromises);
    }
    async getAllUserGroupMemberships() {
        const users = await this.getUsers();
        const memberships = new Map();
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
    async getAuthToken() {
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
        }
        catch (error) {
            throw new errors_1.AuthenticationError('Failed to acquire OAuth token', error);
        }
    }
    async acquireOAuthToken() {
        // Placeholder - implement based on your IPS OAuth setup
        throw new Error('OAuth token acquisition not implemented');
    }
    mapSAPError(error) {
        const status = error.response?.status;
        const scimError = error.response?.data;
        switch (status) {
            case 401:
                return new errors_1.AuthenticationError(scimError?.detail || 'Authentication failed', scimError);
            case 404:
                return new errors_1.NotFoundError(scimError?.detail || 'Resource not found', scimError);
            default:
                return new errors_1.FrameworkError(scimError?.detail || error.message || 'Unknown error', scimError?.scimType || 'UNKNOWN', status || 500, [500, 502, 503, 504].includes(status), scimError);
        }
    }
    getHealthCheckEndpoint() {
        return '/ServiceProviderConfig';
    }
    // ============================================================
    // UTILITIES
    // ============================================================
    buildQueryParams(options) {
        const params = {};
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
    getRetryConfig() {
        // Always return complete RetryConfig by merging with defaults
        const defaults = {
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
exports.IPSConnector = IPSConnector;
//# sourceMappingURL=IPSConnector.js.map