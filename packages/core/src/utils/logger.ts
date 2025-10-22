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

/**
 * Default logger instance for internal framework use
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
    }),
  ],
});

export default logger;