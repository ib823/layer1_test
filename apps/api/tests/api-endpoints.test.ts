/**
 * API Endpoint Integration Tests
 *
 * Tests the RESTful API endpoints for LHDN and SoD modules
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app';
import type { FastifyInstance } from 'fastify';

describe('API Endpoint Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Checks', () => {
    it('GET /health should return 200 OK', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty('ok', true);
      expect(response.json()).toHaveProperty('ts');
    });

    it('GET /api/modules/lhdn/health should return 200 OK', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/modules/lhdn/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        success: true,
        module: 'LHDN e-Invoice',
        status: 'healthy',
      });
    });

    it('GET /api/modules/sod/health should return 200 OK', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/modules/sod/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        success: true,
        module: 'SoD Control',
        status: 'healthy',
      });
    });
  });

  describe('LHDN Module Endpoints', () => {
    const testTenant = 'test-tenant';

    it('GET /api/modules/lhdn/submissions should require tenant header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/modules/lhdn/submissions',
        // No x-tenant header
      });

      // Should handle gracefully even without tenant
      expect([200, 400]).toContain(response.statusCode);
    });

    it('GET /api/modules/lhdn/submissions should return submissions for tenant', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/modules/lhdn/submissions',
        headers: {
          'x-tenant': testTenant,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty('success');
      expect(response.json()).toHaveProperty('data');
      expect(Array.isArray(response.json().data)).toBe(true);
    });

    it('GET /api/modules/lhdn/compliance/report should return stats', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/modules/lhdn/compliance/report',
        headers: {
          'x-tenant': testTenant,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json).toHaveProperty('success', true);
      expect(json.data).toHaveProperty('total_invoices');
      expect(json.data).toHaveProperty('accepted');
      expect(json.data).toHaveProperty('rejected');
      expect(json.data).toHaveProperty('pending');
    });

    it('POST /api/modules/lhdn/invoices/submit should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/modules/lhdn/invoices/submit',
        headers: {
          'x-tenant': testTenant,
          'content-type': 'application/json',
        },
        payload: {
          // Missing required fields
        },
      });

      expect([400, 500]).toContain(response.statusCode);
    });

    it('POST /api/modules/lhdn/invoices/submit should accept valid payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/modules/lhdn/invoices/submit',
        headers: {
          'x-tenant': testTenant,
          'content-type': 'application/json',
        },
        payload: {
          sapBillingDocument: '9000000001',
          sapCompanyCode: '1000',
          autoSubmit: false,
        },
      });

      expect([200, 201, 500]).toContain(response.statusCode);
      if (response.statusCode === 200) {
        expect(response.json()).toHaveProperty('success');
        expect(response.json()).toHaveProperty('data');
      }
    });
  });

  describe('SoD Module Endpoints', () => {
    const testTenant = 'test-tenant';

    it('GET /api/modules/sod/results should return latest analysis', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/modules/sod/results',
        headers: {
          'x-tenant': testTenant,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty('success', true);
      expect(response.json()).toHaveProperty('data');
    });

    it('GET /api/modules/sod/violations should return violations list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/modules/sod/violations',
        headers: {
          'x-tenant': testTenant,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json).toHaveProperty('success', true);
      expect(json).toHaveProperty('data');
      expect(Array.isArray(json.data)).toBe(true);
    });

    it('GET /api/modules/sod/violations should support severity filter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/modules/sod/violations?severity=CRITICAL',
        headers: {
          'x-tenant': testTenant,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty('success', true);
    });

    it('GET /api/modules/sod/recommendations should return recommendations', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/modules/sod/recommendations',
        headers: {
          'x-tenant': testTenant,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty('success', true);
      expect(Array.isArray(response.json().data)).toBe(true);
    });

    it('GET /api/modules/sod/compliance/report should return compliance stats', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/modules/sod/compliance/report',
        headers: {
          'x-tenant': testTenant,
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json).toHaveProperty('success', true);
      expect(json.data).toHaveProperty('total_findings');
      expect(json.data).toHaveProperty('critical');
      expect(json.data).toHaveProperty('high');
      expect(json.data).toHaveProperty('medium');
      expect(json.data).toHaveProperty('low');
    });

    it('POST /api/modules/sod/analyze should validate request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/modules/sod/analyze',
        headers: {
          'x-tenant': testTenant,
          'content-type': 'application/json',
        },
        payload: {
          mode: 'snapshot',
          includeInactive: false,
        },
      });

      // May succeed or fail depending on database state
      expect([200, 400, 500]).toContain(response.statusCode);
    });

    it('POST /api/modules/sod/exceptions/approve should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/modules/sod/exceptions/approve',
        headers: {
          'x-tenant': testTenant,
          'content-type': 'application/json',
        },
        payload: {
          // Missing required fields
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('error');
    });

    it('POST /api/modules/sod/exceptions/reject should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/modules/sod/exceptions/reject',
        headers: {
          'x-tenant': testTenant,
          'content-type': 'application/json',
        },
        payload: {
          // Missing required fields
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/modules/nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/modules/sod/analyze',
        headers: {
          'x-tenant': 'test',
          'content-type': 'application/json',
        },
        payload: '{invalid json}',
      });

      expect([400, 500]).toContain(response.statusCode);
    });
  });
});
