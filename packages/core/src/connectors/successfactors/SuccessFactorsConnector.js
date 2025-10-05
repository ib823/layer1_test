"use strict";
/**
 * SAP SuccessFactors Connector
 * Uses OData v2 with OAuth 2.0 SAML Bearer Assertion flow
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuccessFactorsConnector = void 0;
const BaseSAPConnector_1 = require("../base/BaseSAPConnector");
const odata_1 = require("../../utils/odata");
const errors_1 = require("../../errors");
/**
 * SuccessFactors uses OData v2 like S/4HANA but with different authentication
 */
class SuccessFactorsConnector extends BaseSAPConnector_1.BaseSAPConnector {
    constructor(config) {
        super(config);
    }
    /**
     * Get Employees
     */
    async getEmployees(options) {
        const query = new odata_1.ODataQueryBuilder();
        if (options?.status) {
            query.filter(`status eq ${(0, odata_1.escapeODataString)(options.status)}`);
        }
        if (options?.department) {
            query.filter(`department eq ${(0, odata_1.escapeODataString)(options.department)}`);
        }
        const queryString = query.build();
        const url = queryString
            ? `/odata/v2/User?${queryString}`
            : '/odata/v2/User';
        try {
            const response = await this.request({
                method: 'GET',
                url,
            });
            return response.d.results;
        }
        catch (error) {
            throw this.mapSFError(error);
        }
    }
    /**
     * Get Organizational Units
     */
    async getOrgUnits() {
        try {
            const response = await this.request({
                method: 'GET',
                url: '/odata/v2/FODepartment',
            });
            return response.d.results;
        }
        catch (error) {
            throw this.mapSFError(error);
        }
    }
    /**
     * SuccessFactors uses Basic Auth or OAuth
     */
    async getAuthToken() {
        // For Basic Auth: return base64(apiKey + '@' + companyId + ':password)
        const credentials = `${this.config.successfactors.apiKey}@${this.config.successfactors.companyId}`;
        return Buffer.from(credentials).toString('base64');
    }
    mapSFError(error) {
        const status = error.response?.status;
        const sfError = error.response?.data?.error;
        if (status === 401) {
            return new errors_1.AuthenticationError('Invalid SuccessFactors credentials', sfError);
        }
        return new errors_1.FrameworkError(sfError?.message?.value || error.message || 'SuccessFactors API error', 'SF_ERROR', status || 500, [500, 502, 503].includes(status), sfError);
    }
    mapSAPError(error) {
        return this.mapSFError(error);
    }
    getHealthCheckEndpoint() {
        return '/odata/v2/$metadata';
    }
}
exports.SuccessFactorsConnector = SuccessFactorsConnector;
//# sourceMappingURL=SuccessFactorsConnector.js.map