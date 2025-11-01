import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';
import { SessionManager, CreateSessionParams } from '../../../src/auth/session/SessionManager';
import { PrismaClient } from '../../../src/generated/prisma';
import { DeviceFingerprint } from '../../../src/auth/session/DeviceFingerprint';

// Mock dependencies
jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    silly: jest.fn(),
  },
}));

jest.mock('geoip-lite', () => ({
  lookup: jest.fn((ip: string) => {
    if (ip === '8.8.8.8') {
      return { country: 'US', city: 'Mountain View', ll: [37.386, -122.0838] };
    }
    return null;
  }),
}));

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let redis: Redis;
  let prisma: any;
  let deviceFingerprint: DeviceFingerprint;

  beforeEach(() => {
    // Create mock Redis
    redis = new RedisMock() as Redis;

    // Create mock Prisma with default resolved values
    prisma = {
      userSession: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    deviceFingerprint = new DeviceFingerprint();

    // Create SessionManager instance
    sessionManager = new SessionManager(redis, prisma as PrismaClient, 2, 86400);
  });

  afterEach(async () => {
    await redis.flushall();
    await redis.quit();
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session successfully', async () => {
      const params: CreateSessionParams = {
        userId: 'user-123',
        deviceFingerprint: 'device-fp-123',
        ipAddress: '8.8.8.8',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        mfaVerified: true,
        isTrustedDevice: false,
      };

      prisma.userSession.findMany.mockResolvedValue([]);
      prisma.userSession.create.mockResolvedValue({
        id: 'session-123',
        userId: params.userId,
        sessionId: 'mock-session-id',
        deviceFingerprint: params.deviceFingerprint,
        deviceName: 'Chrome on Windows',
        deviceType: 'desktop',
        ipAddress: params.ipAddress,
        location: 'Mountain View, US',
        mfaVerified: params.mfaVerified,
        isTrustedDevice: params.isTrustedDevice,
        createdAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        revokedReason: null,
      });

      const result = await sessionManager.createSession(params);

      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('sessionToken');
      expect(result.kicked).toBeUndefined();
      expect(prisma.userSession.create).toHaveBeenCalledTimes(1);
    });

    it('should kick oldest session when max sessions exceeded', async () => {
      const params: CreateSessionParams = {
        userId: 'user-123',
        deviceFingerprint: 'device-fp-new',
        ipAddress: '8.8.8.8',
        userAgent: 'Mozilla/5.0',
        mfaVerified: true,
      };

      // Set up 2 existing sessions in Redis
      const createdAt1 = Date.now() - 3600000; // 1 hour ago (older)
      const createdAt2 = Date.now() - 1800000; // 30 min ago (newer)

      await redis.hset('session:token-1', {
        sessionId: 'old-session-1',
        userId: 'user-123',
        deviceName: 'Chrome',
        deviceType: 'desktop',
        city: '',
        country: 'US',
        ipAddress: '1.1.1.1',
        createdAt: createdAt1.toString(),
        lastActivityAt: createdAt1.toString(),
        mfaVerified: '1',
      });

      await redis.hset('session:token-2', {
        sessionId: 'old-session-2',
        userId: 'user-123',
        deviceName: 'Firefox',
        deviceType: 'desktop',
        city: '',
        country: 'US',
        ipAddress: '2.2.2.2',
        createdAt: createdAt2.toString(),
        lastActivityAt: createdAt2.toString(),
        mfaVerified: '1',
      });

      await redis.zadd('user:sessions:user-123', createdAt1, 'token-1', createdAt2, 'token-2');

      prisma.userSession.findFirst.mockResolvedValue({ sessionId: 'old-session-1' });
      prisma.userSession.update.mockResolvedValue({});
      prisma.userSession.create.mockResolvedValue({
        sessionId: 'new-session',
        userId: params.userId,
      });

      const result = await sessionManager.createSession(params);

      expect(result.kicked).toHaveLength(1);
      expect(result.kicked).toContain('old-session-1'); // Oldest session should be kicked
      expect(prisma.userSession.update).toHaveBeenCalled();
    });

    it('should store session in both Redis and PostgreSQL', async () => {
      const params: CreateSessionParams = {
        userId: 'user-123',
        deviceFingerprint: 'device-fp-123',
        ipAddress: '8.8.8.8',
        userAgent: 'Mozilla/5.0',
        mfaVerified: true,
      };

      prisma.userSession.create.mockResolvedValue({
        sessionId: 'session-123',
        userId: params.userId,
      });

      const result = await sessionManager.createSession(params);

      // Check Redis storage - sessions are stored as hash sets using sessionToken
      const redisKey = `session:${result.sessionToken}`;
      const sessionData = await redis.hgetall(redisKey);
      expect(sessionData).toBeTruthy();
      expect(Object.keys(sessionData).length).toBeGreaterThan(0);

      expect(sessionData.userId).toBe(params.userId);
      expect(sessionData.mfaVerified).toBe('1'); // Redis stores as string

      // Check PostgreSQL storage
      expect(prisma.userSession.create).toHaveBeenCalled();
    });
  });

  describe('getSessionByToken', () => {
    it('should retrieve session from Redis if available', async () => {
      const sessionToken = 'token-123';
      const sessionData = {
        sessionId: 'session-123',
        userId: 'user-123',
        deviceName: 'Chrome',
        deviceType: 'desktop',
        city: 'Mountain View',
        country: 'US',
        ipAddress: '8.8.8.8',
        createdAt: Date.now().toString(),
        lastActivityAt: Date.now().toString(),
        mfaVerified: '1',
      };

      await redis.hset(`session:${sessionToken}`, sessionData);

      const result = await sessionManager.getSessionByToken(sessionToken);

      expect(result).toBeTruthy();
      expect(result?.userId).toBe('user-123');
      expect(result?.mfaVerified).toBe(true);
    });

    it('should return null for non-existent session', async () => {
      const result = await sessionManager.getSessionByToken('non-existent-token');
      expect(result).toBeNull();
    });
  });

  describe('validateSession', () => {
    it('should validate active session successfully', async () => {
      const sessionToken = 'token-123';
      const sessionData = {
        sessionId: 'session-123',
        userId: 'user-123',
        deviceName: 'Chrome',
        deviceType: 'desktop',
        city: 'Mountain View',
        country: 'US',
        ipAddress: '8.8.8.8',
        createdAt: Date.now().toString(),
        lastActivityAt: Date.now().toString(),
        mfaVerified: '1',
      };

      await redis.hset(`session:${sessionToken}`, sessionData);

      const result = await sessionManager.validateSession(sessionToken);

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.mfaVerified).toBe(true);
      expect(result.sessionInfo).toBeDefined();
      expect(result.sessionInfo?.userId).toBe('user-123');
    });

    it('should reject non-existent session', async () => {
      const result = await sessionManager.validateSession('non-existent-token');

      expect(result.valid).toBe(false);
      expect(result.userId).toBeUndefined();
    });

    it('should update last activity timestamp', async () => {
      const sessionToken = 'token-123';
      const oldTimestamp = Date.now() - 60000; // 1 minute ago
      const sessionData = {
        sessionId: 'session-123',
        userId: 'user-123',
        deviceName: 'Chrome',
        deviceType: 'desktop',
        city: '',
        country: '',
        ipAddress: '8.8.8.8',
        createdAt: oldTimestamp.toString(),
        lastActivityAt: oldTimestamp.toString(),
        mfaVerified: '1',
      };

      await redis.hset(`session:${sessionToken}`, sessionData);

      await sessionManager.validateSession(sessionToken);

      const updatedData = await redis.hgetall(`session:${sessionToken}`);
      const updatedActivity = parseInt(updatedData.lastActivityAt);

      expect(updatedActivity).toBeGreaterThan(oldTimestamp);
    });
  });

  describe('revokeSession', () => {
    it('should revoke session from both Redis and PostgreSQL', async () => {
      const sessionId = 'session-123';
      const sessionToken = 'token-123';
      const userId = 'user-123';

      // Mock database session
      prisma.userSession.findFirst.mockResolvedValue({
        id: sessionId,
        sessionToken,
        userId,
        revokedAt: null,
      });

      prisma.userSession.update.mockResolvedValue({});

      // Set up Redis data
      await redis.hset(`session:${sessionToken}`, {
        sessionId,
        userId,
        deviceName: 'Chrome',
      });
      await redis.zadd(`user:sessions:${userId}`, Date.now(), sessionToken);

      await sessionManager.revokeSession(sessionId, 'user_logout');

      // Check Redis deletion
      const redisData = await redis.hgetall(`session:${sessionToken}`);
      expect(Object.keys(redisData).length).toBe(0);

      // Check PostgreSQL update
      expect(prisma.userSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: {
          revokedAt: expect.any(Date),
          revocationReason: 'user_logout',
        },
      });
    });

    it('should handle revoke of non-existent session gracefully', async () => {
      prisma.userSession.findFirst.mockResolvedValue(null);

      await sessionManager.revokeSession('non-existent', 'test');

      // Should not throw error
      expect(prisma.userSession.update).not.toHaveBeenCalled();
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all sessions for a user', async () => {
      const userId = 'user-123';
      const sessionTokens = ['token-1', 'token-2'];

      // Set up active sessions in Redis
      for (let i = 0; i < 2; i++) {
        const sessionData = {
          sessionId: `session-${i + 1}`,
          userId,
          deviceName: 'Chrome',
          deviceType: 'desktop',
          city: '',
          country: '',
          ipAddress: `1.1.1.${i + 1}`,
          createdAt: Date.now().toString(),
          lastActivityAt: Date.now().toString(),
          mfaVerified: '1',
        };
        await redis.hset(`session:${sessionTokens[i]}`, sessionData);
      }

      await redis.zadd(`user:sessions:${userId}`, Date.now() - 1000, sessionTokens[0]);
      await redis.zadd(`user:sessions:${userId}`, Date.now(), sessionTokens[1]);

      // Mock database calls
      prisma.userSession.findFirst.mockResolvedValue({
        id: 'session-1',
        sessionToken: 'token-1',
        userId,
      });

      prisma.userSession.update.mockResolvedValue({});

      const count = await sessionManager.revokeAllSessions(userId, undefined, 'password_changed');

      expect(count).toBe(2);
    });

    it('should skip specified session when revoking', async () => {
      const userId = 'user-123';
      const sessionTokens = ['token-1', 'token-2', 'token-3'];

      // Set up active sessions in Redis
      for (let i = 0; i < 3; i++) {
        const sessionData = {
          sessionId: `session-${i + 1}`,
          userId,
          deviceName: 'Chrome',
          deviceType: 'desktop',
          city: '',
          country: '',
          ipAddress: `1.1.1.${i + 1}`,
          createdAt: Date.now().toString(),
          lastActivityAt: Date.now().toString(),
          mfaVerified: '1',
        };
        await redis.hset(`session:${sessionTokens[i]}`, sessionData);
        await redis.zadd(`user:sessions:${userId}`, Date.now() + i, sessionTokens[i]);
      }

      // Mock database calls for 2 sessions (skipping session-2)
      let callCount = 0;
      prisma.userSession.findFirst.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            id: 'session-1',
            sessionToken: 'token-1',
            userId,
          });
        }
        return Promise.resolve({
          id: 'session-3',
          sessionToken: 'token-3',
          userId,
        });
      });

      prisma.userSession.update.mockResolvedValue({});

      const count = await sessionManager.revokeAllSessions(userId, 'session-2', 'test');

      expect(count).toBe(2); // Should revoke all except session-2
    });
  });

  describe('getActiveSessions', () => {
    it('should return list of active sessions for user', async () => {
      const userId = 'user-123';
      const sessionTokens = ['token-1', 'token-2'];
      const sessions = [
        {
          sessionId: 'session-1',
          userId,
          deviceName: 'Chrome on Windows',
          deviceType: 'desktop',
          city: 'Mountain View',
          country: 'US',
          ipAddress: '1.1.1.1',
          createdAt: (Date.now() - 3600000).toString(),
          lastActivityAt: (Date.now() - 1800000).toString(),
          mfaVerified: '1',
        },
        {
          sessionId: 'session-2',
          userId,
          deviceName: 'Safari on iPhone',
          deviceType: 'mobile',
          city: 'San Francisco',
          country: 'US',
          ipAddress: '2.2.2.2',
          createdAt: (Date.now() - 7200000).toString(),
          lastActivityAt: (Date.now() - 3600000).toString(),
          mfaVerified: '1',
        },
      ];

      // Set up sessions in Redis with proper sorted set
      await redis.hset(`session:${sessionTokens[0]}`, sessions[0]);
      await redis.hset(`session:${sessionTokens[1]}`, sessions[1]);
      await redis.zadd(
        `user:sessions:${userId}`,
        Date.now() - 3600000,
        sessionTokens[0],
        Date.now() - 7200000,
        sessionTokens[1]
      );

      const result = await sessionManager.getActiveSessions(userId);

      expect(result).toHaveLength(2);
      // Sessions are ordered by creation time (ascending), so older session (Safari) comes first
      expect(result[0].deviceName).toBe('Safari on iPhone');
      expect(result[1].deviceName).toBe('Chrome on Windows');
    });

    it('should exclude revoked sessions', async () => {
      const userId = 'user-123';
      const sessionToken1 = 'token-1';
      const sessionToken2 = 'token-2';

      // Set up one active session and one that should be filtered out
      await redis.hset(`session:${sessionToken1}`, {
        sessionId: 'session-1',
        userId,
        deviceName: 'Chrome',
        deviceType: 'desktop',
        city: '',
        country: 'US',
        ipAddress: '1.1.1.1',
        createdAt: Date.now().toString(),
        lastActivityAt: Date.now().toString(),
        mfaVerified: '1',
      });

      // Add only one session to the sorted set (the other is "revoked" by not being in the set)
      await redis.zadd(`user:sessions:${userId}`, Date.now(), sessionToken1);

      const result = await sessionManager.getActiveSessions(userId);

      expect(result).toHaveLength(1);
      expect(result[0].sessionId).toBe('session-1');
    });
  });

  // Note: updateActivity is built into validateSession, tested above

  describe('cleanupExpiredSessions', () => {
    it('should remove expired sessions from Redis and database', async () => {
      const expiredSessionId = 'expired-123';
      const expiredSessionToken = 'expired-token-123';
      const userId = 'user-123';

      // Mock expired sessions from database
      prisma.userSession.findMany.mockResolvedValue([
        {
          id: expiredSessionId,
          sessionToken: expiredSessionToken,
          userId,
          expiresAt: new Date(Date.now() - 86400000),
        },
      ]);

      prisma.userSession.update.mockResolvedValue({});

      // Set up Redis data
      await redis.hset(`session:${expiredSessionToken}`, {
        sessionId: expiredSessionId,
        userId,
        deviceName: 'Chrome',
      });
      await redis.zadd(`user:sessions:${userId}`, Date.now() - 86400000, expiredSessionToken);

      const count = await sessionManager.cleanupExpiredSessions();

      expect(count).toBe(1);

      // Check session removed from Redis
      const sessionData = await redis.hgetall(`session:${expiredSessionToken}`);
      expect(Object.keys(sessionData).length).toBe(0);

      // Check marked as revoked in database
      expect(prisma.userSession.update).toHaveBeenCalledWith({
        where: { id: expiredSessionId },
        data: {
          revokedAt: expect.any(Date),
          revocationReason: 'expired',
        },
      });
    });

    it('should return 0 when no sessions are expired', async () => {
      prisma.userSession.findMany.mockResolvedValue([]);

      const count = await sessionManager.cleanupExpiredSessions();

      expect(count).toBe(0);
      expect(prisma.userSession.update).not.toHaveBeenCalled();
    });
  });

  describe('Session limits', () => {
    it('should enforce max sessions limit of 2', async () => {
      const userId = 'user-123';

      const params: CreateSessionParams = {
        userId,
        deviceFingerprint: 'device-fp-3',
        ipAddress: '8.8.8.8',
        userAgent: 'Mozilla/5.0',
        mfaVerified: true,
      };

      // Set up 2 existing sessions in Redis
      const createdAt1 = Date.now() - 7200000; // 2 hours ago (oldest)
      const createdAt2 = Date.now() - 3600000; // 1 hour ago

      await redis.hset('session:token-session-1', {
        sessionId: 'session-1',
        userId,
        deviceName: 'Chrome',
        deviceType: 'desktop',
        city: '',
        country: 'US',
        ipAddress: '1.1.1.1',
        createdAt: createdAt1.toString(),
        lastActivityAt: (Date.now() - 3600000).toString(),
        mfaVerified: '1',
      });

      await redis.hset('session:token-session-2', {
        sessionId: 'session-2',
        userId,
        deviceName: 'Firefox',
        deviceType: 'desktop',
        city: '',
        country: 'US',
        ipAddress: '2.2.2.2',
        createdAt: createdAt2.toString(),
        lastActivityAt: (Date.now() - 1800000).toString(),
        mfaVerified: '1',
      });

      await redis.zadd(
        `user:sessions:${userId}`,
        createdAt1,
        'token-session-1',
        createdAt2,
        'token-session-2'
      );

      prisma.userSession.findFirst.mockResolvedValue({ sessionId: 'session-1' });
      prisma.userSession.update.mockResolvedValue({});
      prisma.userSession.create.mockResolvedValue({
        sessionId: 'session-3',
        userId,
      });

      const result = await sessionManager.createSession(params);

      // Should kick session-1 (oldest)
      expect(result.kicked).toContain('session-1');
      expect(result.kicked).toHaveLength(1);
    });
  });
});
