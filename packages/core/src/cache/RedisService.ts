/**
 * Redis Service
 *
 * Provides Redis connection management and caching operations.
 * Used for:
 * - Password reset tokens
 * - Session storage
 * - Rate limiting
 * - Query result caching
 *
 * Features:
 * - Auto-reconnect
 * - Connection pooling
 * - Error handling
 * - Graceful degradation (fallback to in-memory if Redis unavailable)
 */

import Redis, { RedisOptions } from 'ioredis';
import logger from '../utils/logger';

export interface RedisConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  url?: string; // Full Redis URL (redis://...)
  keyPrefix?: string;
  maxRetriesPerRequest?: number;
  enableOfflineQueue?: boolean;
}

export class RedisService {
  private static instance: RedisService | null = null;
  private client: Redis | null = null;
  private isAvailable: boolean = false;
  private config: RedisConfig;
  private fallbackStorage: Map<string, string> = new Map();

  private constructor(config: RedisConfig) {
    this.config = config;
  }

  /**
   * Initialize Redis service (singleton)
   */
  static initialize(config?: RedisConfig): RedisService {
    if (!RedisService.instance) {
      const defaultConfig: RedisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        url: process.env.REDIS_URL,
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'sapgrc:',
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
      };

      RedisService.instance = new RedisService({ ...defaultConfig, ...config });
      RedisService.instance.connect();
    }

    return RedisService.instance;
  }

  /**
   * Get Redis service instance
   */
  static getInstance(): RedisService {
    if (!RedisService.instance) {
      return RedisService.initialize();
    }
    return RedisService.instance;
  }

  /**
   * Connect to Redis
   */
  private async connect(): Promise<void> {
    try {
      const options: RedisOptions = {
        maxRetriesPerRequest: this.config.maxRetriesPerRequest,
        enableOfflineQueue: this.config.enableOfflineQueue,
        retryStrategy: (times: number) => {
          if (times > 3) {
            logger.warn('Redis connection failed after 3 retries, using fallback storage');
            this.isAvailable = false;
            return null; // Stop retrying
          }
          return Math.min(times * 100, 3000); // Exponential backoff
        },
      };

      // Use URL if provided, otherwise use host/port
      if (this.config.url) {
        this.client = new Redis(this.config.url, options);
      } else {
        this.client = new Redis({
          ...options,
          host: this.config.host,
          port: this.config.port,
          password: this.config.password,
          db: this.config.db,
          keyPrefix: this.config.keyPrefix,
        });
      }

      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
        this.isAvailable = true;
      });

      this.client.on('error', (error) => {
        logger.error('Redis connection error', { error: error.message });
        this.isAvailable = false;
      });

      this.client.on('close', () => {
        logger.warn('Redis connection closed');
        this.isAvailable = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

      // Test connection
      await this.client.ping();
      this.isAvailable = true;

      logger.info('Redis service initialized', {
        host: this.config.host || 'from URL',
        port: this.config.port,
        db: this.config.db,
        keyPrefix: this.config.keyPrefix,
      });
    } catch (error) {
      logger.warn('Redis unavailable, using in-memory fallback', { error });
      this.isAvailable = false;
    }
  }

  /**
   * Check if Redis is available
   */
  isRedisAvailable(): boolean {
    return this.isAvailable && this.client !== null;
  }

  /**
   * Set a key-value pair with optional expiration (in seconds)
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (this.isRedisAvailable()) {
        if (ttlSeconds) {
          await this.client!.setex(key, ttlSeconds, value);
        } else {
          await this.client!.set(key, value);
        }
        logger.debug('Redis SET', { key, ttl: ttlSeconds });
      } else {
        // Fallback to in-memory
        this.fallbackStorage.set(key, value);
        if (ttlSeconds) {
          setTimeout(() => this.fallbackStorage.delete(key), ttlSeconds * 1000);
        }
      }
    } catch (error) {
      logger.error('Redis SET error, using fallback', { key, error });
      this.fallbackStorage.set(key, value);
    }
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    try {
      if (this.isRedisAvailable()) {
        const value = await this.client!.get(key);
        logger.debug('Redis GET', { key, found: !!value });
        return value;
      } else {
        return this.fallbackStorage.get(key) || null;
      }
    } catch (error) {
      logger.error('Redis GET error, using fallback', { key, error });
      return this.fallbackStorage.get(key) || null;
    }
  }

  /**
   * Delete a key
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.isRedisAvailable()) {
        await this.client!.del(key);
        logger.debug('Redis DELETE', { key });
      } else {
        this.fallbackStorage.delete(key);
      }
    } catch (error) {
      logger.error('Redis DELETE error', { key, error });
      this.fallbackStorage.delete(key);
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (this.isRedisAvailable()) {
        const result = await this.client!.exists(key);
        return result === 1;
      } else {
        return this.fallbackStorage.has(key);
      }
    } catch (error) {
      logger.error('Redis EXISTS error', { key, error });
      return this.fallbackStorage.has(key);
    }
  }

  /**
   * Set expiration on a key (in seconds)
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      if (this.isRedisAvailable()) {
        await this.client!.expire(key, ttlSeconds);
        logger.debug('Redis EXPIRE', { key, ttl: ttlSeconds });
      } else {
        // For fallback, we'll need to re-set with timeout
        const value = this.fallbackStorage.get(key);
        if (value) {
          setTimeout(() => this.fallbackStorage.delete(key), ttlSeconds * 1000);
        }
      }
    } catch (error) {
      logger.error('Redis EXPIRE error', { key, error });
    }
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      if (this.isRedisAvailable()) {
        return await this.client!.keys(pattern);
      } else {
        // Simple pattern matching for fallback
        const regex = new RegExp(pattern.replace('*', '.*'));
        return Array.from(this.fallbackStorage.keys()).filter((key) => regex.test(key));
      }
    } catch (error) {
      logger.error('Redis KEYS error', { pattern, error });
      return [];
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    try {
      if (this.isRedisAvailable()) {
        return await this.client!.incr(key);
      } else {
        const current = parseInt(this.fallbackStorage.get(key) || '0', 10);
        const newValue = current + 1;
        this.fallbackStorage.set(key, newValue.toString());
        return newValue;
      }
    } catch (error) {
      logger.error('Redis INCR error', { key, error });
      return 0;
    }
  }

  /**
   * Set a hash field
   */
  async hset(key: string, field: string, value: string): Promise<void> {
    try {
      if (this.isRedisAvailable()) {
        await this.client!.hset(key, field, value);
      } else {
        const hashKey = `${key}:${field}`;
        this.fallbackStorage.set(hashKey, value);
      }
    } catch (error) {
      logger.error('Redis HSET error', { key, field, error });
    }
  }

  /**
   * Get a hash field
   */
  async hget(key: string, field: string): Promise<string | null> {
    try {
      if (this.isRedisAvailable()) {
        return await this.client!.hget(key, field);
      } else {
        const hashKey = `${key}:${field}`;
        return this.fallbackStorage.get(hashKey) || null;
      }
    } catch (error) {
      logger.error('Redis HGET error', { key, field, error });
      return null;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isAvailable = false;
      logger.info('Redis connection closed');
    }
  }

  /**
   * Flush all data (use with caution!)
   */
  async flushAll(): Promise<void> {
    if (this.isRedisAvailable()) {
      await this.client!.flushall();
      logger.warn('Redis FLUSHALL executed');
    }
    this.fallbackStorage.clear();
  }
}

// Export singleton getter
export const getRedisService = () => RedisService.getInstance();
