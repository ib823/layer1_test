/**
 * Cron Job Manager
 *
 * Manages scheduled jobs using node-cron
 * Inspired by VerifyWise's scheduling architecture
 */

import cron, { ScheduledTask } from 'node-cron';
import logger from '../utils/logger';

export interface CronJob {
  name: string;
  schedule: string;
  task: () => Promise<void> | void;
  enabled?: boolean;
  timezone?: string;
  runOnInit?: boolean;
}

export interface CronJobStatus {
  name: string;
  schedule: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  failureCount: number;
}

/**
 * Cron Manager - Manages all scheduled jobs
 */
export class CronManager {
  private static instance: CronManager;
  private jobs: Map<string, ScheduledTask> = new Map();
  private jobStats: Map<
    string,
    {
      schedule: string;
      enabled: boolean;
      lastRun?: Date;
      runCount: number;
      failureCount: number;
    }
  > = new Map();

  private constructor() {
    logger.info('Cron Manager initialized');
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): CronManager {
    if (!CronManager.instance) {
      CronManager.instance = new CronManager();
    }
    return CronManager.instance;
  }

  /**
   * Register a new cron job
   */
  registerJob(jobConfig: CronJob): void {
    const { name, schedule, task, enabled = true, timezone, runOnInit = false } = jobConfig;

    // Validate cron expression
    if (!cron.validate(schedule)) {
      throw new Error(`Invalid cron expression for job "${name}": ${schedule}`);
    }

    // Check if job already exists
    if (this.jobs.has(name)) {
      logger.warn(`Job "${name}" already exists, skipping registration`);
      return;
    }

    // Wrap task with error handling and logging
    const wrappedTask = async () => {
      const stats = this.jobStats.get(name);
      if (!stats) return;

      try {
        logger.info(`Running scheduled job: ${name}`);
        const startTime = Date.now();

        await task();

        const duration = Date.now() - startTime;
        stats.lastRun = new Date();
        stats.runCount++;

        logger.info(`Scheduled job completed: ${name}`, { duration });
      } catch (error: any) {
        stats.failureCount++;
        logger.error(`Scheduled job failed: ${name}`, {
          error: error.message,
          stack: error.stack,
        });
      }
    };

    // Create the scheduled task
    const scheduledTask = cron.schedule(
      schedule,
      wrappedTask,
      {
        scheduled: enabled,
        timezone,
      } as any // node-cron types have issues with timezone
    );

    // Store job and stats
    this.jobs.set(name, scheduledTask);
    this.jobStats.set(name, {
      schedule,
      enabled,
      runCount: 0,
      failureCount: 0,
    });

    logger.info(`Cron job registered: ${name}`, {
      schedule,
      enabled,
      timezone,
    });

    // Run immediately if requested
    if (runOnInit && enabled) {
      logger.info(`Running job on init: ${name}`);
      wrappedTask();
    }
  }

  /**
   * Register multiple jobs
   */
  registerJobs(jobs: CronJob[]): void {
    for (const job of jobs) {
      try {
        this.registerJob(job);
      } catch (error: any) {
        logger.error(`Failed to register job: ${job.name}`, {
          error: error.message,
        });
      }
    }
  }

  /**
   * Start a job
   */
  startJob(name: string): void {
    const job = this.jobs.get(name);
    const stats = this.jobStats.get(name);

    if (!job || !stats) {
      throw new Error(`Job not found: ${name}`);
    }

    job.start();
    stats.enabled = true;
    logger.info(`Cron job started: ${name}`);
  }

  /**
   * Stop a job
   */
  stopJob(name: string): void {
    const job = this.jobs.get(name);
    const stats = this.jobStats.get(name);

    if (!job || !stats) {
      throw new Error(`Job not found: ${name}`);
    }

    job.stop();
    stats.enabled = false;
    logger.info(`Cron job stopped: ${name}`);
  }

  /**
   * Remove a job
   */
  removeJob(name: string): void {
    const job = this.jobs.get(name);

    if (!job) {
      throw new Error(`Job not found: ${name}`);
    }

    job.stop();
    this.jobs.delete(name);
    this.jobStats.delete(name);
    logger.info(`Cron job removed: ${name}`);
  }

  /**
   * Get job status
   */
  getJobStatus(name: string): CronJobStatus | undefined {
    const stats = this.jobStats.get(name);

    if (!stats) {
      return undefined;
    }

    return {
      name,
      schedule: stats.schedule,
      enabled: stats.enabled,
      lastRun: stats.lastRun,
      nextRun: this.getNextRunDate(stats.schedule),
      runCount: stats.runCount,
      failureCount: stats.failureCount,
    };
  }

  /**
   * Get all jobs status
   */
  getAllJobsStatus(): CronJobStatus[] {
    const statuses: CronJobStatus[] = [];

    for (const [name] of this.jobs) {
      const status = this.getJobStatus(name);
      if (status) {
        statuses.push(status);
      }
    }

    return statuses;
  }

  /**
   * Check if a job exists
   */
  hasJob(name: string): boolean {
    return this.jobs.has(name);
  }

  /**
   * Get job names
   */
  getJobNames(): string[] {
    return Array.from(this.jobs.keys());
  }

  /**
   * Start all jobs
   */
  startAll(): void {
    for (const [name] of this.jobs) {
      try {
        this.startJob(name);
      } catch (error: any) {
        logger.error(`Failed to start job: ${name}`, {
          error: error.message,
        });
      }
    }
    logger.info('All cron jobs started');
  }

  /**
   * Stop all jobs
   */
  stopAll(): void {
    for (const [name] of this.jobs) {
      try {
        this.stopJob(name);
      } catch (error: any) {
        logger.error(`Failed to stop job: ${name}`, {
          error: error.message,
        });
      }
    }
    logger.info('All cron jobs stopped');
  }

  /**
   * Calculate next run date from cron expression
   */
  private getNextRunDate(schedule: string): Date | undefined {
    try {
      // This is a simplified implementation
      // For accurate next run calculation, consider using 'cron-parser' package
      // For now, return undefined
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Shutdown - stop all jobs
   */
  shutdown(): void {
    logger.info('Shutting down Cron Manager...');
    this.stopAll();
    this.jobs.clear();
    this.jobStats.clear();
    logger.info('Cron Manager shutdown complete');
  }
}

// Export singleton getter
export const getCronManager = () => CronManager.getInstance();
