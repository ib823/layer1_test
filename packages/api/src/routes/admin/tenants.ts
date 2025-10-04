import { Router, Request, Response, NextFunction } from 'express';
import { TenantController } from '../../controllers/TenantController';
import { TenantProfileRepository } from '@sap-framework/core';
import { validateRequest, schemas } from '../../middleware/validator';
import { cacheMiddleware } from '../../middleware/cache';
import { config } from '../../config';

const router: Router = Router();
const tenantRepo = new TenantProfileRepository(config.databaseUrl);
const controller = new TenantController(tenantRepo);

/**
 * Tenant Management Routes (with caching for performance)
 */

// List all tenants (cached for 5 minutes)
router.get(
  '/',
  validateRequest({ query: schemas.pagination }),
  cacheMiddleware(5 * 60 * 1000),
  (req, res, next) => controller.listTenants(req, res, next)
);

// Get tenant details (cached for 2 minutes)
router.get(
  '/:tenantId',
  validateRequest({ params: schemas.tenantId }),
  cacheMiddleware(2 * 60 * 1000),
  (req, res, next) => controller.getTenant(req, res, next)
);

// Create tenant
router.post(
  '/',
  validateRequest({ body: schemas.createTenant }),
  (req, res, next) => controller.createTenant(req, res, next)
);

// Update tenant
router.put(
  '/:tenantId',
  validateRequest({
    params: schemas.tenantId,
    body: schemas.updateTenant,
  }),
  (req, res, next) => controller.updateTenant(req, res, next)
);

// Delete tenant
router.delete(
  '/:tenantId',
  validateRequest({ params: schemas.tenantId }),
  (req, res, next) => controller.deleteTenant(req, res, next)
);

// Get active modules
router.get(
  '/:tenantId/modules',
  validateRequest({ params: schemas.tenantId }),
  (req, res, next) => controller.getActiveModules(req, res, next)
);

// Activate module
router.post(
  '/:tenantId/modules/:moduleName/activate',
  validateRequest({
    params: schemas.tenantId,
    body: schemas.moduleActivation,
  }),
  (req, res, next) => controller.activateModule(req, res, next)
);

// Deactivate module
router.post(
  '/:tenantId/modules/:moduleName/deactivate',
  validateRequest({ params: schemas.tenantId }),
  (req, res, next) => controller.deactivateModule(req, res, next)
);

export default router;