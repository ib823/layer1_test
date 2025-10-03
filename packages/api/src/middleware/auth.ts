import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { ApiResponseUtil } from '../utils/response';
import { config } from '../config';

/**
 * Authentication middleware
 * Currently a stub - integrates with XSUAA in production
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Skip auth in development if disabled
  if (!config.auth.enabled) {
    req.user = {
      id: 'dev-user',
      email: 'dev@example.com',
      roles: ['admin'],
    };
    next();
    return;
  }

  // TODO: Implement XSUAA token validation
  // const token = req.headers.authorization?.split(' ')[1];
  // if (!token) {
  //   return ApiResponseUtil.unauthorized(res);
  // }
  // Validate token with XSUAA...
  
  // For now, reject if auth is enabled but not implemented
  ApiResponseUtil.error(
    res,
    'NOT_IMPLEMENTED',
    'Authentication not yet implemented',
    501
  );
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