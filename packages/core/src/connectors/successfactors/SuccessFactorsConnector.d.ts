/**
 * SAP SuccessFactors Connector
 * Uses OData v2 with OAuth 2.0 SAML Bearer Assertion flow
 */
import { BaseSAPConnector, SAPConnectorConfig } from '../base/BaseSAPConnector';
import { SFEmployee, SFOrgUnit } from './types';
import { FrameworkError } from '../../errors';
export interface SuccessFactorsConnectorConfig extends SAPConnectorConfig {
    successfactors: {
        companyId: string;
        apiKey: string;
    };
}
/**
 * SuccessFactors uses OData v2 like S/4HANA but with different authentication
 */
export declare class SuccessFactorsConnector extends BaseSAPConnector {
    protected config: SuccessFactorsConnectorConfig;
    constructor(config: SuccessFactorsConnectorConfig);
    /**
     * Get Employees
     */
    getEmployees(options?: {
        status?: string;
        department?: string;
    }): Promise<SFEmployee[]>;
    /**
     * Get Organizational Units
     */
    getOrgUnits(): Promise<SFOrgUnit[]>;
    /**
     * SuccessFactors uses Basic Auth or OAuth
     */
    protected getAuthToken(): Promise<string>;
    private mapSFError;
    protected mapSAPError(error: any): FrameworkError;
    protected getHealthCheckEndpoint(): string;
}
//# sourceMappingURL=SuccessFactorsConnector.d.ts.map