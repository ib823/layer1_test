import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { PrismaClient } from '@sap-framework/core';
import { SessionManager } from '@sap-framework/core';
import Redis from 'ioredis';
import logger from '../utils/logger';

/**
 * SessionController - Session Management
 *
 * Endpoints:
 * - GET /api/sessions - Get all active sessions for current user
 * - GET /api/sessions/current - Get current session details
 * - DELETE /api/sessions/:id - Revoke specific session
 * - DELETE /api/sessions - Revoke all sessions except current
 * - DELETE /api/sessions/all - Revoke all sessions including current
 */
export class SessionController {
  private prisma: PrismaClient;
  private sessionManager: SessionManager;

  constructor() {
    this.prisma = new PrismaClient();
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });

    this.sessionManager = new SessionManager(redis, this.prisma);
  }

  /**
   * Get all active sessions
   * GET /api/sessions
   */
  async getSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Get all active sessions for user
      const sessions = await this.prisma.userSession.findMany({
        where: {
          userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { lastActivityAt: 'desc' },
      });

      res.status(200).json({ sessions });
    } catch (error: any) {
      logger.error('Get sessions error', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get sessions' });
    }
  }

  /**
   * Get current session details
   * GET /api/sessions/current
   */
  async getCurrentSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');

      if (!sessionToken) {
        res.status(401).json({ error: 'No session token' });
        return;
      }

      const sessionData = await this.sessionManager.validateSession(sessionToken);

      if (!sessionData || !sessionData.valid) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      const session = await this.prisma.userSession.findUnique({
        where: { sessionToken },
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.status(200).json({ session });
    } catch (error: any) {
      logger.error('Get current session error', { error });
      res.status(500).json({ error: 'Failed to get current session' });
    }
  }

  /**
   * Revoke specific session
   * DELETE /api/sessions/:id
   */
  async revokeSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Session ID required' });
        return;
      }

      // Verify session belongs to user
      const session = await this.prisma.userSession.findFirst({
        where: { id, userId },
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      await this.sessionManager.revokeSession(session.sessionToken, 'manual');

      res.status(200).json({
        success: true,
        message: 'Session revoked successfully',
      });

      logger.info('Session revoked', { userId, sessionId: id });
    } catch (error: any) {
      logger.error('Revoke session error', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to revoke session' });
    }
  }

  /**
   * Revoke all sessions except current
   * DELETE /api/sessions
   */
  async revokeOtherSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const currentSessionToken = req.headers.authorization?.replace('Bearer ', '');

      if (!userId || !currentSessionToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Revoke all other sessions
      const result = await this.prisma.userSession.updateMany({
        where: {
          userId,
          sessionToken: { not: currentSessionToken },
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revocationReason: 'manual',
        },
      });

      const revokedCount = result.count;

      res.status(200).json({
        success: true,
        message: `${revokedCount} session(s) revoked`,
        revokedCount,
      });

      logger.info('Other sessions revoked', { userId, revokedCount });
    } catch (error: any) {
      logger.error('Revoke other sessions error', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to revoke sessions' });
    }
  }

  /**
   * Revoke all sessions including current (logout everywhere)
   * DELETE /api/sessions/all
   */
  async revokeAllSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Revoke all sessions
      const result = await this.prisma.userSession.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revocationReason: 'manual',
        },
      });

      const revokedCount = result.count;

      res.status(200).json({
        success: true,
        message: `${revokedCount} session(s) revoked`,
        revokedCount,
      });

      logger.info('All sessions revoked', { userId, revokedCount });
    } catch (error: any) {
      logger.error('Revoke all sessions error', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to revoke all sessions' });
    }
  }

  /**
   * Validate session (used by middleware)
   * POST /api/sessions/validate
   * Body: { sessionToken }
   */
  async validateSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionToken } = req.body;

      if (!sessionToken) {
        res.status(400).json({ error: 'Session token required' });
        return;
      }

      const session = await this.sessionManager.validateSession(sessionToken);

      if (!session) {
        res.status(401).json({ valid: false, error: 'Invalid or expired session' });
        return;
      }

      res.status(200).json({
        valid: true,
        session,
      });
    } catch (error: any) {
      logger.error('Validate session error', { error });
      res.status(500).json({ error: 'Failed to validate session' });
    }
  }
}
