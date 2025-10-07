import { Router } from 'express';
import { DiscoveryController } from '../../controllers/DiscoveryController';
import { TenantProfileRepository } from '@sap-framework/core';
import { validateRequest, schemas } from '../../middleware/validator';
import { config } from '../../config';

const router: Router = Router();
const tenantRepo = new TenantProfileRepository(config.databaseUrl);
const controller = new DiscoveryController(tenantRepo);

/**
 * Service Discovery Routes
 */

// Run service discovery
router.post(
  '/:tenantId/discovery',
  validateRequest({ params: schemas.tenantId }),
  (req, res, next) => controller.runDiscovery(req, res, next)
);

// Get capability profile
router.get(
  '/:tenantId/profile',
  validateRequest({ params: schemas.tenantId }),
  (req, res, next) => controller.getProfile(req, res, next)
);

// Get discovery history
router.get(
  '/:tenantId/discovery/history',
  validateRequest({ params: schemas.tenantId }),
  (req, res, next) => controller.getDiscoveryHistory(req, res, next)
);

export default router;