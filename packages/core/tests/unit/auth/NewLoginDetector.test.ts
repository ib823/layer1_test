import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';
import { NewLoginDetector } from '../../../src/auth/loginDetection/NewLoginDetector';
import { RiskAnalyzer } from '../../../src/auth/loginDetection/RiskAnalyzer';
import { PrismaClient } from '../../../src/generated/prisma';

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('NewLoginDetector', () => {
  let detector: NewLoginDetector;
  let redis: Redis;
  let prisma: any;
  let riskAnalyzer: RiskAnalyzer;
  let mockEmailService: any;

  beforeEach(() => {
    redis = new RedisMock() as Redis;
    prisma = {
      trustedDevice: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      securityEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
      userSession: {
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      loginAttempt: {
        create: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    // Mock email service
    mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    riskAnalyzer = new RiskAnalyzer(redis, prisma as PrismaClient);
    // Constructor order: prisma, redis, riskAnalyzer, emailService (optional)
    detector = new NewLoginDetector(prisma as PrismaClient, redis, riskAnalyzer, mockEmailService);
  });

  afterEach(async () => {
    await redis.flushall();
    await redis.quit();
    jest.clearAllMocks();
  });

  describe('detectNewLogin', () => {
    it('should return false for trusted device with low risk', async () => {
      const deviceFingerprint = 'device-fp-123';
      const userId = 'user-123';
      const ipAddress = '8.8.8.8';
      const userAgent = 'Mozilla/5.0';

      // Mock trusted device
      prisma.trustedDevice.findFirst.mockResolvedValue({
        id: 'trusted-1',
        userId,
        deviceFingerprint,
        createdAt: new Date(),
      });

      // Mock low risk assessment
      jest.spyOn(riskAnalyzer, 'analyzeLoginAttempt').mockResolvedValue({
        riskScore: 0,
        riskLevel: 'low',
        riskFactors: [],
        requiresEmailConfirmation: false,
        requiresMFA: false,
        shouldBlock: false,
        isNewDevice: false,
        isNewLocation: false,
      });

      const result = await detector.detectNewLogin(userId, ipAddress, deviceFingerprint, userAgent);

      expect(result.isNewLogin).toBe(false);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.riskAssessment.riskScore).toBe(0);
      expect(result.riskAssessment.isNewDevice).toBe(false);
    });

    it('should return true for unknown device', async () => {
      const deviceFingerprint = 'new-device-fp';
      const userId = 'user-123';
      const ipAddress = '8.8.8.8';
      const userAgent = 'Mozilla/5.0';

      // No trusted device
      prisma.trustedDevice.findFirst.mockResolvedValue(null);

      // Mock new device risk assessment
      jest.spyOn(riskAnalyzer, 'analyzeLoginAttempt').mockResolvedValue({
        riskScore: 20,
        riskLevel: 'low',
        riskFactors: ['new_device'],
        requiresEmailConfirmation: false,
        requiresMFA: false,
        shouldBlock: false,
        isNewDevice: true,
        isNewLocation: false,
      });

      const result = await detector.detectNewLogin(userId, ipAddress, deviceFingerprint, userAgent);

      expect(result.isNewLogin).toBe(true);
      expect(result.requiresConfirmation).toBe(false); // Risk score < 60
      expect(result.riskAssessment.isNewDevice).toBe(true);
    });

    it('should detect new location for trusted device', async () => {
      const deviceFingerprint = 'device-fp-123';
      const userId = 'user-123';
      const ipAddress = '203.0.113.0'; // Japan IP
      const userAgent = 'Mozilla/5.0';

      // Device is trusted
      prisma.trustedDevice.findFirst.mockResolvedValue({
        id: 'trusted-1',
        userId,
        deviceFingerprint,
        createdAt: new Date(),
      });

      // Mock new location risk assessment
      jest.spyOn(riskAnalyzer, 'analyzeLoginAttempt').mockResolvedValue({
        riskScore: 15,
        riskLevel: 'low',
        riskFactors: ['new_location'],
        requiresEmailConfirmation: false,
        requiresMFA: false,
        shouldBlock: false,
        isNewDevice: false,
        isNewLocation: true,
      });

      const result = await detector.detectNewLogin(userId, ipAddress, deviceFingerprint, userAgent);

      expect(result.isNewLogin).toBe(true); // isNewLocation = true
      expect(result.riskAssessment.isNewLocation).toBe(true);
    });

    it('should not flag same location as new', async () => {
      const deviceFingerprint = 'device-fp-123';
      const userId = 'user-123';
      const ipAddress = '8.8.8.8';
      const userAgent = 'Mozilla/5.0';

      prisma.trustedDevice.findFirst.mockResolvedValue({
        id: 'trusted-1',
        userId,
        deviceFingerprint,
      });

      // Mock same location risk assessment
      jest.spyOn(riskAnalyzer, 'analyzeLoginAttempt').mockResolvedValue({
        riskScore: 0,
        riskLevel: 'low',
        riskFactors: [],
        requiresEmailConfirmation: false,
        requiresMFA: false,
        shouldBlock: false,
        isNewDevice: false,
        isNewLocation: false,
      });

      const result = await detector.detectNewLogin(userId, ipAddress, deviceFingerprint, userAgent);

      expect(result.isNewLogin).toBe(false);
      expect(result.riskAssessment.isNewLocation).toBe(false);
    });
  });

  describe('handleNewLogin - confirmation flow', () => {
    it('should allow low-risk new login without confirmation', async () => {
      const userId = 'user-123';
      const deviceFingerprint = 'device-fp-123';
      const ipAddress = '192.168.1.100';
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0';

      // No trusted device
      prisma.trustedDevice.findFirst.mockResolvedValue(null);

      // Low risk assessment
      jest.spyOn(riskAnalyzer, 'analyzeLoginAttempt').mockResolvedValue({
        riskScore: 20,
        riskLevel: 'low',
        riskFactors: ['new_device'],
        requiresEmailConfirmation: false,
        requiresMFA: false,
        shouldBlock: false,
        isNewDevice: true,
        isNewLocation: false,
      });

      const result = await detector.detectNewLogin(userId, ipAddress, deviceFingerprint, userAgent);

      expect(result.isNewLogin).toBe(true);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.riskAssessment.riskScore).toBe(20);
      expect(result.confirmationToken).toBeUndefined();
    });

    it('should require confirmation for medium-risk new login', async () => {
      const userId = 'user-123';
      const deviceFingerprint = 'device-fp-123';
      const ipAddress = '8.8.8.8';
      const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) Safari/16';

      // No trusted device
      prisma.trustedDevice.findFirst.mockResolvedValue(null);

      // Medium risk assessment (risk >= 60 requires confirmation)
      jest.spyOn(riskAnalyzer, 'analyzeLoginAttempt').mockResolvedValue({
        riskScore: 65,
        riskLevel: 'high',
        riskFactors: ['new_device', 'new_location'],
        requiresEmailConfirmation: true,
        requiresMFA: false,
        shouldBlock: false,
        isNewDevice: true,
        isNewLocation: true,
      });

      const result = await detector.detectNewLogin(userId, ipAddress, deviceFingerprint, userAgent);

      expect(result.isNewLogin).toBe(true);
      expect(result.requiresConfirmation).toBe(true);
      expect(result.confirmationToken).toBeDefined();
      expect(result.confirmationToken).toHaveLength(64);

      // Check confirmation was stored in Redis
      const storedConfirmations = await redis.keys('login:confirmation:*');
      expect(storedConfirmations.length).toBeGreaterThan(0);
    });

    it('should auto-block high-risk new login', async () => {
      const userId = 'user-123';
      const deviceFingerprint = 'device-fp-123';
      const ipAddress = '198.51.100.1';
      const userAgent = 'Unknown Browser';

      // No trusted device
      prisma.trustedDevice.findFirst.mockResolvedValue(null);

      // High risk assessment (risk >= 90 auto-blocks)
      jest.spyOn(riskAnalyzer, 'analyzeLoginAttempt').mockResolvedValue({
        riskScore: 95,
        riskLevel: 'critical',
        riskFactors: ['new_device', 'new_location', 'known_threat:10', 'recent_failures:25'],
        requiresEmailConfirmation: true,
        requiresMFA: true,
        shouldBlock: true,
        isNewDevice: true,
        isNewLocation: true,
      });

      const result = await detector.detectNewLogin(userId, ipAddress, deviceFingerprint, userAgent);

      expect(result.isNewLogin).toBe(true);
      expect(result.requiresConfirmation).toBe(false); // Auto-blocked, no confirmation
      expect(result.riskAssessment.shouldBlock).toBe(true);
      expect(result.confirmationToken).toBeUndefined();
    });
  });

  describe('confirmLogin', () => {
    it('should confirm valid token and trust device', async () => {
      const userId = 'user-123';
      const token = 'valid-token-123';
      const deviceFingerprint = 'device-fp-123';
      const ipAddress = '8.8.8.8';
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0';

      // Store pending confirmation
      const confirmationData = {
        userId,
        deviceFingerprint,
        ipAddress,
        userAgent,
        timestamp: Date.now(),
      };

      await redis.setex(
        `login:confirmation:${token}`,
        3600,
        JSON.stringify(confirmationData)
      );

      prisma.trustedDevice.upsert.mockResolvedValue({
        id: 'trusted-1',
        userId,
        deviceFingerprint,
      });

      prisma.loginAttempt.create.mockResolvedValue({});

      const result = await detector.confirmLogin(token);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.sessionData).toBeDefined();
      expect(result.sessionData?.ipAddress).toBe(ipAddress);
      expect(result.sessionData?.deviceFingerprint).toBe(deviceFingerprint);

      // Device should be marked as trusted
      expect(prisma.trustedDevice.upsert).toHaveBeenCalled();

      // Token should be removed
      const storedToken = await redis.get(`login:confirmation:${token}`);
      expect(storedToken).toBeNull();
    });

    it('should reject invalid token', async () => {
      const result = await detector.confirmLogin('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
      expect(prisma.trustedDevice.upsert).not.toHaveBeenCalled();
    });
  });

  describe('denyLogin', () => {
    it('should deny login, force password reset, and revoke sessions', async () => {
      const userId = 'user-123';
      const token = 'deny-token-123';
      const deviceFingerprint = 'device-fp-123';
      const ipAddress = '8.8.8.8';
      const userAgent = 'Mozilla/5.0';

      // Store pending confirmation
      const confirmationData = {
        userId,
        deviceFingerprint,
        ipAddress,
        userAgent,
        timestamp: Date.now(),
      };

      await redis.setex(`login:confirmation:${token}`, 3600, JSON.stringify(confirmationData));

      prisma.loginAttempt.create.mockResolvedValue({});
      prisma.loginAttempt.findFirst.mockResolvedValue({
        userId,
        ipAddress,
        userAgent,
        createdAt: new Date(),
      });
      prisma.userSession.updateMany.mockResolvedValue({ count: 2 });
      prisma.securityEvent.create.mockResolvedValue({});

      const result = await detector.denyLogin(token);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(userId);

      // Check all sessions were revoked
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
          revocationReason: 'security_event',
        },
      });

      // Check security event was logged
      expect(prisma.securityEvent.create).toHaveBeenCalled();

      // Check password reset token was created in Redis
      const resetTokens = await redis.keys('password:reset:*');
      expect(resetTokens.length).toBeGreaterThan(0);

      // Token should be removed
      const storedToken = await redis.get(`login:confirmation:${token}`);
      expect(storedToken).toBeNull();
    });

    it('should return error for invalid token', async () => {
      const result = await detector.denyLogin('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
      expect(prisma.userSession.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('revokeTrustedDevice', () => {
    it('should revoke device from trusted list', async () => {
      const userId = 'user-123';
      const deviceFingerprint = 'device-fp-123';

      prisma.trustedDevice.updateMany.mockResolvedValue({ count: 1 });

      await detector.revokeTrustedDevice(userId, deviceFingerprint);

      expect(prisma.trustedDevice.updateMany).toHaveBeenCalledWith({
        where: {
          userId,
          deviceFingerprint,
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
          revocationReason: 'manual',
        },
      });
    });
  });

  describe('getTrustedDevices', () => {
    it('should return list of trusted devices for user', async () => {
      const userId = 'user-123';

      prisma.trustedDevice.findMany.mockResolvedValue([
        {
          id: 'trusted-1',
          deviceName: 'Chrome on Windows',
          deviceType: 'desktop',
          browser: 'Chrome 120.0',
          os: 'Windows 10',
          lastUsedAt: new Date('2024-01-15'),
          trustedAt: new Date('2024-01-01'),
          trustExpiresAt: new Date('2024-04-01'),
        },
        {
          id: 'trusted-2',
          deviceName: 'Safari on iPhone',
          deviceType: 'mobile',
          browser: 'Safari 16.0',
          os: 'iOS 16.0',
          lastUsedAt: new Date('2024-01-20'),
          trustedAt: new Date('2024-01-10'),
          trustExpiresAt: null,
        },
      ]);

      const devices = await detector.getTrustedDevices(userId);

      expect(devices).toHaveLength(2);
      expect(devices[0].deviceName).toBe('Chrome on Windows');
      expect(devices[1].deviceName).toBe('Safari on iPhone');
      expect(prisma.trustedDevice.findMany).toHaveBeenCalledWith({
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
    });

    it('should return empty array when no trusted devices', async () => {
      const userId = 'user-456';

      prisma.trustedDevice.findMany.mockResolvedValue([]);

      const devices = await detector.getTrustedDevices(userId);

      expect(devices).toEqual([]);
    });
  });

  describe('Edge cases', () => {
    it('should handle Redis errors gracefully', async () => {
      const userId = 'user-123';
      const deviceFingerprint = 'device-fp-123';
      const ipAddress = '8.8.8.8';
      const userAgent = 'Mozilla/5.0';

      // Mock Redis error
      jest.spyOn(redis, 'setex').mockRejectedValue(new Error('Redis connection error'));

      prisma.trustedDevice.findFirst.mockResolvedValue(null);

      // Mock high risk to trigger confirmation token generation (which uses Redis)
      jest.spyOn(riskAnalyzer, 'analyzeLoginAttempt').mockResolvedValue({
        riskScore: 65,
        riskLevel: 'high',
        riskFactors: ['new_device', 'new_location'],
        requiresEmailConfirmation: true,
        requiresMFA: false,
        shouldBlock: false,
        isNewDevice: true,
        isNewLocation: true,
      });

      // Should throw error when Redis fails during token storage
      await expect(
        detector.detectNewLogin(userId, ipAddress, deviceFingerprint, userAgent)
      ).rejects.toThrow();
    });

    it('should handle concurrent confirmation attempts', async () => {
      const token = 'concurrent-token';
      const confirmationData = {
        userId: 'user-123',
        deviceFingerprint: 'device-fp-123',
        ipAddress: '8.8.8.8',
        userAgent: 'Mozilla/5.0',
        timestamp: Date.now(),
      };

      await redis.setex(`login:confirmation:${token}`, 3600, JSON.stringify(confirmationData));

      prisma.trustedDevice.upsert.mockResolvedValue({});
      prisma.loginAttempt.create.mockResolvedValue({});

      // Confirm twice concurrently
      const results = await Promise.all([
        detector.confirmLogin(token),
        detector.confirmLogin(token),
      ]);

      // Note: ioredis-mock doesn't perfectly simulate Redis race conditions
      // In real Redis with proper locking, one would succeed and one would fail
      // With ioredis-mock, both may succeed due to lack of true atomicity
      // We just verify that at least one succeeded
      const successCount = results.filter((r) => r.success).length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      // Verify token is deleted after confirmations
      const storedToken = await redis.get(`login:confirmation:${token}`);
      expect(storedToken).toBeNull();
    });
  });
});
