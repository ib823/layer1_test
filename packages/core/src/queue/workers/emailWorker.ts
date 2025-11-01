/**
 * Email Queue Worker
 *
 * Processes email jobs from the queue
 */

import { Job } from 'bullmq';
import { getEmailService, EmailData } from '../../email/EmailService';
import logger from '../../utils/logger';
import { EmailJobType } from '../queues';

export interface EmailJobData {
  type: EmailJobType;
  email: EmailData;
}

/**
 * Email worker processor
 */
export async function processEmailJob(job: Job<EmailJobData>): Promise<any> {
  const { type, email } = job.data;

  logger.info('Processing email job', {
    jobId: job.id,
    type,
    to: email.to,
    subject: email.subject,
  });

  try {
    const emailService = getEmailService();

    const result = await emailService.sendEmail(email);

    if (!result.success) {
      throw new Error(result.error || 'Email send failed');
    }

    logger.info('Email job completed', {
      jobId: job.id,
      type,
      messageId: result.messageId,
    });

    return {
      success: true,
      messageId: result.messageId,
      previewUrl: result.previewUrl,
    };
  } catch (error: any) {
    logger.error('Email job failed', {
      jobId: job.id,
      type,
      error: error.message,
      stack: error.stack,
    });

    throw error; // Will be retried by BullMQ
  }
}
