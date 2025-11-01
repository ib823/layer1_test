/**
 * Queue Definitions
 *
 * All application queues and their configurations
 */

import { Queue } from 'bullmq';
import { QueueManager } from './QueueManager';

/**
 * Queue names
 */
export const QUEUE_NAMES = {
  EMAIL: 'email',
  ANALYSIS: 'analysis',
  REPORTING: 'reporting',
  SYNC: 'erp-sync',
  NOTIFICATIONS: 'notifications',
} as const;

/**
 * Initialize all application queues
 */
export function initializeQueues(queueManager: QueueManager): void {
  // Email queue - high priority, frequent
  queueManager.createQueue(QUEUE_NAMES.EMAIL, {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  });

  // Analysis queue - CPU intensive, longer running
  queueManager.createQueue(QUEUE_NAMES.ANALYSIS, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: 50,
    removeOnFail: 200,
  });

  // Reporting queue - memory intensive
  queueManager.createQueue(QUEUE_NAMES.REPORTING, {
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 30000,
    },
    removeOnComplete: 25,
    removeOnFail: 100,
  });

  // ERP Sync queue - external API calls
  queueManager.createQueue(QUEUE_NAMES.SYNC, {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 15000,
    },
    removeOnComplete: 20,
    removeOnFail: 100,
  });

  // Notifications queue - Slack, Teams, webhooks
  queueManager.createQueue(QUEUE_NAMES.NOTIFICATIONS, {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}

/**
 * Get a specific queue
 */
export function getQueue(name: keyof typeof QUEUE_NAMES): Queue {
  const queueManager = QueueManager.getInstance();
  const queue = queueManager.getQueue(QUEUE_NAMES[name]);

  if (!queue) {
    throw new Error(`Queue not initialized: ${QUEUE_NAMES[name]}`);
  }

  return queue;
}

/**
 * Email job types
 */
export enum EmailJobType {
  SEND_EMAIL = 'send-email',
  SEND_INVITATION = 'send-invitation',
  SEND_ALERT = 'send-alert',
  SEND_REPORT = 'send-report',
}

/**
 * Analysis job types
 */
export enum AnalysisJobType {
  SOD_ANALYSIS = 'sod-analysis',
  GL_ANOMALY_DETECTION = 'gl-anomaly-detection',
  INVOICE_MATCHING = 'invoice-matching',
  VENDOR_QUALITY_CHECK = 'vendor-quality-check',
  USER_ACCESS_REVIEW = 'user-access-review',
}

/**
 * Reporting job types
 */
export enum ReportingJobType {
  GENERATE_PDF = 'generate-pdf',
  GENERATE_DOCX = 'generate-docx',
  GENERATE_EXCEL = 'generate-excel',
  SEND_SCHEDULED_REPORT = 'send-scheduled-report',
}

/**
 * Sync job types
 */
export enum SyncJobType {
  SYNC_USERS = 'sync-users',
  SYNC_ROLES = 'sync-roles',
  SYNC_GL_DATA = 'sync-gl-data',
  SYNC_VENDOR_DATA = 'sync-vendor-data',
  FULL_SYNC = 'full-sync',
}

/**
 * Notification job types
 */
export enum NotificationJobType {
  SLACK_MESSAGE = 'slack-message',
  TEAMS_MESSAGE = 'teams-message',
  WEBHOOK_CALL = 'webhook-call',
}
