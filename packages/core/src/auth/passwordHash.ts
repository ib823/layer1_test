/**
 * Password Hashing Utilities
 *
 * Provides secure password hashing using bcrypt with industry-standard settings.
 *
 * Security Features:
 * - bcrypt algorithm (resistant to rainbow tables and brute force)
 * - Automatic salt generation (unique per password)
 * - Configurable cost factor (default: 12)
 * - Timing-safe comparison
 */

import bcrypt from 'bcrypt';
import logger from '../utils/logger';

/**
 * Cost factor for bcrypt (number of rounds)
 * - 10 rounds: ~100ms (fast, suitable for high-traffic sites)
 * - 12 rounds: ~300ms (recommended default, good security/performance balance)
 * - 14 rounds: ~1s (high security, slower)
 *
 * Each increment doubles the time and security.
 */
const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

/**
 * Hash a plain-text password using bcrypt
 *
 * @param password - Plain-text password to hash
 * @returns Promise<string> - Bcrypt hash (includes salt)
 *
 * @example
 * const hash = await hashPassword('MySecurePassword123!');
 * // Returns: $2b$12$KIvL.yMh8Z9Q... (60 characters)
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length === 0) {
    throw new Error('Password cannot be empty');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    logger.debug('Password hashed successfully', {
      rounds: SALT_ROUNDS,
      hashLength: hash.length,
    });
    return hash;
  } catch (error) {
    logger.error('Password hashing failed', { error });
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a plain-text password against a bcrypt hash
 *
 * @param password - Plain-text password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns Promise<boolean> - True if password matches hash
 *
 * @example
 * const isValid = await verifyPassword('MySecurePassword123!', storedHash);
 * if (isValid) {
 *   // Password is correct
 * }
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }

  try {
    const isValid = await bcrypt.compare(password, hash);
    logger.debug('Password verification completed', {
      isValid,
      hashLength: hash.length,
    });
    return isValid;
  } catch (error) {
    logger.error('Password verification failed', { error });
    return false;
  }
}

/**
 * Check if a password hash needs to be rehashed
 * (e.g., if the cost factor has been increased)
 *
 * @param hash - Bcrypt hash to check
 * @returns boolean - True if hash should be regenerated
 *
 * @example
 * if (needsRehash(user.passwordHash)) {
 *   const newHash = await hashPassword(plainPassword);
 *   await updateUserPassword(user.id, newHash);
 * }
 */
export function needsRehash(hash: string): boolean {
  try {
    const rounds = bcrypt.getRounds(hash);
    return rounds < SALT_ROUNDS;
  } catch (error) {
    logger.warn('Could not determine bcrypt rounds from hash', { error });
    return true; // Assume rehash needed if we can't parse
  }
}

/**
 * Generate a strong random password
 *
 * @param length - Password length (default: 16)
 * @returns string - Random password with uppercase, lowercase, numbers, and symbols
 *
 * @example
 * const tempPassword = generateRandomPassword();
 * // Returns: "Yk2$mPq9#Wz8Xn5"
 */
export function generateRandomPassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  const allChars = uppercase + lowercase + numbers + symbols;

  // Ensure at least one of each character type
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill remaining length with random characters
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

/**
 * Validate password strength
 *
 * @param password - Password to validate
 * @returns Object with validation result and messages
 *
 * @example
 * const validation = validatePasswordStrength('weak');
 * if (!validation.isValid) {
 *   console.error(validation.errors);
 * }
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
  score: number; // 0-4 (0=very weak, 4=very strong)
} {
  const errors: string[] = [];
  let score = 0;

  // Length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else if (password.length >= 12) {
    score++;
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score++;
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score++;
  }

  // Number check
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score++;
  }

  // Special character check
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score++;
  }

  return {
    isValid: errors.length === 0,
    errors,
    score: Math.min(score, 4),
  };
}
