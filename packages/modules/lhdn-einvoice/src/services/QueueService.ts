/**
 * QueueService
 *
 * Async job queue with retry logic, backoff, and dead-letter handling
 * Enables resilient invoice processing during outages and rate limiting
 *
 * Phase: 5 (Idempotency & Resilience Foundation)
 */

import { Pool } from 'pg';
import { logger } from '../utils/logger';

export type JobType =
  | 'SUBMIT_INVOICE'
  | 'QUERY_STATUS'
  | 'CANCEL_INVOICE'
  | 'SUBMIT_CN'
  | 'SUBMIT_DN'
  | 'RECONCILIATION';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DLQ';

export interface QueueJob {
  id: string;
  tenantId: string;
  jobType: JobType;
  priority: number;
  payload: any;
  idempotencyKey?: string;
  status: JobStatus;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  lastError?: string;
  lastErrorAt?: Date;
  invoiceId?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface EnqueueOptions {
  tenantId: string;
  jobType: JobType;
  payload: any;
  priority?: number; // 1=highest, 10=lowest (default: 5)
  idempotencyKey?: string;
  invoiceId?: string;
  maxAttempts?: number; // Default: 5
}

export interface DequeueOptions {
  limit?: number; // Max jobs to dequeue (default: 1)
  jobTypes?: JobType[]; // Filter by job types
}

export interface RetryBackoffStrategy {
  baseDelay: number; // Base delay in milliseconds (default: 1000)
  maxDelay: number; // Max delay in milliseconds (default: 300000 = 5 minutes)
  exponential: boolean; // Use exponential backoff (default: true)
  jitter: boolean; // Add random jitter (default: true)
}

export class QueueService {
  private pool: Pool;
  private defaultBackoff: RetryBackoffStrategy = {
    baseDelay: 1000, // 1 second
    maxDelay: 300000, // 5 minutes
    exponential: true,
    jitter: true,
  };

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 20, // Higher pool size for queue workers
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  /**
   * Enqueue a new job
   * Idempotency: If job with same idempotency_key exists, skip enqueue
   */
  async enqueue(options: EnqueueOptions): Promise<string> {
    const {
      tenantId,
      jobType,
      payload,
      priority = 5,
      idempotencyKey,
      invoiceId,
      maxAttempts = 5,
    } = options;

    try {
      // Check for existing job with same idempotency key
      if (idempotencyKey) {
        const existing = await this.pool.query(
          `
          SELECT id, status
          FROM lhdn_submission_queue
          WHERE tenant_id = $1
            AND idempotency_key = $2
            AND status IN ('PENDING', 'PROCESSING')
          `,
          [tenantId, idempotencyKey]
        );

        if (existing.rows.length > 0) {
          logger.info('Job already enqueued', {
            tenantId,
            idempotencyKey,
            existingJobId: existing.rows[0].id,
            status: existing.rows[0].status,
          });
          return existing.rows[0].id;
        }
      }

      // Insert new job
      const result = await this.pool.query(
        `
        INSERT INTO lhdn_submission_queue (
          tenant_id,
          job_type,
          priority,
          payload,
          idempotency_key,
          invoice_id,
          max_attempts,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
        RETURNING id
        `,
        [tenantId, jobType, priority, payload, idempotencyKey || null, invoiceId || null, maxAttempts]
      );

      const jobId = result.rows[0].id;

      logger.info('Job enqueued', {
        jobId,
        tenantId,
        jobType,
        priority,
        idempotencyKey,
      });

      return jobId;
    } catch (error: any) {
      logger.error('Failed to enqueue job', {
        error: error.message,
        tenantId,
        jobType,
      });
      throw error;
    }
  }

  /**
   * Dequeue jobs for processing
   * Uses SELECT FOR UPDATE SKIP LOCKED for concurrent workers
   */
  async dequeue(options: DequeueOptions = {}): Promise<QueueJob[]> {
    const { limit = 1, jobTypes } = options;

    try {
      const jobTypeFilter = jobTypes && jobTypes.length > 0
        ? `AND job_type = ANY($1)`
        : '';

      const params: any[] = jobTypes && jobTypes.length > 0 ? [jobTypes] : [];
      params.push(limit);

      const result = await this.pool.query(
        `
        UPDATE lhdn_submission_queue
        SET
          status = 'PROCESSING',
          started_at = NOW(),
          updated_at = NOW()
        WHERE id IN (
          SELECT id
          FROM lhdn_submission_queue
          WHERE status = 'PENDING'
            AND (next_retry_at IS NULL OR next_retry_at <= NOW())
            ${jobTypeFilter}
          ORDER BY priority ASC, created_at ASC
          LIMIT $${params.length}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *
        `,
        params
      );

      const jobs: QueueJob[] = result.rows.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        jobType: row.job_type,
        priority: row.priority,
        payload: row.payload,
        idempotencyKey: row.idempotency_key,
        status: row.status,
        attemptCount: row.attempt_count,
        maxAttempts: row.max_attempts,
        nextRetryAt: row.next_retry_at ? new Date(row.next_retry_at) : undefined,
        lastError: row.last_error,
        lastErrorAt: row.last_error_at ? new Date(row.last_error_at) : undefined,
        invoiceId: row.invoice_id,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        startedAt: row.started_at ? new Date(row.started_at) : undefined,
        completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      }));

      if (jobs.length > 0) {
        logger.info('Jobs dequeued for processing', {
          count: jobs.length,
          jobIds: jobs.map((j) => j.id),
        });
      }

      return jobs;
    } catch (error: any) {
      logger.error('Failed to dequeue jobs', { error: error.message });
      throw error;
    }
  }

  /**
   * Mark job as completed
   */
  async markCompleted(jobId: string): Promise<void> {
    try {
      await this.pool.query(
        `
        UPDATE lhdn_submission_queue
        SET
          status = 'COMPLETED',
          completed_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
        `,
        [jobId]
      );

      logger.info('Job marked as completed', { jobId });
    } catch (error: any) {
      logger.error('Failed to mark job as completed', { error: error.message, jobId });
      throw error;
    }
  }

  /**
   * Mark job as failed and schedule retry
   * If max attempts reached, move to DLQ
   */
  async markFailed(
    jobId: string,
    errorMessage: string,
    backoffStrategy: Partial<RetryBackoffStrategy> = {}
  ): Promise<void> {
    const strategy = { ...this.defaultBackoff, ...backoffStrategy };

    try {
      // Get current job state
      const jobResult = await this.pool.query(
        `
        SELECT attempt_count, max_attempts, job_type, payload, tenant_id
        FROM lhdn_submission_queue
        WHERE id = $1
        `,
        [jobId]
      );

      if (jobResult.rows.length === 0) {
        throw new Error(`Job ${jobId} not found`);
      }

      const job = jobResult.rows[0];
      const attemptCount = job.attempt_count + 1;
      const maxAttempts = job.max_attempts;

      // Check if max attempts reached
      if (attemptCount >= maxAttempts) {
        // Move to DLQ
        await this.moveToDLQ(jobId, errorMessage);
        logger.warn('Job moved to DLQ after max attempts', {
          jobId,
          attemptCount,
          maxAttempts,
        });
        return;
      }

      // Calculate next retry time with exponential backoff + jitter
      const nextRetryAt = this.calculateNextRetry(attemptCount, strategy);

      // Update job
      await this.pool.query(
        `
        UPDATE lhdn_submission_queue
        SET
          status = 'PENDING',
          attempt_count = $2,
          last_error = $3,
          last_error_at = NOW(),
          next_retry_at = $4,
          updated_at = NOW()
        WHERE id = $1
        `,
        [jobId, attemptCount, errorMessage, nextRetryAt]
      );

      logger.info('Job marked as failed, scheduled for retry', {
        jobId,
        attemptCount,
        maxAttempts,
        nextRetryAt,
      });
    } catch (error: any) {
      logger.error('Failed to mark job as failed', { error: error.message, jobId });
      throw error;
    }
  }

  /**
   * Calculate next retry timestamp using exponential backoff + jitter
   */
  private calculateNextRetry(
    attemptCount: number,
    strategy: RetryBackoffStrategy
  ): Date {
    const { baseDelay, maxDelay, exponential, jitter } = strategy;

    // Exponential backoff: delay = baseDelay * (2 ^ attemptCount)
    let delay = exponential
      ? baseDelay * Math.pow(2, attemptCount - 1)
      : baseDelay * attemptCount;

    // Cap at maxDelay
    delay = Math.min(delay, maxDelay);

    // Add jitter (random ±25%)
    if (jitter) {
      const jitterAmount = delay * 0.25;
      delay = delay + (Math.random() * 2 - 1) * jitterAmount;
    }

    const nextRetryAt = new Date(Date.now() + delay);
    return nextRetryAt;
  }

  /**
   * Move job to Dead-Letter Queue (DLQ)
   */
  private async moveToDLQ(jobId: string, finalErrorMessage: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get job details
      const jobResult = await client.query(
        `
        SELECT *
        FROM lhdn_submission_queue
        WHERE id = $1
        FOR UPDATE
        `,
        [jobId]
      );

      if (jobResult.rows.length === 0) {
        throw new Error(`Job ${jobId} not found`);
      }

      const job = jobResult.rows[0];

      // Insert into DLQ
      await client.query(
        `
        INSERT INTO lhdn_dead_letter_queue (
          original_job_id,
          tenant_id,
          job_type,
          payload,
          failure_reason,
          failure_count,
          first_failed_at,
          last_failed_at,
          invoice_id,
          error_category,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, 'PENDING')
        `,
        [
          jobId,
          job.tenant_id,
          job.job_type,
          job.payload,
          finalErrorMessage,
          job.attempt_count,
          job.created_at,
          job.invoice_id,
          this.classifyError(finalErrorMessage),
        ]
      );

      // Update job status to DLQ
      await client.query(
        `
        UPDATE lhdn_submission_queue
        SET
          status = 'DLQ',
          last_error = $2,
          last_error_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
        `,
        [jobId, finalErrorMessage]
      );

      await client.query('COMMIT');

      logger.warn('Job moved to DLQ', {
        jobId,
        jobType: job.job_type,
        failureCount: job.attempt_count,
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Failed to move job to DLQ', { error: error.message, jobId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Classify error for Exception Inbox categorization
   */
  private classifyError(errorMessage: string): string {
    const lowerError = errorMessage.toLowerCase();

    if (lowerError.includes('validation') || lowerError.includes('invalid')) {
      return 'VALIDATION';
    } else if (lowerError.includes('mapping') || lowerError.includes('transform')) {
      return 'MAPPING';
    } else if (
      lowerError.includes('timeout') ||
      lowerError.includes('connection') ||
      lowerError.includes('network')
    ) {
      return 'TRANSPORT';
    } else if (lowerError.includes('lhdn') || lowerError.includes('rejected')) {
      return 'LHDN_REJECT';
    } else if (lowerError.includes('sap') || lowerError.includes('odata')) {
      return 'SAP_ERROR';
    } else {
      return 'UNKNOWN';
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(tenantId?: string): Promise<{
    total: number;
    byStatus: Record<JobStatus, number>;
    byJobType: Record<JobType, number>;
    avgAttempts: number;
    oldestPending: Date | null;
  }> {
    try {
      const whereClause = tenantId ? 'WHERE tenant_id = $1' : '';
      const params = tenantId ? [tenantId] : [];

      const result = await this.pool.query(
        `
        SELECT
          COUNT(*) as total,
          AVG(attempt_count) as avg_attempts,
          jsonb_object_agg(status, status_count) as by_status,
          jsonb_object_agg(job_type, job_type_count) as by_job_type,
          MIN(CASE WHEN status = 'PENDING' THEN created_at END) as oldest_pending
        FROM (
          SELECT
            status,
            job_type,
            attempt_count,
            created_at,
            COUNT(*) OVER (PARTITION BY status) as status_count,
            COUNT(*) OVER (PARTITION BY job_type) as job_type_count
          FROM lhdn_submission_queue
          ${whereClause}
        ) sub
        `,
        params
      );

      const row = result.rows[0];

      return {
        total: parseInt(row.total || '0', 10),
        byStatus: row.by_status || {},
        byJobType: row.by_job_type || {},
        avgAttempts: parseFloat(row.avg_attempts || '0'),
        oldestPending: row.oldest_pending ? new Date(row.oldest_pending) : null,
      };
    } catch (error: any) {
      logger.error('Failed to get queue stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Get DLQ statistics
   */
  async getDLQStats(tenantId?: string): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    try {
      const whereClause = tenantId ? 'WHERE tenant_id = $1' : '';
      const params = tenantId ? [tenantId] : [];

      const result = await this.pool.query(
        `
        SELECT
          COUNT(*) as total,
          jsonb_object_agg(error_category, cat_count) as by_category,
          jsonb_object_agg(status, status_count) as by_status
        FROM (
          SELECT
            error_category,
            status,
            COUNT(*) OVER (PARTITION BY error_category) as cat_count,
            COUNT(*) OVER (PARTITION BY status) as status_count
          FROM lhdn_dead_letter_queue
          ${whereClause}
        ) sub
        `,
        params
      );

      const row = result.rows[0];

      return {
        total: parseInt(row.total || '0', 10),
        byCategory: row.by_category || {},
        byStatus: row.by_status || {},
      };
    } catch (error: any) {
      logger.error('Failed to get DLQ stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Retry jobs from DLQ (manual intervention)
   */
  async retryFromDLQ(dlqId: string): Promise<string> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get DLQ entry
      const dlqResult = await client.query(
        `
        SELECT *
        FROM lhdn_dead_letter_queue
        WHERE id = $1
        FOR UPDATE
        `,
        [dlqId]
      );

      if (dlqResult.rows.length === 0) {
        throw new Error(`DLQ entry ${dlqId} not found`);
      }

      const dlqEntry = dlqResult.rows[0];

      // Re-enqueue the job
      const newJobResult = await client.query(
        `
        INSERT INTO lhdn_submission_queue (
          tenant_id,
          job_type,
          priority,
          payload,
          invoice_id,
          status
        ) VALUES ($1, $2, 1, $3, $4, 'PENDING')
        RETURNING id
        `,
        [dlqEntry.tenant_id, dlqEntry.job_type, dlqEntry.payload, dlqEntry.invoice_id]
      );

      const newJobId = newJobResult.rows[0].id;

      // Mark DLQ entry as resolved
      await client.query(
        `
        UPDATE lhdn_dead_letter_queue
        SET
          status = 'RESOLVED',
          resolved_at = NOW(),
          resolution_notes = 'Manually retried as job ' || $2
        WHERE id = $1
        `,
        [dlqId, newJobId]
      );

      await client.query('COMMIT');

      logger.info('DLQ entry retried', { dlqId, newJobId });

      return newJobId;
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Failed to retry from DLQ', { error: error.message, dlqId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
