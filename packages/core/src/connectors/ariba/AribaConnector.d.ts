import { BaseSAPConnector, SAPConnectorConfig } from '../base/BaseSAPConnector';
import { FrameworkError } from '../../errors';
export interface AribaConnectorConfig extends SAPConnectorConfig {
    ariba: {
        realm: string;
        apiKey: string;
    };
}
export declare class AribaConnector extends BaseSAPConnector {
    protected config: AribaConnectorConfig;
    constructor(config: AribaConnectorConfig);
    protected getAuthToken(): Promise<string>;
    protected mapSAPError(error: any): FrameworkError;
    protected getHealthCheckEndpoint(): string;
}
//# sourceMappingURL=AribaConnector.d.ts.map