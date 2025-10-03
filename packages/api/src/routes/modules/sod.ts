import { Router, Request, Response, NextFunction } from 'express';
import { SoDController } from '../../controllers/SoDController';
import { TenantProfileRepository } from '@sap-framework/core';
import { validateRequest, schemas } from '../../middleware/validator';
import { z } from 'zod';
import { config } from '../../config';

const router: Router = Router();
const tenantRepo = new TenantProfileRepository(config.databaseUrl);
const controller = new SoDController(tenantRepo);

/**
 * SoD Analysis Module Routes
 */

// Validation schemas
const acknowledgeViolationSchema = z.object({
  justification: z.string().min(10, 'Justification must be at least 10 characters'),
  approvedBy: z.string().min(1, 'Approver name is required'),
});

// List violations
router.get(
  '/:tenantId/violations',
  validateRequest({
    params: schemas.tenantId,
    query: schemas.pagination,
  }),
  (req, res, next) => controller.listViolations(req, res, next)
);

// Get violation details
router.get(
  '/:tenantId/violations/:violationId',
  validateRequest({ params: schemas.tenantId }),
  (req, res, next) => controller.getViolation(req, res, next)
);

// Acknowledge violation
router.post(
  '/:tenantId/violations/:violationId/acknowledge',
  validateRequest({
    params: schemas.tenantId,
    body: acknowledgeViolationSchema,
  }),
  (req, res, next) => controller.acknowledgeViolation(req, res, next)
);

// Get latest analysis
router.get(
  '/:tenantId/analysis',
  validateRequest({ params: schemas.tenantId }),
  (req, res, next) => controller.getAnalysis(req, res, next)
);

// Run analysis
router.post(
  '/:tenantId/analyze',
  validateRequest({ params: schemas.tenantId }),
  (req, res, next) => controller.runAnalysis(req, res, next)
);

// Export report
router.get(
  '/:tenantId/export',
  validateRequest({ params: schemas.tenantId }),
  (req, res, next) => controller.exportReport(req, res, next)
);

export default router;