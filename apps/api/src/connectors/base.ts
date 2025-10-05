export type ConnectorInfo = { name: string; type: string; version?: string };
export type PingResult = { ok: boolean; info: ConnectorInfo };

export interface Connector {
  ping(): Promise<PingResult>;
}
