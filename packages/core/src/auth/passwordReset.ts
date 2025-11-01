/**
 * Password Reset Token Management
 *
 * Handles creation, verification, and expiration of password reset tokens
 * Security features:
 * - Cryptographically secure random tokens
 * - SHA-256 hashing for storage
 * - Time-based expiration
 * - One-time use tokens
 * - Redis-based storage with fallback to in-memory
 */

import crypto from 'crypto';
import logger from '../utils/logger';
import { getRedisService } from '../cache/RedisService';

export interface PasswordResetToken {
  token: string; // Raw token (only available during creation)
  hashedToken: string; // Hashed token for storage
  email: string;
  expiresAt: Date;
  createdAt: Date;
  userId?: string;
}

/**
 * Generate a secure password reset token
 *
 * @param email - User's email address
 * @param validityMinutes - Token validity period (default: 60 minutes)
 * @returns Token object with raw token and hashed version
 */
export function generatePasswordResetToken(
  email: string,
  validityMinutes: number = 60
): PasswordResetToken {
  // Generate cryptographically secure random token (32 bytes = 256 bits)
  const token = crypto.randomBytes(32).toString('hex');

  // Hash the token for storage (prevent token theft from database)
  const hashedToken = hashToken(token);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + validityMinutes * 60 * 1000);

  logger.info('Password reset token generated', {
    email,
    expiresAt: expiresAt.toISOString(),
    validityMinutes,
  });

  return {
    token, // Return raw token (only shown once, for email)
    hashedToken, // Store this in database
    email,
    expiresAt,
    createdAt: now,
  };
}

/**
 * Hash a token using SHA-256
 *
 * @param token - Raw token string
 * @returns Hashed token (hex format)
 */
export function hashToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

/**
 * Verify a password reset token
 *
 * @param token - Raw token from user
 * @param storedToken - Token object from database
 * @returns Verification result with details
 */
export function verifyPasswordResetToken(
  token: string,
  storedToken: {
    hashedToken: string;
    email: string;
    expiresAt: Date | string;
    used?: boolean;
  }
): {
  valid: boolean;
  reason?: string;
  email?: string;
} {
  // Check if token was already used
  if (storedToken.used) {
    logger.warn('Password reset token already used', {
      email: storedToken.email,
    });
    return {
      valid: false,
      reason: 'Token has already been used',
    };
  }

  // Check if token is expired
  const expiresAt = new Date(storedToken.expiresAt);
  if (expiresAt < new Date()) {
    logger.warn('Password reset token expired', {
      email: storedToken.email,
      expiresAt: expiresAt.toISOString(),
    });
    return {
      valid: false,
      reason: 'Token has expired',
    };
  }

  // Verify token hash matches
  const hashedInputToken = hashToken(token);
  const tokensMatch = crypto.timingSafeEqual(
    Buffer.from(hashedInputToken),
    Buffer.from(storedToken.hashedToken)
  );

  if (!tokensMatch) {
    logger.warn('Password reset token mismatch', {
      email: storedToken.email,
    });
    return {
      valid: false,
      reason: 'Invalid token',
    };
  }

  logger.info('Password reset token verified successfully', {
    email: storedToken.email,
  });

  return {
    valid: true,
    email: storedToken.email,
  };
}

/**
 * Generate a password reset URL
 *
 * @param baseUrl - Application base URL
 * @param token - Reset token
 * @returns Complete reset URL
 */
export function generatePasswordResetUrl(
  baseUrl: string,
  token: string
): string {
  // Remove trailing slash from baseUrl
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  return `${cleanBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

/**
 * Calculate token expiry time for display
 *
 * @param validityMinutes - Validity period in minutes
 * @returns Human-readable expiry time
 */
export function getExpiryTimeString(validityMinutes: number): string {
  if (validityMinutes < 60) {
    return `${validityMinutes} minutes`;
  }

  const hours = Math.floor(validityMinutes / 60);
  const minutes = validityMinutes % 60;

  if (minutes === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }

  return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes > 1 ? 's' : ''}`;
}

/**
 * Rate limiting helper for password reset requests
 *
 * Prevents abuse by limiting reset requests per email
 */
export class PasswordResetRateLimiter {
  private attempts: Map<string, { count: number; resetAt: Date }> = new Map();
  private maxAttemptsPerHour: number;

  constructor(maxAttemptsPerHour: number = 5) {
    this.maxAttemptsPerHour = maxAttemptsPerHour;

    // Clean up expired entries every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  /**
   * Check if email can request password reset
   */
  canRequest(email: string): { allowed: boolean; reason?: string; retryAfter?: Date } {
    const normalized = email.toLowerCase();
    const entry = this.attempts.get(normalized);

    if (!entry) {
      return { allowed: true };
    }

    const now = new Date();

    // Reset counter if hour has passed
    if (now >= entry.resetAt) {
      this.attempts.delete(normalized);
      return { allowed: true };
    }

    // Check if limit exceeded
    if (entry.count >= this.maxAttemptsPerHour) {
      logger.warn('Password reset rate limit exceeded', {
        email,
        attempts: entry.count,
        retryAfter: entry.resetAt.toISOString(),
      });

      return {
        allowed: false,
        reason: `Too many password reset requests. Please try again after ${entry.resetAt.toLocaleTimeString()}.`,
        retryAfter: entry.resetAt,
      };
    }

    return { allowed: true };
  }

  /**
   * Record a password reset request attempt
   */
  recordAttempt(email: string): void {
    const normalized = email.toLowerCase();
    const entry = this.attempts.get(normalized);
    const now = new Date();

    if (!entry) {
      this.attempts.set(normalized, {
        count: 1,
        resetAt: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour from now
      });
    } else {
      entry.count++;
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = new Date();
    for (const [email, entry] of this.attempts.entries()) {
      if (now >= entry.resetAt) {
        this.attempts.delete(email);
      }
    }
  }
}

// Export singleton rate limiter
export const passwordResetRateLimiter = new PasswordResetRateLimiter(5);

/**
 * Redis-based Token Store for Password Reset Tokens
 *
 * Provides persistent storage for password reset tokens using Redis.
 * Automatically falls back to in-memory storage if Redis is unavailable.
 */
export class RedisTokenStore {
  private redis = getRedisService();
  private keyPrefix = 'password_reset:';

  /**
   * Store a password reset token in Redis
   *
   * @param hashedToken - Hashed token (key)
   * @param tokenData - Token data to store
   * @param ttlSeconds - Time to live in seconds
   */
  async set(
    hashedToken: string,
    tokenData: {
      email: string;
      expiresAt: Date;
      createdAt: Date;
      used?: boolean;
    },
    ttlSeconds: number
  ): Promise<void> {
    const key = `${this.keyPrefix}${hashedToken}`;
    const value = JSON.stringify({
      ...tokenData,
      expiresAt: tokenData.expiresAt.toISOString(),
      createdAt: tokenData.createdAt.toISOString(),
    });

    await this.redis.set(key, value, ttlSeconds);

    logger.debug('Password reset token stored', {
      hashedToken: hashedToken.substring(0, 10) + '...',
      email: tokenData.email,
      ttl: ttlSeconds,
    });
  }

  /**
   * Get a password reset token from Redis
   *
   * @param hashedToken - Hashed token (key)
   * @returns Token data or null if not found
   */
  async get(
    hashedToken: string
  ): Promise<{
    hashedToken: string;
    email: string;
    expiresAt: Date;
    createdAt: Date;
    used?: boolean;
  } | null> {
    const key = `${this.keyPrefix}${hashedToken}`;
    const value = await this.redis.get(key);

    if (!value) {
      return null;
    }

    try {
      const parsed = JSON.parse(value);
      return {
        hashedToken,
        email: parsed.email,
        expiresAt: new Date(parsed.expiresAt),
        createdAt: new Date(parsed.createdAt),
        used: parsed.used || false,
      };
    } catch (error) {
      logger.error('Failed to parse password reset token', { error });
      return null;
    }
  }

  /**
   * Mark a token as used
   *
   * @param hashedToken - Hashed token
   */
  async markAsUsed(hashedToken: string): Promise<void> {
    const tokenData = await this.get(hashedToken);
    if (tokenData) {
      tokenData.used = true;
      const ttl = Math.floor((tokenData.expiresAt.getTime() - Date.now()) / 1000);
      if (ttl > 0) {
        await this.set(hashedToken, tokenData, ttl);
      }
    }
  }

  /**
   * Delete a token from Redis
   *
   * @param hashedToken - Hashed token
   */
  async delete(hashedToken: string): Promise<void> {
    const key = `${this.keyPrefix}${hashedToken}`;
    await this.redis.delete(key);
  }

  /**
   * Check if a token exists
   *
   * @param hashedToken - Hashed token
   * @returns True if token exists
   */
  async exists(hashedToken: string): Promise<boolean> {
    const key = `${this.keyPrefix}${hashedToken}`;
    return await this.redis.exists(key);
  }
}

// Export singleton token store
export const passwordResetTokenStore = new RedisTokenStore();
