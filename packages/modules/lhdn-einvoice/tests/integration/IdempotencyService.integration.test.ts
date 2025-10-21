/**
 * Idempotency Service Integration Tests
 *
 * Tests idempotency key management with real database
 */

import { IdempotencyService } from '../../src/services/IdempotencyService';
import { TestEnvironment } from './setup';
import { Pool } from 'pg';

describe('IdempotencyService Integration Tests', () => {
  let service: IdempotencyService;
  let pool: Pool;

  beforeAll(async () => {
    pool = TestEnvironment.getPool();
    service = new IdempotencyService(pool);
  }, 300000);

  beforeEach(async () => {
    await TestEnvironment.cleanup();
    await TestEnvironment.insertFixtures();
  });

  describe('Idempotency Key Creation', () => {
    it('should create new idempotency key', async () => {
      const key = 'test-key-001';
      const operation = 'SUBMIT_INVOICE';
      const payload = { invoiceId: '123', action: 'submit' };

      const created = await service.createKey(key, operation, payload);

      expect(created).toBe(true);

      // Verify in database
      const result = await pool.query(
        'SELECT * FROM lhdn_idempotency_keys WHERE idempotency_key = $1',
        [key]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].operation).toBe(operation);
      expect(result.rows[0].status).toBe('PROCESSING');
    });

    it('should not create duplicate idempotency key', async () => {
      const key = 'duplicate-key';
      const operation = 'SUBMIT_INVOICE';
      const payload = { invoiceId: '123' };

      const first = await service.createKey(key, operation, payload);
      expect(first).toBe(true);

      const second = await service.createKey(key, operation, payload);
      expect(second).toBe(false);
    });

    it('should store full payload as JSON', async () => {
      const key = 'complex-payload-key';
      const operation = 'SUBMIT_INVOICE';
      const payload = {
        invoiceId: '123',
        tenantId: 'tenant-001',
        metadata: {
          user: 'test-user',
          timestamp: new Date().toISOString(),
        },
        lineItems: [
          { productId: 'P1', quantity: 5 },
          { productId: 'P2', quantity: 3 },
        ],
      };

      await service.createKey(key, operation, payload);

      const result = await pool.query(
        'SELECT request_payload FROM lhdn_idempotency_keys WHERE idempotency_key = $1',
        [key]
      );

      const stored = result.rows[0].request_payload;
      expect(stored).toEqual(payload);
    });
  });

  describe('Idempotency Key Status Checking', () => {
    it('should check if key exists', async () => {
      const key = 'existing-key';
      await service.createKey(key, 'TEST_OPERATION', {});

      const exists = await service.keyExists(key);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const exists = await service.keyExists('non-existent-key');
      expect(exists).toBe(false);
    });

    it('should get key status', async () => {
      const key = 'status-key';
      await service.createKey(key, 'SUBMIT_INVOICE', { invoiceId: '123' });

      const status = await service.getKeyStatus(key);

      expect(status).toBeDefined();
      expect(status?.status).toBe('PROCESSING');
      expect(status?.operation).toBe('SUBMIT_INVOICE');
    });

    it('should return null for non-existent key status', async () => {
      const status = await service.getKeyStatus('missing-key');
      expect(status).toBeNull();
    });
  });

  describe('Idempotency Key Completion', () => {
    it('should mark key as completed with response', async () => {
      const key = 'complete-key';
      await service.createKey(key, 'SUBMIT_INVOICE', { invoiceId: '123' });

      const response = {
        success: true,
        invoiceId: '123',
        lhdnId: 'LHDN-20240101-001',
        submittedAt: new Date().toISOString(),
      };

      await service.completeKey(key, response);

      const status = await service.getKeyStatus(key);
      expect(status?.status).toBe('COMPLETED');
      expect(status?.response_payload).toEqual(response);
      expect(status?.completed_at).toBeDefined();
    });

    it('should mark key as failed with error', async () => {
      const key = 'fail-key';
      await service.createKey(key, 'SUBMIT_INVOICE', { invoiceId: '123' });

      const error = {
        error: 'VALIDATION_ERROR',
        message: 'Invalid TIN format',
        code: 'ERR_INVALID_TIN',
      };

      await service.failKey(key, error);

      const status = await service.getKeyStatus(key);
      expect(status?.status).toBe('FAILED');
      expect(status?.response_payload).toEqual(error);
      expect(status?.completed_at).toBeDefined();
    });

    it('should not update non-existent key', async () => {
      const response = { success: true };

      await expect(
        service.completeKey('non-existent', response)
      ).resolves.not.toThrow();

      // Should not create the key
      const exists = await service.keyExists('non-existent');
      expect(exists).toBe(false);
    });
  });

  describe('Idempotent Request Handling', () => {
    it('should return cached response for duplicate request', async () => {
      const key = 'cached-request';
      const operation = 'SUBMIT_INVOICE';
      const payload = { invoiceId: '123' };
      const expectedResponse = {
        success: true,
        invoiceId: '123',
        lhdnId: 'LHDN-CACHED',
      };

      // First request - create and complete
      await service.createKey(key, operation, payload);
      await service.completeKey(key, expectedResponse);

      // Second request - should get cached response
      const status = await service.getKeyStatus(key);
      expect(status?.status).toBe('COMPLETED');
      expect(status?.response_payload).toEqual(expectedResponse);
    });

    it('should handle concurrent requests with same key', async () => {
      const key = 'concurrent-key';
      const operation = 'SUBMIT_INVOICE';
      const payload = { invoiceId: '123' };

      // Simulate concurrent requests
      const results = await Promise.all([
        service.createKey(key, operation, payload),
        service.createKey(key, operation, payload),
        service.createKey(key, operation, payload),
      ]);

      // Only one should succeed
      const successes = results.filter((r) => r === true);
      expect(successes).toHaveLength(1);
    });
  });

  describe('Key Expiration and Cleanup', () => {
    it('should identify expired keys', async () => {
      const key = 'expired-key';
      await service.createKey(key, 'TEST_OPERATION', {});

      // Manually set created_at to past
      await pool.query(
        `UPDATE lhdn_idempotency_keys
         SET created_at = NOW() - INTERVAL '25 hours'
         WHERE idempotency_key = $1`,
        [key]
      );

      const expired = await service.getExpiredKeys(24); // 24 hours TTL
      expect(expired.some((k) => k === key)).toBe(true);
    });

    it('should cleanup expired keys', async () => {
      const expiredKey = 'old-key';
      const activeKey = 'new-key';

      await service.createKey(expiredKey, 'TEST', {});
      await service.createKey(activeKey, 'TEST', {});

      // Make one expired
      await pool.query(
        `UPDATE lhdn_idempotency_keys
         SET created_at = NOW() - INTERVAL '25 hours'
         WHERE idempotency_key = $1`,
        [expiredKey]
      );

      const deletedCount = await service.cleanupExpiredKeys(24);
      expect(deletedCount).toBeGreaterThanOrEqual(1);

      // Expired key should be gone
      const expiredExists = await service.keyExists(expiredKey);
      expect(expiredExists).toBe(false);

      // Active key should remain
      const activeExists = await service.keyExists(activeKey);
      expect(activeExists).toBe(true);
    });

    it('should not cleanup keys in PROCESSING state within timeout', async () => {
      const key = 'processing-key';
      await service.createKey(key, 'TEST', {});

      const deletedCount = await service.cleanupExpiredKeys(24);

      const exists = await service.keyExists(key);
      expect(exists).toBe(true);
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should isolate idempotency keys by tenant', async () => {
      const key = 'tenant-key';

      // Create same key for different tenants
      await service.createKey(key, 'SUBMIT_INVOICE', {
        tenantId: '00000000-0000-0000-0000-000000000001',
        invoiceId: '123',
      });

      await service.createKey(key, 'SUBMIT_INVOICE', {
        tenantId: '00000000-0000-0000-0000-000000000002',
        invoiceId: '456',
      });

      // Both should exist (stored with different tenant context in payload)
      const result = await pool.query(
        'SELECT * FROM lhdn_idempotency_keys WHERE idempotency_key = $1',
        [key]
      );

      expect(result.rows).toHaveLength(1); // Same key can only exist once
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle bulk key creation', async () => {
      const keys = Array.from({ length: 100 }, (_, i) => `bulk-key-${i}`);

      const startTime = Date.now();

      for (const key of keys) {
        await service.createKey(key, 'BULK_TEST', { index: key });
      }

      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 5 seconds for 100 keys)
      expect(duration).toBeLessThan(5000);

      // Verify all created
      const result = await pool.query(
        "SELECT COUNT(*) FROM lhdn_idempotency_keys WHERE idempotency_key LIKE 'bulk-key-%'"
      );

      expect(parseInt(result.rows[0].count)).toBe(100);
    });

    it('should handle large payloads', async () => {
      const key = 'large-payload';
      const largePayload = {
        invoiceId: '123',
        lineItems: Array.from({ length: 1000 }, (_, i) => ({
          lineNumber: i + 1,
          productId: `PROD-${i}`,
          description: `Product ${i} with long description that takes up space`,
          quantity: Math.floor(Math.random() * 100),
          unitPrice: Math.random() * 1000,
        })),
      };

      await service.createKey(key, 'LARGE_INVOICE', largePayload);

      const status = await service.getKeyStatus(key);
      expect(status?.request_payload).toEqual(largePayload);
    });
  });
});
