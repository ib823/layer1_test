import {
  EncryptionService,
  initializeEncryption,
  getEncryptionService,
  encryptCredentials,
  decryptCredentials
} from '../../src/utils/encryption';

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

      const wrongKeyService = new EncryptionService('wrong-master-key');

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
      const oldService = new EncryptionService('old-master-key');
      const newService = new EncryptionService('new-master-key');

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
  });

  describe('singleton pattern', () => {
    it('should initialize global encryption service', () => {
      const service = initializeEncryption('test-singleton-key');
      expect(service).toBeInstanceOf(EncryptionService);
    });

    it('should return existing instance when already initialized', () => {
      const service1 = initializeEncryption('test-key-1');
      const service2 = initializeEncryption('test-key-2');
      expect(service1).toBe(service2);
    });

    it('should get initialized encryption service', () => {
      initializeEncryption('test-get-key');
      const service = getEncryptionService();
      expect(service).toBeInstanceOf(EncryptionService);
    });
  });

  describe('utility functions', () => {
    beforeAll(() => {
      initializeEncryption('test-utility-key');
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
