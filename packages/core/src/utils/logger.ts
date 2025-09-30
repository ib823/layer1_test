import winston from 'winston';
import { LoggerConfig } from '../types';

export function createLogger(config: LoggerConfig): winston.Logger {
  return winston.createLogger({
    level: config.level,
    format: config.format === 'json' 
      ? winston.format.json()
      : winston.format.simple(),
    transports: [
      new winston.transports.Console(),
    ],
  });
}