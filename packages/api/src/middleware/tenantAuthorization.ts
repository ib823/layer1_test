/**
 * Tenant Authorization Middleware
 *
 * SECURITY FIX: CVE-FRAMEWORK-2025-003 (Tenant Isolation Failure)
 *
 * Prevents Insecure Direct Object Reference (IDOR) attacks by validating
 * that authenticated users can only access their own tenant's data.
 *
 * CRITICAL: This middleware MUST be applied to ALL tenant-scoped routes
 *
 * Usage:
 *   router.use('/api/modules/:tenantId/*', validateTenantAccess());
 *   router.use('/api/admin/tenants/:tenantId', validateTenantAccess({ adminOverride: true }));
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { ApiResponseUtil } from '../utils/response';
import logger from '../utils/logger';

export interface TenantAuthOptions {
  /**
   * Allow admin users to access any tenant
   * Default: true
   */
  adminOverride?: boolean;

  /**
   * Custom parameter name for tenant ID
   * Default: 'tenantId'
   */
  tenantIdParam?: string;

  /**
   * Allow access if user has specific role (besides admin)
   */
  allowedRoles?: string[];
}

/**
 * ✅ SECURITY FIX: Tenant authorization middleware
 *
 * Validates that:
 * 1. User is authenticated (req.user exists)
 * 2. User's tenantId matches the requested tenantId in URL
 * 3. OR user has admin role (if adminOverride is true)
 *
 * Prevents IDOR attacks where user A accesses tenant B's data
 */
export function validateTenantAccess(options: TenantAuthOptions = {}) {
  const {
    adminOverride = true,
    tenantIdParam = 'tenantId',
    allowedRoles = [],
  } = options;

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Ensure user is authenticated
    if (!req.user) {
      logger.error('Tenant authorization check failed: No user in request', {
        path: req.path,
        ip: req.ip,
      });
      return ApiResponseUtil.unauthorized(res, 'Authentication required');
    }

    // Extract tenant ID from URL parameters
    const requestedTenantId = req.params[tenantIdParam];

    if (!requestedTenantId) {
      logger.error('Tenant authorization check failed: No tenantId in URL', {
        path: req.path,
        params: req.params,
      });
      return ApiResponseUtil.badRequest(res, 'Tenant ID required in URL');
    }

    // ✅ SECURITY CHECK 1: Admin override (if enabled)
    if (adminOverride && req.user.roles?.includes('admin')) {
      logger.debug('Tenant access granted via admin override', {
        userId: req.user.id,
        userTenant: req.user.tenantId,
        requestedTenant: requestedTenantId,
      });
      return next();
    }

    // ✅ SECURITY CHECK 2: Custom roles override (if specified)
    if (allowedRoles.length > 0) {
      const hasAllowedRole = req.user.roles?.some(role => allowedRoles.includes(role));
      if (hasAllowedRole) {
        logger.debug('Tenant access granted via custom role', {
          userId: req.user.id,
          userRoles: req.user.roles,
          allowedRoles,
        });
        return next();
      }
    }

    // ✅ SECURITY CHECK 3: Tenant ID match (CRITICAL)
    if (req.user.tenantId !== requestedTenantId) {
      logger.warn('⚠️  SECURITY: Tenant access denied (IDOR attempt)', {
        userId: req.user.id,
        userEmail: req.user.email,
        userTenant: req.user.tenantId,
        requestedTenant: requestedTenantId,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Return 404 instead of 403 to avoid tenant enumeration
      return ApiResponseUtil.notFound(res, 'Resource');
    }

    // ✅ Access granted: User's tenantId matches requested tenantId
    logger.debug('Tenant access granted', {
      userId: req.user.id,
      tenantId: req.user.tenantId,
      path: req.path,
    });

    next();
  };
}

/**
 * Strict tenant validation (no admin override)
 *
 * Use this for endpoints where even admins must specify correct tenant
 */
export function validateTenantAccessStrict(tenantIdParam = 'tenantId') {
  return validateTenantAccess({
    adminOverride: false,
    tenantIdParam,
  });
}

/**
 * Validate that user can only access their own resources
 *
 * Similar to tenant validation but for user-specific resources
 * Example: /api/users/:userId/profile
 */
export function validateUserAccess(userIdParam = 'userId') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return ApiResponseUtil.unauthorized(res, 'Authentication required');
    }

    const requestedUserId = req.params[userIdParam];

    if (!requestedUserId) {
      return ApiResponseUtil.badRequest(res, 'User ID required in URL');
    }

    // Admin can access any user
    if (req.user.roles?.includes('admin')) {
      return next();
    }

    // User can only access their own data
    if (req.user.id !== requestedUserId) {
      logger.warn('⚠️  SECURITY: User access denied (IDOR attempt)', {
        userId: req.user.id,
        requestedUserId,
        path: req.path,
        ip: req.ip,
      });
      return ApiResponseUtil.notFound(res, 'Resource');
    }

    next();
  };
}

/**
 * Middleware to attach tenant filter to query
 *
 * Automatically adds tenantId filter to database queries
 * Defense in depth: Even if authorization check is bypassed, query is filtered
 */
export function enforceTenantFilter() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return ApiResponseUtil.unauthorized(res, 'Authentication required');
    }

    // Attach tenant filter to request for use in controllers/repositories
    req.tenantFilter = {
      tenantId: req.user.tenantId || '',
    };

    // For admins, allow query parameter to override (for multi-tenant admin tools)
    if (req.user.roles?.includes('admin') && req.query.tenantId) {
      if (req.tenantFilter) {
        req.tenantFilter.tenantId = req.query.tenantId as string;
      }
    }

    next();
  };
}

/**
 * Validate resource belongs to user's tenant
 *
 * Use this in repositories/controllers as additional check
 *
 * @example
 * ```typescript
 * const violation = await getViolation(violationId);
 * assertTenantOwnership(req.user, violation.tenantId, 'Violation');
 * ```
 */
export function assertTenantOwnership(
  user: AuthenticatedRequest['user'],
  resourceTenantId: string,
  resourceType: string
): void {
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Admin can access any tenant's resources
  if (user.roles?.includes('admin')) {
    return;
  }

  // Validate tenant match
  if (user.tenantId !== resourceTenantId) {
    logger.error('⚠️  SECURITY: Tenant ownership check failed', {
      userId: user.id,
      userTenant: user.tenantId,
      resourceTenant: resourceTenantId,
      resourceType,
    });
    throw new Error(`${resourceType} not found`); // Return generic error to prevent enumeration
  }
}
