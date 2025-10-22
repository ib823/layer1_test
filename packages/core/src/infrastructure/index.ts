/**
 * Infrastructure Initialization
 *
 * Centralized setup for all infrastructure components:
 * - Job Queue System (BullMQ + Redis)
 * - Email Service (Nodemailer + Resend)
 * - Scheduled Jobs (node-cron)
 */

import { QueueManager, QueueConfig } from '../queue/QueueManager';
import { initializeQueues, QUEUE_NAMES } from '../queue/queues';
import { processEmailJob } from '../queue/workers/emailWorker';
import { EmailService, EmailConfig } from '../email/EmailService';
import { CronManager } from '../scheduler/CronManager';
import { getAllScheduledJobs } from '../scheduler/jobs';
import logger from '../utils/logger';

export interface InfrastructureConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  email: EmailConfig;
  scheduler: {
    enabled: boolean;
    timezone?: string;
  };
  workers: {
    email?: {
      concurrency?: number;
    };
    analysis?: {
      concurrency?: number;
    };
  };
}

/**
 * Infrastructure Manager
 *
 * Manages lifecycle of all infrastructure components
 */
export class InfrastructureManager {
  private static instance: InfrastructureManager;
  private queueManager?: QueueManager;
  private emailService?: EmailService;
  private cronManager?: CronManager;
  private initialized = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): InfrastructureManager {
    if (!InfrastructureManager.instance) {
      InfrastructureManager.instance = new InfrastructureManager();
    }
    return InfrastructureManager.instance;
  }

  /**
   * Initialize all infrastructure components
   */
  async initialize(config: InfrastructureConfig): Promise<void> {
    if (this.initialized) {
      logger.warn('Infrastructure already initialized');
      return;
    }

    logger.info('Initializing infrastructure...');

    try {
      // 1. Initialize Queue Manager
      logger.info('Initializing queue manager...');
      const queueConfig: QueueConfig = {
        redis: config.redis,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      };

      this.queueManager = QueueManager.initialize(queueConfig);
      initializeQueues(this.queueManager);
      logger.info('Queue manager initialized');

      // 2. Register Workers
      logger.info('Registering workers...');

      // Email worker
      this.queueManager.registerWorker(
        QUEUE_NAMES.EMAIL,
        processEmailJob,
        {
          concurrency: config.workers.email?.concurrency || 10,
        }
      );

      logger.info('Workers registered');

      // 3. Initialize Email Service
      logger.info('Initializing email service...');
      this.emailService = EmailService.initialize(config.email);

      // Verify email configuration
      const emailVerified = await this.emailService.verify();
      if (emailVerified) {
        logger.info('Email service verified');
      } else {
        logger.warn('Email service verification failed');
      }

      // 4. Initialize Cron Manager (if enabled)
      if (config.scheduler.enabled) {
        logger.info('Initializing scheduler...');
        this.cronManager = CronManager.getInstance();

        // Register all scheduled jobs
        const jobs = getAllScheduledJobs();
        this.cronManager.registerJobs(jobs);

        logger.info(`Scheduler initialized with ${jobs.length} jobs`);
      } else {
        logger.info('Scheduler disabled');
      }

      this.initialized = true;
      logger.info('Infrastructure initialization complete');

      // Log startup summary
      this.logStartupSummary();
    } catch (error: any) {
      logger.error('Infrastructure initialization failed', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Check if infrastructure is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get queue manager
   */
  getQueueManager(): QueueManager {
    if (!this.queueManager) {
      throw new Error('Queue manager not initialized');
    }
    return this.queueManager;
  }

  /**
   * Get email service
   */
  getEmailService(): EmailService {
    if (!this.emailService) {
      throw new Error('Email service not initialized');
    }
    return this.emailService;
  }

  /**
   * Get cron manager
   */
  getCronManager(): CronManager | undefined {
    return this.cronManager;
  }

  /**
   * Get infrastructure health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: {
      queueManager: boolean;
      emailService: boolean;
      scheduler: boolean;
    };
    queues?: Record<string, any>;
    scheduledJobs?: any[];
  }> {
    const components = {
      queueManager: !!this.queueManager,
      emailService: !!this.emailService,
      scheduler: !!this.cronManager,
    };

    // Get queue stats
    let queues: Record<string, any> = {};
    if (this.queueManager) {
      try {
        const queueNames = Object.values(QUEUE_NAMES);
        for (const queueName of queueNames) {
          queues[queueName] = await this.queueManager.getQueueStats(queueName);
        }
      } catch (error: any) {
        logger.error('Failed to get queue stats', { error: error.message });
      }
    }

    // Get scheduled jobs status
    let scheduledJobs: any[] = [];
    if (this.cronManager) {
      try {
        scheduledJobs = this.cronManager.getAllJobsStatus();
      } catch (error: any) {
        logger.error('Failed to get scheduled jobs status', { error: error.message });
      }
    }

    // Determine overall status
    const allHealthy = Object.values(components).every((c) => c === true);
    const anyHealthy = Object.values(components).some((c) => c === true);

    const status = allHealthy
      ? 'healthy'
      : anyHealthy
      ? 'degraded'
      : 'unhealthy';

    return {
      status,
      components,
      queues,
      scheduledJobs,
    };
  }

  /**
   * Shutdown infrastructure gracefully
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      logger.warn('Infrastructure not initialized, nothing to shutdown');
      return;
    }

    logger.info('Shutting down infrastructure...');

    try {
      // 1. Stop cron jobs
      if (this.cronManager) {
        logger.info('Stopping scheduled jobs...');
        this.cronManager.shutdown();
      }

      // 2. Close queue manager (workers, queues, redis)
      if (this.queueManager) {
        logger.info('Closing queue manager...');
        await this.queueManager.close();
      }

      this.initialized = false;
      logger.info('Infrastructure shutdown complete');
    } catch (error: any) {
      logger.error('Infrastructure shutdown failed', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Log startup summary
   */
  private logStartupSummary(): void {
    const summary = {
      initialized: this.initialized,
      components: {
        queueManager: !!this.queueManager,
        emailService: !!this.emailService,
        scheduler: !!this.cronManager,
      },
      queues: this.queueManager ? Object.values(QUEUE_NAMES) : [],
      scheduledJobs: this.cronManager
        ? this.cronManager.getJobNames().length
        : 0,
    };

    logger.info('Infrastructure startup summary', summary);
  }
}

/**
 * Initialize infrastructure (convenience function)
 */
export async function initializeInfrastructure(
  config: InfrastructureConfig
): Promise<InfrastructureManager> {
  const manager = InfrastructureManager.getInstance();
  await manager.initialize(config);
  return manager;
}

/**
 * Get infrastructure manager instance
 */
export function getInfrastructure(): InfrastructureManager {
  return InfrastructureManager.getInstance();
}

/**
 * Shutdown infrastructure (convenience function)
 */
export async function shutdownInfrastructure(): Promise<void> {
  const manager = InfrastructureManager.getInstance();
  await manager.shutdown();
}
