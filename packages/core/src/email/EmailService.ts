/**
 * Email Service
 *
 * Handles email sending via Nodemailer + Resend
 * Inspired by VerifyWise's email architecture
 */

import nodemailer, { Transporter } from 'nodemailer';
import { Resend } from 'resend';
import logger from '../utils/logger';
import { renderEmailTemplate } from './templates';

export interface EmailConfig {
  provider: 'resend' | 'smtp' | 'test';
  resend?: {
    apiKey: string;
  };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: {
    name: string;
    email: string;
  };
}

export interface EmailData {
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, any>;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * Email Service - Singleton
 */
export class EmailService {
  private static instance: EmailService;
  private config: EmailConfig;
  private transporter?: Transporter;
  private resendClient?: Resend;

  private constructor(config: EmailConfig) {
    this.config = config;
    this.initialize();
  }

  /**
   * Initialize the email service
   */
  static initialize(config: EmailConfig): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService(config);
    }
    return EmailService.instance;
  }

  /**
   * Get the email service instance
   */
  static getInstance(): EmailService {
    if (!EmailService.instance) {
      throw new Error('EmailService not initialized. Call initialize() first.');
    }
    return EmailService.instance;
  }

  /**
   * Initialize the email provider
   */
  private initialize(): void {
    switch (this.config.provider) {
      case 'resend':
        if (!this.config.resend?.apiKey) {
          throw new Error('Resend API key is required');
        }
        this.resendClient = new Resend(this.config.resend.apiKey);
        logger.info('Email service initialized with Resend');
        break;

      case 'smtp':
        if (!this.config.smtp) {
          throw new Error('SMTP configuration is required');
        }
        this.transporter = nodemailer.createTransport(this.config.smtp);
        logger.info('Email service initialized with SMTP');
        break;

      case 'test':
        // Test mode - creates ethereal email account
        this.initializeTestMode();
        break;

      default:
        throw new Error(`Unknown email provider: ${this.config.provider}`);
    }
  }

  /**
   * Initialize test mode with Ethereal
   */
  private async initializeTestMode(): Promise<void> {
    const testAccount = await nodemailer.createTestAccount();

    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    logger.info('Email service initialized in TEST mode', {
      user: testAccount.user,
      previewUrl: 'https://ethereal.email',
    });
  }

  /**
   * Send an email
   */
  async sendEmail(emailData: EmailData): Promise<{
    success: boolean;
    messageId?: string;
    previewUrl?: string;
    error?: string;
  }> {
    try {
      // Render email template
      const { html, text } = await renderEmailTemplate(
        emailData.template,
        emailData.data
      );

      // Prepare recipients
      const to = Array.isArray(emailData.to) ? emailData.to : [emailData.to];
      const cc = emailData.cc
        ? Array.isArray(emailData.cc)
          ? emailData.cc
          : [emailData.cc]
        : undefined;
      const bcc = emailData.bcc
        ? Array.isArray(emailData.bcc)
          ? emailData.bcc
          : [emailData.bcc]
        : undefined;

      // Send via appropriate provider
      if (this.config.provider === 'resend' && this.resendClient) {
        return await this.sendViaResend({
          to,
          subject: emailData.subject,
          html,
          cc,
          bcc,
          attachments: emailData.attachments,
        });
      } else if (this.transporter) {
        return await this.sendViaSmtp({
          to,
          subject: emailData.subject,
          html,
          text,
          cc,
          bcc,
          attachments: emailData.attachments,
        });
      } else {
        throw new Error('No email transport configured');
      }
    } catch (error: any) {
      logger.error('Failed to send email', {
        error: error.message,
        stack: error.stack,
        template: emailData.template,
        to: emailData.to,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send email via Resend
   */
  private async sendViaResend(data: {
    to: string[];
    subject: string;
    html: string;
    cc?: string[];
    bcc?: string[];
    attachments?: any[];
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const result = await this.resendClient!.emails.send({
        from: `${this.config.from.name} <${this.config.from.email}>`,
        to: data.to,
        subject: data.subject,
        html: data.html,
        cc: data.cc,
        bcc: data.bcc,
        attachments: data.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
        })),
      });

      logger.info('Email sent via Resend', {
        messageId: result.data?.id,
        to: data.to,
      });

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error: any) {
      logger.error('Resend email failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send email via SMTP
   */
  private async sendViaSmtp(data: {
    to: string[];
    subject: string;
    html: string;
    text: string;
    cc?: string[];
    bcc?: string[];
    attachments?: any[];
  }): Promise<{
    success: boolean;
    messageId?: string;
    previewUrl?: string;
    error?: string;
  }> {
    try {
      const info = await this.transporter!.sendMail({
        from: `"${this.config.from.name}" <${this.config.from.email}>`,
        to: data.to.join(', '),
        cc: data.cc?.join(', '),
        bcc: data.bcc?.join(', '),
        subject: data.subject,
        html: data.html,
        text: data.text,
        attachments: data.attachments,
      });

      logger.info('Email sent via SMTP', {
        messageId: info.messageId,
        to: data.to,
      });

      // Get preview URL for test mode
      const previewUrl =
        this.config.provider === 'test'
          ? nodemailer.getTestMessageUrl(info)
          : undefined;

      if (previewUrl) {
        logger.info('Test email preview URL', { previewUrl });
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: previewUrl || undefined,
      };
    } catch (error: any) {
      logger.error('SMTP email failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send bulk emails (batched)
   */
  async sendBulkEmails(
    emails: EmailData[],
    batchSize: number = 10
  ): Promise<{
    total: number;
    success: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      total: emails.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process in batches
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map((email) => this.sendEmail(email))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value.success) {
          results.success++;
        } else {
          results.failed++;
          const error =
            result.status === 'fulfilled'
              ? result.value.error
              : result.reason?.message;
          if (error) {
            results.errors.push(error);
          }
        }
      }

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < emails.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    logger.info('Bulk email send completed', results);
    return results;
  }

  /**
   * Verify email configuration
   */
  async verify(): Promise<boolean> {
    try {
      if (this.transporter) {
        await this.transporter.verify();
        logger.info('Email configuration verified');
        return true;
      } else if (this.resendClient) {
        // Resend doesn't have a verify method, consider it valid if initialized
        logger.info('Resend email configuration valid');
        return true;
      }
      return false;
    } catch (error: any) {
      logger.error('Email configuration verification failed', {
        error: error.message,
      });
      return false;
    }
  }
}

// Export singleton getter
export const getEmailService = () => EmailService.getInstance();
