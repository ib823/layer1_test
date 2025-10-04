import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

// Create Redis client (optional - uses memory if Redis unavailable)
const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : null;

// Standard rate limit: 100 requests per 15 minutes
export const standardRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  ...(redis && {
    store: new RedisStore({
      // @ts-expect-error - rate-limit-redis types may be outdated
      sendCommand: (...args: string[]) => redis.call(...args),
      prefix: 'rl:standard:',
    }),
  }),
});

// Strict rate limit for analysis endpoints: 10 requests per hour
export const analysisRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many analysis requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  ...(redis && {
    store: new RedisStore({
      // @ts-expect-error - rate-limit-redis types may be outdated
      sendCommand: (...args: string[]) => redis.call(...args),
      prefix: 'rl:analysis:',
    }),
  }),
});

// Auth endpoints: 5 requests per 15 minutes
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  ...(redis && {
    store: new RedisStore({
      // @ts-expect-error - rate-limit-redis types may be outdated
      sendCommand: (...args: string[]) => redis.call(...args),
      prefix: 'rl:auth:',
    }),
  }),
});
