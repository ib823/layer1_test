import { BaseSAPConnector, SAPConnectorConfig } from '../base/BaseSAPConnector';
import { FrameworkError } from '../../errors';

export interface AribaConnectorConfig extends SAPConnectorConfig {
  ariba: { realm: string; apiKey: string };
}

export class AribaConnector extends BaseSAPConnector {
  protected declare config: AribaConnectorConfig;

  constructor(config: AribaConnectorConfig) {
    super(config);
  }

  protected async getAuthToken(): Promise<string> {
    return this.config.ariba.apiKey;
  }

  protected mapSAPError(error: unknown): FrameworkError {
    return new FrameworkError('Ariba error', 'ARIBA', 500, false, error);
  }

  protected getHealthCheckEndpoint(): string {
    return '/api/status';
  }
}