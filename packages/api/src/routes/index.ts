import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import tenantsRoutes from './admin/tenants';
import discoveryRoutes from './admin/discovery';
import onboardingRoutes from './onboarding';
import monitoringRoutes from './monitoring';
import sodRoutes from './modules/sod';
import { ApiResponseUtil } from '../utils/response';

const router: Router = Router();

/**
 * API Routes
 * Base: /api
 */

// Health check (no auth required)
router.get('/health', (req, res) => {
  ApiResponseUtil.success(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Version info (no auth required)
router.get('/version', (req, res) => {
  ApiResponseUtil.success(res, {
    version: '1.0.0',
    apiVersion: 'v1',
    framework: 'SAP MVP Framework',
  });
});

// Apply authentication to all routes below (optional in development)
// Uncomment when ready to enable auth
// router.use(authenticate);

/**
 * Admin Routes
 * Prefix: /api/admin
 */
router.use('/admin/tenants', tenantsRoutes);
router.use('/admin/tenants', discoveryRoutes);

/**
 * Onboarding Routes
 * Prefix: /api/onboarding
 */
router.use('/onboarding', onboardingRoutes);

/**
 * Monitoring Routes
 * Prefix: /api/monitoring
 */
router.use('/monitoring', monitoringRoutes);

/**
 * Module Routes
 * Prefix: /api/modules
 */
router.use('/modules/sod', sodRoutes);

export default router;