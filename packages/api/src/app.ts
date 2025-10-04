import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import swaggerUi from 'swagger-ui-express';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { auditLog } from './middleware/auditLog';
import { enforceDataResidency } from './middleware/dataResidency';
import { standardRateLimit } from './middleware/rateLimiting';
import { config } from './config';
import logger from './utils/logger';
import { swaggerSpec } from './swagger';

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors(config.cors));

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Apply rate limiting to all routes
  app.use(standardRateLimit);

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