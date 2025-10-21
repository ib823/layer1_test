import { createApp } from './app';
import { config } from './config';
import logger from './utils/logger';
import { enforceSecurityConfig } from '@sap-framework/core';

// Validate security configuration before starting server
logger.info('🔒 Validating security configuration...');
enforceSecurityConfig(process.env);

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`🚀 SAP Framework API Server started`, {
    port: config.port,
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });

  logger.info('📋 API Documentation:', {
    health: `http://localhost:${config.port}/api/health`,
    version: `http://localhost:${config.port}/api/version`,
    admin: `http://localhost:${config.port}/api/admin/tenants`,
    monitoring: `http://localhost:${config.port}/api/monitoring/health`,
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

export default server;