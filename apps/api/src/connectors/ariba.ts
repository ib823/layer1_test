import type { Connector, PingResult } from './base';

export class AribaConnector implements Connector {
  constructor(_opts: { baseUrl?: string; auth?: any }) {}
  async ping(): Promise<PingResult> {
    return { ok: true, info: { name: 'Ariba (stub)', type: 'Ariba', version: 'stub' } };
  }
}
