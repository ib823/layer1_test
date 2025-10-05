import type { Connector, PingResult } from './base';

export class S4Connector implements Connector {
  constructor(_opts: { baseUrl?: string; auth?: any }) {}
  async ping(): Promise<PingResult> {
    return { ok: true, info: { name: 'SAP S/4HANA (stub)', type: 'S4HANA', version: 'stub' } };
  }
}
