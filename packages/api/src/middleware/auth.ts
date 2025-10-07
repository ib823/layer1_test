import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { ApiResponseUtil } from '../utils/response';
import { config } from '../config';
import logger from '../utils/logger';
import * as xssec from '@sap/xssec';
import * as xsenv from '@sap/xsenv';

/**
 * Authentication middleware with XSUAA JWT validation
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Skip auth in development if disabled
  if (!config.auth.enabled) {
    logger.warn('Authentication disabled - using dev user');
    req.user = {
      id: 'dev-user',
      email: 'dev@example.com',
      roles: ['admin'],
      tenantId: 'dev-tenant',
    };
    next();
    return;
  }

  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Missing or invalid Authorization header');
    ApiResponseUtil.unauthorized(res, 'Missing or invalid authorization token');
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    ApiResponseUtil.unauthorized(res, 'Missing token');
    return;
  }

  try {
    // PRODUCTION: Validate with XSUAA (when running in SAP BTP Cloud Foundry)
    if (config.nodeEnv === 'production' || process.env.VCAP_SERVICES) {
      try {
        const xsuaaService = xsenv.getServices({ xsuaa: { tag: 'xsuaa' } }).xsuaa;

        xssec.createSecurityContext(token, xsuaaService, (error, securityContext) => {
          if (error || !securityContext) {
            logger.error('XSUAA validation failed:', error);
            return ApiResponseUtil.unauthorized(res, 'Invalid token');
          }

          req.user = {
            id: securityContext.getLogonName(),
            email: securityContext.getEmail(),
            roles: securityContext.getAttribute('xs.rolecollections') || [],
            tenantId: securityContext.getSubaccountId(),
          };

          logger.info('User authenticated via XSUAA', {
            userId: req.user.id,
            tenantId: req.user.tenantId,
          });

          next();
        });
        return;
      } catch (xsuaaError: any) {
        logger.error('XSUAA service not available:', xsuaaError.message);
        // Fall through to development mode if XSUAA is not available
      }
    }

    // DEVELOPMENT: Simple JWT validation (for testing without XSUAA)
    logger.warn('Using development JWT validation (not for production!)');

    const decodedToken = decodeJWT(token);

    if (!decodedToken) {
      ApiResponseUtil.unauthorized(res, 'Invalid token format');
      return;
    }

    // Check expiration
    if (decodedToken.exp && Date.now() >= decodedToken.exp * 1000) {
      logger.warn('Token expired', { userId: decodedToken.sub });
      ApiResponseUtil.unauthorized(res, 'Token expired');
      return;
    }

    // Extract user information
    req.user = {
      id: decodedToken.sub || decodedToken.user_id || 'unknown',
      email: decodedToken.email || decodedToken.user_name || '',
      roles: decodedToken.scope || decodedToken.roles || [],
      tenantId: decodedToken.zid || decodedToken.tenant_id || 'default',
    };

    logger.info('User authenticated (dev mode)', {
      userId: req.user.id,
      tenantId: req.user.tenantId,
      roles: req.user.roles,
    });

    next();
  } catch (error: any) {
    logger.error('Authentication error:', error);
    ApiResponseUtil.unauthorized(res, 'Authentication failed');
    return;
  }
}

/**
 * Simple JWT decoder (base64 decode - no signature validation)
 * FOR DEVELOPMENT ONLY - Use XSUAA validation in production
 */
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    logger.error('JWT decode error:', error);
    return null;
  }
}

export function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return ApiResponseUtil.unauthorized(res);
    }

    if (!req.user.roles.includes(role) && !req.user.roles.includes('admin')) {
      return ApiResponseUtil.forbidden(res, `Requires role: ${role}`);
    }

    next();
  };
}