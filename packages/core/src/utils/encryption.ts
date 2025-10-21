import crypto from 'crypto';
import logger from './logger';

/**
 * Encryption Service for sensitive data (credentials, tokens, etc.)
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For GCM mode
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits
const ITERATIONS = 100000; // PBKDF2 iterations

export interface EncryptionResult {
  encrypted: string; // Base64 encoded: salt + iv + tag + ciphertext
}

export class EncryptionService {
  private masterKey: Buffer;

  constructor(masterKeyString?: string) {
    // Get master key from environment or parameter
    const keyString = masterKeyString || process.env.ENCRYPTION_MASTER_KEY;

    if (!keyString) {
      throw new Error(
        'Encryption master key not configured. Set ENCRYPTION_MASTER_KEY environment variable.'
      );
    }

    // Validate key strength
    this.validateKeyStrength(keyString);

    // Try to decode as base64 first (preferred format for direct key usage)
    try {
      const decodedKey = Buffer.from(keyString, 'base64');
      if (decodedKey.length === KEY_LENGTH) {
        // Direct key usage (preferred) - no derivation needed
        this.masterKey = decodedKey;
        return;
      }
    } catch (error) {
      // Not valid base64, fall through to derivation
    }

    // Fall back to key derivation for non-base64 or wrong-length keys
    // Use a cryptographically random salt (deterministic from key for consistency)
    const salt = crypto.createHash('sha256').update(keyString).digest().slice(0, 16);
    this.masterKey = crypto.scryptSync(keyString, salt, KEY_LENGTH);
  }

  /**
   * Validate encryption key strength
   * @private
   */
  private validateKeyStrength(key: string): void {
    // Try to decode as base64 first
    try {
      const decoded = Buffer.from(key, 'base64');
      // If it's valid base64, check the decoded length
      if (decoded.toString('base64') === key) {
        // It's proper base64, check decoded byte length
        if (decoded.length >= 16) {
          // 16+ bytes is acceptable for base64 keys
          return;
        }
      }
    } catch (error) {
      // Not base64, continue to string length check
    }

    // For non-base64 keys, check string length
    if (key.length < 32) {
      throw new Error(
        'Encryption key too weak. Must be at least 32 characters or 16+ byte base64 encoded.'
      );
    }

    // Warn about common weak patterns (but don't reject - allow for testing)
    // Skip validation in test environment to avoid logger dependencies
    if (process.env.NODE_ENV !== 'test') {
      const weakPatterns = [
        /^(test|demo|example|sample|default)/i,
        /^(.)\1{10,}/, // Repeated characters
        /^(password|secret|key)/i,
      ];

      for (const pattern of weakPatterns) {
        if (pattern.test(key)) {
          logger.warn('Encryption key appears to use a weak or default pattern', {
            recommendation: 'Generate a strong key using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
          });
          break;
        }
      }
    }
  }

  /**
   * Encrypt sensitive data
   * @param plaintext - Data to encrypt (string or object)
   * @returns Encrypted data with salt, IV, and auth tag
   */
  encrypt(plaintext: string | object): EncryptionResult {
    try {
      // Convert object to JSON string if needed
      const data = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);

      // Generate random IV
      const iv = crypto.randomBytes(IV_LENGTH);

      // Create cipher
      const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv);

      // Encrypt
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Combine: iv + authTag + encrypted data
      const combined = Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'hex'),
      ]);

      return {
        encrypted: combined.toString('base64'),
      };
    } catch (error: any) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive data
   * @param encryptedData - Encrypted data from encrypt()
   * @returns Decrypted plaintext
   */
  decrypt(encryptedData: string): string {
    try {
      // Decode base64
      const combined = Buffer.from(encryptedData, 'base64');

      // Extract components
      const iv = combined.slice(0, IV_LENGTH);
      const authTag = combined.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
      const encrypted = combined.slice(IV_LENGTH + TAG_LENGTH);

      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error: any) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt and return as JSON object
   */
  encryptObject(data: object): EncryptionResult {
    return this.encrypt(JSON.stringify(data));
  }

  /**
   * Decrypt and parse as JSON object
   */
  decryptObject<T = any>(encryptedData: string): T {
    const decrypted = this.decrypt(encryptedData);
    return JSON.parse(decrypted);
  }

  /**
   * Hash password or sensitive string (one-way)
   * Uses PBKDF2 for key derivation
   */
  hash(data: string, salt?: string): { hash: string; salt: string } {
    const useSalt = salt || crypto.randomBytes(SALT_LENGTH).toString('hex');
    const hash = crypto.pbkdf2Sync(data, useSalt, ITERATIONS, 64, 'sha512').toString('hex');

    return {
      hash,
      salt: useSalt,
    };
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hash(data, salt);
    return computedHash === hash;
  }

  /**
   * Rotate encryption key (re-encrypt with new key)
   * @param encryptedData - Data encrypted with old key
   * @param newKeyService - New encryption service with different key
   */
  static rotate(
    encryptedData: string,
    oldKeyService: EncryptionService,
    newKeyService: EncryptionService
  ): EncryptionResult {
    const decrypted = oldKeyService.decrypt(encryptedData);
    return newKeyService.encrypt(decrypted);
  }
}

/**
 * Singleton instance for global use
 * Initialize once at application startup
 */
let globalEncryptionService: EncryptionService | null = null;

export function initializeEncryption(masterKey?: string): EncryptionService {
  if (!globalEncryptionService) {
    globalEncryptionService = new EncryptionService(masterKey);
  }
  return globalEncryptionService;
}

export function getEncryptionService(): EncryptionService {
  if (!globalEncryptionService) {
    throw new Error('Encryption service not initialized. Call initializeEncryption() first.');
  }
  return globalEncryptionService;
}

/**
 * Utility function to encrypt credentials for storage
 */
export function encryptCredentials(credentials: any): string {
  const service = getEncryptionService();
  return service.encryptObject(credentials).encrypted;
}

/**
 * Utility function to decrypt credentials from storage
 */
export function decryptCredentials<T = any>(encryptedData: string): T {
  const service = getEncryptionService();
  return service.decryptObject<T>(encryptedData);
}
