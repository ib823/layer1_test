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
  PrismaClient,
  getEmailService,
  SessionManager,
  NewLoginDetector,
  RiskAnalyzer,
  DeviceFingerprint,
} from '@sap-framework/core';
import Redis from 'ioredis';

// Lazy initialize auth services (to avoid issues with service startup order)
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

let riskAnalyzer: RiskAnalyzer;
let sessionManager: SessionManager;
let newLoginDetector: NewLoginDetector;

function ensureAuthServicesInitialized() {
  if (!riskAnalyzer) {
    riskAnalyzer = new RiskAnalyzer(redis, prisma);
  }
  if (!sessionManager) {
    sessionManager = new SessionManager(redis, prisma);
  }
  if (!newLoginDetector) {
    newLoginDetector = new NewLoginDetector(prisma, redis, riskAnalyzer);
  }
}

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
      // Ensure auth services are initialized
      ensureAuthServicesInitialized();

      const { email, password, mfaCode, deviceName } = req.body;

      if (!email || !password) {
        ApiResponseUtil.badRequest(res, 'Email and password are required');
        return;
      }

      // ✅ SECURITY FIX: Sanitize and validate email
      let sanitizedEmail: string;
      try {
        sanitizedEmail = sanitizeEmail(email);
      } catch (error) {
        ApiResponseUtil.badRequest(res, 'Invalid email format');
        return;
      }

      // Get device information
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent') || 'unknown';
      const parsedUA = DeviceFingerprint.parseUserAgent(userAgent);
      const fingerprintHash = DeviceFingerprint.generateFingerprint(userAgent, ipAddress, parsedUA);

      // In development mode, use mock authentication with real session management
      const isDevelopment = process.env.NODE_ENV !== 'production';

      if (isDevelopment) {
        // Development: Create mock user
        const mockUser = {
          id: 'dev-user-123',
          email: sanitizedEmail,
          name: sanitizedEmail.split('@')[0] || 'Dev User',
          roles: ['admin', 'user'],
          tenantId: 'dev-tenant',
          tenantName: 'Development Tenant',
        };

        // Perform risk analysis
        const riskDetection = await newLoginDetector.detectNewLogin(
          mockUser.id,
          ipAddress,
          fingerprintHash,
          userAgent
        );

        // Check if login requires confirmation
        if (riskDetection.requiresConfirmation) {
          logger.warn('Login requires email confirmation', {
            userId: mockUser.id,
            riskScore: riskDetection.riskAssessment.riskScore,
          });

          ApiResponseUtil.error(
            res,
            'CONFIRMATION_REQUIRED',
            'Please confirm this login attempt via email',
            403,
            {
              requiresConfirmation: true,
              confirmationToken: riskDetection.confirmationToken,
            }
          );
          return;
        }

        // Create session using SessionManager
        const sessionResult = await sessionManager.createSession({
          userId: mockUser.id,
          deviceFingerprint: fingerprintHash,
          ipAddress,
          userAgent,
          mfaVerified: false, // No MFA in dev mode
          isTrustedDevice: !riskDetection.isNewLogin,
        });

        // Generate token (in production, use sessionId)
        const token = AuthController.generateDevToken({
          ...mockUser,
          sessionId: sessionResult.sessionId,
        });

        logger.info('Development login successful', {
          email: sanitizedEmail,
          sessionId: sessionResult.sessionId,
          riskScore: riskDetection.riskAssessment.riskScore,
          kickedSessions: sessionResult.kicked?.length || 0,
        });

        ApiResponseUtil.success(res, {
          user: {
            ...mockUser,
            permissions: ['read', 'write', 'admin'],
            lastLogin: new Date(),
          },
          token,
          sessionId: sessionResult.sessionId,
          sessionToken: sessionResult.sessionToken,
          expiresIn: 3600, // 1 hour
          sessionInfo: {
            kickedSessions: sessionResult.kicked || [],
          },
        });
        return;
      }

      // ========================================================================
      // Production mode - Full authentication flow
      // ========================================================================
      // TODO: Implement production authentication when user model is available
      //
      // Production flow should:
      // 1. Fetch user from database by email
      // 2. Verify password hash
      // 3. Check if MFA is enabled
      // 4. If MFA enabled and no mfaCode provided, return MFA_REQUIRED
      // 5. If MFA enabled and mfaCode provided, verify it
      // 6. Perform risk analysis
      // 7. Check for new login detection
      // 8. Create session with SessionManager
      // 9. Return token with session info
      //
      // Example production implementation:
      /*
      const user = await prisma.userMFAConfig.findUnique({
        where: { userId: email }, // Adjust based on schema
      });

      if (!user) {
        await riskAnalyzer.recordFailedAttempt(sanitizedEmail, ipAddress, 'user_not_found');
        ApiResponseUtil.unauthorized(res, 'Invalid credentials');
        return;
      }

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        await riskAnalyzer.recordFailedAttempt(sanitizedEmail, ipAddress, 'invalid_password');
        ApiResponseUtil.unauthorized(res, 'Invalid credentials');
        return;
      }

      // Check MFA
      if (user.mfaEnabled && !mfaCode) {
        ApiResponseUtil.error(res, 'MFA_REQUIRED', 'MFA code required', 403, {
          requiresMFA: true,
          mfaMethod: user.preferredMfaMethod || 'totp',
        });
        return;
      }

      if (user.mfaEnabled && mfaCode) {
        // Verify MFA code (implement in TOTPService or PasskeyService)
        const mfaValid = await verifyMFACode(user.id, mfaCode);
        if (!mfaValid) {
          ApiResponseUtil.unauthorized(res, 'Invalid MFA code');
          return;
        }
      }

      // Rest of production flow...
      */

      logger.warn('Production authentication not fully implemented');
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
        permissions: ['read', 'write', ...(req.user.roles?.includes('admin') ? ['admin'] : [])],
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
      // Ensure auth services are initialized
      ensureAuthServicesInitialized();

      const userId = req.user?.id;
      const sessionId = (req.user as any)?.sessionId; // Extract from token if available

      if (!userId) {
        ApiResponseUtil.unauthorized(res);
        return;
      }

      // Revoke session if sessionId is available
      if (sessionId) {
        await sessionManager.revokeSession(sessionId, 'user_logout');
        logger.info('Session revoked on logout', { userId, sessionId });
      } else {
        logger.warn('Logout without sessionId - cannot revoke session', { userId });
      }

      logger.info('User logged out', { userId });

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

      // Production mode - Validate session
      // TODO: Implement full production token refresh when user model is available
      //
      // Production flow should:
      // 1. Decode refresh token to get sessionId
      // 2. Validate session with SessionManager
      // 3. Check if session is still active
      // 4. Generate new access token
      //
      // Example production implementation:
      /*
      const decoded = decodeProductionToken(refreshToken);
      if (!decoded || !decoded.sessionId) {
        ApiResponseUtil.unauthorized(res, 'Invalid refresh token');
        return;
      }

      // Validate session
      const session = await sessionManager.getSession(decoded.sessionId);
      if (!session || session.revokedAt) {
        ApiResponseUtil.unauthorized(res, 'Session expired or revoked');
        return;
      }

      // Update last active time
      await sessionManager.updateSessionActivity(decoded.sessionId);

      // Generate new tokens
      const newToken = generateProductionToken(session.userId, decoded.sessionId);
      const newRefreshToken = generateProductionRefreshToken(session.userId, decoded.sessionId);

      ApiResponseUtil.success(res, {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn: 3600,
      });
      */

      logger.warn('Production token refresh not fully implemented');
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
          subject: 'Password Reset Request - Prism',
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

      // TODO: Update password in database when user model is available
      // For now, log the password change (but not the actual password!)
      logger.info('Password reset successful', {
        email: verification.email,
        passwordScore: passwordValidation.score,
      });

      // Production implementation when user model exists:
      // await prisma.user.update({
      //   where: { email: verification.email },
      //   data: {
      //     passwordHash: hashedPassword,
      //     passwordChangedAt: new Date(),
      //   }
      // });
      //
      // After password change, revoke all sessions for security:
      // await sessionManager.revokeAllUserSessions(userId, 'password_changed');

      // Send confirmation email
      try {
        const emailService = getEmailService();
        await emailService.sendEmail({
          to: verification.email!,
          subject: 'Password Changed - Prism',
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

  /**
   * Register new admin user
   * POST /api/auth/register
   */
  static async requestRegistration(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, isAdmin } = req.body;

      if (!email || !password) {
        ApiResponseUtil.badRequest(res, 'Email and password are required');
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

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        ApiResponseUtil.badRequest(res, `Password is not strong enough: ${passwordValidation.errors.join(', ')}`);
        return;
      }

      // Hash the password for storage
      const passwordHash = await hashPassword(password);

      // Generate registration token
      const tokenData = generatePasswordResetToken(sanitizedEmail, 60); // 60 minutes validity

      // Store registration data in Redis under a separate key for registration tokens
      const registrationKey = `reg:${tokenData.hashedToken}`;
      const ttlSeconds = 60 * 60; // 60 minutes
      const registrationData = {
        email: sanitizedEmail,
        passwordHash,
        isAdmin: isAdmin || false,
        expiresAt: tokenData.expiresAt.toISOString(),
        createdAt: tokenData.createdAt.toISOString(),
      };
      await redis.setex(registrationKey, ttlSeconds, JSON.stringify(registrationData));

      // Generate registration URL
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const verificationUrl = `${baseUrl}/auth/verify-registration?token=${tokenData.token}`;

      // Send registration email
      try {
        const emailService = getEmailService();
        await emailService.sendEmail({
          to: sanitizedEmail,
          subject: 'Welcome to Prism - Verify Your Email',
          template: 'user-invitation',
          data: {
            recipientName: sanitizedEmail.split('@')[0],
            invitationLink: verificationUrl,
            role: isAdmin ? 'Administrator' : 'User',
            expiresIn: getExpiryTimeString(60),
          },
        });

        logger.info('Registration email sent', {
          email: sanitizedEmail,
          isAdmin,
          expiresAt: tokenData.expiresAt.toISOString(),
        });
      } catch (emailError) {
        logger.error('Failed to send registration email', {
          error: emailError,
          email: sanitizedEmail,
        });

        // In development, return token in response for testing
        if (process.env.NODE_ENV !== 'production') {
          ApiResponseUtil.success(res, {
            message: 'Registration initiated (email service not configured)',
            verificationToken: tokenData.token,
            verificationUrl,
            expiresAt: tokenData.expiresAt,
          });
          return;
        }

        ApiResponseUtil.error(
          res,
          'EMAIL_ERROR',
          'Failed to send registration email',
          500
        );
        return;
      }

      ApiResponseUtil.success(res, {
        message: 'Registration email sent. Please verify your email to complete registration.',
        email: sanitizedEmail,
      });
    } catch (error: any) {
      logger.error('Registration request error:', error);
      ApiResponseUtil.error(res, 'REGISTRATION_ERROR', 'Registration failed', 500);
    }
  }

  /**
   * Verify registration and create user
   * POST /api/auth/verify-registration
   */
  static async verifyRegistration(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        ApiResponseUtil.badRequest(res, 'Verification token is required');
        return;
      }

      // Hash token to look up in Redis
      const hashedToken = hashToken(token);
      const registrationKey = `reg:${hashedToken}`;
      const registrationDataStr = await redis.get(registrationKey);

      if (!registrationDataStr) {
        logger.warn('Registration token not found or expired');
        ApiResponseUtil.error(res, 'INVALID_TOKEN', 'Invalid or expired token', 400);
        return;
      }

      let registrationData: any;
      try {
        registrationData = JSON.parse(registrationDataStr);
      } catch (parseError) {
        logger.error('Failed to parse registration data', { error: parseError });
        ApiResponseUtil.error(res, 'INVALID_TOKEN', 'Invalid token', 400);
        return;
      }

      const email = registrationData.email;
      const isAdmin = registrationData.isAdmin || false;

      // In development mode, create a login token immediately
      const isDevelopment = process.env.NODE_ENV !== 'production';

      if (isDevelopment) {
        // Delete token after use
        await redis.del(registrationKey);

        // Create mock user
        const mockUser = {
          id: `user-${email.split('@')[0]}-${Date.now()}`,
          email,
          name: email.split('@')[0],
          roles: isAdmin ? ['admin', 'user'] : ['user'],
          tenantId: 'dev-tenant',
          tenantName: 'Development Tenant',
        };

        // Generate token
        const loginToken = AuthController.generateDevToken(mockUser);

        logger.info('User registered successfully', {
          email,
          isAdmin,
          userId: mockUser.id,
        });

        ApiResponseUtil.success(res, {
          message: 'Registration verified successfully! You can now log in.',
          user: mockUser,
          token: loginToken,
          sessionId: `session-${mockUser.id}`,
          expiresIn: 3600,
        });
        return;
      }

      // Production mode - would create user in database
      // TODO: Implement production user creation
      logger.warn('Production registration not fully implemented');
      ApiResponseUtil.error(res, 'REGISTRATION_ERROR', 'Registration not configured for production', 500);
    } catch (error: any) {
      logger.error('Registration verification error:', error);
      ApiResponseUtil.error(res, 'VERIFICATION_ERROR', 'Registration verification failed', 500);
    }
  }
}
