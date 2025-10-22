/**
 * Job Queue Manager
 *
 * BullMQ-based job queue system for background processing
 * Inspired by VerifyWise's queue architecture
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import logger from '../utils/logger';

export interface JobConfig {
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

export interface QueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  defaultJobOptions?: JobConfig;
}

/**
 * Queue Manager - Central management for all job queues
 */
export class QueueManager {
  private static instance: QueueManager;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private connection: Redis;
  private config: QueueConfig;

  private constructor(config: QueueConfig) {
    this.config = config;
    this.connection = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db || 0,
      maxRetriesPerRequest: null, // Required for BullMQ
    });

    this.connection.on('connect', () => {
      logger.info('Redis connection established for job queues');
    });

    this.connection.on('error', (error) => {
      logger.error('Redis connection error', { error });
    });
  }

  /**
   * Initialize the queue manager (singleton)
   */
  static initialize(config: QueueConfig): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager(config);
    }
    return QueueManager.instance;
  }

  /**
   * Get the queue manager instance
   */
  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      throw new Error('QueueManager not initialized. Call initialize() first.');
    }
    return QueueManager.instance;
  }

  /**
   * Create a new queue
   */
  createQueue(name: string, options?: JobConfig): Queue {
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    const queue = new Queue(name, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: options?.attempts || this.config.defaultJobOptions?.attempts || 3,
        backoff: options?.backoff || this.config.defaultJobOptions?.backoff || {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: options?.removeOnComplete ?? this.config.defaultJobOptions?.removeOnComplete ?? 100,
        removeOnFail: options?.removeOnFail ?? this.config.defaultJobOptions?.removeOnFail ?? 1000,
      },
    });

    // Setup queue events
    const events = new QueueEvents(name, {
      connection: this.connection,
    });

    events.on('completed', ({ jobId, returnvalue }) => {
      logger.info(`Job completed`, { queue: name, jobId, returnvalue });
    });

    events.on('failed', ({ jobId, failedReason }) => {
      logger.error(`Job failed`, { queue: name, jobId, failedReason });
    });

    this.queues.set(name, queue);
    this.queueEvents.set(name, events);

    logger.info(`Queue created: ${name}`);
    return queue;
  }

  /**
   * Register a worker for a queue
   */
  registerWorker<T = any>(
    queueName: string,
    processor: (job: Job<T>) => Promise<any>,
    options?: {
      concurrency?: number;
      limiter?: {
        max: number;
        duration: number;
      };
    }
  ): Worker {
    if (this.workers.has(queueName)) {
      logger.warn(`Worker already registered for queue: ${queueName}`);
      return this.workers.get(queueName)!;
    }

    const worker = new Worker(queueName, processor, {
      connection: this.connection,
      concurrency: options?.concurrency || 5,
      limiter: options?.limiter,
    });

    worker.on('completed', (job) => {
      logger.info(`Worker completed job`, { queue: queueName, jobId: job.id });
    });

    worker.on('failed', (job, error) => {
      logger.error(`Worker failed job`, {
        queue: queueName,
        jobId: job?.id,
        error: error.message,
        stack: error.stack,
      });
    });

    worker.on('error', (error) => {
      logger.error(`Worker error`, { queue: queueName, error: error.message });
    });

    this.workers.set(queueName, worker);
    logger.info(`Worker registered for queue: ${queueName}`);

    return worker;
  }

  /**
   * Add a job to a queue
   */
  async addJob<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    options?: JobConfig & { delay?: number; priority?: number }
  ): Promise<Job<T>> {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const job = await queue.add(jobName, data, {
      attempts: options?.attempts,
      backoff: options?.backoff,
      removeOnComplete: options?.removeOnComplete,
      removeOnFail: options?.removeOnFail,
      delay: options?.delay,
      priority: options?.priority,
    });

    logger.info(`Job added to queue`, {
      queue: queueName,
      jobName,
      jobId: job.id,
    });

    return job;
  }

  /**
   * Get a queue by name
   */
  getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  /**
   * Get a worker by queue name
   */
  getWorker(name: string): Worker | undefined {
    return this.workers.get(name);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.pause();
      logger.info(`Queue paused: ${queueName}`);
    }
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.resume();
      logger.info(`Queue resumed: ${queueName}`);
    }
  }

  /**
   * Clean old jobs from a queue
   */
  async cleanQueue(
    queueName: string,
    grace: number = 3600000, // 1 hour
    status: 'completed' | 'failed' | 'delayed' = 'completed'
  ): Promise<string[]> {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const jobIds = await queue.clean(grace, 1000, status);
    logger.info(`Queue cleaned`, {
      queue: queueName,
      status,
      count: jobIds.length,
    });

    return jobIds;
  }

  /**
   * Close all queues and workers
   */
  async close(): Promise<void> {
    logger.info('Closing queue manager...');

    // Close all workers
    for (const [name, worker] of this.workers.entries()) {
      await worker.close();
      logger.info(`Worker closed: ${name}`);
    }

    // Close all queue events
    for (const [name, events] of this.queueEvents.entries()) {
      await events.close();
      logger.info(`Queue events closed: ${name}`);
    }

    // Close all queues
    for (const [name, queue] of this.queues.entries()) {
      await queue.close();
      logger.info(`Queue closed: ${name}`);
    }

    // Close Redis connection
    await this.connection.quit();
    logger.info('Redis connection closed');
  }
}

// Export singleton getter
export const getQueueManager = () => QueueManager.getInstance();
