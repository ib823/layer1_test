import { PrismaClient } from '../../generated/prisma';
import Redis from 'ioredis';
import { randomBytes } from 'crypto';
import logger from '../../utils/logger';
import { RiskAnalyzer, RiskAssessment } from './RiskAnalyzer';
import { EmailService } from '../../email/EmailService';
import { DeviceFingerprint } from '../session/DeviceFingerprint';
import geoip from 'geoip-lite';

export interface NewLoginDetection {
  isNewLogin: boolean;
  requiresConfirmation: boolean;
  riskAssessment: RiskAssessment;
  confirmationToken?: string;
}

export interface LoginConfirmationResult {
  success: boolean;
  userId?: string;
  sessionData?: any;
  error?: string;
}

/**
 * NewLoginDetector - Detect and handle new login attempts
 *
 * Features:
 * - Detects logins from new devices/locations
 * - Triggers email confirmation for suspicious logins
 * - Manages trusted devices
 * - Handles login denial (auto password reset)
 * - Integrates with RiskAnalyzer for risk scoring
 */
export class NewLoginDetector {
  private prisma: PrismaClient;
  private redis: Redis;
  private riskAnalyzer: RiskAnalyzer;
  private emailService: EmailService;

  // Thresholds
  private readonly CONFIRMATION_RISK_THRESHOLD = 60; // Risk score >= 60 requires confirmation
  private readonly AUTO_BLOCK_THRESHOLD = 90; // Risk score >= 90 automatically blocks

  constructor(
    prisma: PrismaClient,
    redis: Redis,
    riskAnalyzer: RiskAnalyzer,
    emailService?: EmailService
  ) {
    this.prisma = prisma;
    this.redis = redis;
    this.riskAnalyzer = riskAnalyzer;
    this.emailService = emailService || EmailService.getInstance();
  }

  /**
   * Detect if login requires confirmation
   */
  async detectNewLogin(
    userId: string,
    ipAddress: string,
    deviceFingerprint: string,
    userAgent: string
  ): Promise<NewLoginDetection> {
    // Perform risk analysis
    const riskAssessment = await this.riskAnalyzer.analyzeLoginAttempt(
      userId,
      ipAddress,
      deviceFingerprint,
      userAgent
    );

    logger.info('New login detection analyzed', {
      userId,
      riskScore: riskAssessment.riskScore,
      riskLevel: riskAssessment.riskLevel,
    });

    // Auto-block if risk too high
    if (riskAssessment.riskScore >= this.AUTO_BLOCK_THRESHOLD) {
      logger.warn('Login auto-blocked due to high risk', {
        userId,
        riskScore: riskAssessment.riskScore,
      });

      return {
        isNewLogin: true,
        requiresConfirmation: false, // Don't even send confirmation
        riskAssessment,
      };
    }

    // Check if device is trusted
    const isTrustedDevice = await this.isDeviceTrusted(userId, deviceFingerprint);

    // Determine if confirmation required
    const requiresConfirmation =
      !isTrustedDevice && riskAssessment.riskScore >= this.CONFIRMATION_RISK_THRESHOLD;

    let confirmationToken: string | undefined;

    if (requiresConfirmation) {
      // Generate confirmation token
      confirmationToken = randomBytes(32).toString('hex');

      // Store token in Redis (expires in 1 hour)
      const tokenKey = `login:confirmation:${confirmationToken}`;
      await this.redis.setex(
        tokenKey,
        3600,
        JSON.stringify({
          userId,
          ipAddress,
          deviceFingerprint,
          userAgent,
          timestamp: Date.now(),
        })
      );

      // Send confirmation email (if email service configured)
      if (this.emailService) {
        await this.sendConfirmationEmail(
          userId,
          confirmationToken,
          ipAddress,
          riskAssessment
        );
      }

      logger.info('Login confirmation required', {
        userId,
        confirmationToken: confirmationToken.substring(0, 8) + '...',
      });
    }

    return {
      isNewLogin: riskAssessment.isNewDevice || riskAssessment.isNewLocation,
      requiresConfirmation,
      riskAssessment,
      confirmationToken,
    };
  }

  /**
   * Confirm a login attempt
   */
  async confirmLogin(confirmationToken: string): Promise<LoginConfirmationResult> {
    const tokenKey = `login:confirmation:${confirmationToken}`;
    const tokenData = await this.redis.get(tokenKey);

    if (!tokenData) {
      return {
        success: false,
        error: 'Invalid or expired confirmation token',
      };
    }

    const { userId, deviceFingerprint, ipAddress, userAgent } = JSON.parse(tokenData);

    // Mark device as trusted
    await this.trustDevice(userId, deviceFingerprint, ipAddress, userAgent);

    // Delete confirmation token
    await this.redis.del(tokenKey);

    // Record successful confirmation in login_attempts
    await this.prisma.loginAttempt.create({
      data: {
        userId,
        email: '', // Will be filled by caller
        status: 'success',
        ipAddress,
        deviceFingerprint,
        userAgent,
        isNewDevice: true,
        isNewLocation: false,
        isSuspicious: false,
        riskScore: 0,
        confirmedAt: new Date(),
        confirmationToken,
      },
    });

    logger.info('Login confirmed successfully', { userId, deviceFingerprint });

    return {
      success: true,
      userId,
      sessionData: {
        ipAddress,
        deviceFingerprint,
        userAgent,
      },
    };
  }

  /**
   * Deny a login attempt (triggers password reset)
   */
  async denyLogin(confirmationToken: string): Promise<LoginConfirmationResult> {
    const tokenKey = `login:confirmation:${confirmationToken}`;
    const tokenData = await this.redis.get(tokenKey);

    if (!tokenData) {
      return {
        success: false,
        error: 'Invalid or expired confirmation token',
      };
    }

    const { userId, deviceFingerprint, ipAddress, userAgent } = JSON.parse(tokenData);

    // Delete confirmation token
    await this.redis.del(tokenKey);

    // Record denied login attempt
    await this.prisma.loginAttempt.create({
      data: {
        userId,
        email: '', // Will be filled by caller
        status: 'blocked',
        failureReason: 'User denied login attempt',
        ipAddress,
        deviceFingerprint,
        userAgent,
        isNewDevice: true,
        isNewLocation: false,
        isSuspicious: true,
        riskScore: 100,
        deniedAt: new Date(),
        confirmationToken,
      },
    });

    // Revoke all user sessions (force logout everywhere)
    await this.revokeAllUserSessions(userId, 'security_event');

    // Generate password reset token (force password change)
    const resetToken = await this.generatePasswordResetToken(userId);

    // Send password reset email (if email service configured)
    if (this.emailService) {
      await this.sendPasswordResetEmail(userId, resetToken);
    }

    // Log security event
    await this.prisma.securityEvent.create({
      data: {
        userId,
        eventType: 'suspicious_login_denied',
        eventCategory: 'security',
        severity: 'critical',
        description: `User denied login attempt from IP ${ipAddress}`,
        metadata: {
          ipAddress,
          deviceFingerprint,
          userAgent,
          deniedAt: new Date().toISOString(),
        },
        ipAddress,
        deviceFingerprint,
        triggeredBy: 'user',
      },
    });

    logger.warn('Login denied by user - password reset initiated', {
      userId,
      ipAddress,
      deviceFingerprint,
    });

    return {
      success: true,
      userId,
    };
  }

  /**
   * Check if device is trusted for user
   */
  private async isDeviceTrusted(
    userId: string,
    deviceFingerprint: string
  ): Promise<boolean> {
    const trustedDevice = await this.prisma.trustedDevice.findFirst({
      where: {
        userId,
        deviceFingerprint,
        revokedAt: null,
        OR: [
          { trustExpiresAt: null },
          { trustExpiresAt: { gt: new Date() } },
        ],
      },
    });

    return !!trustedDevice;
  }

  /**
   * Mark device as trusted
   */
  private async trustDevice(
    userId: string,
    deviceFingerprint: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    // Parse user agent for device info using DeviceFingerprint utility
    const parsedUA = DeviceFingerprint.parseUserAgent(userAgent);
    const deviceInfo = {
      deviceName: DeviceFingerprint.getDeviceName(parsedUA),
      deviceType: DeviceFingerprint.getDeviceType(parsedUA),
      browser: DeviceFingerprint.getBrowserString(parsedUA),
      os: DeviceFingerprint.getOSString(parsedUA),
    };

    // Get location from IP using geoip-lite
    const geo = geoip.lookup(ipAddress);
    const location = {
      country: geo?.country || null,
      city: geo?.city || null,
    };

    // Upsert trusted device
    await this.prisma.trustedDevice.upsert({
      where: {
        userId_deviceFingerprint: {
          userId,
          deviceFingerprint,
        },
      },
      create: {
        userId,
        deviceFingerprint,
        deviceName: deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        ipAddress,
        country: location.country,
        city: location.city,
        firstSeenAt: new Date(),
        lastUsedAt: new Date(),
        trustedAt: new Date(),
        // Trust expires in 90 days
        trustExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
      update: {
        lastUsedAt: new Date(),
        ipAddress, // Update last known IP
        country: location.country,
        city: location.city,
      },
    });

    logger.info('Device marked as trusted', { userId, deviceFingerprint });
  }

  /**
   * Revoke all user sessions
   */
  private async revokeAllUserSessions(
    userId: string,
    reason: string
  ): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revocationReason: reason,
      },
    });

    // Also clear Redis sessions
    // TODO: Implement Redis session cleanup

    logger.info('All user sessions revoked', { userId, reason });
  }

  /**
   * Generate password reset token
   */
  private async generatePasswordResetToken(userId: string): Promise<string> {
    const resetToken = randomBytes(32).toString('hex');

    // Store token in Redis (expires in 1 hour)
    const tokenKey = `password:reset:${resetToken}`;
    await this.redis.setex(
      tokenKey,
      3600,
      JSON.stringify({
        userId,
        forced: true, // Indicates forced reset due to security event
        timestamp: Date.now(),
      })
    );

    logger.info('Password reset token generated', { userId });

    return resetToken;
  }

  /**
   * Send confirmation email
   */
  private async sendConfirmationEmail(
    userId: string,
    confirmationToken: string,
    ipAddress: string,
    riskAssessment: RiskAssessment
  ): Promise<void> {
    // TODO: Fetch user email from user service/table when user model is available
    // For now, we'll need the email to be passed from the caller
    // This is a placeholder implementation that logs the intent

    // Build confirmation and denial links
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
    const confirmLink = `${baseUrl}/auth/confirm-login?token=${confirmationToken}`;
    const denyLink = `${baseUrl}/auth/deny-login?token=${confirmationToken}`;

    // Extract basic device info from risk assessment
    const deviceInfo = riskAssessment.isNewDevice ? 'New Device' : 'Known Device';
    const location = riskAssessment.isNewLocation ? 'New Location' : 'Known Location';

    // TODO: When user model is available, uncomment and use:
    /*
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user || !user.email) {
      logger.warn('Cannot send confirmation email - user email not found', { userId });
      return;
    }

    await this.emailService.sendEmail({
      to: user.email,
      subject: 'New Login Detected - Confirmation Required',
      template: 'new-login-confirmation',
      data: {
        recipientName: user.name || user.email,
        deviceInfo,
        location,
        ipAddress,
        timestamp: new Date().toLocaleString('en-US', {
          dateStyle: 'full',
          timeStyle: 'long',
        }),
        confirmLink,
        denyLink,
        expiresIn: '1 hour',
      },
    });
    */

    logger.info('Confirmation email prepared (pending user model)', {
      userId,
      ipAddress,
      confirmLink: confirmLink.substring(0, 50) + '...',
      denyLink: denyLink.substring(0, 50) + '...',
    });
  }

  /**
   * Send password reset email
   */
  private async sendPasswordResetEmail(
    userId: string,
    resetToken: string
  ): Promise<void> {
    // TODO: Fetch user email from user service/table when user model is available
    // For now, this is a placeholder implementation that logs the intent

    // Get the most recent denied login attempt for context
    const deniedAttempt = await this.prisma.loginAttempt.findFirst({
      where: {
        userId,
        status: 'blocked',
        failureReason: 'User denied login attempt',
      },
      orderBy: { createdAt: 'desc' },
    });

    // Build password reset link
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
    const newPasswordLink = `${baseUrl}/auth/reset-password?token=${resetToken}`;

    // Extract device and location info from denied attempt
    const deviceInfo = deniedAttempt?.userAgent || 'Unknown Device';
    const location = 'Unknown Location'; // TODO: Implement geolocation
    const ipAddress = deniedAttempt?.ipAddress || 'Unknown';

    // TODO: When user model is available, uncomment and use:
    /*
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user || !user.email) {
      logger.warn('Cannot send password reset email - user email not found', { userId });
      return;
    }

    await this.emailService.sendEmail({
      to: user.email,
      subject: 'Security Alert: Login Attempt Denied - Password Reset Required',
      template: 'login-denied-notification',
      data: {
        recipientName: user.name || user.email,
        deviceInfo,
        location,
        ipAddress,
        timestamp: deniedAttempt?.createdAt?.toLocaleString('en-US', {
          dateStyle: 'full',
          timeStyle: 'long',
        }) || new Date().toLocaleString('en-US', {
          dateStyle: 'full',
          timeStyle: 'long',
        }),
        newPasswordLink,
      },
    });
    */

    logger.info('Password reset email prepared (pending user model)', {
      userId,
      resetLink: newPasswordLink.substring(0, 50) + '...',
      deniedAttemptIp: ipAddress,
    });
  }

  /**
   * Get pending confirmation for user
   */
  async getPendingConfirmation(userId: string): Promise<{
    hasPending: boolean;
    ipAddress?: string;
    timestamp?: number;
  }> {
    // Scan Redis for pending confirmations for this user
    // This is a simplified version - in production, use a better approach
    // (e.g., store user->token mapping in Redis)

    // TODO: Implement proper pending confirmation lookup

    return {
      hasPending: false,
    };
  }

  /**
   * Revoke trust for a device
   */
  async revokeTrustedDevice(
    userId: string,
    deviceFingerprint: string
  ): Promise<void> {
    await this.prisma.trustedDevice.updateMany({
      where: {
        userId,
        deviceFingerprint,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revocationReason: 'manual',
      },
    });

    logger.info('Trusted device revoked', { userId, deviceFingerprint });
  }

  /**
   * Get user's trusted devices
   */
  async getTrustedDevices(userId: string): Promise<
    Array<{
      id: string;
      deviceName: string | null;
      deviceType: string | null;
      browser: string | null;
      os: string | null;
      lastUsedAt: Date;
      trustedAt: Date;
      trustExpiresAt: Date | null;
    }>
  > {
    const devices = await this.prisma.trustedDevice.findMany({
      where: {
        userId,
        revokedAt: null,
      },
      select: {
        id: true,
        deviceName: true,
        deviceType: true,
        browser: true,
        os: true,
        lastUsedAt: true,
        trustedAt: true,
        trustExpiresAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });

    return devices;
  }
}
