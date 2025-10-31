import { PasskeyService } from '../../../src/auth/passkey/PasskeyService';
import { PrismaClient } from '../../../src/generated/prisma';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';

jest.mock('@simplewebauthn/server');
jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockedGenerateRegistrationOptions = generateRegistrationOptions as jest.MockedFunction<
  typeof generateRegistrationOptions
>;
const mockedVerifyRegistrationResponse = verifyRegistrationResponse as jest.MockedFunction<
  typeof verifyRegistrationResponse
>;
const mockedGenerateAuthenticationOptions = generateAuthenticationOptions as jest.MockedFunction<
  typeof generateAuthenticationOptions
>;
const mockedVerifyAuthenticationResponse = verifyAuthenticationResponse as jest.MockedFunction<
  typeof verifyAuthenticationResponse
>;

describe('PasskeyService', () => {
  let passkeyService: PasskeyService;
  let prisma: any;
  let redis: Redis;

  const rpName = 'Prism';
  const rpID = 'localhost';
  const origin = 'http://localhost:3001';

  beforeEach(() => {
    redis = new RedisMock() as Redis;

    prisma = {
      userMFAConfig: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      webAuthnCredential: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    // Constructor: (prisma, redis, rpId, rpName, origin)
    passkeyService = new PasskeyService(prisma as PrismaClient, redis, rpID, rpName, origin);
  });

  afterEach(async () => {
    await redis.quit();
    jest.clearAllMocks();
  });

  describe('generateRegistrationOptions', () => {
    it('should generate registration options for new user', async () => {
      const userId = 'user-123';
      const userEmail = 'user@example.com';
      const userName = 'User Name';

      prisma.webAuthnCredential.findMany.mockResolvedValue([]);

      mockedGenerateRegistrationOptions.mockReturnValue({
        challenge: 'mock-challenge-base64',
        rp: {
          name: rpName,
          id: rpID,
        },
        user: {
          id: Buffer.from(userId).toString('base64'),
          name: userEmail,
          displayName: userName,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        timeout: 60000,
        attestation: 'none',
        excludeCredentials: [],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      } as any);

      // generateRegistrationOptions signature: (userId, userEmail, userName)
      const result = await passkeyService.generateRegistrationOptions(userId, userEmail, userName);

      expect(result).toHaveProperty('challenge');
      expect(result).toHaveProperty('options');
      expect(result.options.rp.name).toBe(rpName);
      expect(result.options.rp.id).toBe(rpID);
      expect(result.options.user.name).toBe(userEmail);
      expect(mockedGenerateRegistrationOptions).toHaveBeenCalled();
    });

    it('should exclude existing credentials', async () => {
      const userId = 'user-123';
      const userEmail = 'user@example.com';
      const userName = 'User Name';

      const existingCredentials = [
        {
          credentialId: Buffer.from('credential-1'),
          userId,
          credentialPublicKey: Buffer.from('public-key-1'),
          counter: 0,
          transports: ['internal'],
          createdAt: new Date(),
        },
        {
          credentialId: Buffer.from('credential-2'),
          userId,
          credentialPublicKey: Buffer.from('public-key-2'),
          counter: 0,
          transports: ['usb', 'nfc'],
          createdAt: new Date(),
        },
      ];

      prisma.webAuthnCredential.findMany.mockResolvedValue(existingCredentials);

      mockedGenerateRegistrationOptions.mockReturnValue({
        challenge: 'mock-challenge',
        excludeCredentials: [
          { id: 'credential-1', type: 'public-key', transports: ['internal'] },
          { id: 'credential-2', type: 'public-key', transports: ['usb', 'nfc'] },
        ],
      } as any);

      const result = await passkeyService.generateRegistrationOptions(userId, userEmail, userName);

      expect(result.options.excludeCredentials).toHaveLength(2);
      expect(mockedGenerateRegistrationOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          excludeCredentials: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(Buffer),
            }),
          ]),
        })
      );
    });

    it('should support both platform and cross-platform authenticators', async () => {
      const userId = 'user-123';
      const userEmail = 'user@example.com';
      const userName = 'User Name';

      prisma.webAuthnCredential.findMany.mockResolvedValue([]);

      mockedGenerateRegistrationOptions.mockReturnValue({
        challenge: 'mock-challenge',
        authenticatorSelection: {
          authenticatorAttachment: 'cross-platform',
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      } as any);

      const result = await passkeyService.generateRegistrationOptions(
        userId,
        userEmail,
        userName
      );

      expect(result).toHaveProperty('options');
      expect(mockedGenerateRegistrationOptions).toHaveBeenCalled();
    });
  });

  describe('verifyRegistration', () => {
    it('should verify valid registration and store credential', async () => {
      const userId = 'user-123';
      const deviceName = 'My iPhone';

      // Set up Redis challenge
      await redis.set(`passkey:challenge:registration:${userId}`, 'mock-challenge');

      const mockResponse = {
        id: 'credential-id-123',
        rawId: 'credential-id-123',
        response: {
          clientDataJSON: 'mock-client-data',
          attestationObject: 'mock-attestation',
          transports: ['internal'],
        },
        type: 'public-key',
      };

      const mockVerification = {
        verified: true,
        registrationInfo: {
          credential: {
            id: Buffer.from('credential-id-123'),
            publicKey: Buffer.from('public-key-bytes'),
            counter: 0,
          },
          credentialDeviceType: 'singleDevice',
          credentialBackedUp: false,
          aaguid: 'aaguid-123',
          fmt: 'none',
        },
      };

      mockedVerifyRegistrationResponse.mockResolvedValue(mockVerification as any);

      prisma.webAuthnCredential.create.mockResolvedValue({
        id: 'db-id-123',
        userId,
        credentialId: Buffer.from('credential-id-123').toString('base64'),
        credentialPublicKey: Buffer.from('public-key-bytes').toString('base64'),
        counter: 0,
        deviceName,
        transports: ['internal'],
        createdAt: new Date(),
      });

      prisma.userMFAConfig.upsert.mockResolvedValue({});

      // verifyRegistration signature: (userId, response, deviceName?)
      const result = await passkeyService.verifyRegistration(
        userId,
        mockResponse as any,
        deviceName
      );

      expect(result.verified).toBe(true);
      expect(result.credentialId).toBeDefined();
      expect(prisma.webAuthnCredential.create).toHaveBeenCalled();
      expect(prisma.userMFAConfig.upsert).toHaveBeenCalledWith({
        where: { userId },
        create: expect.objectContaining({
          userId,
          passkeyEnabled: true,
        }),
        update: expect.objectContaining({
          passkeyEnabled: true,
        }),
      });
    });

    it('should reject invalid registration', async () => {
      const userId = 'user-123';

      // Set up Redis challenge
      await redis.set(`passkey:challenge:registration:${userId}`, 'mock-challenge');

      const mockResponse = {
        id: 'credential-id-123',
        rawId: 'credential-id-123',
        response: {
          clientDataJSON: 'invalid-data',
          attestationObject: 'invalid-attestation',
        },
        type: 'public-key',
      };

      mockedVerifyRegistrationResponse.mockResolvedValue({
        verified: false,
      } as any);

      const result = await passkeyService.verifyRegistration(
        userId,
        mockResponse as any,
        'Device'
      );

      expect(result.verified).toBe(false);
      expect(prisma.webAuthnCredential.create).not.toHaveBeenCalled();
    });

    it('should handle verification errors', async () => {
      const userId = 'user-123';

      // Set up Redis challenge
      await redis.set(`passkey:challenge:registration:${userId}`, 'mock-challenge');

      const mockResponse = {
        id: 'credential-id-123',
        type: 'public-key',
        response: {
          clientDataJSON: 'data',
          attestationObject: 'attestation',
        },
      };

      mockedVerifyRegistrationResponse.mockRejectedValue(new Error('Verification failed'));

      const result = await passkeyService.verifyRegistration(
        userId,
        mockResponse as any,
        'Device'
      );

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Verification');
    });
  });

  describe('generateAuthenticationOptions', () => {
    it('should generate authentication options with user credentials', async () => {
      const userId = 'user-123';

      const userCredentials = [
        {
          credentialId: 'cred-1-base64',
          userId,
          credentialPublicKey: Buffer.from('key-1').toString('base64'),
          counter: 5,
          transports: ['internal'],
          createdAt: new Date(),
        },
        {
          credentialId: 'cred-2-base64',
          userId,
          credentialPublicKey: Buffer.from('key-2').toString('base64'),
          counter: 10,
          transports: ['usb', 'nfc'],
          createdAt: new Date(),
        },
      ];

      prisma.webAuthnCredential.findMany.mockResolvedValue(userCredentials);

      mockedGenerateAuthenticationOptions.mockReturnValue({
        challenge: 'auth-challenge-123',
        allowCredentials: [
          { id: 'cred-1', type: 'public-key', transports: ['internal'] },
          { id: 'cred-2', type: 'public-key', transports: ['usb', 'nfc'] },
        ],
        timeout: 60000,
        userVerification: 'preferred',
        rpId: rpID,
      } as any);

      const result = await passkeyService.generateAuthenticationOptions(userId);

      expect(result).toHaveProperty('challenge');
      expect(result).toHaveProperty('options');
      expect(result.options.allowCredentials).toHaveLength(2);
      expect(mockedGenerateAuthenticationOptions).toHaveBeenCalled();
    });

    it('should return empty credentials for user without passkeys', async () => {
      const userId = 'user-456';

      prisma.webAuthnCredential.findMany.mockResolvedValue([]);

      mockedGenerateAuthenticationOptions.mockReturnValue({
        challenge: 'auth-challenge-123',
        allowCredentials: [],
        timeout: 60000,
      } as any);

      const result = await passkeyService.generateAuthenticationOptions(userId);

      expect(result.options.allowCredentials).toHaveLength(0);
    });
  });

  describe('verifyAuthentication', () => {
    it('should verify valid authentication', async () => {
      const userId = 'user-123';
      const credentialId = 'cred-id-123';

      // Store challenge in Redis
      await redis.set(`passkey:challenge:auth:${credentialId}`, 'auth-challenge');

      const mockAuthResponse = {
        id: credentialId,
        rawId: credentialId,
        response: {
          clientDataJSON: 'mock-client-data',
          authenticatorData: 'mock-auth-data',
          signature: 'mock-signature',
        },
        type: 'public-key',
      };

      const storedCredential = {
        id: 'db-id',
        credentialId: credentialId,
        userId,
        credentialPublicKey: Buffer.from('public-key').toString('base64'),
        counter: 10,
        transports: ['internal'],
        createdAt: new Date(),
      };

      prisma.webAuthnCredential.findUnique.mockResolvedValue(storedCredential);

      mockedVerifyAuthenticationResponse.mockResolvedValue({
        verified: true,
        authenticationInfo: {
          newCounter: 11,
          credentialID: Buffer.from(credentialId),
        },
      } as any);

      prisma.webAuthnCredential.update.mockResolvedValue({
        ...storedCredential,
        counter: 11,
        lastUsedAt: new Date(),
      });

      // verifyAuthentication signature: (response, userId?)
      const result = await passkeyService.verifyAuthentication(
        mockAuthResponse as any,
        userId
      );

      expect(result.verified).toBe(true);
      expect(result.credentialId).toBe(credentialId);

      // Counter should be updated
      expect(prisma.webAuthnCredential.update).toHaveBeenCalledWith({
        where: {
          credentialId,
        },
        data: expect.objectContaining({
          counter: expect.any(BigInt),
          lastUsedAt: expect.any(Date),
        }),
      });
    });

    it('should reject authentication for non-existent credential', async () => {
      const userId = 'user-123';
      const credentialId = 'unknown-cred';

      const mockAuthResponse = {
        id: credentialId,
        rawId: credentialId,
        type: 'public-key',
      };

      prisma.webAuthnCredential.findUnique.mockResolvedValue(null);

      const result = await passkeyService.verifyAuthentication(
        mockAuthResponse as any,
        userId
      );

      expect(result.verified).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should reject invalid authentication', async () => {
      const userId = 'user-123';
      const credentialId = 'cred-id-123';

      // Store challenge in Redis
      await redis.set(`passkey:challenge:auth:${credentialId}`, 'auth-challenge');

      const mockAuthResponse = {
        id: credentialId,
        rawId: credentialId,
        response: {
          clientDataJSON: 'data',
          authenticatorData: 'data',
          signature: 'sig',
        },
        type: 'public-key',
      };

      const storedCredential = {
        credentialId: credentialId,
        userId,
        credentialPublicKey: Buffer.from('public-key').toString('base64'),
        counter: 10,
        transports: ['internal'],
      };

      prisma.webAuthnCredential.findUnique.mockResolvedValue(storedCredential);

      mockedVerifyAuthenticationResponse.mockResolvedValue({
        verified: false,
      } as any);

      const result = await passkeyService.verifyAuthentication(
        mockAuthResponse as any,
        userId
      );

      expect(result.verified).toBe(false);
      expect(prisma.webAuthnCredential.update).not.toHaveBeenCalled();
    });

  });

  describe('getUserPasskeys', () => {
    it('should return list of user passkeys', async () => {
      const userId = 'user-123';

      const credentials = [
        {
          id: 'db-id-1',
          deviceName: 'iPhone 15 Pro',
          deviceType: 'singleDevice',
          createdAt: new Date('2024-01-01'),
          lastUsedAt: new Date('2024-01-20'),
        },
        {
          id: 'db-id-2',
          deviceName: 'YubiKey 5',
          deviceType: 'multiDevice',
          createdAt: new Date('2024-01-10'),
          lastUsedAt: new Date('2024-01-15'),
        },
      ];

      prisma.webAuthnCredential.findMany.mockResolvedValue(credentials);

      const passkeys = await passkeyService.getUserPasskeys(userId);

      expect(passkeys).toHaveLength(2);
      expect(passkeys[0].deviceName).toBe('iPhone 15 Pro');
      expect(passkeys[1].deviceName).toBe('YubiKey 5');
    });

    it('should return empty array for user without passkeys', async () => {
      const userId = 'user-456';

      prisma.webAuthnCredential.findMany.mockResolvedValue([]);

      const passkeys = await passkeyService.getUserPasskeys(userId);

      expect(passkeys).toEqual([]);
    });
  });

  describe('removePasskey', () => {
    it('should remove passkey successfully', async () => {
      const userId = 'user-123';
      const credentialId = 'db-id-123';

      prisma.webAuthnCredential.delete.mockResolvedValue({
        id: credentialId,
        userId,
        credentialId: 'cred-data',
      });

      // Mock that user still has other passkeys
      prisma.webAuthnCredential.count.mockResolvedValue(1);

      await passkeyService.removePasskey(userId, credentialId);

      expect(prisma.webAuthnCredential.delete).toHaveBeenCalledWith({
        where: {
          id: credentialId,
          userId,
        },
      });
    });

    it('should disable passkey MFA when last passkey is removed', async () => {
      const userId = 'user-123';
      const credentialId = 'last-cred-id';

      prisma.webAuthnCredential.delete.mockResolvedValue({});

      // No passkeys remaining
      prisma.webAuthnCredential.count.mockResolvedValue(0);

      prisma.userMFAConfig.findUnique.mockResolvedValue({ totpEnabled: false });
      prisma.userMFAConfig.update.mockResolvedValue({});

      await passkeyService.removePasskey(userId, credentialId);

      expect(prisma.userMFAConfig.update).toHaveBeenCalledWith({
        where: { userId },
        data: expect.objectContaining({
          passkeyEnabled: false,
          mfaEnabled: false,
        }),
      });
    });
  });

  describe('renamePasskey', () => {
    it('should rename passkey successfully', async () => {
      const userId = 'user-123';
      const credentialId = 'db-id-123';
      const newName = 'My MacBook Pro';

      prisma.webAuthnCredential.update.mockResolvedValue({
        id: credentialId,
        userId,
        deviceName: newName,
      });

      await passkeyService.renamePasskey(userId, credentialId, newName);

      expect(prisma.webAuthnCredential.update).toHaveBeenCalledWith({
        where: {
          id: credentialId,
          userId,
        },
        data: {
          deviceName: newName,
        },
      });
    });

    it('should accept device name as provided', async () => {
      const userId = 'user-123';
      const credentialId = 'db-id-123';
      const newName = 'My Device';

      prisma.webAuthnCredential.update.mockResolvedValue({});

      await passkeyService.renamePasskey(userId, credentialId, newName);

      expect(prisma.webAuthnCredential.update).toHaveBeenCalledWith({
        where: {
          id: credentialId,
          userId,
        },
        data: {
          deviceName: newName,
        },
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle very long credential names', async () => {
      const userId = 'user-123';
      const credentialId = 'cred-123';
      const longName = 'A'.repeat(500);

      prisma.webAuthnCredential.update.mockResolvedValue({});

      await passkeyService.renamePasskey(userId, credentialId, longName);

      // Should truncate or accept long names
      expect(prisma.webAuthnCredential.update).toHaveBeenCalled();
    });

    it('should handle concurrent passkey registrations', async () => {
      const userId = 'user-123';
      const userEmail = 'user@example.com';
      const userName = 'User Name';

      prisma.webAuthnCredential.findMany.mockResolvedValue([]);

      mockedGenerateRegistrationOptions.mockReturnValue({
        challenge: 'unique-challenge-1',
      } as any);

      // Generate options concurrently
      const results = await Promise.all([
        passkeyService.generateRegistrationOptions(userId, userEmail, userName),
        passkeyService.generateRegistrationOptions(userId, userEmail, userName),
        passkeyService.generateRegistrationOptions(userId, userEmail, userName),
      ]);

      // All should succeed
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toHaveProperty('challenge');
      });
    });

    it('should handle missing transports gracefully', async () => {
      const userId = 'user-123';
      const userEmail = 'user@example.com';
      const userName = 'User Name';

      const credentials = [
        {
          credentialId: 'cred-1-base64',
          userId,
          credentialPublicKey: Buffer.from('key-1').toString('base64'),
          counter: 0,
          transports: null, // Missing transports
          createdAt: new Date(),
        },
      ];

      prisma.webAuthnCredential.findMany.mockResolvedValue(credentials);

      mockedGenerateRegistrationOptions.mockReturnValue({
        challenge: 'challenge',
      } as any);

      const result = await passkeyService.generateRegistrationOptions(userId, userEmail, userName);

      expect(result).toBeDefined();
    });
  });
});
