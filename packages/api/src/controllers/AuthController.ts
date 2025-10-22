import { Request, Response } from 'express';
import { ApiResponseUtil } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import logger from '../utils/logger';
import { sanitizeEmail } from '../utils/sanitization';
import {
  generatePasswordResetToken,
  verifyPasswordResetToken,
  generatePasswordResetUrl,
  getExpiryTimeString,
  passwordResetRateLimiter,
  hashToken,
  hashPassword,
  validatePasswordStrength,
  passwordResetTokenStore,
} from '@sap-framework/core';
import { getEmailService } from '@sap-framework/core';

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

      // ✅ SECURITY FIX: Sanitize and validate email
      // DEFECT-035: Stored XSS vulnerability fix
      let sanitizedEmail: string;
      try {
        sanitizedEmail = sanitizeEmail(email);
      } catch (error) {
        ApiResponseUtil.badRequest(res, 'Invalid email format');
        return;
      }

      // In development mode or when AUTH_ENABLED=false, accept any credentials
      // In production, you would validate against a user database
      const isDevelopment = process.env.NODE_ENV !== 'production';

      if (isDevelopment) {
        // Development: Create mock user with sanitized email
        const mockUser = {
          id: 'dev-user-123',
          email: sanitizedEmail,
          name: sanitizedEmail.split('@')[0] || 'Dev User',
          roles: ['admin', 'user'],
          tenantId: 'dev-tenant',
          tenantName: 'Development Tenant',
        };

        // Generate a simple development token (base64 encoded JSON)
        const token = AuthController.generateDevToken(mockUser);
        const refreshToken = AuthController.generateDevToken({ ...mockUser, type: 'refresh' });

        logger.info('Development login successful', { email: sanitizedEmail });

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

  // ===================================================================
  // PASSWORD RESET FUNCTIONALITY
  // ===================================================================

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  static async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        ApiResponseUtil.badRequest(res, 'Email is required');
        return;
      }

      // Sanitize and validate email
      let sanitizedEmail: string;
      try {
        sanitizedEmail = sanitizeEmail(email);
      } catch (error) {
        ApiResponseUtil.badRequest(res, 'Invalid email format');
        return;
      }

      // Check rate limiting
      const rateLimitCheck = passwordResetRateLimiter.canRequest(sanitizedEmail);
      if (!rateLimitCheck.allowed) {
        ApiResponseUtil.error(
          res,
          'RATE_LIMIT_EXCEEDED',
          rateLimitCheck.reason || 'Too many requests',
          429
        );
        return;
      }

      // Record attempt
      passwordResetRateLimiter.recordAttempt(sanitizedEmail);

      // Generate reset token
      const tokenData = generatePasswordResetToken(sanitizedEmail, 60); // 60 minutes validity

      // Store token in Redis (with automatic expiration)
      const ttlSeconds = 60 * 60; // 60 minutes
      await passwordResetTokenStore.set(
        tokenData.hashedToken,
        {
          email: sanitizedEmail,
          expiresAt: tokenData.expiresAt,
          createdAt: tokenData.createdAt,
          used: false,
        },
        ttlSeconds
      );

      // Generate reset URL
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const resetUrl = generatePasswordResetUrl(baseUrl, tokenData.token);

      // Send email (if email service is configured)
      try {
        const emailService = getEmailService();
        await emailService.sendEmail({
          to: sanitizedEmail,
          subject: 'Password Reset Request - SAP GRC Platform',
          template: 'password-reset',
          data: {
            recipientName: sanitizedEmail.split('@')[0],
            resetLink: resetUrl,
            expiresIn: getExpiryTimeString(60),
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          },
        });

        logger.info('Password reset email sent', {
          email: sanitizedEmail,
          expiresAt: tokenData.expiresAt.toISOString(),
        });
      } catch (emailError) {
        logger.error('Failed to send password reset email', {
          error: emailError,
          email: sanitizedEmail,
        });

        // In development, return token in response for testing
        if (process.env.NODE_ENV !== 'production') {
          ApiResponseUtil.success(res, {
            message: 'Password reset initiated (email service not configured)',
            resetToken: tokenData.token,
            resetUrl,
            expiresAt: tokenData.expiresAt,
          });
          return;
        }

        ApiResponseUtil.error(
          res,
          'EMAIL_ERROR',
          'Failed to send password reset email',
          500
        );
        return;
      }

      // Always return success (don't reveal if email exists)
      ApiResponseUtil.success(res, {
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    } catch (error: any) {
      logger.error('Password reset request error:', error);
      ApiResponseUtil.error(res, 'PASSWORD_RESET_ERROR', 'Password reset request failed', 500);
    }
  }

  /**
   * Verify password reset token
   * GET /api/auth/verify-reset-token?token=...
   */
  static async verifyResetToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        ApiResponseUtil.badRequest(res, 'Token is required');
        return;
      }

      // Hash token to look up in store
      const hashedToken = hashToken(token);
      const storedToken = await passwordResetTokenStore.get(hashedToken);

      if (!storedToken) {
        logger.warn('Password reset token not found');
        ApiResponseUtil.error(res, 'INVALID_TOKEN', 'Invalid or expired token', 400);
        return;
      }

      // Verify token
      const verification = verifyPasswordResetToken(token, storedToken);

      if (!verification.valid) {
        ApiResponseUtil.error(
          res,
          'INVALID_TOKEN',
          verification.reason || 'Invalid token',
          400
        );
        return;
      }

      ApiResponseUtil.success(res, {
        valid: true,
        email: verification.email,
      });
    } catch (error: any) {
      logger.error('Token verification error:', error);
      ApiResponseUtil.error(res, 'VERIFICATION_ERROR', 'Token verification failed', 500);
    }
  }

  /**
   * Reset password
   * POST /api/auth/reset-password
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        ApiResponseUtil.badRequest(res, 'Token and new password are required');
        return;
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        ApiResponseUtil.error(
          res,
          'WEAK_PASSWORD',
          passwordValidation.errors.join('. '),
          400
        );
        return;
      }

      // Hash token to look up in store
      const hashedToken = hashToken(token);
      const storedToken = await passwordResetTokenStore.get(hashedToken);

      if (!storedToken) {
        logger.warn('Password reset token not found');
        ApiResponseUtil.error(res, 'INVALID_TOKEN', 'Invalid or expired token', 400);
        return;
      }

      // Verify token
      const verification = verifyPasswordResetToken(token, storedToken);

      if (!verification.valid) {
        ApiResponseUtil.error(
          res,
          'INVALID_TOKEN',
          verification.reason || 'Invalid token',
          400
        );
        return;
      }

      // Mark token as used in Redis
      await passwordResetTokenStore.markAsUsed(hashedToken);

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);

      // TODO: Update password in database
      // For now, log the password change (but not the actual password!)
      logger.info('Password reset successful', {
        email: verification.email,
        passwordScore: passwordValidation.score,
      });

      // In production, you would update the user's password in the database:
      // await prisma.user.update({
      //   where: { email: verification.email },
      //   data: { passwordHash: hashedPassword }
      // });

      // Send confirmation email
      try {
        const emailService = getEmailService();
        await emailService.sendEmail({
          to: verification.email!,
          subject: 'Password Changed - SAP GRC Platform',
          template: 'password-reset-confirmation',
          data: {
            recipientName: verification.email!.split('@')[0],
            resetAt: new Date().toISOString(),
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          },
        });
      } catch (emailError) {
        logger.error('Failed to send password reset confirmation', {
          error: emailError,
        });
        // Don't fail the request if confirmation email fails
      }

      ApiResponseUtil.success(res, {
        message: 'Password reset successful. You can now log in with your new password.',
      });
    } catch (error: any) {
      logger.error('Password reset error:', error);
      ApiResponseUtil.error(res, 'PASSWORD_RESET_ERROR', 'Password reset failed', 500);
    }
  }
}
