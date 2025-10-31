import Redis from 'ioredis';
import { randomBytes } from 'crypto';
import { DeviceFingerprint, DeviceInfo } from './DeviceFingerprint';
import { PrismaClient } from '../../generated/prisma';
import geoip from 'geoip-lite';
import logger from '../../utils/logger';

export interface CreateSessionParams {
  userId: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  mfaVerified: boolean;
  isTrustedDevice?: boolean;
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  deviceName: string;
  deviceType: string;
  location: string;
  ipAddress: string;
  createdAt: number;
  lastActivityAt: number;
  mfaVerified: boolean;
}

export interface SessionValidation {
  valid: boolean;
  userId?: string;
  mfaVerified?: boolean;
  sessionInfo?: SessionInfo;
}

/**
 * Session Manager
 *
 * Manages user sessions with the following features:
 * - Maximum 2 concurrent sessions per user
 * - Automatic eviction of oldest session when limit exceeded
 * - Redis for fast session lookup
 * - PostgreSQL for session audit trail
 * - Device and location tracking
 * - Session activity monitoring
 */
export class SessionManager {
  private redis: Redis;
  private prisma: PrismaClient;
  private maxSessions: number;
  private sessionTTL: number; // in seconds

  constructor(
    redis: Redis,
    prisma: PrismaClient,
    maxSessions: number = 2,
    sessionTTL: number = 86400 // 24 hours
  ) {
    this.redis = redis;
    this.prisma = prisma;
    this.maxSessions = maxSessions;
    this.sessionTTL = sessionTTL;
  }

  /**
   * Create new session with automatic old session cleanup
   */
  async createSession(params: CreateSessionParams): Promise<{
    sessionId: string;
    sessionToken: string;
    kicked?: string[];
  }> {
    const {
      userId,
      deviceFingerprint,
      ipAddress,
      userAgent,
      mfaVerified,
      isTrustedDevice = false,
    } = params;

    // Generate session ID and token
    const sessionId = this.generateSessionId();
    const sessionToken = this.generateSessionToken();
    const timestamp = Date.now();
    const expiresAt = new Date(timestamp + this.sessionTTL * 1000);

    // Check current session count
    const activeSessions = await this.getActiveSessions(userId);
    const kicked: string[] = [];

    // If at or over limit, kick oldest session(s)
    if (activeSessions.length >= this.maxSessions) {
      const sessionsToKick = activeSessions.length - this.maxSessions + 1;
      const oldestSessions = activeSessions
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(0, sessionsToKick);

      for (const oldSession of oldestSessions) {
        await this.revokeSession(oldSession.sessionId, 'max_sessions');
        kicked.push(oldSession.sessionId);
        logger.info('Session kicked due to max sessions', {
          userId,
          kickedSessionId: oldSession.sessionId,
          newSessionId: sessionId,
        });
      }
    }

    // Parse device info
    const deviceInfo = DeviceFingerprint.generateDeviceInfo(userAgent, ipAddress);

    // Get location from IP
    const location = this.getLocationFromIP(ipAddress);

    // Store session in Redis
    await this.redis.hset(`session:${sessionToken}`, {
      sessionId,
      userId,
      deviceFingerprint,
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      ipAddress,
      country: location.country || '',
      city: location.city || '',
      latitude: location.latitude?.toString() || '',
      longitude: location.longitude?.toString() || '',
      isTrustedDevice: isTrustedDevice ? '1' : '0',
      mfaVerified: mfaVerified ? '1' : '0',
      createdAt: timestamp.toString(),
      lastActivityAt: timestamp.toString(),
    });

    // Set TTL on session
    await this.redis.expire(`session:${sessionToken}`, this.sessionTTL);

    // Add to user's session set (sorted by timestamp)
    await this.redis.zadd(`user:sessions:${userId}`, timestamp, sessionToken);

    // Store in database for audit trail
    await this.prisma.userSession.create({
      data: {
        id: sessionId,
        userId,
        sessionToken,
        deviceFingerprint,
        deviceName: deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        ipAddress,
        country: location.country,
        city: location.city,
        latitude: location.latitude,
        longitude: location.longitude,
        isTrustedDevice,
        mfaVerified,
        createdAt: new Date(timestamp),
        lastActivityAt: new Date(timestamp),
        expiresAt,
        userAgent,
      },
    });

    logger.info('Session created', {
      sessionId,
      userId,
      deviceType: deviceInfo.deviceType,
      location: `${location.city}, ${location.country}`,
      kicked: kicked.length,
    });

    return {
      sessionId,
      sessionToken,
      kicked: kicked.length > 0 ? kicked : undefined,
    };
  }

  /**
   * Get all active sessions for user (from Redis)
   */
  async getActiveSessions(userId: string): Promise<SessionInfo[]> {
    // Get session tokens from sorted set
    const sessionTokens = await this.redis.zrange(
      `user:sessions:${userId}`,
      0,
      -1
    );

    const sessions: SessionInfo[] = [];

    for (const sessionToken of sessionTokens) {
      const sessionData = await this.redis.hgetall(`session:${sessionToken}`);

      if (sessionData && sessionData.userId) {
        sessions.push({
          sessionId: sessionData.sessionId,
          userId: sessionData.userId,
          deviceName: sessionData.deviceName || 'Unknown Device',
          deviceType: sessionData.deviceType || 'desktop',
          location: this.formatLocation({
            city: sessionData.city,
            country: sessionData.country,
          }),
          ipAddress: sessionData.ipAddress,
          createdAt: parseInt(sessionData.createdAt),
          lastActivityAt: parseInt(sessionData.lastActivityAt),
          mfaVerified: sessionData.mfaVerified === '1',
        });
      } else {
        // Clean up orphaned session token
        await this.redis.zrem(`user:sessions:${userId}`, sessionToken);
      }
    }

    return sessions;
  }

  /**
   * Validate session and update last activity
   */
  async validateSession(sessionToken: string): Promise<SessionValidation> {
    const sessionData = await this.redis.hgetall(`session:${sessionToken}`);

    if (!sessionData || !sessionData.userId) {
      return { valid: false };
    }

    // Update last activity timestamp
    const now = Date.now();
    await this.redis.hset(
      `session:${sessionToken}`,
      'lastActivityAt',
      now.toString()
    );

    // Update in database (async, don't wait)
    this.prisma.userSession
      .update({
        where: { sessionToken },
        data: { lastActivityAt: new Date(now) },
      })
      .catch((err: any) => {
        logger.error('Failed to update session activity in database', {
          error: err,
          sessionToken,
        });
      });

    return {
      valid: true,
      userId: sessionData.userId,
      mfaVerified: sessionData.mfaVerified === '1',
      sessionInfo: {
        sessionId: sessionData.sessionId,
        userId: sessionData.userId,
        deviceName: sessionData.deviceName || 'Unknown Device',
        deviceType: sessionData.deviceType || 'desktop',
        location: this.formatLocation({
          city: sessionData.city,
          country: sessionData.country,
        }),
        ipAddress: sessionData.ipAddress,
        createdAt: parseInt(sessionData.createdAt),
        lastActivityAt: now,
        mfaVerified: sessionData.mfaVerified === '1',
      },
    };
  }

  /**
   * Revoke single session
   */
  async revokeSession(
    sessionId: string,
    reason: string = 'manual'
  ): Promise<void> {
    // Get session token from database
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, revokedAt: null },
    });

    if (!session) {
      logger.warn('Session not found or already revoked', { sessionId });
      return;
    }

    // Remove from Redis
    await this.redis.del(`session:${session.sessionToken}`);
    await this.redis.zrem(
      `user:sessions:${session.userId}`,
      session.sessionToken
    );

    // Mark as revoked in database
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
        revocationReason: reason,
      },
    });

    logger.info('Session revoked', {
      sessionId,
      userId: session.userId,
      reason,
    });
  }

  /**
   * Revoke all sessions for user except the current one
   */
  async revokeAllSessions(
    userId: string,
    exceptSessionId?: string,
    reason: string = 'password_change'
  ): Promise<number> {
    const sessions = await this.getActiveSessions(userId);
    let revokedCount = 0;

    for (const session of sessions) {
      if (session.sessionId !== exceptSessionId) {
        await this.revokeSession(session.sessionId, reason);
        revokedCount++;
      }
    }

    logger.info('Bulk session revocation', {
      userId,
      revokedCount,
      exceptSessionId,
      reason,
    });

    return revokedCount;
  }

  /**
   * Get session by token
   */
  async getSessionByToken(sessionToken: string): Promise<SessionInfo | null> {
    const sessionData = await this.redis.hgetall(`session:${sessionToken}`);

    if (!sessionData || !sessionData.userId) {
      return null;
    }

    return {
      sessionId: sessionData.sessionId,
      userId: sessionData.userId,
      deviceName: sessionData.deviceName || 'Unknown Device',
      deviceType: sessionData.deviceType || 'desktop',
      location: this.formatLocation({
        city: sessionData.city,
        country: sessionData.country,
      }),
      ipAddress: sessionData.ipAddress,
      createdAt: parseInt(sessionData.createdAt),
      lastActivityAt: parseInt(sessionData.lastActivityAt),
      mfaVerified: sessionData.mfaVerified === '1',
    };
  }

  /**
   * Cleanup expired sessions (run periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const expiredSessions = await this.prisma.userSession.findMany({
      where: {
        expiresAt: { lt: new Date() },
        revokedAt: null,
      },
      select: { id: true, sessionToken: true, userId: true },
    });

    for (const session of expiredSessions) {
      await this.redis.del(`session:${session.sessionToken}`);
      await this.redis.zrem(
        `user:sessions:${session.userId}`,
        session.sessionToken
      );

      await this.prisma.userSession.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          revocationReason: 'expired',
        },
      });
    }

    if (expiredSessions.length > 0) {
      logger.info('Cleaned up expired sessions', {
        count: expiredSessions.length,
      });
    }

    return expiredSessions.length;
  }

  // Helper methods

  private generateSessionId(): string {
    return randomBytes(16).toString('hex');
  }

  private generateSessionToken(): string {
    return randomBytes(32).toString('hex');
  }

  private getLocationFromIP(ipAddress: string): {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  } {
    // Use geoip-lite for basic geolocation
    const geo = geoip.lookup(ipAddress);

    if (!geo) {
      return {};
    }

    return {
      country: geo.country,
      city: geo.city || undefined,
      latitude: geo.ll?.[0],
      longitude: geo.ll?.[1],
    };
  }

  private formatLocation(loc: { city?: string; country?: string }): string {
    if (loc.city && loc.country) {
      return `${loc.city}, ${loc.country}`;
    }
    if (loc.country) {
      return loc.country;
    }
    return 'Unknown Location';
  }
}
