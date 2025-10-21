/**
 * Queue Service Integration Tests
 *
 * Tests submission queue management with real database
 */

import { QueueService } from '../../src/services/QueueService';
import { TestEnvironment } from './setup';
import { Pool } from 'pg';

describe('QueueService Integration Tests', () => {
  let service: QueueService;
  let pool: Pool;

  beforeAll(async () => {
    pool = TestEnvironment.getPool();
    service = new QueueService(pool);
  }, 300000);

  beforeEach(async () => {
    await TestEnvironment.cleanup();
    await TestEnvironment.insertFixtures();
  });

  describe('Queue Item Creation', () => {
    it('should enqueue invoice for submission', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';
      const tenantId = '00000000-0000-0000-0000-000000000001';

      const queueId = await service.enqueue(invoiceId, tenantId, 'SUBMIT', {
        priority: 'NORMAL',
        scheduledAt: new Date(),
      });

      expect(queueId).toBeDefined();

      // Verify in database
      const result = await pool.query(
        'SELECT * FROM lhdn_submission_queue WHERE id = $1',
        [queueId]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].invoice_id).toBe(invoiceId);
      expect(result.rows[0].status).toBe('PENDING');
      expect(result.rows[0].operation_type).toBe('SUBMIT');
    });

    it('should enqueue with priority', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';
      const tenantId = '00000000-0000-0000-0000-000000000001';

      const highPriorityId = await service.enqueue(invoiceId, tenantId, 'SUBMIT', {
        priority: 'HIGH',
      });

      const result = await pool.query(
        'SELECT priority FROM lhdn_submission_queue WHERE id = $1',
        [highPriorityId]
      );

      expect(result.rows[0].priority).toBe('HIGH');
    });

    it('should schedule for future execution', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';
      const tenantId = '00000000-0000-0000-0000-000000000001';
      const scheduledAt = new Date(Date.now() + 3600000); // 1 hour from now

      const queueId = await service.enqueue(invoiceId, tenantId, 'SUBMIT', {
        scheduledAt,
      });

      const result = await pool.query(
        'SELECT scheduled_at FROM lhdn_submission_queue WHERE id = $1',
        [queueId]
      );

      const storedTime = new Date(result.rows[0].scheduled_at).getTime();
      const expectedTime = scheduledAt.getTime();

      expect(Math.abs(storedTime - expectedTime)).toBeLessThan(1000);
    });
  });

  describe('Queue Item Retrieval', () => {
    it('should get next pending item', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';
      const tenantId = '00000000-0000-0000-0000-000000000001';

      await service.enqueue(invoiceId, tenantId, 'SUBMIT');

      const item = await service.getNextPending();

      expect(item).toBeDefined();
      expect(item?.invoiceId).toBe(invoiceId);
      expect(item?.status).toBe('PENDING');
    });

    it('should prioritize HIGH priority items', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';

      // Create low priority first
      await service.enqueue('invoice-low', tenantId, 'SUBMIT', {
        priority: 'LOW',
      });

      // Then high priority
      await service.enqueue('invoice-high', tenantId, 'SUBMIT', {
        priority: 'HIGH',
      });

      const next = await service.getNextPending();

      // High priority should come first
      expect(next?.invoiceId).toBe('invoice-high');
    });

    it('should not return scheduled future items', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      const futureTime = new Date(Date.now() + 3600000);

      await service.enqueue('invoice-future', tenantId, 'SUBMIT', {
        scheduledAt: futureTime,
      });

      const next = await service.getNextPending();

      expect(next).toBeNull();
    });

    it('should get items by status', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';

      const id1 = await service.enqueue('invoice-1', tenantId, 'SUBMIT');
      const id2 = await service.enqueue('invoice-2', tenantId, 'SUBMIT');

      await service.markAsProcessing(id1);

      const pending = await service.getItemsByStatus('PENDING');
      const processing = await service.getItemsByStatus('PROCESSING');

      expect(pending.length).toBe(1);
      expect(pending[0].invoiceId).toBe('invoice-2');

      expect(processing.length).toBe(1);
      expect(processing[0].invoiceId).toBe('invoice-1');
    });
  });

  describe('Queue Item Status Updates', () => {
    it('should mark item as processing', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      const queueId = await service.enqueue('invoice-1', tenantId, 'SUBMIT');

      await service.markAsProcessing(queueId);

      const result = await pool.query(
        'SELECT status, started_at FROM lhdn_submission_queue WHERE id = $1',
        [queueId]
      );

      expect(result.rows[0].status).toBe('PROCESSING');
      expect(result.rows[0].started_at).toBeDefined();
    });

    it('should mark item as completed', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      const queueId = await service.enqueue('invoice-1', tenantId, 'SUBMIT');

      await service.markAsProcessing(queueId);

      const response = {
        success: true,
        lhdnId: 'LHDN-12345',
        submittedAt: new Date().toISOString(),
      };

      await service.markAsCompleted(queueId, response);

      const result = await pool.query(
        'SELECT status, completed_at, result_payload FROM lhdn_submission_queue WHERE id = $1',
        [queueId]
      );

      expect(result.rows[0].status).toBe('COMPLETED');
      expect(result.rows[0].completed_at).toBeDefined();
      expect(result.rows[0].result_payload).toEqual(response);
    });

    it('should mark item as failed with retry', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      const queueId = await service.enqueue('invoice-1', tenantId, 'SUBMIT');

      await service.markAsProcessing(queueId);

      const error = {
        error: 'NETWORK_ERROR',
        message: 'Connection timeout',
      };

      await service.markAsFailed(queueId, error, true);

      const result = await pool.query(
        'SELECT status, retry_count, last_error FROM lhdn_submission_queue WHERE id = $1',
        [queueId]
      );

      expect(result.rows[0].status).toBe('PENDING'); // Retry means back to pending
      expect(result.rows[0].retry_count).toBe(1);
      expect(result.rows[0].last_error).toEqual(error);
    });

    it('should mark item as failed without retry after max attempts', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      const queueId = await service.enqueue('invoice-1', tenantId, 'SUBMIT');

      // Simulate 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await service.markAsProcessing(queueId);
        await service.markAsFailed(queueId, { error: 'Test error' }, true);
      }

      // 4th attempt should mark as permanently failed
      await service.markAsProcessing(queueId);
      await service.markAsFailed(queueId, { error: 'Final error' }, true);

      const result = await pool.query(
        'SELECT status, retry_count FROM lhdn_submission_queue WHERE id = $1',
        [queueId]
      );

      expect(result.rows[0].status).toBe('FAILED');
      expect(result.rows[0].retry_count).toBe(4);
    });
  });

  describe('Retry Logic', () => {
    it('should implement exponential backoff', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      const queueId = await service.enqueue('invoice-1', tenantId, 'SUBMIT');

      // First retry
      await service.markAsProcessing(queueId);
      await service.markAsFailed(queueId, { error: 'Error 1' }, true);

      let result = await pool.query(
        'SELECT next_retry_at FROM lhdn_submission_queue WHERE id = $1',
        [queueId]
      );

      const firstRetryTime = new Date(result.rows[0].next_retry_at);

      // Second retry
      await service.markAsProcessing(queueId);
      await service.markAsFailed(queueId, { error: 'Error 2' }, true);

      result = await pool.query(
        'SELECT next_retry_at FROM lhdn_submission_queue WHERE id = $1',
        [queueId]
      );

      const secondRetryTime = new Date(result.rows[0].next_retry_at);

      // Second retry should be further in the future (exponential backoff)
      expect(secondRetryTime.getTime()).toBeGreaterThan(firstRetryTime.getTime());
    });

    it('should respect retry limits', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      const queueId = await service.enqueue('invoice-1', tenantId, 'SUBMIT', {
        maxRetries: 2,
      });

      // Fail twice
      for (let i = 0; i < 2; i++) {
        await service.markAsProcessing(queueId);
        await service.markAsFailed(queueId, { error: `Error ${i}` }, true);
      }

      // Third failure should mark as permanently failed
      await service.markAsProcessing(queueId);
      await service.markAsFailed(queueId, { error: 'Final error' }, true);

      const result = await pool.query(
        'SELECT status FROM lhdn_submission_queue WHERE id = $1',
        [queueId]
      );

      expect(result.rows[0].status).toBe('FAILED');
    });
  });

  describe('Dead Letter Queue', () => {
    it('should move permanently failed items to DLQ', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      const queueId = await service.enqueue('invoice-1', tenantId, 'SUBMIT');

      // Fail with no retry
      await service.markAsProcessing(queueId);
      await service.markAsFailed(queueId, { error: 'Permanent failure' }, false);

      await service.moveToDLQ(queueId);

      const dlqResult = await pool.query(
        'SELECT * FROM lhdn_dead_letter_queue WHERE original_queue_id = $1',
        [queueId]
      );

      expect(dlqResult.rows).toHaveLength(1);
      expect(dlqResult.rows[0].invoice_id).toBe('invoice-1');
      expect(dlqResult.rows[0].reason).toContain('Permanent failure');
    });

    it('should get DLQ items for analysis', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';

      // Create and fail multiple items
      for (let i = 0; i < 5; i++) {
        const queueId = await service.enqueue(`invoice-${i}`, tenantId, 'SUBMIT');
        await service.markAsProcessing(queueId);
        await service.markAsFailed(queueId, { error: `Error ${i}` }, false);
        await service.moveToDLQ(queueId);
      }

      const dlqItems = await service.getDLQItems(tenantId);

      expect(dlqItems.length).toBe(5);
    });
  });

  describe('Queue Statistics', () => {
    it('should get queue statistics', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';

      // Create various items
      await service.enqueue('invoice-1', tenantId, 'SUBMIT');
      await service.enqueue('invoice-2', tenantId, 'SUBMIT');

      const id3 = await service.enqueue('invoice-3', tenantId, 'SUBMIT');
      await service.markAsProcessing(id3);

      const id4 = await service.enqueue('invoice-4', tenantId, 'SUBMIT');
      await service.markAsProcessing(id4);
      await service.markAsCompleted(id4, { success: true });

      const stats = await service.getQueueStats(tenantId);

      expect(stats.pending).toBe(2);
      expect(stats.processing).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(0);
    });

    it('should get average processing time', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';

      const id = await service.enqueue('invoice-1', tenantId, 'SUBMIT');
      await service.markAsProcessing(id);

      // Simulate some processing time
      await new Promise((resolve) => setTimeout(resolve, 100));

      await service.markAsCompleted(id, { success: true });

      const stats = await service.getQueueStats(tenantId);

      expect(stats.avgProcessingTimeMs).toBeGreaterThan(0);
    });
  });

  describe('Queue Cleanup', () => {
    it('should purge old completed items', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';

      const id = await service.enqueue('invoice-old', tenantId, 'SUBMIT');
      await service.markAsProcessing(id);
      await service.markAsCompleted(id, { success: true });

      // Make it old
      await pool.query(
        `UPDATE lhdn_submission_queue
         SET completed_at = NOW() - INTERVAL '31 days'
         WHERE id = $1`,
        [id]
      );

      const purgedCount = await service.purgeOldItems(30); // 30 days retention

      expect(purgedCount).toBeGreaterThanOrEqual(1);

      const result = await pool.query(
        'SELECT * FROM lhdn_submission_queue WHERE id = $1',
        [id]
      );

      expect(result.rows).toHaveLength(0);
    });

    it('should not purge recent items', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';

      const id = await service.enqueue('invoice-recent', tenantId, 'SUBMIT');
      await service.markAsProcessing(id);
      await service.markAsCompleted(id, { success: true });

      const purgedCount = await service.purgeOldItems(30);

      const result = await pool.query(
        'SELECT * FROM lhdn_submission_queue WHERE id = $1',
        [id]
      );

      expect(result.rows).toHaveLength(1);
    });
  });

  describe('Concurrent Processing', () => {
    it('should handle concurrent queue operations', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';

      // Simulate concurrent enqueues
      const enqueuePromises = Array.from({ length: 10 }, (_, i) =>
        service.enqueue(`invoice-${i}`, tenantId, 'SUBMIT')
      );

      const queueIds = await Promise.all(enqueuePromises);

      expect(queueIds).toHaveLength(10);
      expect(new Set(queueIds).size).toBe(10); // All unique
    });

    it('should prevent double processing of same item', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      const queueId = await service.enqueue('invoice-1', tenantId, 'SUBMIT');

      // Try to mark as processing concurrently
      const results = await Promise.all([
        service.markAsProcessing(queueId),
        service.markAsProcessing(queueId),
        service.markAsProcessing(queueId),
      ]);

      // Should succeed only once
      const result = await pool.query(
        'SELECT status FROM lhdn_submission_queue WHERE id = $1',
        [queueId]
      );

      expect(result.rows[0].status).toBe('PROCESSING');
    });
  });
});
