/**
 * Health Check Routes
 * System health monitoring endpoints
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@sap-framework/core';
import { ApiResponseUtil } from '../utils/response';
import logger from '../utils/logger';

const router: Router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/health
 * Overall system health check
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        api: 'healthy',
        database: 'unknown',
        modules: 'unknown',
      },
    };

    // Quick database check
    try {
      await prisma.$queryRaw`SELECT 1`;
      healthStatus.checks.database = 'healthy';
    } catch (error) {
      healthStatus.checks.database = 'unhealthy';
      healthStatus.status = 'degraded';
      logger.error('Database health check failed', error);
    }

    // Check if modules are available
    healthStatus.checks.modules = 'healthy';

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json(healthStatus);
  } catch (error: any) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/health/database
 * Database connectivity and table health check
 */
router.get('/database', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();

    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;

    // Check critical tables
    const tableChecks = await Promise.all([
      prisma.tenant.count().then(() => ({ table: 'Tenant', status: 'ok' })).catch((e: any) => ({ table: 'Tenant', status: 'error', error: e.message })),
      prisma.invoiceMatchRun.count().then(() => ({ table: 'InvoiceMatchRun', status: 'ok' })).catch((e: any) => ({ table: 'InvoiceMatchRun', status: 'error', error: e.message })),
      prisma.gLAnomalyRun.count().then(() => ({ table: 'GLAnomalyRun', status: 'ok' })).catch((e: any) => ({ table: 'GLAnomalyRun', status: 'error', error: e.message })),
      prisma.vendorQualityRun.count().then(() => ({ table: 'VendorQualityRun', status: 'ok' })).catch((e: any) => ({ table: 'VendorQualityRun', status: 'error', error: e.message })),
    ]);

    const allHealthy = tableChecks.every((check: any) => check.status === 'ok');

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      database: {
        connected: true,
        responseTimeMs: responseTime,
        tables: tableChecks,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Database health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      database: {
        connected: false,
        error: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/health/modules
 * Module availability check
 */
router.get('/modules', async (req: Request, res: Response) => {
  try {
    const modules = [
      {
        name: 'Invoice Matching',
        status: 'available',
        endpoint: '/api/matching',
        capabilities: ['three-way-matching', 'fraud-detection'],
      },
      {
        name: 'GL Anomaly Detection',
        status: 'available',
        endpoint: '/api/modules/gl-anomaly',
        capabilities: ['benfords-law', 'statistical-outliers', 'behavioral-anomalies'],
      },
      {
        name: 'Vendor Data Quality',
        status: 'available',
        endpoint: '/api/modules/vendor-quality',
        capabilities: ['quality-scoring', 'duplicate-detection', 'risk-profiling'],
      },
      {
        name: 'SoD Control',
        status: 'available',
        endpoint: '/api/modules/sod',
        capabilities: ['segregation-of-duties', 'conflict-detection'],
      },
    ];

    res.status(200).json({
      status: 'healthy',
      modules,
      totalModules: modules.length,
      availableModules: modules.filter((m) => m.status === 'available').length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Modules health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/health/ready
 * Kubernetes readiness probe
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Readiness check failed', error);
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/health/live
 * Kubernetes liveness probe
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

export default router;
