import { Router } from 'express';
import { OnboardingController } from '../../controllers/OnboardingController';
import { TenantProfileRepository } from '@sap-framework/core';
import { validateRequest } from '../../middleware/validator';
import { z } from 'zod';
import { config } from '../../config';

const router: Router = Router();
const tenantRepo = new TenantProfileRepository(config.databaseUrl);
const controller = new OnboardingController(tenantRepo);

/**
 * Onboarding Flow Routes
 */

// Validation schemas
const startOnboardingSchema = z.object({
  tenantId: z.string().min(1),
  companyName: z.string().min(1),
});

const connectionTestSchema = z.object({
  baseUrl: z.string().url(),
  client: z.string().optional(),
  auth: z.object({
    type: z.enum(['OAUTH', 'BASIC', 'CERTIFICATE']),
    credentials: z.any(),
  }),
});

const completeOnboardingSchema = z.object({
  sapConnection: z.object({
    baseUrl: z.string().url(),
    client: z.string().optional(),
    auth: z.object({
      type: z.enum(['OAUTH', 'BASIC', 'CERTIFICATE']),
      credentials: z.any(),
    }),
  }),
});

// Start onboarding
router.post(
  '/start',
  validateRequest({ body: startOnboardingSchema }),
  (req, res, next) => controller.startOnboarding(req, res, next)
);

// Test connection
router.post(
  '/:sessionId/connection',
  validateRequest({ body: connectionTestSchema }),
  (req, res, next) => controller.testConnection(req, res, next)
);

// Run discovery
router.post(
  '/:sessionId/discover',
  validateRequest({ body: connectionTestSchema }),
  (req, res, next) => controller.runDiscovery(req, res, next)
);

// Complete onboarding
router.post(
  '/:sessionId/complete',
  validateRequest({ body: completeOnboardingSchema }),
  (req, res, next) => controller.completeOnboarding(req, res, next)
);

// Get onboarding status
router.get(
  '/:sessionId/status',
  (req, res, next) => controller.getStatus(req, res, next)
);

export default router;