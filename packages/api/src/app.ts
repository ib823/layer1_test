import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import swaggerUi from 'swagger-ui-express';
import { initializeEncryption } from '@sap-framework/core';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { auditLog } from './middleware/auditLog';
import { enforceDataResidency } from './middleware/dataResidency';
import { apiLimiter } from './middleware/rateLimiting';
import { metricsMiddleware } from './middleware/metrics';
import { config } from './config';
import logger from './utils/logger';
import { swaggerSpec } from './swagger';

export function createApp(): Application {
  const app = express();

  // Initialize encryption service at startup
  try {
    if (process.env.ENCRYPTION_MASTER_KEY) {
      initializeEncryption(process.env.ENCRYPTION_MASTER_KEY);
      logger.info('✅ Encryption service initialized');
    } else {
      logger.warn('⚠️  ENCRYPTION_MASTER_KEY not set - encryption disabled');
    }
  } catch (error: any) {
    logger.error('❌ Failed to initialize encryption service:', error);
    throw error;
  }

  // Security middleware with comprehensive headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for Swagger UI
          styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for Swagger UI
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow embedding resources
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true, // X-Content-Type-Options: nosniff
      frameguard: { action: 'deny' }, // X-Frame-Options: DENY
      xssFilter: true, // X-XSS-Protection: 1; mode=block
    })
  );
  app.use(cors(config.cors));

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Note: Rate limiting is now applied in routes/index.ts after public endpoints

  // Metrics tracking middleware
  app.use(metricsMiddleware);

  // Request ID middleware
  app.use((req, res, next) => {
    res.locals.requestId = uuidv4();
    res.setHeader('X-Request-ID', res.locals.requestId);
    next();
  });

  // Request logging
  app.use((req, res, next) => {
    logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      requestId: res.locals.requestId,
      ip: req.ip,
    });
    next();
  });

  // Data residency enforcement (after auth, before routes)
  app.use(enforceDataResidency());

  // Audit logging (log all requests)
  app.use(auditLog());

  // API Documentation (Swagger UI)
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'SAP MVP Framework API',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
      },
    })
  );

  // Mount API routes
  app.use('/api', routes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      message: 'SAP MVP Framework API',
      version: '1.0.0',
      documentation: '/api-docs',
      health: '/api/health',
    });
  });

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}