import { createApp } from './app';
import { config } from './config';
import logger from './utils/logger';
import { enforceSecurityConfig, EmailService } from '@sap-framework/core';

// Validate security configuration before starting server
logger.info('🔒 Validating security configuration...');
enforceSecurityConfig(process.env);

// Initialize Email Service
logger.info('📧 Initializing email service...');
try {
  const emailProvider = (process.env.EMAIL_PROVIDER || 'test') as 'brevo' | 'resend' | 'smtp' | 'test';

  const emailConfig = {
    provider: emailProvider,
    from: {
      name: process.env.EMAIL_FROM_NAME || 'Prism',
      email: process.env.EMAIL_FROM_EMAIL || 'noreply@prism.com',
    },
    ...(emailProvider === 'brevo' && {
      brevo: {
        apiKey: process.env.BREVO_API_KEY || '',
      },
    }),
    ...(emailProvider === 'resend' && {
      resend: {
        apiKey: process.env.RESEND_API_KEY || '',
      },
    }),
    ...(emailProvider === 'smtp' && {
      smtp: {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      },
    }),
  };

  EmailService.initialize(emailConfig);
  logger.info(`📧 Email service initialized with provider: ${emailProvider}`);
} catch (error: any) {
  logger.error('Failed to initialize email service', { error: error.message });
  // Continue without email service - it will fail gracefully when needed
}

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