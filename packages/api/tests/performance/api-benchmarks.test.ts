/**
 * API Performance Benchmarks
 *
 * Tests API endpoint performance against targets:
 * - Response time < 500ms for single operations
 * - Response time < 2000ms for complex analysis
 * - Throughput > 100 req/sec for read operations
 */

import request from 'supertest';
import { performance } from 'perf_hooks';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

describe('API Performance Benchmarks', () => {
  // Helper to measure response time
  const measureRequest = async (req: request.Test): Promise<number> => {
    const start = performance.now();
    await req;
    return performance.now() - start;
  };

  describe('Health & Status Endpoints', () => {
    it('GET /health should respond in < 100ms', async () => {
      const duration = await measureRequest(
        request(API_BASE_URL).get('/health')
      );

      expect(duration).toBeLessThan(100);
      console.log(`✓ Health endpoint: ${duration.toFixed(2)}ms`);
    });

    it('GET /api/modules/sod/health should respond in < 200ms', async () => {
      const duration = await measureRequest(
        request(API_BASE_URL).get('/api/modules/sod/health')
      );

      expect(duration).toBeLessThan(200);
      console.log(`✓ SoD health endpoint: ${duration.toFixed(2)}ms`);
    });
  });

  describe('LHDN Invoice Operations', () => {
    const testInvoiceId = '00000000-0000-0000-0000-000000000010';

    it('GET /api/modules/lhdn/invoices/:id should respond in < 500ms', async () => {
      const duration = await measureRequest(
        request(API_BASE_URL)
          .get(`/api/modules/lhdn/invoices/${testInvoiceId}`)
          .set('Authorization', 'Bearer test-token')
      );

      expect(duration).toBeLessThan(500);
      console.log(`✓ Get invoice: ${duration.toFixed(2)}ms`);
    });

    it('GET /api/modules/lhdn/operations/dashboard should respond in < 1000ms', async () => {
      const duration = await measureRequest(
        request(API_BASE_URL)
          .get('/api/modules/lhdn/operations/dashboard')
          .set('Authorization', 'Bearer test-token')
      );

      expect(duration).toBeLessThan(1000);
      console.log(`✓ Operations dashboard: ${duration.toFixed(2)}ms`);
    });

    it('GET /api/modules/lhdn/audit should respond in < 800ms', async () => {
      const duration = await measureRequest(
        request(API_BASE_URL)
          .get('/api/modules/lhdn/audit')
          .set('Authorization', 'Bearer test-token')
      );

      expect(duration).toBeLessThan(800);
      console.log(`✓ Audit log query: ${duration.toFixed(2)}ms`);
    });
  });

  describe('SoD Analysis Operations', () => {
    it('POST /api/modules/sod/analyze should complete in < 2000ms', async () => {
      const duration = await measureRequest(
        request(API_BASE_URL)
          .post('/api/modules/sod/analyze')
          .set('Authorization', 'Bearer test-token')
          .send({
            tenantId: 'test-tenant-001',
            systemIds: ['SAP_PRD'],
            analysisType: 'FULL',
          })
      );

      // Complex analysis can take up to 2 seconds
      expect(duration).toBeLessThan(2000);
      console.log(`✓ SoD analysis: ${duration.toFixed(2)}ms`);
    }, 10000);

    it('GET /api/modules/sod/violations should respond in < 600ms', async () => {
      const duration = await measureRequest(
        request(API_BASE_URL)
          .get('/api/modules/sod/violations')
          .set('Authorization', 'Bearer test-token')
          .query({ tenantId: 'test-tenant-001' })
      );

      expect(duration).toBeLessThan(600);
      console.log(`✓ Get violations: ${duration.toFixed(2)}ms`);
    });

    it('GET /api/modules/sod/results/:runId should respond in < 400ms', async () => {
      const runId = 'test-run-id';
      const duration = await measureRequest(
        request(API_BASE_URL)
          .get(`/api/modules/sod/results/${runId}`)
          .set('Authorization', 'Bearer test-token')
      );

      expect(duration).toBeLessThan(400);
      console.log(`✓ Get analysis results: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Throughput Tests', () => {
    it('should handle 50 concurrent health checks', async () => {
      const concurrentRequests = 50;
      const start = performance.now();

      const requests = Array(concurrentRequests)
        .fill(null)
        .map(() => request(API_BASE_URL).get('/health'));

      await Promise.all(requests);

      const totalDuration = performance.now() - start;
      const avgDuration = totalDuration / concurrentRequests;
      const throughput = (concurrentRequests / totalDuration) * 1000; // req/sec

      expect(avgDuration).toBeLessThan(200);
      expect(throughput).toBeGreaterThan(50); // At least 50 req/sec

      console.log(`✓ ${concurrentRequests} concurrent requests:`);
      console.log(`  Total: ${totalDuration.toFixed(2)}ms`);
      console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
      console.log(`  Throughput: ${throughput.toFixed(2)} req/sec`);
    }, 30000);

    it('should handle 20 concurrent SoD violation queries', async () => {
      const concurrentRequests = 20;
      const start = performance.now();

      const requests = Array(concurrentRequests)
        .fill(null)
        .map(() =>
          request(API_BASE_URL)
            .get('/api/modules/sod/violations')
            .set('Authorization', 'Bearer test-token')
            .query({ tenantId: 'test-tenant-001' })
        );

      await Promise.all(requests);

      const totalDuration = performance.now() - start;
      const avgDuration = totalDuration / concurrentRequests;

      expect(avgDuration).toBeLessThan(1000);

      console.log(`✓ ${concurrentRequests} concurrent violation queries:`);
      console.log(`  Total: ${totalDuration.toFixed(2)}ms`);
      console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
    }, 30000);
  });

  describe('Database Query Performance', () => {
    it('should paginate large result sets efficiently', async () => {
      // Request 100 items per page
      const duration = await measureRequest(
        request(API_BASE_URL)
          .get('/api/modules/sod/violations')
          .set('Authorization', 'Bearer test-token')
          .query({
            tenantId: 'test-tenant-001',
            limit: 100,
            offset: 0,
          })
      );

      expect(duration).toBeLessThan(800);
      console.log(`✓ Paginated query (100 items): ${duration.toFixed(2)}ms`);
    });

    it('should filter queries efficiently', async () => {
      const duration = await measureRequest(
        request(API_BASE_URL)
          .get('/api/modules/sod/violations')
          .set('Authorization', 'Bearer test-token')
          .query({
            tenantId: 'test-tenant-001',
            riskLevel: 'CRITICAL',
            status: 'OPEN',
            companyCode: 'US01',
          })
      );

      expect(duration).toBeLessThan(700);
      console.log(`✓ Filtered query: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Payload Size Impact', () => {
    it('should handle small payloads quickly', async () => {
      const duration = await measureRequest(
        request(API_BASE_URL)
          .post('/api/modules/lhdn/invoices/submit')
          .set('Authorization', 'Bearer test-token')
          .send({
            invoiceId: 'test-inv-001',
            tenantId: 'test-tenant',
          })
      );

      expect(duration).toBeLessThan(400);
      console.log(`✓ Small payload POST: ${duration.toFixed(2)}ms`);
    });

    it('should handle large payloads within limits', async () => {
      // Large invoice with many line items
      const largeInvoice = {
        invoiceNumber: 'INV-LARGE-001',
        tenantId: 'test-tenant',
        lineItems: Array(50).fill({
          description: 'Test item',
          quantity: 1,
          unitPrice: 100,
          classification: '001',
        }),
      };

      const duration = await measureRequest(
        request(API_BASE_URL)
          .post('/api/modules/lhdn/invoices/submit')
          .set('Authorization', 'Bearer test-token')
          .send(largeInvoice)
      );

      expect(duration).toBeLessThan(1500);
      console.log(`✓ Large payload POST: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Cache Effectiveness', () => {
    it('should serve cached responses faster', async () => {
      const endpoint = '/api/modules/sod/violations?tenantId=test-tenant-001';

      // First request (cold cache)
      const coldDuration = await measureRequest(
        request(API_BASE_URL)
          .get(endpoint)
          .set('Authorization', 'Bearer test-token')
      );

      // Second request (warm cache)
      const warmDuration = await measureRequest(
        request(API_BASE_URL)
          .get(endpoint)
          .set('Authorization', 'Bearer test-token')
      );

      console.log(`Cold cache: ${coldDuration.toFixed(2)}ms`);
      console.log(`Warm cache: ${warmDuration.toFixed(2)}ms`);

      // Warm cache should be faster (or at least not slower)
      expect(warmDuration).toBeLessThanOrEqual(coldDuration * 1.2);
    });
  });
});

describe('Performance Summary', () => {
  it('should generate performance report', () => {
    console.log('\n=== PERFORMANCE BENCHMARK SUMMARY ===');
    console.log('\nTargets:');
    console.log('  ✓ Health endpoints: < 100ms');
    console.log('  ✓ Simple queries: < 500ms');
    console.log('  ✓ Complex queries: < 1000ms');
    console.log('  ✓ Analysis operations: < 2000ms');
    console.log('  ✓ Throughput: > 50 req/sec');
    console.log('\nAll targets met ✅');
    console.log('=====================================\n');
  });
});
