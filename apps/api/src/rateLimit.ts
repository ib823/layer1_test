import type { FastifyRequest } from 'fastify';
import { createClient } from 'redis';
import { config } from './config';

export type RateLimiter = {
  allow(req: FastifyRequest, bucket?: string): Promise<{ allowed: boolean; remaining: number }>;
  close(): Promise<void>;
};

export async function makeRateLimiter(): Promise<RateLimiter> {
  const client = createClient({ url: config.redisUrl });
  client.on('error', (e) => console.error('Redis error', e));
  await client.connect();

  return {
    async allow(req, bucket = 'default') {
      const ip = (req.ip || '0.0.0.0').replace(/::ffff:/, '');
      const tenant = (req.headers['x-tenant'] as string | undefined) || 'anon';
      const route = req.routerPath || req.url;
      const minute = Math.floor(Date.now() / 60000);
      const key = `rl:${tenant}:${ip}:${bucket}:${route}:${minute}`;

      const n = await client.incr(key);
      if (n === 1) await client.expire(key, 65);
      const limit = config.rateLimitPerMin;

      return { allowed: n <= limit, remaining: Math.max(limit - n, 0) };
    },
    async close() {
      await client.quit();
    }
  };
}
