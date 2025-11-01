import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { randomBytes } from 'crypto';
import { PrismaClient } from '../../generated/prisma';
import Redis from 'ioredis';
import logger from '../../utils/logger';

export interface TOTPSetupResponse {
  secret: string; // Encrypted before storage
  qrCodeDataURL: string;
  backupCodes: string[];
}

export interface TOTPVerificationResult {
  verified: boolean;
  error?: string;
}

/**
 * TOTP (Time-Based One-Time Password) Service
 *
 * Implements RFC 6238 TOTP for two-factor authentication.
 * Uses otplib for TOTP generation and verification.
 */
export class TOTPService {
  private prisma: PrismaClient;
  private redis: Redis;
  private issuer: string;
  private window: number; // Time window for validation (default: 1 = ±30 seconds)

  constructor(
    prisma: PrismaClient,
    redis: Redis,
    issuer: string = 'Prism',
    window: number = 1
  ) {
    this.prisma = prisma;
    this.redis = redis;
    this.issuer = issuer;
    this.window = window;

    // Configure otplib
    authenticator.options = {
      window: this.window,
    };
  }

  /**
   * Generate TOTP secret and QR code for user
   */
  async generateSetup(userId: string, userEmail: string): Promise<TOTPSetupResponse> {
    // Generate secret (base32 encoded)
    const secret = authenticator.generateSecret();

    // Generate OTP Auth URL for QR code
    const otpauth = authenticator.keyuri(userEmail, this.issuer, secret);

    // Generate QR code data URL
    const qrCodeDataURL = await QRCode.toDataURL(otpauth);

    // Generate 10 backup codes
    const backupCodes = this.generateBackupCodes(10);

    logger.info('TOTP setup generated', { userId, userEmail });

    return {
      secret, // NOTE: Encrypt this before storing in database
      qrCodeDataURL,
      backupCodes, // NOTE: Hash these before storing in database
    };
  }

  /**
   * Verify TOTP token
   */
  async verifyToken(
    userId: string,
    token: string,
    secret: string
  ): Promise<TOTPVerificationResult> {
    // Check rate limiting
    const rateLimitOk = await this.checkRateLimit(userId, 'totp_attempts');
    if (!rateLimitOk) {
      return {
        verified: false,
        error: 'Too many attempts. Please try again later.',
      };
    }

    // Remove spaces and dashes from token
    const cleanToken = token.replace(/[\s-]/g, '');

    // Verify token length
    if (cleanToken.length !== 6) {
      await this.recordFailedAttempt(userId, 'totp_attempts');
      return {
        verified: false,
        error: 'Invalid token format',
      };
    }

    try {
      // Verify TOTP token
      const isValid = authenticator.verify({
        token: cleanToken,
        secret, // NOTE: Decrypt this from database first
      });

      if (isValid) {
        // Clear rate limit on success
        await this.clearRateLimit(userId, 'totp_attempts');

        // Update last used timestamp
        await this.prisma.userMFAConfig.update({
          where: { userId },
          data: { totpLastUsedAt: new Date() },
        });

        logger.info('TOTP verification successful', { userId });

        return { verified: true };
      } else {
        // Record failed attempt
        await this.recordFailedAttempt(userId, 'totp_attempts');

        logger.warn('TOTP verification failed', { userId });

        return {
          verified: false,
          error: 'Invalid code',
        };
      }
    } catch (error) {
      logger.error('TOTP verification error', { error, userId });
      return {
        verified: false,
        error: 'Verification error',
      };
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(
    userId: string,
    code: string
  ): Promise<TOTPVerificationResult> {
    // Check rate limiting
    const rateLimitOk = await this.checkRateLimit(userId, 'backup_code_attempts');
    if (!rateLimitOk) {
      return {
        verified: false,
        error: 'Too many attempts. Please try again later.',
      };
    }

    // Get user's MFA config
    const mfaConfig = await this.prisma.userMFAConfig.findUnique({
      where: { userId },
      select: { totpBackupCodes: true },
    });

    if (!mfaConfig || !mfaConfig.totpBackupCodes) {
      await this.recordFailedAttempt(userId, 'backup_code_attempts');
      return {
        verified: false,
        error: 'No backup codes available',
      };
    }

    // Clean code (remove spaces/dashes)
    const cleanCode = code.replace(/[\s-]/g, '').toUpperCase();

    // Check if code exists in backup codes
    // NOTE: In production, hash the input code and compare with hashed codes in database
    const codeIndex = mfaConfig.totpBackupCodes.indexOf(cleanCode);

    if (codeIndex === -1) {
      await this.recordFailedAttempt(userId, 'backup_code_attempts');
      return {
        verified: false,
        error: 'Invalid backup code',
      };
    }

    // Remove used backup code
    const updatedCodes = [...mfaConfig.totpBackupCodes];
    updatedCodes.splice(codeIndex, 1);

    await this.prisma.userMFAConfig.update({
      where: { userId },
      data: { totpBackupCodes: updatedCodes },
    });

    // Clear rate limit
    await this.clearRateLimit(userId, 'backup_code_attempts');

    logger.info('Backup code verified', {
      userId,
      remainingCodes: updatedCodes.length,
    });

    return { verified: true };
  }

  /**
   * Enable TOTP for user
   */
  async enableTOTP(
    userId: string,
    secret: string,
    backupCodes: string[]
  ): Promise<void> {
    await this.prisma.userMFAConfig.upsert({
      where: { userId },
      create: {
        userId,
        mfaEnabled: true,
        totpEnabled: true,
        totpSecret: secret, // NOTE: Encrypt before storing
        totpBackupCodes: backupCodes, // NOTE: Hash before storing
        totpSetupAt: new Date(),
      },
      update: {
        mfaEnabled: true,
        totpEnabled: true,
        totpSecret: secret, // NOTE: Encrypt before storing
        totpBackupCodes: backupCodes, // NOTE: Hash before storing
        totpSetupAt: new Date(),
      },
    });

    logger.info('TOTP enabled', { userId });
  }

  /**
   * Disable TOTP for user
   */
  async disableTOTP(userId: string): Promise<void> {
    const mfaConfig = await this.prisma.userMFAConfig.findUnique({
      where: { userId },
      select: { passkeyEnabled: true },
    });

    // Update MFA config
    await this.prisma.userMFAConfig.update({
      where: { userId },
      data: {
        totpEnabled: false,
        totpSecret: null,
        totpBackupCodes: [],
        // Only disable MFA entirely if passkey is also disabled
        mfaEnabled: mfaConfig?.passkeyEnabled || false,
      },
    });

    logger.info('TOTP disabled', { userId });
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const newBackupCodes = this.generateBackupCodes(10);

    await this.prisma.userMFAConfig.update({
      where: { userId },
      data: {
        totpBackupCodes: newBackupCodes, // NOTE: Hash before storing
      },
    });

    logger.info('Backup codes regenerated', { userId });

    return newBackupCodes;
  }

  /**
   * Get MFA status for user
   */
  async getMFAStatus(userId: string): Promise<{
    mfaEnabled: boolean;
    totpEnabled: boolean;
    passkeyEnabled: boolean;
    preferredMethod?: string;
    backupCodesRemaining: number;
  }> {
    const mfaConfig = await this.prisma.userMFAConfig.findUnique({
      where: { userId },
      select: {
        mfaEnabled: true,
        totpEnabled: true,
        passkeyEnabled: true,
        preferredMfaMethod: true,
        totpBackupCodes: true,
      },
    });

    if (!mfaConfig) {
      return {
        mfaEnabled: false,
        totpEnabled: false,
        passkeyEnabled: false,
        backupCodesRemaining: 0,
      };
    }

    return {
      mfaEnabled: mfaConfig.mfaEnabled,
      totpEnabled: mfaConfig.totpEnabled,
      passkeyEnabled: mfaConfig.passkeyEnabled,
      preferredMethod: mfaConfig.preferredMfaMethod || undefined,
      backupCodesRemaining: mfaConfig.totpBackupCodes?.length || 0,
    };
  }

  /**
   * Set preferred MFA method
   */
  async setPreferredMFAMethod(
    userId: string,
    method: 'totp' | 'passkey'
  ): Promise<void> {
    await this.prisma.userMFAConfig.update({
      where: { userId },
      data: { preferredMfaMethod: method },
    });

    logger.info('Preferred MFA method updated', { userId, method });
  }

  // Private helper methods

  /**
   * Generate backup codes (8 characters, alphanumeric)
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      // Generate 4 random bytes = 8 hex characters
      const code = randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }

    return codes;
  }

  /**
   * Check rate limit for MFA attempts
   */
  private async checkRateLimit(
    userId: string,
    limitType: string
  ): Promise<boolean> {
    const rateLimit = await this.prisma.mFARateLimit.findUnique({
      where: { userId_limitType: { userId, limitType } },
    });

    if (!rateLimit) {
      return true; // No rate limit record = OK
    }

    // Check if locked
    if (rateLimit.lockedUntil && rateLimit.lockedUntil > new Date()) {
      return false; // Still locked
    }

    // Check if within window (5 minutes)
    const windowStart = new Date(Date.now() - 5 * 60 * 1000);
    if (rateLimit.windowStart < windowStart) {
      // Window expired, reset counter
      await this.prisma.mFARateLimit.update({
        where: { id: rateLimit.id },
        data: {
          attemptCount: 0,
          windowStart: new Date(),
          lockedUntil: null,
        },
      });
      return true;
    }

    // Check attempt count (max 5 in 5 minutes)
    if (rateLimit.attemptCount >= 5) {
      // Lock for 15 minutes
      await this.prisma.mFARateLimit.update({
        where: { id: rateLimit.id },
        data: {
          lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
      logger.warn('MFA rate limit exceeded', { userId, limitType });
      return false;
    }

    return true;
  }

  /**
   * Record failed MFA attempt
   */
  private async recordFailedAttempt(
    userId: string,
    limitType: string
  ): Promise<void> {
    await this.prisma.mFARateLimit.upsert({
      where: { userId_limitType: { userId, limitType } },
      create: {
        userId,
        limitType,
        attemptCount: 1,
        windowStart: new Date(),
        lastAttemptAt: new Date(),
      },
      update: {
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });
  }

  /**
   * Clear rate limit after successful verification
   */
  private async clearRateLimit(userId: string, limitType: string): Promise<void> {
    await this.prisma.mFARateLimit.updateMany({
      where: { userId, limitType },
      data: {
        attemptCount: 0,
        windowStart: new Date(),
        lockedUntil: null,
      },
    });
  }
}
