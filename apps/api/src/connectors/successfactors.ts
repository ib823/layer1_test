import type { Connector, PingResult } from './base';

export class SuccessFactorsConnector implements Connector {
  constructor(_opts: { baseUrl?: string; auth?: any }) {}
  async ping(): Promise<PingResult> {
    return { ok: true, info: { name: 'SuccessFactors (stub)', type: 'SuccessFactors', version: 'stub' } };
  }
}
