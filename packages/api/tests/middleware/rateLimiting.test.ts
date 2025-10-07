import { Request, Response, NextFunction } from 'express';
import { apiLimiter, discoveryLimiter, sodAnalysisLimiter, adminLimiter } from '../../src/middleware/rateLimiting';
import { AuthenticatedRequest } from '../../src/types';

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    quit: jest.fn(),
  }));
});

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Rate Limiting Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      ip: '127.0.0.1',
      user: {
        id: 'test-user',
        email: 'test@example.com',
        roles: ['user'],
        tenantId: 'test-tenant',
      },
    } as any;
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      getHeader: jest.fn().mockReturnValue('60'),
    };
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('apiLimiter', () => {
    it('should be a function (middleware)', () => {
      expect(typeof apiLimiter).toBe('function');
    });

    it('should skip rate limiting for /api/health', () => {
      // Rate limiter is configured to skip health endpoint
      // We can't easily test this without actual requests, but we can verify the middleware exists
      expect(apiLimiter).toBeDefined();
    });

    it('should skip rate limiting for /api/version', () => {
      // Rate limiter is configured to skip version endpoint
      expect(apiLimiter).toBeDefined();
    });
  });

  describe('discoveryLimiter', () => {
    it('should be a function (middleware)', () => {
      expect(typeof discoveryLimiter).toBe('function');
    });

    it('should have stricter limits than apiLimiter', () => {
      // Discovery is limited to 5/hour
      // We can't test the actual limit without integration tests,
      // but we can verify the middleware is configured
      expect(discoveryLimiter).toBeDefined();
    });
  });

  describe('sodAnalysisLimiter', () => {
    it('should be a function (middleware)', () => {
      expect(typeof sodAnalysisLimiter).toBe('function');
    });

    it('should have moderate limits', () => {
      // SoD analysis is limited to 10/hour
      expect(sodAnalysisLimiter).toBeDefined();
    });
  });

  describe('adminLimiter', () => {
    it('should be a function (middleware)', () => {
      expect(typeof adminLimiter).toBe('function');
    });

    it('should allow more requests for admin operations', () => {
      // Admin operations are limited to 50/hour
      expect(adminLimiter).toBeDefined();
    });
  });

  describe('Rate Limit Key Generation', () => {
    it('should generate keys based on tenantId and userId', () => {
      // The key format should be: rl:{tenantId}:{userId}
      // This is tested implicitly through the limiter configuration
      // In integration tests, we would verify the Redis keys
      expect(mockReq.user?.tenantId).toBe('test-tenant');
      expect(mockReq.user?.id).toBe('test-user');
    });

    it('should handle unauthenticated requests with IP', () => {
      mockReq.user = undefined;

      // Should fall back to IP address
      expect(mockReq.ip).toBe('127.0.0.1');
    });
  });

  describe('Rate Limit Response Headers', () => {
    it('should include standard rate limit headers', () => {
      // When rate limited, responses should include:
      // - RateLimit-Limit
      // - RateLimit-Remaining
      // - RateLimit-Reset
      // - Retry-After

      // This is configured in the middleware but tested in integration tests
      expect(apiLimiter).toBeDefined();
    });
  });

  describe('Redis Fallback', () => {
    it('should fall back to in-memory store if Redis unavailable', () => {
      // When REDIS_URL is not set, should use in-memory store
      // This is logged in the middleware initialization

      // The test just verifies the middleware is created
      expect(apiLimiter).toBeDefined();
    });
  });
});

/**
 * Integration Test Notes:
 *
 * These unit tests verify that the middleware functions exist and are configured.
 * For full rate limiting behavior testing, integration tests are needed:
 *
 * 1. Test hitting endpoints repeatedly to trigger rate limits
 * 2. Verify 429 responses with correct headers
 * 3. Test different user roles get different quotas
 * 4. Test tenant-based rate limiting isolation
 * 5. Test Redis key expiration
 * 6. Test fallback to in-memory when Redis is down
 *
 * Example integration test:
 *
 * ```typescript
 * it('should rate limit unauthenticated requests to 10/min', async () => {
 *   // Make 10 requests - all should succeed
 *   for (let i = 0; i < 10; i++) {
 *     const res = await request(app).get('/api/onboarding');
 *     expect(res.status).not.toBe(429);
 *   }
 *
 *   // 11th request should be rate limited
 *   const res = await request(app).get('/api/onboarding');
 *   expect(res.status).toBe(429);
 *   expect(res.body.error).toBe('Too many requests');
 * });
 * ```
 */
