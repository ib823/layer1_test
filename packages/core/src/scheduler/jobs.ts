/**
 * Scheduled Jobs Definitions
 *
 * All application scheduled jobs
 */

import { CronJob } from './CronManager';
import { getQueueManager } from '../queue/QueueManager';
import { QUEUE_NAMES, AnalysisJobType, SyncJobType } from '../queue/queues';
import { auditLogger } from '../audit/AuditLogger';
import { PrismaClient } from '../generated/prisma';
import logger from '../utils/logger';

/**
 * Daily SoD Analysis Job
 * Runs every day at 2:00 AM
 */
export const dailySoDAnalysis: CronJob = {
  name: 'daily-sod-analysis',
  schedule: '0 2 * * *', // 2:00 AM daily
  timezone: 'UTC',
  enabled: true,
  task: async () => {
    logger.info('Running daily SoD analysis');

    const queueManager = getQueueManager();

    // Queue SoD analysis for all active tenants
    // In a real implementation, fetch active tenants from database
    await queueManager.addJob(
      QUEUE_NAMES.ANALYSIS,
      AnalysisJobType.SOD_ANALYSIS,
      {
        type: 'scheduled',
        scheduledAt: new Date().toISOString(),
      }
    );

    logger.info('Daily SoD analysis queued');
  },
};

/**
 * Nightly GL Anomaly Detection
 * Runs every night at 3:00 AM
 */
export const nightlyGLAnomalyDetection: CronJob = {
  name: 'nightly-gl-anomaly-detection',
  schedule: '0 3 * * *', // 3:00 AM daily
  timezone: 'UTC',
  enabled: true,
  task: async () => {
    logger.info('Running nightly GL anomaly detection');

    const queueManager = getQueueManager();

    await queueManager.addJob(
      QUEUE_NAMES.ANALYSIS,
      AnalysisJobType.GL_ANOMALY_DETECTION,
      {
        type: 'scheduled',
        period: 'last-24-hours',
        scheduledAt: new Date().toISOString(),
      }
    );

    logger.info('Nightly GL anomaly detection queued');
  },
};

/**
 * Weekly Vendor Quality Check
 * Runs every Monday at 4:00 AM
 */
export const weeklyVendorQualityCheck: CronJob = {
  name: 'weekly-vendor-quality-check',
  schedule: '0 4 * * 1', // Monday 4:00 AM
  timezone: 'UTC',
  enabled: true,
  task: async () => {
    logger.info('Running weekly vendor quality check');

    const queueManager = getQueueManager();

    await queueManager.addJob(
      QUEUE_NAMES.ANALYSIS,
      AnalysisJobType.VENDOR_QUALITY_CHECK,
      {
        type: 'scheduled',
        scheduledAt: new Date().toISOString(),
      }
    );

    logger.info('Weekly vendor quality check queued');
  },
};

/**
 * Monthly Access Review Reminder
 * Runs on 1st of every month at 9:00 AM
 */
export const monthlyAccessReviewReminder: CronJob = {
  name: 'monthly-access-review-reminder',
  schedule: '0 9 1 * *', // 1st of month, 9:00 AM
  timezone: 'UTC',
  enabled: true,
  task: async () => {
    logger.info('Running monthly access review reminder');

    const queueManager = getQueueManager();

    await queueManager.addJob(
      QUEUE_NAMES.ANALYSIS,
      AnalysisJobType.USER_ACCESS_REVIEW,
      {
        type: 'scheduled',
        action: 'send-reminders',
        scheduledAt: new Date().toISOString(),
      }
    );

    logger.info('Monthly access review reminders queued');
  },
};

/**
 * Hourly ERP Data Sync
 * Runs every hour
 */
export const hourlyERPSync: CronJob = {
  name: 'hourly-erp-sync',
  schedule: '0 * * * *', // Every hour
  timezone: 'UTC',
  enabled: true,
  task: async () => {
    logger.info('Running hourly ERP data sync');

    const queueManager = getQueueManager();

    await queueManager.addJob(
      QUEUE_NAMES.SYNC,
      SyncJobType.SYNC_USERS,
      {
        type: 'scheduled',
        syncType: 'incremental',
        scheduledAt: new Date().toISOString(),
      }
    );

    logger.info('Hourly ERP sync queued');
  },
};

/**
 * Daily Queue Cleanup
 * Runs every day at 1:00 AM
 * Cleans old completed and failed jobs
 */
export const dailyQueueCleanup: CronJob = {
  name: 'daily-queue-cleanup',
  schedule: '0 1 * * *', // 1:00 AM daily
  timezone: 'UTC',
  enabled: true,
  task: async () => {
    logger.info('Running daily queue cleanup');

    const queueManager = getQueueManager();

    // Clean completed jobs older than 1 day
    const oneDayAgo = 24 * 60 * 60 * 1000;

    await Promise.all([
      queueManager.cleanQueue(QUEUE_NAMES.EMAIL, oneDayAgo, 'completed'),
      queueManager.cleanQueue(QUEUE_NAMES.ANALYSIS, oneDayAgo, 'completed'),
      queueManager.cleanQueue(QUEUE_NAMES.REPORTING, oneDayAgo, 'completed'),
      queueManager.cleanQueue(QUEUE_NAMES.SYNC, oneDayAgo, 'completed'),
      queueManager.cleanQueue(QUEUE_NAMES.NOTIFICATIONS, oneDayAgo, 'completed'),
    ]);

    // Clean failed jobs older than 7 days
    const sevenDaysAgo = 7 * 24 * 60 * 60 * 1000;

    await Promise.all([
      queueManager.cleanQueue(QUEUE_NAMES.EMAIL, sevenDaysAgo, 'failed'),
      queueManager.cleanQueue(QUEUE_NAMES.ANALYSIS, sevenDaysAgo, 'failed'),
      queueManager.cleanQueue(QUEUE_NAMES.REPORTING, sevenDaysAgo, 'failed'),
      queueManager.cleanQueue(QUEUE_NAMES.SYNC, sevenDaysAgo, 'failed'),
      queueManager.cleanQueue(QUEUE_NAMES.NOTIFICATIONS, sevenDaysAgo, 'failed'),
    ]);

    logger.info('Daily queue cleanup completed');
  },
};

/**
 * Weekly Audit Log Cleanup
 * Runs every Sunday at 2:30 AM
 * Enforces retention policies on audit logs
 */
export const weeklyAuditLogCleanup: CronJob = {
  name: 'weekly-audit-log-cleanup',
  schedule: '30 2 * * 0', // Sunday 2:30 AM
  timezone: 'UTC',
  enabled: true,
  task: async () => {
    logger.info('Running weekly audit log cleanup');

    try {
      const prisma = new PrismaClient();

      // Get all tenants
      const tenants = await prisma.tenant.findMany({
        where: { status: 'active' },
        select: { id: true, name: true },
      });

      logger.info(`Cleaning audit logs for ${tenants.length} tenants`);

      let totalDeleted = 0;

      for (const tenant of tenants) {
        try {
          const deleted = await auditLogger.cleanup(tenant.id);
          totalDeleted += deleted;

          if (deleted > 0) {
            logger.info(`Deleted ${deleted} expired audit logs for tenant ${tenant.name}`);
          }
        } catch (error) {
          logger.error(`Failed to cleanup audit logs for tenant ${tenant.id}`, { error });
        }
      }

      await prisma.$disconnect();

      logger.info(`Weekly audit log cleanup completed. Total deleted: ${totalDeleted}`);
    } catch (error) {
      logger.error('Failed to run audit log cleanup', { error });
      throw error;
    }
  },
};

/**
 * Weekly Report Delivery
 * Runs every Monday at 8:00 AM
 * Generates and emails scheduled reports
 */
export const weeklyReportDelivery: CronJob = {
  name: 'weekly-report-delivery',
  schedule: '0 8 * * 1', // Monday 8:00 AM
  timezone: 'UTC',
  enabled: true,
  task: async () => {
    logger.info('Running weekly report delivery');

    try {
      const prisma = new PrismaClient();

      // Get all tenants with scheduled reports
      // TODO: Add ScheduledReport table to Prisma schema
      // For now, this is a placeholder

      logger.info('Weekly report delivery completed');

      await prisma.$disconnect();
    } catch (error) {
      logger.error('Failed to run weekly report delivery', { error });
      throw error;
    }
  },
};

/**
 * Automation Runner
 * Runs every minute to check for scheduled automations
 */
export const automationRunner: CronJob = {
  name: 'automation-runner',
  schedule: '* * * * *', // Every minute
  timezone: 'UTC',
  enabled: true,
  task: async () => {
    // Import here to avoid circular dependency
    const { automationEngine } = await import('../automation/AutomationEngine');

    // Trigger scheduled automations
    // This will be called every minute, automations will check their own schedule
    logger.debug('Automation runner tick');
  },
};

/**
 * Get all scheduled jobs
 */
export function getAllScheduledJobs(): CronJob[] {
  return [
    dailySoDAnalysis,
    nightlyGLAnomalyDetection,
    weeklyVendorQualityCheck,
    monthlyAccessReviewReminder,
    hourlyERPSync,
    dailyQueueCleanup,
    weeklyAuditLogCleanup,
    weeklyReportDelivery,
    automationRunner,
  ];
}
