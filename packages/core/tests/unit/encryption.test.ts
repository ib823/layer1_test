// Mock logger to avoid winston dependencies in tests - MUST BE BEFORE IMPORTS
jest.mock('../../src/utils/logger', () => ({
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  },
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  })),
}));

import {
  EncryptionService,
  initializeEncryption,
  getEncryptionService,
  encryptCredentials,
  decryptCredentials
} from '../../src/utils/encryption';
import crypto from 'crypto';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;
  const testMasterKey = 'test-master-key-for-unit-tests-only';

  beforeEach(() => {
    encryptionService = new EncryptionService(testMasterKey);
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt string correctly', () => {
      const plaintext = 'sensitive-api-key-12345';
      const { encrypted } = encryptionService.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);

      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt object correctly', () => {
      const credentials = {
        clientId: 'my-client-id',
        clientSecret: 'super-secret-value',
        tokenUrl: 'https://auth.example.com/token',
      };

      const { encrypted } = encryptionService.encryptObject(credentials);
      expect(encrypted).toBeDefined();

      const decrypted = encryptionService.decryptObject(encrypted);
      expect(decrypted).toEqual(credentials);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const plaintext = 'same-data';
      const { encrypted: encrypted1 } = encryptionService.encrypt(plaintext);
      const { encrypted: encrypted2 } = encryptionService.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same value
      expect(encryptionService.decrypt(encrypted1)).toBe(plaintext);
      expect(encryptionService.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should fail decryption with wrong key', () => {
      const plaintext = 'secret-data';
      const { encrypted } = encryptionService.encrypt(plaintext);

      const wrongKeyService = new EncryptionService('wrong-master-key-32-chars-long-enough-to-pass-validation');

      expect(() => {
        wrongKeyService.decrypt(encrypted);
      }).toThrow();
    });

    it('should fail decryption with tampered ciphertext', () => {
      const plaintext = 'secret-data';
      const { encrypted } = encryptionService.encrypt(plaintext);

      // Tamper with the encrypted data
      const tamperedData = 'A' + encrypted.substring(1);

      expect(() => {
        encryptionService.decrypt(tamperedData);
      }).toThrow();
    });
  });

  describe('hash/verify', () => {
    it('should hash and verify password correctly', () => {
      const password = 'MySecurePassword123!';
      const { hash, salt } = encryptionService.hash(password);

      expect(hash).toBeDefined();
      expect(salt).toBeDefined();
      expect(hash).not.toBe(password);

      const isValid = encryptionService.verifyHash(password, hash, salt);
      expect(isValid).toBe(true);
    });

    it('should fail verification with wrong password', () => {
      const password = 'CorrectPassword';
      const { hash, salt } = encryptionService.hash(password);

      const isValid = encryptionService.verifyHash('WrongPassword', hash, salt);
      expect(isValid).toBe(false);
    });

    it('should produce different hash with different salt', () => {
      const password = 'SamePassword';
      const { hash: hash1, salt: salt1 } = encryptionService.hash(password);
      const { hash: hash2, salt: salt2 } = encryptionService.hash(password);

      expect(salt1).not.toBe(salt2);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('key rotation', () => {
    it('should successfully rotate encryption keys', () => {
      const oldService = new EncryptionService('old-master-key-32-chars-long-enough-for-validation-ok');
      const newService = new EncryptionService('new-master-key-32-chars-long-enough-for-validation-ok');

      const plaintext = 'data-to-rotate';
      const { encrypted: oldEncrypted } = oldService.encrypt(plaintext);

      // Rotate to new key
      const { encrypted: newEncrypted } = EncryptionService.rotate(
        oldEncrypted,
        oldService,
        newService
      );

      // Old key should not be able to decrypt new data
      expect(() => oldService.decrypt(newEncrypted)).toThrow();

      // New key should decrypt correctly
      const decrypted = newService.decrypt(newEncrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('error handling', () => {
    it('should throw error if master key not provided', () => {
      expect(() => {
        new EncryptionService();
      }).toThrow('Encryption master key not configured');
    });

    it('should throw error on invalid encrypted data format', () => {
      expect(() => {
        encryptionService.decrypt('invalid-base64-data!!!');
      }).toThrow();
    });

    it('should throw error on empty encrypted data', () => {
      expect(() => {
        encryptionService.decrypt('');
      }).toThrow();
    });

    it('should throw error for weak encryption key (too short)', () => {
      expect(() => {
        new EncryptionService('short');
      }).toThrow('Encryption key too weak');
    });
  });

  describe('key formats and backward compatibility', () => {
    it('should accept base64-encoded 32-byte key (preferred format)', () => {
      // Generate a proper 32-byte base64 key
      const base64Key = Buffer.from(crypto.randomBytes(32)).toString('base64');
      const service = new EncryptionService(base64Key);

      const plaintext = 'test-data';
      const { encrypted } = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should fall back to key derivation for non-base64 keys', () => {
      const plaintextKey = 'this-is-a-very-long-plaintext-key-for-testing';
      const service = new EncryptionService(plaintextKey);

      const plaintext = 'test-data';
      const { encrypted } = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should fall back to key derivation for wrong-length base64', () => {
      // 16-byte base64 (not 32 bytes)
      const shortBase64 = Buffer.from(crypto.randomBytes(16)).toString('base64');
      const service = new EncryptionService(shortBase64);

      const plaintext = 'test-data';
      const { encrypted } = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should maintain backward compatibility with existing keys', () => {
      // Same key should produce decryptable results with new implementation
      const legacyKey = 'test-master-key-for-backward-compatibility-testing';
      const service1 = new EncryptionService(legacyKey);

      const plaintext = 'sensitive-data';
      const { encrypted } = service1.encrypt(plaintext);

      // Create new instance with same key
      const service2 = new EncryptionService(legacyKey);
      const decrypted = service2.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should use deterministic salt for key derivation (backward compatible)', () => {
      const key = 'consistent-key-for-testing-salt-determinism';
      const service1 = new EncryptionService(key);
      const service2 = new EncryptionService(key);

      const plaintext = 'test-data';
      const { encrypted } = service1.encrypt(plaintext);

      // Should decrypt with second service instance (same derived key)
      const decrypted = service2.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('singleton pattern', () => {
    it('should initialize global encryption service', () => {
      const service = initializeEncryption('test-singleton-key-32-chars-long-enough');
      expect(service).toBeInstanceOf(EncryptionService);
    });

    it('should return existing instance when already initialized', () => {
      const service1 = initializeEncryption('test-key-1-that-is-32-chars-long-enough-for-validation');
      const service2 = initializeEncryption('test-key-2-that-is-32-chars-long-enough-for-validation');
      expect(service1).toBe(service2);
    });

    it('should get initialized encryption service', () => {
      initializeEncryption('test-get-key-32-chars-long-enough-for-validation-ok');
      const service = getEncryptionService();
      expect(service).toBeInstanceOf(EncryptionService);
    });
  });

  describe('utility functions', () => {
    beforeAll(() => {
      initializeEncryption('test-utility-key-32-chars-long-enough-for-validation');
    });

    it('should encrypt credentials using utility function', () => {
      const credentials = {
        username: 'testuser',
        password: 'testpass'
      };
      const encrypted = encryptCredentials(credentials);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should decrypt credentials using utility function', () => {
      const credentials = {
        apiKey: 'test-api-key',
        secret: 'test-secret'
      };
      const encrypted = encryptCredentials(credentials);
      const decrypted = decryptCredentials(encrypted);
      expect(decrypted).toEqual(credentials);
    });
  });
});
