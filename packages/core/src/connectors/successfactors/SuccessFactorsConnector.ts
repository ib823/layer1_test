import { BaseSAPConnector, SAPConnectorConfig } from '../base/BaseSAPConnector';
import { FrameworkError } from '../../errors';

export interface SuccessFactorsConnectorConfig extends SAPConnectorConfig {
  successfactors: { companyId: string; apiKey: string };
}

export class SuccessFactorsConnector extends BaseSAPConnector {
  protected declare config: SuccessFactorsConnectorConfig;

  constructor(config: SuccessFactorsConnectorConfig) {
    super(config);
  }

  protected async getAuthToken(): Promise<string> {
    return Buffer.from(this.config.successfactors.apiKey).toString('base64');
  }

  protected mapSAPError(error: any): FrameworkError {
    return new FrameworkError('SF error', 'SF', 500, false, error);
  }

  protected getHealthCheckEndpoint(): string {
    return '/odata/v2/$metadata';
  }
}