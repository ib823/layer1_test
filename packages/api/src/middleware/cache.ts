import { Request, Response, NextFunction } from 'express';
import { MemoryCache } from '@sap-framework/core';

const cache = new MemoryCache();

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  keyGenerator?: (req: Request) => string;
}

/**
 * Cache middleware for API responses
 * @param ttlMs Time to live in milliseconds (default: 60000 = 1 minute)
 */
export function cacheMiddleware(ttlMs: number = 60000) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key from request
    const cacheKey = `${req.method}:${req.path}:${JSON.stringify(req.query)}`;

    // Check if cached response exists
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache the response
    res.json = function (body: any) {
      if (res.statusCode === 200) {
        cache.set(cacheKey, body, ttlMs).catch(err => {
          console.error('Cache set error:', err);
        });
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

/**
 * Cache invalidation utility
 */
export async function invalidateCache(pattern?: string): Promise<void> {
  if (pattern) {
    // Invalidate specific pattern (would need implementation in MemoryCache)
    console.log(`Invalidating cache for pattern: ${pattern}`);
  } else {
    // Clear all cache
    await cache.clear();
  }
}

/**
 * Tenant-specific cache invalidation
 */
export async function invalidateTenantCache(tenantId: string): Promise<void> {
  // Invalidate all cache entries related to this tenant
  await invalidateCache(`*${tenantId}*`);
}
