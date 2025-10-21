import { Request, Response } from 'express';
import { ApiResponseUtil } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import logger from '../utils/logger';

/**
 * Authentication Controller
 * Handles login, logout, token refresh, and user info
 */
export class AuthController {
  /**
   * Login endpoint
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        ApiResponseUtil.badRequest(res, 'Email and password are required');
        return;
      }

      // In development mode or when AUTH_ENABLED=false, accept any credentials
      // In production, you would validate against a user database
      const isDevelopment = process.env.NODE_ENV !== 'production';

      if (isDevelopment) {
        // Development: Create mock user
        const mockUser = {
          id: 'dev-user-123',
          email,
          name: email.split('@')[0] || 'Dev User',
          roles: ['admin', 'user'],
          tenantId: 'dev-tenant',
          tenantName: 'Development Tenant',
        };

        // Generate a simple development token (base64 encoded JSON)
        const token = AuthController.generateDevToken(mockUser);
        const refreshToken = AuthController.generateDevToken({ ...mockUser, type: 'refresh' });

        logger.info('Development login successful', { email });

        ApiResponseUtil.success(res, {
          user: {
            ...mockUser,
            permissions: ['read', 'write', 'admin'],
            lastLogin: new Date(),
          },
          token,
          refreshToken,
          expiresIn: 3600, // 1 hour
        });
        return;
      }

      // Production mode - validate credentials
      // TODO: Implement real authentication (database lookup, password hash verification)
      // For now, return unauthorized
      logger.warn('Production authentication not implemented');
      ApiResponseUtil.unauthorized(res, 'Authentication not configured');
    } catch (error: any) {
      logger.error('Login error:', error);
      ApiResponseUtil.error(res, 'AUTH_ERROR', 'Login failed', 500);
    }
  }

  /**
   * Get current user
   * GET /api/auth/me
   */
  static async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // User is already attached by auth middleware
      if (!req.user) {
        ApiResponseUtil.unauthorized(res);
        return;
      }

      // Return user info with permissions
      const user = {
        id: req.user.id,
        email: req.user.email,
        name: req.user.email?.split('@')[0] || 'User',
        roles: req.user.roles || ['user'],
        tenantId: req.user.tenantId,
        tenantName: req.user.tenantId === 'dev-tenant' ? 'Development Tenant' : 'Production Tenant',
        permissions: ['read', 'write', ...(req.user.roles.includes('admin') ? ['admin'] : [])],
        lastLogin: new Date(),
      };

      ApiResponseUtil.success(res, user);
    } catch (error: any) {
      logger.error('Get current user error:', error);
      ApiResponseUtil.error(res, 'AUTH_ERROR', 'Failed to get user info', 500);
    }
  }

  /**
   * Logout
   * POST /api/auth/logout
   */
  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      logger.info('User logged out', { userId: req.user?.id });

      // In a real implementation, you would:
      // 1. Invalidate the refresh token in the database
      // 2. Add the access token to a blacklist (with Redis)
      // 3. Clear any server-side sessions

      ApiResponseUtil.success(res, { message: 'Logged out successfully' });
    } catch (error: any) {
      logger.error('Logout error:', error);
      ApiResponseUtil.error(res, 'AUTH_ERROR', 'Logout failed', 500);
    }
  }

  /**
   * Refresh token
   * POST /api/auth/refresh
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        ApiResponseUtil.badRequest(res, 'Refresh token is required');
        return;
      }

      // In development mode, decode and re-issue token
      const isDevelopment = process.env.NODE_ENV !== 'production';

      if (isDevelopment) {
        try {
          // Decode the refresh token
          const decoded = AuthController.decodeDevToken(refreshToken);

          if (!decoded || decoded.type !== 'refresh') {
            ApiResponseUtil.unauthorized(res, 'Invalid refresh token');
            return;
          }

          // Generate new tokens
          const user = {
            id: decoded.id,
            email: decoded.email,
            name: decoded.name,
            roles: decoded.roles,
            tenantId: decoded.tenantId,
          };

          const newToken = AuthController.generateDevToken(user);
          const newRefreshToken = AuthController.generateDevToken({ ...user, type: 'refresh' });

          logger.info('Token refreshed', { userId: user.id });

          ApiResponseUtil.success(res, {
            token: newToken,
            refreshToken: newRefreshToken,
            expiresIn: 3600,
          });
          return;
        } catch (error) {
          logger.error('Token refresh decode error:', error);
          ApiResponseUtil.unauthorized(res, 'Invalid refresh token');
          return;
        }
      }

      // Production mode
      // TODO: Implement real token refresh (validate refresh token from database)
      logger.warn('Production token refresh not implemented');
      ApiResponseUtil.unauthorized(res, 'Token refresh not configured');
    } catch (error: any) {
      logger.error('Refresh token error:', error);
      ApiResponseUtil.error(res, 'AUTH_ERROR', 'Token refresh failed', 500);
    }
  }

  /**
   * Generate a development JWT-like token (base64 encoded)
   * NOT SECURE - FOR DEVELOPMENT ONLY
   */
  private static generateDevToken(payload: any): string {
    const header = { alg: 'none', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      ...payload,
      iat: now,
      exp: now + 3600, // 1 hour
      sub: payload.id,
      email: payload.email,
      roles: payload.roles,
      tenant_id: payload.tenantId,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(claims)).toString('base64url');

    // No signature in dev mode (algorithm: none)
    return `${encodedHeader}.${encodedPayload}.dev-signature`;
  }

  /**
   * Decode a development token
   */
  private static decodeDevToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      logger.error('Token decode error:', error);
      return null;
    }
  }
}
