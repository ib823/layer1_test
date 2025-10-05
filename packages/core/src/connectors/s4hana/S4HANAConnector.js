"use strict";
/**
 * S/4HANA Connector - SAP S/4HANA Cloud/On-Premise
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.S4HANAConnector = void 0;
const BaseSAPConnector_1 = require("../base/BaseSAPConnector");
const odata_1 = require("../../utils/odata");
const retry_1 = require("../../utils/retry");
const circuitBreaker_1 = require("../../utils/circuitBreaker");
const errors_1 = require("../../errors");
class S4HANAConnector extends BaseSAPConnector_1.BaseSAPConnector {
    retryStrategy;
    circuitBreaker;
    tokenCache = null;
    constructor(config) {
        super(config);
        this.retryStrategy = new retry_1.RetryStrategy();
        this.circuitBreaker = new circuitBreaker_1.CircuitBreaker(config.circuitBreaker || {
            failureThreshold: 5,
            successThreshold: 2,
            resetTimeout: 60000,
            name: 'S4HANA',
        });
    }
    async getUserRoles(options) {
        const query = new odata_1.ODataQueryBuilder();
        const filters = [];
        if (options.activeOnly) {
            const now = new Date().toISOString();
            filters.push(`ValidFrom le datetime'${now}'`);
            filters.push(`ValidTo ge datetime'${now}'`);
        }
        if (options.userIds && options.userIds.length > 0) {
            const userFilter = options.userIds
                .map((id) => `UserID eq ${(0, odata_1.escapeODataString)(id)}`)
                .join(' or ');
            filters.push(`(${userFilter})`);
        }
        if (options.roleIds && options.roleIds.length > 0) {
            const roleFilter = options.roleIds
                .map((id) => `RoleID eq ${(0, odata_1.escapeODataString)(id)}`)
                .join(' or ');
            filters.push(`(${roleFilter})`);
        }
        filters.forEach((f) => query.filter(f));
        return await this.executeQuery('/sap/opu/odata/sap/API_USER_ROLE_SRV/UserRoles', query);
    }
    async getUsers(options) {
        const query = new odata_1.ODataQueryBuilder();
        if (options.activeOnly) {
            query.filter("IsLocked eq false");
        }
        if (options.userIds && options.userIds.length > 0) {
            const userFilter = options.userIds
                .map((id) => `UserID eq ${(0, odata_1.escapeODataString)(id)}`)
                .join(' or ');
            query.filter(`(${userFilter})`);
        }
        return await this.executeQuery('/sap/opu/odata/sap/API_USER_SRV/Users', query);
    }
    async getRoles(options) {
        const query = new odata_1.ODataQueryBuilder();
        if (options.roleIds && options.roleIds.length > 0) {
            const roleFilter = options.roleIds
                .map((id) => `RoleID eq ${(0, odata_1.escapeODataString)(id)}`)
                .join(' or ');
            query.filter(`(${roleFilter})`);
        }
        if (options.roleType) {
            query.filter(`RoleType eq ${(0, odata_1.escapeODataString)(options.roleType)}`);
        }
        return await this.executeQuery('/sap/opu/odata/sap/API_ROLE_SRV/Roles', query);
    }
    async executeQuery(endpoint, queryBuilder) {
        const queryString = queryBuilder.build();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return await this.circuitBreaker.execute(async () => {
            return await this.retryStrategy.executeWithRetry(async () => {
                const response = await this.request({
                    method: 'GET',
                    url: url,
                });
                return response.d.results;
            }, this.getRetryConfig());
        });
    }
    async executeBatch(_requests) {
        if (!this.config.odata?.useBatch) {
            throw new errors_1.ValidationError('Batch operations not enabled in configuration');
        }
        throw new Error('Batch operations not yet implemented');
    }
    // Shadow parent config with correct type
    async getAuthToken() {
        if (this.tokenCache && Date.now() < this.tokenCache.expiry) {
            return this.tokenCache.token;
        }
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
        const { type } = this.config.auth;
        if (type === 'OAUTH') {
            throw new Error('OAuth token acquisition not implemented');
        }
        throw new errors_1.AuthenticationError(`Unsupported auth type: ${type}`);
    }
    mapSAPError(error) {
        const status = error.response?.status;
        const sapError = error.response?.data?.error;
        switch (status) {
            case 400:
                return new errors_1.ValidationError(sapError?.message?.value || 'Invalid request', sapError);
            case 401:
                return new errors_1.AuthenticationError(sapError?.message?.value || 'Authentication failed', sapError);
            case 403:
                return new errors_1.ValidationError(sapError?.message?.value || 'Insufficient permissions', sapError);
            case 404:
                return new errors_1.NotFoundError(sapError?.message?.value || 'Resource not found', sapError);
            case 429:
                return new errors_1.FrameworkError('Rate limit exceeded', 'RATE_LIMIT', 429, true, sapError);
            case 500:
            case 502:
            case 503:
            case 504:
                return new errors_1.FrameworkError(sapError?.message?.value || 'SAP system error', 'SAP_ERROR', status, true, sapError);
            default:
                return new errors_1.FrameworkError(error.message || 'Unknown error', 'UNKNOWN', status || 500, false, sapError);
        }
    }
    getHealthCheckEndpoint() {
        return '/sap/opu/odata/iwfnd/catalogservice;v=2';
    }
    getRetryConfig() {
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
    getCircuitBreakerState() {
        return this.circuitBreaker.getMetrics();
    }
    resetCircuitBreaker() {
        this.circuitBreaker.reset();
    }
}
exports.S4HANAConnector = S4HANAConnector;
//# sourceMappingURL=S4HANAConnector.js.map