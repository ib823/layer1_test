/**
 * SECURE Authentication Middleware
 *
 * SECURITY FIX: CVE-FRAMEWORK-2025-001 & CVE-2025-002
 * - Removes authentication bypass
 * - Enforces JWT signature validation in all environments
 * - No more "dev mode" with fake authentication
 *
 * Changes from original auth.ts:
 * 1. REMOVED: Development mode JWT bypass
 * 2. REMOVED: AUTH_ENABLED=false option
 * 3. ADDED: Proper JWT signature validation even in development
 * 4. ENFORCED: XSUAA in production, signed JWT in development
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { ApiResponseUtil } from '../utils/response';
import { config } from '../config';
import logger from '../utils/logger';
import * as xssec from '@sap/xssec';
import * as xsenv from '@sap/xsenv';
import jwt from 'jsonwebtoken';

/**
 * JWT Payload Interface
 */
interface JWTPayload {
  sub: string;
  user_id?: string;
  email?: string;
  user_name?: string;
  scope?: string[];
  roles?: string[];
  exp?: number;
  iat?: number;
  zid?: string;
  tenant_id?: string;
  [key: string]: unknown;
}

/**
 * SECURE Authentication middleware with JWT signature validation
 *
 * Production: Uses XSUAA (SAP BTP)
 * Development: Uses JWT with REQUIRED signature validation
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // ✅ SECURITY FIX: Authentication is ALWAYS required
  // No more AUTH_ENABLED=false bypass

  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Missing or invalid Authorization header', {
      ip: req.ip,
      path: req.path,
    });
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
      validateWithXSUAA(token, req, res, next);
      return;
    }

    // ✅ SECURITY FIX: DEVELOPMENT mode now requires PROPER JWT validation
    // No more base64 decode without signature check
    validateWithJWT(token, req, res, next);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Authentication error:', { error: errorMessage, ip: req.ip });
    ApiResponseUtil.unauthorized(res, 'Authentication failed');
    return;
  }
}

/**
 * Validate token with XSUAA (Production)
 */
function validateWithXSUAA(
  token: string,
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
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
  } catch (xsuaaError: unknown) {
    const errorMessage = xsuaaError instanceof Error ? xsuaaError.message : 'Unknown error';
    logger.error('XSUAA service not available:', errorMessage);
    ApiResponseUtil.error(res, 'AUTH_ERROR', 'XSUAA authentication service unavailable', 503);
  }
}

/**
 * ✅ SECURITY FIX: Validate JWT with SIGNATURE verification (Development)
 *
 * REQUIRES JWT_SECRET environment variable
 * REJECTS tokens with "alg: none"
 * VALIDATES signature using jsonwebtoken library
 */
function validateWithJWT(
  token: string,
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // ✅ Require JWT_SECRET in development
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    logger.error('JWT_SECRET not configured for development authentication');
    ApiResponseUtil.error(
      res,
      'AUTH_CONFIG_ERROR',
      'Authentication not properly configured',
      500
    );
    return;
  }

  try {
    // ✅ SECURITY FIX: Validate JWT signature with jsonwebtoken library
    const decoded = jwt.verify(token, jwtSecret, {
      algorithms: ['HS256', 'HS384', 'HS512'],  // ✅ Reject "none" algorithm
      ignoreExpiration: false,  // ✅ Validate expiration
      maxAge: '24h',  // ✅ Maximum token age
    }) as JWTPayload;

    // Extract user information from validated token
    req.user = {
      id: decoded.sub || decoded.user_id || 'unknown',
      email: decoded.email || decoded.user_name || '',
      roles: Array.isArray(decoded.roles) ? decoded.roles :
             Array.isArray(decoded.scope) ? decoded.scope :
             ['user'],  // Default role
      tenantId: decoded.tenant_id || decoded.zid || 'default',
    };

    logger.info('User authenticated via JWT', {
      userId: req.user.id,
      tenantId: req.user.tenantId,
      roles: req.user.roles,
    });

    next();
  } catch (error: unknown) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT token', {
        error: error.message,
        ip: req.ip,
      });
      ApiResponseUtil.unauthorized(res, 'Invalid or expired token');
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Expired JWT token', {
        expiredAt: error.expiredAt,
        ip: req.ip,
      });
      ApiResponseUtil.unauthorized(res, 'Token expired');
      return;
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('JWT validation error:', { error: errorMessage });
    ApiResponseUtil.unauthorized(res, 'Authentication failed');
  }
}

/**
 * Role-based authorization middleware
 *
 * Requires specific role OR admin role
 */
export function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return ApiResponseUtil.unauthorized(res);
    }

    if (!req.user.roles?.includes(role) && !req.user.roles?.includes('admin')) {
      logger.warn('Insufficient permissions', {
        userId: req.user.id,
        requiredRole: role,
        userRoles: req.user.roles,
      });
      return ApiResponseUtil.forbidden(res, `Requires role: ${role}`);
    }

    next();
  };
}

/**
 * Require admin role
 */
export function requireAdmin() {
  return requireRole('admin');
}

/**
 * Generate secure JWT token for development/testing
 *
 * ✅ SECURITY FIX: Uses proper signature with JWT_SECRET
 * ✅ Sets reasonable expiration
 * ✅ Includes all required claims
 */
export function generateSecureJWT(payload: {
  id: string;
  email: string;
  roles: string[];
  tenantId: string;
}): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(
    {
      sub: payload.id,
      email: payload.email,
      roles: payload.roles,
      tenant_id: payload.tenantId,
    },
    jwtSecret,
    {
      algorithm: 'HS256',  // ✅ Secure algorithm
      expiresIn: '24h',     // ✅ Reasonable expiration
      issuer: 'sap-framework',
      audience: 'sap-framework-api',
    }
  );
}
