/**
 * Core type definitions
 */

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: number;
  details?: any;
}

export interface TokenPayload {
  iss: string;
  exp: number;
  aud: string[];
  sub: string;
  user_id: string;
  user_name: string;
  zid: string;
  scope: string[];
  [key: string]: any;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LoggerConfig {
  level: LogLevel;
  format?: 'json' | 'simple';
  destination?: string;
}