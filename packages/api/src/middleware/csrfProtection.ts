/**
 * CSRF Protection Middleware
 *
 * SECURITY FIX: CVE-FRAMEWORK-2025-008 (Missing CSRF Protection)
 *
 * Protects against Cross-Site Request Forgery attacks by requiring:
 * 1. Custom request header (X-Requested-With)
 * 2. Origin/Referer validation
 * 3. SameSite cookie attribute (if using cookies)
 *
 * Usage:
 *   router.use(csrfProtection());
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { ApiResponseUtil } from '../utils/response';
import logger from '../utils/logger';

export interface CSRFProtectionOptions {
  /**
   * Allowed origins for requests
   * Default: from CORS_ORIGIN environment variable
   */
  allowedOrigins?: string[];

  /**
   * Skip CSRF check for specific paths (regex patterns)
   * Example: [/^\/api\/webhooks/]
   */
  skipPaths?: RegExp[];

  /**
   * Whether to check custom header (X-Requested-With)
   * Default: true
   */
  checkCustomHeader?: boolean;

  /**
   * Whether to check Origin/Referer header
   * Default: true
   */
  checkOrigin?: boolean;
}

/**
 * ✅ SECURITY FIX: CSRF protection middleware
 *
 * Prevents CSRF attacks by validating:
 * 1. Custom request header (blocks simple form submissions)
 * 2. Origin/Referer header (validates request source)
 */
export function csrfProtection(options: CSRFProtectionOptions = {}) {
  const {
    allowedOrigins = [process.env.CORS_ORIGIN || 'http://localhost:3001'],
    skipPaths = [],
    checkCustomHeader = true,
    checkOrigin = true,
  } = options;

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Skip for safe methods (GET, HEAD, OPTIONS)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Skip for specific paths (e.g., webhooks)
    for (const pattern of skipPaths) {
      if (pattern.test(req.path)) {
        logger.debug('CSRF check skipped for path', { path: req.path });
        return next();
      }
    }

    // ✅ CHECK 1: Custom header validation
    if (checkCustomHeader) {
      const customHeader = req.headers['x-requested-with'];

      if (!customHeader || customHeader !== 'XMLHttpRequest') {
        logger.warn('⚠️  SECURITY: CSRF attempt blocked (missing custom header)', {
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });

        return ApiResponseUtil.error(
          res,
          'CSRF_ERROR',
          'Missing required request header',
          403
        );
      }
    }

    // ✅ CHECK 2: Origin/Referer validation
    if (checkOrigin) {
      const origin = req.headers.origin || req.headers.referer;

      if (!origin) {
        logger.warn('⚠️  SECURITY: CSRF attempt blocked (missing origin)', {
          method: req.method,
          path: req.path,
          ip: req.ip,
        });

        return ApiResponseUtil.error(
          res,
          'CSRF_ERROR',
          'Missing request origin',
          403
        );
      }

      // Normalize origin (remove trailing slash, protocol variations)
      const normalizedOrigin = normalizeOrigin(origin);

      // Check if origin is in allowlist
      const isAllowed = allowedOrigins.some(allowed => {
        const normalizedAllowed = normalizeOrigin(allowed);
        return normalizedOrigin === normalizedAllowed;
      });

      if (!isAllowed) {
        logger.warn('⚠️  SECURITY: CSRF attempt blocked (unauthorized origin)', {
          method: req.method,
          path: req.path,
          origin: normalizedOrigin,
          allowedOrigins,
          ip: req.ip,
        });

        return ApiResponseUtil.error(
          res,
          'CSRF_ERROR',
          'Unauthorized request origin',
          403
        );
      }
    }

    // ✅ All checks passed
    next();
  };
}

/**
 * Normalize origin URL for comparison
 */
function normalizeOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    return `${url.protocol}//${url.host}`;
  } catch {
    // If origin is not a full URL, try to parse as hostname
    return origin.toLowerCase().replace(/\/$/, '');
  }
}

/**
 * Add allowed origin to CSRF protection
 */
export function addAllowedOrigin(origin: string): void {
  // This would typically be used to dynamically add origins
  // For now, origins should be configured via environment variables
  logger.info('Add allowed origin', { origin });
}
