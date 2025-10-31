/**
 * NotificationService
 *
 * Handles notifications for e-invoice events
 * - Email alerts
 * - Webhook notifications
 * - Event logging
 */

import axios, { AxiosError } from 'axios';
import { LHDNInvoice, LHDNTenantConfig, InvoiceStatus } from '../types';
import { logger } from '../utils/logger';

export interface NotificationEvent {
  type: 'SUBMISSION' | 'ACCEPTANCE' | 'REJECTION' | 'CANCELLATION' | 'VALIDATION_ERROR';
  invoice: LHDNInvoice;
  timestamp: Date;
  message: string;
  details?: any;
}

export interface EmailNotification {
  to: string[];
  subject: string;
  body: string;
  html?: string;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  tenantId: string;
  invoice: {
    invoiceNumber: string;
    documentType: string;
    status: InvoiceStatus;
    totalAmount: number;
    submissionUid?: string;
    lhdnReferenceNumber?: string;
  };
  details?: any;
}

export class NotificationService {
  constructor(private config: LHDNTenantConfig) {}

  /**
   * Send notification for invoice event
   */
  async notify(event: NotificationEvent): Promise<void> {
    logger.info('Processing notification', {
      type: event.type,
      invoiceNumber: event.invoice.invoiceNumber,
    });

    // Send email if configured
    if (this.config.notificationEmails && this.config.notificationEmails.length > 0) {
      await this.sendEmailNotification(event);
    }

    // Send webhook if configured
    if (this.config.webhookUrl) {
      await this.sendWebhookNotification(event);
    }
  }

  /**
   * Send email notification
   * Note: Requires email service integration (e.g., SendGrid, AWS SES)
   */
  private async sendEmailNotification(event: NotificationEvent): Promise<void> {
    try {
      const email = this.buildEmailNotification(event);

      logger.info('Sending email notification', {
        to: email.to,
        subject: email.subject,
      });

      // Placeholder for email service integration
      // In production, integrate with SendGrid, AWS SES, or BTP Destination
      /*
      await emailService.send({
        to: email.to,
        subject: email.subject,
        html: email.html,
      });
      */

      logger.info('Email notification sent', {
        to: email.to,
      });
    } catch (error: any) {
      logger.error('Email notification failed', {
        error: error.message,
        event: event.type,
      });
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(event: NotificationEvent): Promise<void> {
    try {
      const payload = this.buildWebhookPayload(event);

      logger.info('Sending webhook notification', {
        url: this.config.webhookUrl,
        event: event.type,
      });

      await axios.post(this.config.webhookUrl!, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-LHDN-Event': event.type,
          'X-Tenant-ID': event.invoice.tenantId,
        },
        timeout: 10000, // 10 seconds
      });

      logger.info('Webhook notification sent', {
        url: this.config.webhookUrl,
      });
    } catch (error: any) {
      const axiosError = error as AxiosError;
      logger.error('Webhook notification failed', {
        error: axiosError.message,
        status: axiosError.response?.status,
        event: event.type,
      });
    }
  }

  /**
   * Build email notification content
   */
  private buildEmailNotification(event: NotificationEvent): EmailNotification {
    const invoice = event.invoice;

    let subject: string;
    let body: string;

    switch (event.type) {
      case 'SUBMISSION':
        subject = `✅ Invoice ${invoice.invoiceNumber} Submitted to LHDN`;
        body = `
Invoice ${invoice.invoiceNumber} has been successfully submitted to LHDN MyInvois.

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Date: ${invoice.invoiceDate.toLocaleDateString()}
- Amount: ${invoice.currency} ${invoice.totalAmount.toFixed(2)}
- Submission UID: ${invoice.submissionUid || 'Pending'}

Status: Awaiting LHDN acceptance
        `.trim();
        break;

      case 'ACCEPTANCE':
        subject = `✅ Invoice ${invoice.invoiceNumber} Accepted by LHDN`;
        body = `
Invoice ${invoice.invoiceNumber} has been accepted by LHDN MyInvois.

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- LHDN Reference: ${invoice.lhdnReferenceNumber}
- Date: ${invoice.invoiceDate.toLocaleDateString()}
- Amount: ${invoice.currency} ${invoice.totalAmount.toFixed(2)}

The invoice is now officially registered with LHDN.
        `.trim();
        break;

      case 'REJECTION':
        subject = `❌ Invoice ${invoice.invoiceNumber} Rejected by LHDN`;
        body = `
Invoice ${invoice.invoiceNumber} has been REJECTED by LHDN MyInvois.

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Date: ${invoice.invoiceDate.toLocaleDateString()}
- Amount: ${invoice.currency} ${invoice.totalAmount.toFixed(2)}

Rejection Reasons:
${invoice.rejectionReasons?.join('\n') || 'No details provided'}

Please correct the issues and resubmit.
        `.trim();
        break;

      case 'CANCELLATION':
        subject = `🚫 Invoice ${invoice.invoiceNumber} Cancelled`;
        body = `
Invoice ${invoice.invoiceNumber} has been cancelled.

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- LHDN Reference: ${invoice.lhdnReferenceNumber}
- Date: ${invoice.invoiceDate.toLocaleDateString()}
- Amount: ${invoice.currency} ${invoice.totalAmount.toFixed(2)}

The invoice has been officially cancelled in LHDN MyInvois.
        `.trim();
        break;

      case 'VALIDATION_ERROR':
        subject = `⚠️ Validation Error - Invoice ${invoice.invoiceNumber}`;
        body = `
Invoice ${invoice.invoiceNumber} failed validation.

${event.message}

Please review and correct the invoice data.
        `.trim();
        break;

      default:
        subject = `Invoice ${invoice.invoiceNumber} - ${event.type}`;
        body = event.message;
    }

    return {
      to: this.config.notificationEmails,
      subject,
      body,
      html: this.buildHTMLEmail(subject, body, invoice),
    };
  }

  /**
   * Build HTML email template
   */
  private buildHTMLEmail(
    subject: string,
    body: string,
    invoice: LHDNInvoice
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0070f3; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    .details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #0070f3; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>LHDN MyInvois Notification</h2>
    </div>
    <div class="content">
      <h3>${subject}</h3>
      <div class="details">
        <pre style="white-space: pre-wrap;">${body}</pre>
      </div>
    </div>
    <div class="footer">
      <p>Prism - LHDN e-Invoice Module</p>
      <p>Tenant: ${invoice.tenantId}</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Build webhook payload
   */
  private buildWebhookPayload(event: NotificationEvent): WebhookPayload {
    return {
      event: event.type,
      timestamp: event.timestamp.toISOString(),
      tenantId: event.invoice.tenantId,
      invoice: {
        invoiceNumber: event.invoice.invoiceNumber,
        documentType: event.invoice.documentType,
        status: event.invoice.status,
        totalAmount: event.invoice.totalAmount,
        submissionUid: event.invoice.submissionUid,
        lhdnReferenceNumber: event.invoice.lhdnReferenceNumber,
      },
      details: event.details,
    };
  }

  /**
   * Notify submission
   */
  async notifySubmission(invoice: LHDNInvoice): Promise<void> {
    await this.notify({
      type: 'SUBMISSION',
      invoice,
      timestamp: new Date(),
      message: `Invoice ${invoice.invoiceNumber} submitted to LHDN MyInvois`,
    });
  }

  /**
   * Notify acceptance
   */
  async notifyAcceptance(invoice: LHDNInvoice): Promise<void> {
    await this.notify({
      type: 'ACCEPTANCE',
      invoice,
      timestamp: new Date(),
      message: `Invoice ${invoice.invoiceNumber} accepted by LHDN`,
      details: {
        lhdnReferenceNumber: invoice.lhdnReferenceNumber,
        acceptedAt: invoice.acceptedAt,
      },
    });
  }

  /**
   * Notify rejection
   */
  async notifyRejection(invoice: LHDNInvoice, reasons: string[]): Promise<void> {
    await this.notify({
      type: 'REJECTION',
      invoice,
      timestamp: new Date(),
      message: `Invoice ${invoice.invoiceNumber} rejected by LHDN`,
      details: {
        reasons,
        rejectedAt: invoice.rejectedAt,
      },
    });
  }

  /**
   * Notify cancellation
   */
  async notifyCancellation(invoice: LHDNInvoice, reason: string): Promise<void> {
    await this.notify({
      type: 'CANCELLATION',
      invoice,
      timestamp: new Date(),
      message: `Invoice ${invoice.invoiceNumber} cancelled`,
      details: {
        reason,
      },
    });
  }

  /**
   * Notify validation error
   */
  async notifyValidationError(invoice: LHDNInvoice, errors: any[]): Promise<void> {
    await this.notify({
      type: 'VALIDATION_ERROR',
      invoice,
      timestamp: new Date(),
      message: `Validation failed for invoice ${invoice.invoiceNumber}`,
      details: {
        errors,
      },
    });
  }
}
