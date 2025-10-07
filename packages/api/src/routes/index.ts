import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import {
  apiLimiter,
  discoveryLimiter,
  sodAnalysisLimiter,
  adminLimiter
} from '../middleware/rateLimiting';
import tenantsRoutes from './admin/tenants';
import discoveryRoutes from './admin/discovery';
import onboardingRoutes from './onboarding';
import monitoringRoutes from './monitoring';
import sodRoutes from './modules/sod';
import { ApiResponseUtil } from '../utils/response';
import { config } from '../config';

const router: Router = Router();

/**
 * API Routes
 * Base: /api
 *
 * Security Model:
 * - Health/version endpoints: PUBLIC (no auth, no rate limit)
 * - All other endpoints: AUTHENTICATED + RATE LIMITED
 * - Admin endpoints: AUTHENTICATED + ADMIN ROLE + RATE LIMITED
 * - Expensive operations (discovery, SoD): STRICTER RATE LIMITS
 */

// ==============================================================================
// PUBLIC ENDPOINTS (no auth, no rate limiting)
// ==============================================================================

// Health check (BTP standard: /healthz)
router.get('/health', (req, res) => {
  ApiResponseUtil.success(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Healthz alias for Cloud Foundry / K8s compatibility
router.get('/healthz', (req, res) => {
  ApiResponseUtil.success(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Version info
router.get('/version', (req, res) => {
  ApiResponseUtil.success(res, {
    version: '1.0.0',
    apiVersion: 'v1',
    framework: 'SAP MVP Framework',
  });
});

// ==============================================================================
// GLOBAL MIDDLEWARE: Apply to all routes below
// ==============================================================================

// Apply rate limiting FIRST (before auth, to prevent auth bypass attacks)
router.use(apiLimiter);

// Apply authentication
// IMPORTANT: Always enabled in production. Dev mode requires AUTH_ENABLED=true
if (config.auth.enabled) {
  router.use(authenticate);
} else {
  // Development mode: Log warning that auth is disabled
  router.use((req: AuthenticatedRequest, res, next) => {
    console.warn('⚠️  WARNING: Authentication is DISABLED. Set AUTH_ENABLED=true in production!');
    // In dev mode with auth disabled, set a fake user for testing
    req.user = {
      id: 'dev-user',
      email: 'dev@example.com',
      roles: ['admin'],
      tenantId: 'dev-tenant',
    };
    next();
  });
}

// ==============================================================================
// ADMIN ROUTES: Require admin role + stricter rate limiting
// ==============================================================================

// Apply admin-specific middleware
router.use('/admin', adminLimiter);
router.use('/admin', requireRole('admin'));

// Discovery endpoint needs even stricter limiting
router.use('/admin/tenants/:id/discover', discoveryLimiter);

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

// ==============================================================================
// MODULE ROUTES: Expensive operations need stricter rate limiting
// ==============================================================================

// SoD analysis is expensive - apply stricter limiting
router.use('/modules/sod/analyze', sodAnalysisLimiter);

/**
 * Module Routes
 * Prefix: /api/modules
 */
router.use('/modules/sod', sodRoutes);

import glAnomalyRoutes from './modules/gl-anomaly';
router.use('/modules/gl-anomaly', glAnomalyRoutes);

import vendorQualityRoutes from './modules/vendor-quality';
router.use('/modules/vendor-quality', vendorQualityRoutes);

/**
 * Compliance Routes
 * Prefix: /api/compliance
 */
import gdprRoutes from './compliance/gdpr';
router.use('/compliance/gdpr', gdprRoutes);

/**
 * Analytics Routes
 * Prefix: /api/analytics
 */
import analyticsRoutes from './analytics';
router.use('/analytics', analyticsRoutes);

/**
 * Dashboard Routes
 * Prefix: /api/dashboard
 */
import dashboardRoutes from './dashboard';
router.use('/dashboard', dashboardRoutes);

/**
 * Invoice Matching Routes
 * Prefix: /api/matching
 */
import matchingRoutes from './matching';
router.use('/matching', matchingRoutes);

/**
 * Capabilities Routes (BTP Destination connectivity checks)
 * Prefix: /api/capabilities
 * Requires: Admin role (configured in App Router xs-app.json)
 */
import capabilitiesRoutes from './capabilities';
router.use('/capabilities', capabilitiesRoutes);

export default router;