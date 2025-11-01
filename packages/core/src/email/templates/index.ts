/**
 * Email Templates
 *
 * MJML-based email templates with fallback text versions
 */

import mjml2html from 'mjml';
import logger from '../../utils/logger';

/**
 * Base email template wrapper
 */
function wrapTemplate(content: string, preheader?: string): string {
  return `
<mjml>
  <mj-head>
    <mj-title>Prism</mj-title>
    <mj-preview>${preheader || 'Prism Notification'}</mj-preview>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
      <mj-text font-size="14px" color="#333333" line-height="1.6" />
      <mj-button background-color="#1890ff" color="#ffffff" border-radius="4px" font-weight="600" />
    </mj-attributes>
    <mj-style>
      .header { background-color: #1890ff; color: #ffffff; }
      .footer { background-color: #f5f5f5; color: #666666; font-size: 12px; }
      .alert-critical { background-color: #ff4d4f; color: #ffffff; }
      .alert-high { background-color: #faad14; color: #ffffff; }
      .alert-medium { background-color: #1890ff; color: #ffffff; }
    </mj-style>
  </mj-head>
  <mj-body background-color="#f0f0f0">
    ${content}
  </mj-body>
</mjml>
  `;
}

/**
 * User invitation template
 */
export function userInvitationTemplate(data: {
  recipientName: string;
  inviterName: string;
  organizationName: string;
  role: string;
  invitationLink: string;
  expiresIn: string;
}): string {
  return wrapTemplate(
    `
<mj-section css-class="header" padding="20px">
  <mj-column>
    <mj-text align="center" font-size="24px" font-weight="bold">
      Welcome to Prism
    </mj-text>
  </mj-column>
</mj-section>

<mj-section background-color="#ffffff" padding="40px 20px">
  <mj-column>
    <mj-text>
      <p>Hi ${data.recipientName},</p>
      <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.organizationName}</strong> on the Prism as a <strong>${data.role}</strong>.</p>
      <p>This invitation will expire in ${data.expiresIn}.</p>
    </mj-text>
    <mj-button href="${data.invitationLink}" padding="20px 0">
      Accept Invitation
    </mj-button>
    <mj-text font-size="12px" color="#666666" padding-top="20px">
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p>${data.invitationLink}</p>
    </mj-text>
  </mj-column>
</mj-section>

<mj-section css-class="footer" padding="20px">
  <mj-column>
    <mj-text align="center">
      <p>Prism - Governance, Risk & Compliance</p>
      <p>This email was sent to you because you were invited to join an organization.</p>
    </mj-text>
  </mj-column>
</mj-section>
    `,
    `You've been invited to join ${data.organizationName}`
  );
}

/**
 * Violation alert template
 */
export function violationAlertTemplate(data: {
  recipientName: string;
  violationType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedUser?: string;
  detectedAt: string;
  viewLink: string;
  details: Array<{ label: string; value: string }>;
}): string {
  const severityClass = {
    critical: 'alert-critical',
    high: 'alert-high',
    medium: 'alert-medium',
    low: '',
  }[data.severity];

  return wrapTemplate(
    `
<mj-section css-class="${severityClass}" padding="20px">
  <mj-column>
    <mj-text align="center" font-size="20px" font-weight="bold">
      ⚠️ ${data.severity.toUpperCase()} ${data.violationType}
    </mj-text>
  </mj-column>
</mj-section>

<mj-section background-color="#ffffff" padding="40px 20px">
  <mj-column>
    <mj-text>
      <p>Hi ${data.recipientName},</p>
      <p>A <strong>${data.severity}</strong> severity ${data.violationType} has been detected.</p>
      <p><strong>Description:</strong> ${data.description}</p>
      ${data.affectedUser ? `<p><strong>Affected User:</strong> ${data.affectedUser}</p>` : ''}
      <p><strong>Detected At:</strong> ${data.detectedAt}</p>
    </mj-text>

    ${
      data.details.length > 0
        ? `
    <mj-text padding-top="20px">
      <p><strong>Details:</strong></p>
      <ul>
        ${data.details.map((d) => `<li><strong>${d.label}:</strong> ${d.value}</li>`).join('')}
      </ul>
    </mj-text>
    `
        : ''
    }

    <mj-button href="${data.viewLink}" padding="30px 0">
      View Violation Details
    </mj-button>
  </mj-column>
</mj-section>

<mj-section css-class="footer" padding="20px">
  <mj-column>
    <mj-text align="center">
      <p>This is an automated alert from Prism</p>
      <p>Immediate action may be required for critical violations</p>
    </mj-text>
  </mj-column>
</mj-section>
    `,
    `${data.severity.toUpperCase()} ${data.violationType} detected`
  );
}

/**
 * Report delivery template
 */
export function reportDeliveryTemplate(data: {
  recipientName: string;
  reportName: string;
  reportType: string;
  generatedAt: string;
  period?: string;
  summary?: string;
  downloadLink: string;
  expiresIn?: string;
}): string {
  return wrapTemplate(
    `
<mj-section css-class="header" padding="20px">
  <mj-column>
    <mj-text align="center" font-size="24px" font-weight="bold">
      📊 Report Ready
    </mj-text>
  </mj-column>
</mj-section>

<mj-section background-color="#ffffff" padding="40px 20px">
  <mj-column>
    <mj-text>
      <p>Hi ${data.recipientName},</p>
      <p>Your requested <strong>${data.reportType}</strong> report is ready for download.</p>
      <p><strong>Report:</strong> ${data.reportName}</p>
      <p><strong>Generated:</strong> ${data.generatedAt}</p>
      ${data.period ? `<p><strong>Period:</strong> ${data.period}</p>` : ''}
      ${data.summary ? `<p><strong>Summary:</strong> ${data.summary}</p>` : ''}
      ${data.expiresIn ? `<p><em>This download link will expire in ${data.expiresIn}.</em></p>` : ''}
    </mj-text>
    <mj-button href="${data.downloadLink}" padding="30px 0">
      Download Report
    </mj-button>
  </mj-column>
</mj-section>

<mj-section css-class="footer" padding="20px">
  <mj-column>
    <mj-text align="center">
      <p>Prism - Automated Reporting</p>
    </mj-text>
  </mj-column>
</mj-section>
    `,
    `Your ${data.reportType} report is ready`
  );
}

/**
 * Access review reminder template
 */
export function accessReviewReminderTemplate(data: {
  recipientName: string;
  reviewName: string;
  dueDate: string;
  itemsToReview: number;
  reviewLink: string;
  priority: 'urgent' | 'normal';
}): string {
  return wrapTemplate(
    `
<mj-section css-class="header" padding="20px">
  <mj-column>
    <mj-text align="center" font-size="24px" font-weight="bold">
      ${data.priority === 'urgent' ? '🚨' : '📋'} Access Review ${data.priority === 'urgent' ? 'URGENT' : 'Reminder'}
    </mj-text>
  </mj-column>
</mj-section>

<mj-section background-color="#ffffff" padding="40px 20px">
  <mj-column>
    <mj-text>
      <p>Hi ${data.recipientName},</p>
      <p>You have <strong>${data.itemsToReview} items</strong> pending review for:</p>
      <p><strong>${data.reviewName}</strong></p>
      <p><strong>Due Date:</strong> ${data.dueDate}</p>
      ${data.priority === 'urgent' ? '<p style="color: #ff4d4f;"><strong>This review is overdue and requires immediate attention.</strong></p>' : ''}
    </mj:text>
    <mj-button href="${data.reviewLink}" padding="30px 0">
      Start Review
    </mj-button>
  </mj-column>
</mj-section>

<mj-section css-class="footer" padding="20px">
  <mj-column>
    <mj-text align="center">
      <p>Prism - User Access Review</p>
      <p>Regular access reviews are essential for compliance</p>
    </mj-text>
  </mj-column>
</mj-section>
    `,
    `Access review reminder: ${data.reviewName}`
  );
}

/**
 * Password reset template
 */
export function passwordResetTemplate(data: {
  recipientName: string;
  resetLink: string;
  expiresIn: string;
  ipAddress?: string;
  userAgent?: string;
}): string {
  return wrapTemplate(
    `
<mj-section css-class="header" padding="20px">
  <mj-column>
    <mj-text align="center" font-size="24px" font-weight="bold">
      🔒 Password Reset Request
    </mj-text>
  </mj-column>
</mj-section>

<mj-section background-color="#ffffff" padding="40px 20px">
  <mj-column>
    <mj-text>
      <p>Hi ${data.recipientName},</p>
      <p>We received a request to reset your password for your Prism account.</p>
      <p>Click the button below to create a new password. This link will expire in <strong>${data.expiresIn}</strong>.</p>
    </mj-text>
    <mj-button href="${data.resetLink}" padding="30px 0">
      Reset Password
    </mj-button>
    <mj-text font-size="12px" color="#666666" padding-top="20px">
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p>${data.resetLink}</p>
      <p style="border-top: 1px solid #e8e8e8; padding-top: 15px; margin-top: 20px;">
        <strong>Security Information:</strong><br/>
        ${data.ipAddress ? `Request from: ${data.ipAddress}<br/>` : ''}
        ${data.userAgent ? `Device: ${data.userAgent}<br/>` : ''}
      </p>
      <p style="color: #ff4d4f; font-weight: 600;">
        If you didn't request this password reset, please ignore this email or contact support if you're concerned about your account security.
      </p>
    </mj-text>
  </mj-column>
</mj-section>

<mj-section css-class="footer" padding="20px">
  <mj-column>
    <mj-text align="center">
      <p>Prism - Account Security</p>
      <p>This email was sent because a password reset was requested for your account.</p>
    </mj-text>
  </mj-column>
</mj-section>
    `,
    `Password reset requested for your SAP GRC account`
  );
}

/**
 * Password reset confirmation template
 */
export function passwordResetConfirmationTemplate(data: {
  recipientName: string;
  resetAt: string;
  ipAddress?: string;
  userAgent?: string;
}): string {
  return wrapTemplate(
    `
<mj-section css-class="header" padding="20px">
  <mj-column>
    <mj-text align="center" font-size="24px" font-weight="bold">
      ✅ Password Changed Successfully
    </mj-text>
  </mj-column>
</mj-section>

<mj-section background-color="#ffffff" padding="40px 20px">
  <mj-column>
    <mj-text>
      <p>Hi ${data.recipientName},</p>
      <p>Your Prism password was successfully changed at <strong>${data.resetAt}</strong>.</p>
      ${data.ipAddress || data.userAgent ? `
      <p style="border-top: 1px solid #e8e8e8; padding-top: 15px; margin-top: 20px;">
        <strong>Security Information:</strong><br/>
        ${data.ipAddress ? `Location: ${data.ipAddress}<br/>` : ''}
        ${data.userAgent ? `Device: ${data.userAgent}<br/>` : ''}
      </p>
      ` : ''}
      <p style="color: #ff4d4f; font-weight: 600; margin-top: 20px;">
        If you didn't make this change, please contact support immediately at support@sapgrc.com
      </p>
    </mj-text>
  </mj-column>
</mj-section>

<mj-section css-class="footer" padding="20px">
  <mj-column>
    <mj-text align="center">
      <p>Prism - Account Security</p>
      <p>This is a security notification for your account.</p>
    </mj-text>
  </mj-column>
</mj-section>
    `,
    `Your password has been changed`
  );
}

/**
 * Generic notification template
 */
export function genericNotificationTemplate(data: {
  recipientName: string;
  title: string;
  message: string;
  actionLabel?: string;
  actionLink?: string;
}): string {
  return wrapTemplate(
    `
<mj-section css-class="header" padding="20px">
  <mj-column>
    <mj-text align="center" font-size="24px" font-weight="bold">
      ${data.title}
    </mj-text>
  </mj-column>
</mj-section>

<mj-section background-color="#ffffff" padding="40px 20px">
  <mj-column>
    <mj-text>
      <p>Hi ${data.recipientName},</p>
      <p>${data.message}</p>
    </mj-text>
    ${
      data.actionLink && data.actionLabel
        ? `
    <mj-button href="${data.actionLink}" padding="30px 0">
      ${data.actionLabel}
    </mj-button>
    `
        : ''
    }
  </mj-column>
</mj-section>

<mj-section css-class="footer" padding="20px">
  <mj-column>
    <mj-text align="center">
      <p>Prism</p>
    </mj-text>
  </mj-column>
</mj-section>
    `,
    data.title
  );
}

/**
 * Template registry
 */
const templates = {
  'user-invitation': userInvitationTemplate,
  'violation-alert': violationAlertTemplate,
  'report-delivery': reportDeliveryTemplate,
  'access-review-reminder': accessReviewReminderTemplate,
  'password-reset': passwordResetTemplate,
  'password-reset-confirmation': passwordResetConfirmationTemplate,
  'generic-notification': genericNotificationTemplate,
};

/**
 * Render an email template
 */
export async function renderEmailTemplate(
  templateName: string,
  data: any
): Promise<{ html: string; text: string }> {
  try {
    const templateFn = templates[templateName as keyof typeof templates];

    if (!templateFn) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Generate MJML
    const mjml = templateFn(data);

    // Convert to HTML
    const result = mjml2html(mjml, {
      validationLevel: 'soft',
    });

    if (result.errors && result.errors.length > 0) {
      logger.warn('MJML template has warnings', {
        template: templateName,
        errors: result.errors,
      });
    }

    // Generate plain text version (strip HTML tags)
    const text = result.html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      html: result.html,
      text,
    };
  } catch (error: any) {
    logger.error('Failed to render email template', {
      template: templateName,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get available templates
 */
export function getAvailableTemplates(): string[] {
  return Object.keys(templates);
}
