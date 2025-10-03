import { Router, Request, Response, NextFunction } from 'express';
import { MonitoringController } from '../../controllers/MonitoringController';
import { TenantProfileRepository } from '@sap-framework/core';
import { validateRequest, schemas } from '../../middleware/validator';
import { config } from '../../config';

const router: Router = Router();
const tenantRepo = new TenantProfileRepository(config.databaseUrl);
const controller = new MonitoringController(tenantRepo);

/**
 * Monitoring & Health Routes
 */

// System health
router.get(
  '/health',
  (req, res, next) => controller.getHealth(req, res, next)
);

// Connector statuses
router.get(
  '/connectors',
  (req, res, next) => controller.getConnectors(req, res, next)
);

// System metrics
router.get(
  '/metrics',
  (req, res, next) => controller.getMetrics(req, res, next)
);

// Discovery history (all tenants)
router.get(
  '/discovery/history',
  (req, res, next) => controller.getDiscoveryHistory(req, res, next)
);

// Tenant-specific status
router.get(
  '/tenants/:tenantId/status',
  validateRequest({ params: schemas.tenantId }),
  (req, res, next) => controller.getTenantStatus(req, res, next)
);

export default router;