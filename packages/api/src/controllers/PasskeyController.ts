import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { PrismaClient } from '@sap-framework/core';
import { PasskeyService } from '@sap-framework/core';
import Redis from 'ioredis';
import logger from '../utils/logger';

/**
 * PasskeyController - WebAuthn/Passkey Management
 *
 * Endpoints:
 * - POST /api/passkey/register/options - Generate registration options
 * - POST /api/passkey/register/verify - Verify registration
 * - POST /api/passkey/auth/options - Generate authentication options
 * - POST /api/passkey/auth/verify - Verify authentication
 * - GET /api/passkey/list - Get user's passkeys
 * - DELETE /api/passkey/:id - Remove passkey
 * - PUT /api/passkey/:id/rename - Rename passkey
 */
export class PasskeyController {
  private prisma: PrismaClient;
  private passkeyService: PasskeyService;

  constructor() {
    this.prisma = new PrismaClient();
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });

    this.passkeyService = new PasskeyService(
      this.prisma,
      redis,
      process.env.WEBAUTHN_RP_ID || 'localhost',
      process.env.WEBAUTHN_RP_NAME || 'Prism',
      process.env.WEBAUTHN_ORIGIN || 'http://localhost:3001'
    );
  }

  /**
   * Generate passkey registration options
   * POST /api/passkey/register/options
   */
  async getRegistrationOptions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userEmail = req.user?.email;
      const userName = req.user?.name || userEmail;

      if (!userId || !userEmail) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const options = await this.passkeyService.generateRegistrationOptions(
        userId,
        userEmail,
        userName || userEmail
      );

      res.status(200).json(options.options);

      logger.info('Passkey registration options generated', { userId });
    } catch (error: any) {
      logger.error('Passkey registration options error', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to generate registration options' });
    }
  }

  /**
   * Verify passkey registration
   * POST /api/passkey/register/verify
   * Body: { response (RegistrationResponseJSON), deviceName? }
   */
  async verifyRegistration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { response: registrationResponse, deviceName } = req.body;

      if (!registrationResponse) {
        res.status(400).json({ error: 'Registration response required' });
        return;
      }

      const verification = await this.passkeyService.verifyRegistration(
        userId,
        registrationResponse,
        deviceName
      );

      if (!verification.verified) {
        res.status(400).json({ error: verification.error || 'Verification failed' });
        return;
      }

      res.status(200).json({
        success: true,
        verified: true,
        credentialId: verification.credentialId,
      });

      logger.info('Passkey registered successfully', { userId });
    } catch (error: any) {
      logger.error('Passkey registration verification error', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to verify registration' });
    }
  }

  /**
   * Generate passkey authentication options
   * POST /api/passkey/auth/options
   * Body: { userId? } (optional - for non-discoverable flow)
   */
  async getAuthenticationOptions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.body;

      const options = await this.passkeyService.generateAuthenticationOptions(userId);

      res.status(200).json(options.options);

      logger.info('Passkey authentication options generated', { userId: userId || 'unknown' });
    } catch (error: any) {
      logger.error('Passkey authentication options error', { error });
      res.status(500).json({ error: 'Failed to generate authentication options' });
    }
  }

  /**
   * Verify passkey authentication
   * POST /api/passkey/auth/verify
   * Body: { response (AuthenticationResponseJSON), userId? }
   */
  async verifyAuthentication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { response: authResponse, userId } = req.body;

      if (!authResponse) {
        res.status(400).json({ error: 'Authentication response required' });
        return;
      }

      const verification = await this.passkeyService.verifyAuthentication(
        authResponse,
        userId
      );

      if (!verification.verified) {
        res.status(400).json({ error: verification.error || 'Verification failed' });
        return;
      }

      res.status(200).json({
        success: true,
        verified: true,
        userId: verification.userId,
      });

      logger.info('Passkey authenticated successfully', { userId: verification.userId });
    } catch (error: any) {
      logger.error('Passkey authentication verification error', { error });
      res.status(500).json({ error: 'Failed to verify authentication' });
    }
  }

  /**
   * Get user's passkeys
   * GET /api/passkey/list
   */
  async listPasskeys(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const passkeys = await this.passkeyService.getUserPasskeys(userId);

      res.status(200).json({ passkeys });
    } catch (error: any) {
      logger.error('List passkeys error', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to list passkeys' });
    }
  }

  /**
   * Remove passkey
   * DELETE /api/passkey/:id
   */
  async removePasskey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Passkey ID required' });
        return;
      }

      await this.passkeyService.removePasskey(userId, id);

      res.status(200).json({
        success: true,
        message: 'Passkey removed successfully',
      });

      logger.info('Passkey removed', { userId, passkeyId: id });
    } catch (error: any) {
      logger.error('Remove passkey error', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to remove passkey' });
    }
  }

  /**
   * Rename passkey
   * PUT /api/passkey/:id/rename
   * Body: { name }
   */
  async renamePasskey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { name } = req.body;

      if (!id || !name) {
        res.status(400).json({ error: 'Passkey ID and name required' });
        return;
      }

      await this.passkeyService.renamePasskey(userId, id, name);

      res.status(200).json({
        success: true,
        message: 'Passkey renamed successfully',
      });

      logger.info('Passkey renamed', { userId, passkeyId: id, newName: name });
    } catch (error: any) {
      logger.error('Rename passkey error', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to rename passkey' });
    }
  }
}
