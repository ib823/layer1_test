import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { PrismaClient } from '@sap-framework/core';
import { TOTPService } from '@sap-framework/core';
import Redis from 'ioredis';
import logger from '../utils/logger';

/**
 * MFAController - Multi-Factor Authentication Management
 *
 * Endpoints:
 * - POST /api/mfa/totp/setup - Generate TOTP setup (QR code)
 * - POST /api/mfa/totp/verify-setup - Verify and enable TOTP
 * - POST /api/mfa/totp/verify - Verify TOTP code during login
 * - POST /api/mfa/totp/disable - Disable TOTP
 * - POST /api/mfa/backup-codes/regenerate - Regenerate backup codes
 * - POST /api/mfa/backup-codes/verify - Verify backup code
 * - GET /api/mfa/status - Get MFA status for current user
 * - PUT /api/mfa/preferred-method - Set preferred MFA method
 */
export class MFAController {
  private prisma: PrismaClient;
  private totpService: TOTPService;

  constructor() {
    this.prisma = new PrismaClient();
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });
    this.totpService = new TOTPService(this.prisma, redis);
  }

  /**
   * Generate TOTP setup (QR code)
   * POST /api/mfa/totp/setup
   */
  async setupTOTP(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userEmail = req.user?.email;
      const userName = req.user?.name || userEmail;

      if (!userId || !userEmail) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check if TOTP already enabled
      const mfaStatus = await this.totpService.getMFAStatus(userId);
      if (mfaStatus.totpEnabled) {
        res.status(400).json({ error: 'TOTP already enabled' });
        return;
      }

      // Generate TOTP setup
      const setup = await this.totpService.generateSetup(userId, userEmail);

      // NOTE: Don't store secret yet - wait for verification

      res.status(200).json({
        qrCode: setup.qrCodeDataURL,
        secret: setup.secret, // User needs this if QR code fails
        backupCodes: setup.backupCodes,
      });

      logger.info('TOTP setup generated', { userId });
    } catch (error: any) {
      logger.error('TOTP setup error', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to generate TOTP setup' });
    }
  }

  /**
   * Verify and enable TOTP
   * POST /api/mfa/totp/verify-setup
   * Body: { secret, token, backupCodes }
   */
  async verifyAndEnableTOTP(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { secret, token, backupCodes } = req.body;

      if (!secret || !token || !backupCodes) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Verify TOTP token
      const verification = await this.totpService.verifyToken(userId, token, secret);

      if (!verification.verified) {
        res.status(400).json({ error: verification.error || 'Invalid token' });
        return;
      }

      // Enable TOTP
      await this.totpService.enableTOTP(userId, secret, backupCodes);

      res.status(200).json({
        success: true,
        message: 'TOTP enabled successfully',
      });

      logger.info('TOTP enabled', { userId });
    } catch (error: any) {
      logger.error('TOTP enable error', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to enable TOTP' });
    }
  }

  /**
   * Verify TOTP code during login
   * POST /api/mfa/totp/verify
   * Body: { token }
   */
  async verifyTOTP(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { token } = req.body;

      if (!token) {
        res.status(400).json({ error: 'Token required' });
        return;
      }

      // Get user's TOTP secret
      const mfaConfig = await this.prisma.userMFAConfig.findUnique({
        where: { userId },
        select: { totpSecret: true, totpEnabled: true },
      });

      if (!mfaConfig || !mfaConfig.totpEnabled || !mfaConfig.totpSecret) {
        res.status(400).json({ error: 'TOTP not enabled' });
        return;
      }

      // Verify TOTP token
      const verification = await this.totpService.verifyToken(
        userId,
        token,
        mfaConfig.totpSecret
      );

      if (!verification.verified) {
        res.status(400).json({ error: verification.error || 'Invalid token' });
        return;
      }

      res.status(200).json({
        success: true,
        verified: true,
      });

      logger.info('TOTP verified', { userId });
    } catch (error: any) {
      logger.error('TOTP verification error', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to verify TOTP' });
    }
  }

  /**
   * Disable TOTP
   * POST /api/mfa/totp/disable
   */
  async disableTOTP(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.totpService.disableTOTP(userId);

      res.status(200).json({
        success: true,
        message: 'TOTP disabled successfully',
      });

      logger.info('TOTP disabled', { userId });
    } catch (error: any) {
      logger.error('TOTP disable error', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to disable TOTP' });
    }
  }

  /**
   * Regenerate backup codes
   * POST /api/mfa/backup-codes/regenerate
   */
  async regenerateBackupCodes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const newBackupCodes = await this.totpService.regenerateBackupCodes(userId);

      res.status(200).json({
        success: true,
        backupCodes: newBackupCodes,
      });

      logger.info('Backup codes regenerated', { userId });
    } catch (error: any) {
      logger.error('Backup codes regeneration error', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to regenerate backup codes' });
    }
  }

  /**
   * Verify backup code
   * POST /api/mfa/backup-codes/verify
   * Body: { code }
   */
  async verifyBackupCode(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { code } = req.body;

      if (!code) {
        res.status(400).json({ error: 'Code required' });
        return;
      }

      const verification = await this.totpService.verifyBackupCode(userId, code);

      if (!verification.verified) {
        res.status(400).json({ error: verification.error || 'Invalid code' });
        return;
      }

      res.status(200).json({
        success: true,
        verified: true,
      });

      logger.info('Backup code verified', { userId });
    } catch (error: any) {
      logger.error('Backup code verification error', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to verify backup code' });
    }
  }

  /**
   * Get MFA status
   * GET /api/mfa/status
   */
  async getMFAStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const status = await this.totpService.getMFAStatus(userId);

      res.status(200).json(status);
    } catch (error: any) {
      logger.error('Get MFA status error', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get MFA status' });
    }
  }

  /**
   * Set preferred MFA method
   * PUT /api/mfa/preferred-method
   * Body: { method: 'totp' | 'passkey' }
   */
  async setPreferredMethod(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { method } = req.body;

      if (method !== 'totp' && method !== 'passkey') {
        res.status(400).json({ error: 'Invalid method' });
        return;
      }

      await this.totpService.setPreferredMFAMethod(userId, method);

      res.status(200).json({
        success: true,
        message: 'Preferred MFA method updated',
      });

      logger.info('Preferred MFA method updated', { userId, method });
    } catch (error: any) {
      logger.error('Set preferred MFA method error', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to set preferred MFA method' });
    }
  }
}
