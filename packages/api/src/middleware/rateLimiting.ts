import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import logger from '../utils/logger';
import { AuthenticatedRequest } from '../types';
import { Response } from 'express';

/**
 * Rate Limiting Middleware with Redis Backend
 *
 * Multi-tenant aware rate limiting with tiered quotas:
 * - Public (unauthenticated): 10 req/min
 * - Authenticated: 100 req/min
 * - Admin: 1000 req/min
 * - Service Discovery: 5 req/hour
 * - SoD Analysis: 10 req/hour
 *
 * Falls back to in-memory store if Redis is unavailable (dev only).
 */

// Initialize Redis client (optional for development)
const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error('Redis connection failed after 3 retries - using in-memory rate limiting');
          return null; // Stop retrying
        }
        return Math.min(times * 100, 3000); // Exponential backoff
      },
    })
  : null;

if (!redis) {
  logger.warn('⚠️  Redis not configured - using in-memory rate limiting (NOT for production)');
} else {
  redis.on('error', (err) => {
    logger.error('Redis error:', err);
  });
  redis.on('connect', () => {
    logger.info('✅ Redis connected for rate limiting');
  });
}

/**
 * Generate rate limit key based on tenant + user + IP
 * Ensures isolation between tenants
 */
function keyGenerator(req: AuthenticatedRequest): string {
  const tenantId = req.user?.tenantId || 'anon';
  const userId = req.user?.id || req.ip || 'unknown';
  return `rl:${tenantId}:${userId}`;
}

/**
 * Determine max requests based on user role
 */
async function maxRequests(req: AuthenticatedRequest): Promise<number> {
  const user = req.user;

  // Public (unauthenticated): 10/min
  if (!user) return 10;

  // Admin: 1000/min
  if (user.roles?.includes('admin')) return 1000;

  // Authenticated: 100/min
  return 100;
}

/**
 * Standard rate limit handler (429 response)
 */
function rateLimitHandler(req: AuthenticatedRequest, res: Response) {
  const retryAfter = res.getHeader('Retry-After');
  logger.warn('Rate limit exceeded', {
    tenantId: req.user?.tenantId || 'anon',
    userId: req.user?.id || req.ip,
    path: req.path,
    retryAfter,
  });

  res.status(429).json({
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: retryAfter ? parseInt(retryAfter as string, 10) : 60,
  });
}

/**
 * General API rate limiter
 * Applied to all /api routes
 */
export const apiLimiter = rateLimit({
  store: redis
    ? new RedisStore({
        // @ts-expect-error - RedisStore types expect ioredis v4, we use v5
        client: redis,
        prefix: 'rl:api:',
      })
    : undefined, // Use default in-memory store if Redis unavailable

  windowMs: 60 * 1000, // 1 minute
  max: maxRequests,
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  keyGenerator,
  handler: rateLimitHandler,
  skip: (req) => {
    // Skip rate limiting for health check and version endpoints
    return req.path === '/api/health' || req.path === '/api/version';
  },
});

/**
 * Service Discovery rate limiter
 * More restrictive: 5 requests per hour
 */
export const discoveryLimiter = rateLimit({
  store: redis
    ? new RedisStore({
        // @ts-expect-error - RedisStore types expect ioredis v4, we use v5
        client: redis,
        prefix: 'rl:discovery:',
      })
    : undefined,

  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: AuthenticatedRequest) => {
    // Rate limit by tenant only (not per user)
    return `rl:discovery:${req.user?.tenantId || req.ip}`;
  },
  handler: rateLimitHandler,
  message: {
    error: 'Service discovery rate limit exceeded',
    message: 'You can only run service discovery 5 times per hour. Please try again later.',
  },
});

/**
 * SoD Analysis rate limiter
 * Moderate restriction: 10 analyses per hour
 */
export const sodAnalysisLimiter = rateLimit({
  store: redis
    ? new RedisStore({
        // @ts-expect-error - RedisStore types expect ioredis v4, we use v5
        client: redis,
        prefix: 'rl:sod:',
      })
    : undefined,

  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: AuthenticatedRequest) => {
    // Rate limit by tenant only
    return `rl:sod:${req.user?.tenantId || req.ip}`;
  },
  handler: rateLimitHandler,
  message: {
    error: 'SoD analysis rate limit exceeded',
    message: 'You can only run 10 SoD analyses per hour. Please try again later.',
  },
});

/**
 * Admin operations rate limiter
 * Slightly more permissive: 50 per hour
 */
export const adminLimiter = rateLimit({
  store: redis
    ? new RedisStore({
        // @ts-expect-error - RedisStore types expect ioredis v4, we use v5
        client: redis,
        prefix: 'rl:admin:',
      })
    : undefined,

  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: rateLimitHandler,
});

/**
 * Cleanup function for graceful shutdown
 */
export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    logger.info('Closing Redis connection...');
    await redis.quit();
  }
}
