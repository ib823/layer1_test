import request from 'supertest';
import express from 'express';
import { apiLimiter, discoveryLimiter, sodAnalysisLimiter } from '../../src/middleware/rateLimiting';

describe('Rate Limiting Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('API General Rate Limiting', () => {
    it('should allow requests within limit (10/min for unauthenticated)', async () => {
      app.use(apiLimiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      // Make 10 requests (should all succeed)
      for (let i = 0; i < 10; i++) {
        const res = await request(app).get('/test');
        expect(res.status).toBe(200);
        expect(res.headers['ratelimit-limit']).toBeDefined();
        expect(res.headers['ratelimit-remaining']).toBeDefined();
      }
    });

    it('should return 429 after exceeding rate limit', async () => {
      app.use(apiLimiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      // Make 11 requests (11th should fail)
      for (let i = 0; i < 10; i++) {
        await request(app).get('/test');
      }

      const res = await request(app).get('/test');
      expect(res.status).toBe(429);
      expect(res.body).toHaveProperty('error', 'Too many requests');
      expect(res.body).toHaveProperty('retryAfter');
      expect(res.headers['retry-after']).toBeDefined();
    });

    it('should include rate limit headers in response', async () => {
      app.use(apiLimiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      const res = await request(app).get('/test');
      expect(res.headers).toHaveProperty('ratelimit-limit');
      expect(res.headers).toHaveProperty('ratelimit-remaining');
      expect(res.headers).toHaveProperty('ratelimit-reset');
    });

    it('should have higher limits for admin users', async () => {
      app.use((req: any, res, next) => {
        req.user = { id: 'admin1', roles: ['admin'], tenantId: 'tenant1' };
        next();
      });
      app.use(apiLimiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      // Admin should be able to make 1000/min
      const firstRes = await request(app).get('/test');
      expect(firstRes.status).toBe(200);
      // Limit header should reflect admin quota
      const limit = parseInt(firstRes.headers['ratelimit-limit']);
      expect(limit).toBeGreaterThan(100);
    });
  });

  describe('Discovery Rate Limiting', () => {
    it('should allow only 5 requests per hour', async () => {
      app.use((req: any, res, next) => {
        req.user = { id: 'user1', roles: ['user'], tenantId: 'tenant1' };
        next();
      });
      app.use(discoveryLimiter);
      app.post('/discover', (req, res) => res.json({ success: true }));

      // Make 5 requests (should all succeed)
      for (let i = 0; i < 5; i++) {
        const res = await request(app).post('/discover');
        expect(res.status).toBe(200);
      }

      // 6th request should fail
      const res = await request(app).post('/discover');
      expect(res.status).toBe(429);
      expect(res.body.error).toContain('Service discovery rate limit exceeded');
    });

    it('should isolate rate limits by tenant', async () => {
      app.use((req: any, res, next) => {
        const tenant = req.query.tenant;
        req.user = { id: 'user1', roles: ['user'], tenantId: tenant };
        next();
      });
      app.use(discoveryLimiter);
      app.post('/discover', (req, res) => res.json({ success: true }));

      // Tenant 1 makes 5 requests
      for (let i = 0; i < 5; i++) {
        await request(app).post('/discover?tenant=tenant1');
      }

      // Tenant 1 should be rate limited
      const res1 = await request(app).post('/discover?tenant=tenant1');
      expect(res1.status).toBe(429);

      // Tenant 2 should still be able to make requests
      const res2 = await request(app).post('/discover?tenant=tenant2');
      expect(res2.status).toBe(200);
    });
  });

  describe('SoD Analysis Rate Limiting', () => {
    it('should allow 10 analyses per hour', async () => {
      app.use((req: any, res, next) => {
        req.user = { id: 'user1', roles: ['user'], tenantId: 'tenant1' };
        next();
      });
      app.use(sodAnalysisLimiter);
      app.post('/analyze', (req, res) => res.json({ success: true }));

      // Make 10 requests (should all succeed)
      for (let i = 0; i < 10; i++) {
        const res = await request(app).post('/analyze');
        expect(res.status).toBe(200);
      }

      // 11th request should fail
      const res = await request(app).post('/analyze');
      expect(res.status).toBe(429);
      expect(res.body.error).toContain('SoD analysis rate limit exceeded');
    });
  });
});
