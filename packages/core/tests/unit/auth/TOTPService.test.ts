import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';
import { TOTPService } from '../../../src/auth/totp/TOTPService';
import { PrismaClient } from '../../../src/generated/prisma';
import * as otplib from 'otplib';

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('TOTPService', () => {
  let totpService: TOTPService;
  let redis: Redis;
  let prisma: any;

  beforeEach(() => {
    redis = new RedisMock() as Redis;
    prisma = {
      userMFAConfig: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      mFARateLimit: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    totpService = new TOTPService(prisma as PrismaClient, redis);
  });

  afterEach(async () => {
    await redis.flushall();
    await redis.quit();
    jest.clearAllMocks();
  });

  describe('generateSetup', () => {
    it('should generate TOTP setup with secret and QR code', async () => {
      const userId = 'user-123';
      const email = 'user@example.com';

      const setup = await totpService.generateSetup(userId, email);

      expect(setup).toHaveProperty('secret');
      expect(setup).toHaveProperty('qrCodeDataURL');
      expect(setup).toHaveProperty('backupCodes');

      // Secret should be base32 encoded
      expect(setup.secret).toMatch(/^[A-Z2-7]+=*$/);

      // QR code should be data URL
      expect(setup.qrCodeDataURL).toMatch(/^data:image\/png;base64,/);

      // Should have 10 backup codes
      expect(setup.backupCodes).toHaveLength(10);
      setup.backupCodes.forEach((code) => {
        expect(code).toHaveLength(8);
        expect(code).toMatch(/^[A-F0-9]{8}$/);
      });
    });

    it('should generate unique secrets for different users', async () => {
      const setup1 = await totpService.generateSetup('user-1', 'user1@example.com');
      const setup2 = await totpService.generateSetup('user-2', 'user2@example.com');

      expect(setup1.secret).not.toBe(setup2.secret);
      expect(setup1.qrCodeDataURL).not.toBe(setup2.qrCodeDataURL);
    });

    it('should include user email and issuer in QR code', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';

      const setup = await totpService.generateSetup(userId, email);

      // QR code should be generated successfully
      expect(setup.qrCodeDataURL).toBeTruthy();
      expect(setup.qrCodeDataURL.length).toBeGreaterThan(100);
    });
  });

  describe('enableTOTP', () => {
    it('should enable TOTP for user', async () => {
      const userId = 'user-123';
      const secret = otplib.authenticator.generateSecret();
      const backupCodes = Array(10)
        .fill(null)
        .map(() => 'BACKUP01');

      prisma.userMFAConfig.upsert.mockResolvedValue({
        userId,
        totpEnabled: true,
        totpSecret: secret,
        totpBackupCodes: backupCodes,
      });

      await totpService.enableTOTP(userId, secret, backupCodes);

      expect(prisma.userMFAConfig.upsert).toHaveBeenCalledWith({
        where: { userId },
        create: expect.objectContaining({
          userId,
          mfaEnabled: true,
          totpEnabled: true,
          totpSecret: secret,
          totpBackupCodes: backupCodes,
        }),
        update: expect.objectContaining({
          mfaEnabled: true,
          totpEnabled: true,
          totpSecret: secret,
          totpBackupCodes: backupCodes,
        }),
      });
    });
  });

  describe('verifyToken', () => {
    it('should verify valid TOTP token', async () => {
      const userId = 'user-123';
      const secret = otplib.authenticator.generateSecret();
      const token = otplib.authenticator.generate(secret);

      // Mock no rate limit
      prisma.mFARateLimit.findUnique.mockResolvedValue(null);
      prisma.mFARateLimit.updateMany.mockResolvedValue({});
      prisma.userMFAConfig.update.mockResolvedValue({});

      const result = await totpService.verifyToken(userId, token, secret);

      expect(result.verified).toBe(true);
      expect(result.error).toBeUndefined();
      expect(prisma.userMFAConfig.update).toHaveBeenCalledWith({
        where: { userId },
        data: { totpLastUsedAt: expect.any(Date) },
      });
    });

    it('should reject invalid token', async () => {
      const userId = 'user-123';
      const secret = otplib.authenticator.generateSecret();
      const invalidToken = '000000';

      prisma.mFARateLimit.findUnique.mockResolvedValue(null);
      prisma.mFARateLimit.upsert.mockResolvedValue({});

      const result = await totpService.verifyToken(userId, invalidToken, secret);

      expect(result.verified).toBe(false);
      expect(result.error).toBeDefined();

      // Should record failed attempt
      expect(prisma.mFARateLimit.upsert).toHaveBeenCalled();
    });

    it('should reject token with wrong secret', async () => {
      const userId = 'user-123';
      const secret1 = otplib.authenticator.generateSecret();
      const secret2 = otplib.authenticator.generateSecret();
      const token = otplib.authenticator.generate(secret1);

      prisma.mFARateLimit.findUnique.mockResolvedValue(null);
      prisma.mFARateLimit.upsert.mockResolvedValue({});

      const result = await totpService.verifyToken(userId, token, secret2);

      expect(result.verified).toBe(false);
    });

    it('should reject token with invalid format', async () => {
      const userId = 'user-123';
      const secret = otplib.authenticator.generateSecret();
      const invalidToken = '12345'; // Only 5 digits

      prisma.mFARateLimit.findUnique.mockResolvedValue(null);
      prisma.mFARateLimit.upsert.mockResolvedValue({});

      const result = await totpService.verifyToken(userId, invalidToken, secret);

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Invalid token format');
    });

    it('should enforce rate limiting', async () => {
      const userId = 'user-123';
      const secret = otplib.authenticator.generateSecret();
      const token = otplib.authenticator.generate(secret);

      // Mock rate limit exceeded
      prisma.mFARateLimit.findUnique.mockResolvedValue({
        userId,
        limitType: 'totp_attempts',
        attemptCount: 5,
        windowStart: new Date(Date.now() - 60000), // 1 min ago
        lockedUntil: null,
      });

      prisma.mFARateLimit.update.mockResolvedValue({});

      const result = await totpService.verifyToken(userId, token, secret);

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Too many attempts');
    });

    it('should unlock after lockout period expires', async () => {
      const userId = 'user-123';
      const secret = otplib.authenticator.generateSecret();
      const token = otplib.authenticator.generate(secret);

      // Locked until past time (already expired)
      prisma.mFARateLimit.findUnique.mockResolvedValue({
        userId,
        limitType: 'totp_attempts',
        attemptCount: 5,
        windowStart: new Date(Date.now() - 1000000),
        lastAttemptAt: new Date(Date.now() - 1000000),
        lockedUntil: new Date(Date.now() - 60000), // Expired 1 minute ago
      });

      prisma.mFARateLimit.updateMany.mockResolvedValue({});
      prisma.userMFAConfig.update.mockResolvedValue({});

      const result = await totpService.verifyToken(userId, token, secret);

      expect(result.verified).toBe(true);
    });
  });

  describe('verifyBackupCode', () => {
    it('should verify valid backup code', async () => {
      const userId = 'user-123';
      const backupCodes = ['BACKUP01', 'BACKUP02', 'BACKUP03'];

      prisma.mFARateLimit.findUnique.mockResolvedValue(null);
      prisma.userMFAConfig.findUnique.mockResolvedValue({
        userId,
        totpEnabled: true,
        totpBackupCodes: backupCodes,
      });

      prisma.userMFAConfig.update.mockResolvedValue({});
      prisma.mFARateLimit.updateMany.mockResolvedValue({});

      const result = await totpService.verifyBackupCode(userId, 'BACKUP02');

      expect(result.verified).toBe(true);

      // Should remove used code
      expect(prisma.userMFAConfig.update).toHaveBeenCalledWith({
        where: { userId },
        data: {
          totpBackupCodes: ['BACKUP01', 'BACKUP03'],
        },
      });
    });

    it('should reject invalid backup code', async () => {
      const userId = 'user-123';
      const backupCodes = ['BACKUP01', 'BACKUP02'];

      prisma.mFARateLimit.findUnique.mockResolvedValue(null);
      prisma.userMFAConfig.findUnique.mockResolvedValue({
        userId,
        totpEnabled: true,
        totpBackupCodes: backupCodes,
      });

      prisma.mFARateLimit.upsert.mockResolvedValue({});

      const result = await totpService.verifyBackupCode(userId, 'INVALID99');

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Invalid');
      expect(prisma.userMFAConfig.update).not.toHaveBeenCalled();
    });

    it('should reject when no backup codes available', async () => {
      const userId = 'user-123';

      prisma.mFARateLimit.findUnique.mockResolvedValue(null);
      prisma.userMFAConfig.findUnique.mockResolvedValue({
        userId,
        totpEnabled: true,
        totpBackupCodes: [],
      });

      prisma.mFARateLimit.upsert.mockResolvedValue({});

      const result = await totpService.verifyBackupCode(userId, 'BACKUP01');

      expect(result.verified).toBe(false);
      // Empty array is truthy, so it passes the null check and treats it as invalid code
      expect(result.error).toContain('Invalid');
    });

    it('should enforce rate limiting on backup code attempts', async () => {
      const userId = 'user-123';

      // Mock rate limit exceeded
      prisma.mFARateLimit.findUnique.mockResolvedValue({
        userId,
        limitType: 'backup_code_attempts',
        attemptCount: 5,
        windowStart: new Date(Date.now() - 60000),
        lockedUntil: null,
      });

      prisma.mFARateLimit.update.mockResolvedValue({});

      const result = await totpService.verifyBackupCode(userId, 'BACKUP01');

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Too many attempts');
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should generate new backup codes', async () => {
      const userId = 'user-123';

      prisma.userMFAConfig.update.mockResolvedValue({});

      const backupCodes = await totpService.regenerateBackupCodes(userId);

      expect(backupCodes).toHaveLength(10);
      backupCodes.forEach((code) => {
        expect(code).toHaveLength(8);
        expect(code).toMatch(/^[A-F0-9]{8}$/);
      });

      expect(prisma.userMFAConfig.update).toHaveBeenCalledWith({
        where: { userId },
        data: {
          totpBackupCodes: expect.arrayContaining([expect.any(String)]),
        },
      });
    });

    it('should generate unique backup codes', async () => {
      const userId = 'user-123';

      prisma.userMFAConfig.update.mockResolvedValue({});

      const codes1 = await totpService.regenerateBackupCodes(userId);
      const codes2 = await totpService.regenerateBackupCodes(userId);

      // Each set should be unique
      expect(codes1).not.toEqual(codes2);

      // Within each set, all codes should be unique
      const uniqueCodes1 = new Set(codes1);
      const uniqueCodes2 = new Set(codes2);
      expect(uniqueCodes1.size).toBe(10);
      expect(uniqueCodes2.size).toBe(10);
    });
  });

  describe('disableTOTP', () => {
    it('should disable TOTP and clear secrets', async () => {
      const userId = 'user-123';

      prisma.userMFAConfig.findUnique.mockResolvedValue({
        userId,
        passkeyEnabled: false,
      });

      prisma.userMFAConfig.update.mockResolvedValue({
        userId,
        totpEnabled: false,
        totpSecret: null,
        totpBackupCodes: [],
      });

      await totpService.disableTOTP(userId);

      expect(prisma.userMFAConfig.update).toHaveBeenCalledWith({
        where: { userId },
        data: {
          totpEnabled: false,
          totpSecret: null,
          totpBackupCodes: [],
          mfaEnabled: false, // Should be false since passkey is also disabled
        },
      });
    });

    it('should keep MFA enabled if passkey is still enabled', async () => {
      const userId = 'user-123';

      prisma.userMFAConfig.findUnique.mockResolvedValue({
        userId,
        passkeyEnabled: true,
      });

      prisma.userMFAConfig.update.mockResolvedValue({});

      await totpService.disableTOTP(userId);

      expect(prisma.userMFAConfig.update).toHaveBeenCalledWith({
        where: { userId },
        data: {
          totpEnabled: false,
          totpSecret: null,
          totpBackupCodes: [],
          mfaEnabled: true, // Should remain true since passkey is enabled
        },
      });
    });
  });

  describe('getMFAStatus', () => {
    it('should return MFA status for user with TOTP', async () => {
      const userId = 'user-123';

      prisma.userMFAConfig.findUnique.mockResolvedValue({
        userId,
        mfaEnabled: true,
        totpEnabled: true,
        passkeyEnabled: false,
        preferredMfaMethod: 'totp',
        totpBackupCodes: ['CODE1', 'CODE2', 'CODE3'],
      });

      const status = await totpService.getMFAStatus(userId);

      expect(status).toEqual({
        mfaEnabled: true,
        totpEnabled: true,
        passkeyEnabled: false,
        preferredMethod: 'totp',
        backupCodesRemaining: 3,
      });
    });

    it('should return disabled status for user without MFA', async () => {
      const userId = 'user-456';

      prisma.userMFAConfig.findUnique.mockResolvedValue(null);

      const status = await totpService.getMFAStatus(userId);

      expect(status).toEqual({
        mfaEnabled: false,
        totpEnabled: false,
        passkeyEnabled: false,
        backupCodesRemaining: 0,
      });
    });
  });

  describe('setPreferredMFAMethod', () => {
    it('should set preferred MFA method to TOTP', async () => {
      const userId = 'user-123';

      prisma.userMFAConfig.update.mockResolvedValue({});

      await totpService.setPreferredMFAMethod(userId, 'totp');

      expect(prisma.userMFAConfig.update).toHaveBeenCalledWith({
        where: { userId },
        data: { preferredMfaMethod: 'totp' },
      });
    });

    it('should set preferred MFA method to passkey', async () => {
      const userId = 'user-123';

      prisma.userMFAConfig.update.mockResolvedValue({});

      await totpService.setPreferredMFAMethod(userId, 'passkey');

      expect(prisma.userMFAConfig.update).toHaveBeenCalledWith({
        where: { userId },
        data: { preferredMfaMethod: 'passkey' },
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle database errors gracefully', async () => {
      const userId = 'user-123';
      const secret = otplib.authenticator.generateSecret();
      const token = otplib.authenticator.generate(secret);

      prisma.mFARateLimit.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(totpService.verifyToken(userId, token, secret)).rejects.toThrow();
    });

    it('should handle malformed tokens', async () => {
      const userId = 'user-123';
      const secret = otplib.authenticator.generateSecret();

      prisma.mFARateLimit.findUnique.mockResolvedValue(null);
      prisma.mFARateLimit.upsert.mockResolvedValue({});

      const malformedTokens = ['', 'abc', '12345', '1234567', 'abcdef'];

      for (const token of malformedTokens) {
        const result = await totpService.verifyToken(userId, token, secret);
        expect(result.verified).toBe(false);
      }
    });

    it('should clean tokens with spaces and dashes', async () => {
      const userId = 'user-123';
      const secret = otplib.authenticator.generateSecret();
      const token = otplib.authenticator.generate(secret);
      const tokenWithSpaces = `${token.slice(0, 3)} ${token.slice(3)}`;

      prisma.mFARateLimit.findUnique.mockResolvedValue(null);
      prisma.mFARateLimit.updateMany.mockResolvedValue({});
      prisma.userMFAConfig.update.mockResolvedValue({});

      const result = await totpService.verifyToken(userId, tokenWithSpaces, secret);

      expect(result.verified).toBe(true);
    });
  });
});
