/**
 * Tenant Isolation Middleware
 *
 * SECURITY FIX: CVE-FRAMEWORK-2025-003 (Horizontal Privilege Escalation)
 * DEFECT-033: Broken tenant isolation
 * DEFECT-034: IDOR vulnerability
 *
 * Ensures users can only access data from their own tenant.
 * Prevents horizontal privilege escalation attacks.
 *
 * Features:
 * - Validates tenant access based on authenticated user
 * - Enforces tenant scoping for all database queries
 * - Blocks cross-tenant data access attempts
 * - Logs security violations for monitoring
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { ApiResponseUtil } from '../utils/response';
import logger from '../utils/logger';

/**
 * Tenant isolation middleware
 *
 * Validates that the user has access to the requested tenant.
 * Sets req.tenantFilter to enforce tenant scoping in database queries.
 *
 * Usage:
 * - Apply after authentication middleware
 * - Apply before any data access operations
 */
export function enforceTenantIsolation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Ensure user is authenticated
  if (!req.user) {
    logger.error('Tenant isolation: No authenticated user', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    ApiResponseUtil.unauthorized(res, 'Authentication required');
    return;
  }

  const userTenantId = req.user.tenantId;
  const isAdmin = req.user.roles.includes('admin') || req.user.roles.includes('system_admin');

  // Extract tenant ID from route params (e.g., /api/tenants/:tenantId/...)
  const requestedTenantId = req.params.tenantId || req.params.id;

  // Set tenant filter for defense-in-depth
  // This will be used by repository/service layers to scope queries
  req.tenantFilter = {
    tenantId: userTenantId,
  };

  // If route has explicit tenant ID, validate access
  if (requestedTenantId) {
    // Admin users can access any tenant (for multi-tenant management)
    if (isAdmin) {
      // Allow admin, but log for audit
      logger.info('Admin cross-tenant access', {
        userId: req.user.id,
        userTenant: userTenantId,
        requestedTenant: requestedTenantId,
        path: req.path,
        method: req.method,
      });

      // Update tenant filter to requested tenant for admin operations
      req.tenantFilter = {
        tenantId: requestedTenantId,
      };

      next();
      return;
    }

    // Non-admin users can only access their own tenant
    if (requestedTenantId !== userTenantId) {
      logger.warn('Tenant isolation violation: User attempted to access another tenant', {
        userId: req.user.id,
        userEmail: req.user.email,
        userTenant: userTenantId,
        requestedTenant: requestedTenantId,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      ApiResponseUtil.forbidden(
        res,
        'Access denied: You do not have permission to access this tenant'
      );
      return;
    }
  }

  // Log successful tenant validation (debug level)
  logger.debug('Tenant isolation: Access validated', {
    userId: req.user.id,
    tenantId: userTenantId,
    path: req.path,
  });

  next();
}

/**
 * Helper middleware: Require specific tenant access
 *
 * Use this to explicitly require tenant ID in route and validate access.
 * Example: router.get('/tenants/:tenantId/violations', requireTenantAccess, handler)
 */
export function requireTenantAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.params.tenantId && !req.params.id) {
    logger.error('requireTenantAccess: No tenant ID in route params', {
      path: req.path,
      params: req.params,
    });
    ApiResponseUtil.error(
      res,
      'MISSING_TENANT_ID',
      'Tenant ID is required in the URL',
      400
    );
    return;
  }

  // Delegate to main tenant isolation middleware
  enforceTenantIsolation(req, res, next);
}

/**
 * Helper function: Get tenant ID from authenticated request
 *
 * Use this in controllers/services to get the validated tenant ID.
 * This ensures you're always using the correct tenant scope.
 */
export function getTenantId(req: AuthenticatedRequest): string {
  if (!req.tenantFilter?.tenantId) {
    throw new Error('Tenant filter not set. Ensure tenant middleware is applied.');
  }
  return req.tenantFilter.tenantId;
}

/**
 * Helper function: Validate resource ownership
 *
 * Use this to verify that a resource belongs to the user's tenant.
 * Prevents IDOR attacks by checking resource ownership.
 *
 * @param resourceTenantId - Tenant ID from the resource (e.g., violation.tenantId)
 * @param req - Authenticated request with tenant context
 * @throws Error if resource doesn't belong to user's tenant
 */
export function validateResourceOwnership(
  resourceTenantId: string,
  req: AuthenticatedRequest
): void {
  const userTenantId = getTenantId(req);
  const isAdmin = req.user?.roles.includes('admin') || req.user?.roles.includes('system_admin');

  // Admins can access any resource (for support/management)
  if (isAdmin) {
    return;
  }

  // Non-admin users can only access resources from their tenant
  if (resourceTenantId !== userTenantId) {
    logger.warn('IDOR attempt: User tried to access resource from another tenant', {
      userId: req.user?.id,
      userTenant: userTenantId,
      resourceTenant: resourceTenantId,
      path: req.path,
      ip: req.ip,
    });

    throw new Error('Access denied: Resource not found or you do not have permission');
  }
}

/**
 * Prisma middleware helper: Inject tenant filter into Prisma queries
 *
 * Use this with Prisma middleware to automatically scope all queries by tenant.
 *
 * Example:
 * prisma.$use(async (params, next) => {
 *   if (params.model && ['Violation', 'User', 'Audit'].includes(params.model)) {
 *     params.args = injectTenantFilter(params.args, tenantId);
 *   }
 *   return next(params);
 * });
 */
export function injectTenantFilter(args: any, tenantId: string): any {
  if (!args) {
    args = {};
  }

  if (!args.where) {
    args.where = {};
  }

  // Add tenant filter to where clause
  args.where.tenantId = tenantId;

  return args;
}
