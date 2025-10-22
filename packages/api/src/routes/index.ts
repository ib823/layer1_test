import { Router } from 'express';
// ✅ SECURITY FIX: Use secure authentication middleware
import { authenticate, requireRole } from '../middleware/auth.secure';
import { AuthenticatedRequest } from '../types';
import {
  apiLimiter,
  discoveryLimiter,
  sodAnalysisLimiter,
  adminLimiter
} from '../middleware/rateLimiting';
import { auditMiddleware } from '../middleware/auditMiddleware';
// ✅ SECURITY FIX: Add CSRF protection
import { csrfProtection } from '../middleware/csrfProtection';
import tenantsRoutes from './admin/tenants';
import discoveryRoutes from './admin/discovery';
import onboardingRoutes from './onboarding';
import monitoringRoutes from './monitoring';
import sodRoutes from './modules/sod';
import auditRoutes from './audit';
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

// Health check routes with comprehensive monitoring
import healthRoutes from './health';
router.use('/health', healthRoutes);

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

// Authentication routes (login, refresh are public; me, logout require auth)
import authRoutes from './auth';
router.use('/auth', authRoutes);

// ==============================================================================
// GLOBAL MIDDLEWARE: Apply to all routes below
// ==============================================================================

// ✅ SECURITY FIX: Apply rate limiting FIRST (before auth, to prevent auth bypass attacks)
router.use(apiLimiter);

// ✅ SECURITY FIX: Apply authentication - ALWAYS required (no bypass)
// CVE-2025-001 & CVE-2025-002: Authentication is now mandatory in all environments
// Production: Uses XSUAA (SAP BTP)
// Development: Uses JWT with signature validation (requires JWT_SECRET)
router.use(authenticate);

// ✅ SECURITY FIX: Apply CSRF protection for state-changing operations
// CVE-2025-008: Protects against Cross-Site Request Forgery attacks
router.use(csrfProtection({
  allowedOrigins: [process.env.CORS_ORIGIN || 'http://localhost:3001'],
  skipPaths: [
    /^\/api\/webhooks/,  // Webhooks typically use other authentication methods
  ],
}));

// ✅ SECURITY FIX: Apply tenant isolation middleware
// CVE-FRAMEWORK-2025-003: Prevents horizontal privilege escalation
// DEFECT-033, DEFECT-034: Enforces tenant scoping on all operations
import { enforceTenantIsolation } from '../middleware/tenantIsolation';
router.use(enforceTenantIsolation);

// ✅ SECURITY FIX: Apply input sanitization middleware
// CVE-FRAMEWORK-2025-005: Prevents stored XSS attacks
// DEFECT-035: Sanitizes all user inputs to prevent script injection
import { sanitizeRequestBody } from '../utils/sanitization';
router.use(sanitizeRequestBody);

// Apply audit middleware (after auth, so we have user context)
router.use(auditMiddleware);

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

/**
 * Audit Trail Routes
 * Prefix: /api/audit
 */
router.use('/audit', auditRoutes);

/**
 * Reporting Routes
 * Prefix: /api/reports
 */
import reportRoutes from './reports';
router.use('/reports', reportRoutes);

/**
 * Automation Routes
 * Prefix: /api/automations
 */
import automationRoutes from './automations';
router.use('/automations', automationRoutes);

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