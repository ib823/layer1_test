/**
 * Cancellation Workflow
 *
 * Handles invoice cancellation/voiding for both pre- and post-acceptance scenarios
 *
 * Business Rules:
 * - Pre-acceptance (DRAFT/VALIDATED): Simple state transition
 * - Post-acceptance (ACCEPTED): Must call LHDN cancellation API
 * - Time window: Must cancel within 72 hours of acceptance (LHDN policy)
 * - Cancellation is irreversible (terminal state)
 * - Cannot cancel SUBMITTED invoices (must wait for ACCEPTED/REJECTED)
 *
 * Phase: 7 (Document Type Coverage)
 */

import { LHDNInvoiceRepository } from '../repository/LHDNInvoiceRepository';
import { EventService } from '../services/EventService';
import { SubmissionService } from '../services/SubmissionService';
import { NotificationService } from '../services/NotificationService';
import { LHDNInvoice, ValidationResult } from '../types';
import { logger } from '../utils/logger';

export interface CancelInvoiceRequest {
  tenantId: string;
  invoiceId: string;
  reason: string;

  // Metadata
  cancelledBy: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface CancelInvoiceResult {
  success: boolean;
  invoiceId: string;
  invoiceNumber: string;
  previousStatus: string;
  newStatus: string;
  cancellationType: 'PRE_ACCEPTANCE' | 'POST_ACCEPTANCE';
  lhdnCancellationId?: string;
  errors?: string[];
  warnings?: string[];
}

export class CancellationWorkflow {
  private repository: LHDNInvoiceRepository;
  private eventService: EventService;
  private submissionService: SubmissionService;
  private notificationService: NotificationService;

  // LHDN policy: 72-hour cancellation window
  private readonly CANCELLATION_WINDOW_HOURS = 72;

  constructor(databaseUrl: string) {
    this.repository = new LHDNInvoiceRepository(databaseUrl);
    this.eventService = new EventService(databaseUrl);

    // These will be initialized with tenant config in execute()
    this.submissionService = null as any;
    this.notificationService = null as any;
  }

  /**
   * Execute cancellation workflow
   */
  async execute(request: CancelInvoiceRequest): Promise<CancelInvoiceResult> {
    const {
      tenantId,
      invoiceId,
      reason,
      cancelledBy,
      ipAddress,
      userAgent,
      requestId,
    } = request;

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      logger.info('Starting cancellation workflow', {
        tenantId,
        invoiceId,
        cancelledBy,
        reason,
      });

      // Step 1: Validate invoice exists and belongs to tenant
      const invoice = await this.repository.getInvoiceById(invoiceId);

      if (!invoice) {
        throw new Error(`Invoice ${invoiceId} not found`);
      }

      if (invoice.tenantId !== tenantId) {
        throw new Error(`Invoice belongs to different tenant`);
      }

      // Step 2: Validate invoice is not already cancelled
      if (invoice.status === 'CANCELLED') {
        throw new Error(`Invoice ${invoice.invoiceNumber} is already cancelled`);
      }

      // Step 3: Validate invoice is not in SUBMITTED state
      if (invoice.status === 'SUBMITTED') {
        throw new Error(
          `Cannot cancel invoice in SUBMITTED state. Wait for ACCEPTED or REJECTED status.`
        );
      }

      // Step 4: Determine cancellation type
      const isPostAcceptance = invoice.status === 'ACCEPTED';
      const cancellationType = isPostAcceptance ? 'POST_ACCEPTANCE' : 'PRE_ACCEPTANCE';

      logger.info('Cancellation type determined', {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        currentStatus: invoice.status,
        cancellationType,
      });

      // Step 5: For post-acceptance, validate time window and call LHDN API
      let lhdnCancellationId: string | undefined;

      if (isPostAcceptance) {
        // Check 72-hour window
        if (!invoice.acceptedAt) {
          throw new Error('ACCEPTED invoice missing acceptedAt timestamp');
        }

        const now = new Date();
        const hoursSinceAcceptance =
          (now.getTime() - invoice.acceptedAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceAcceptance > this.CANCELLATION_WINDOW_HOURS) {
          throw new Error(
            `Cancellation window expired. Invoice was accepted ${hoursSinceAcceptance.toFixed(1)} hours ago. ` +
              `LHDN policy allows cancellation within ${this.CANCELLATION_WINDOW_HOURS} hours only.`
          );
        }

        logger.info('Cancellation within time window', {
          invoiceId,
          hoursSinceAcceptance: hoursSinceAcceptance.toFixed(1),
          windowHours: this.CANCELLATION_WINDOW_HOURS,
        });

        // Get tenant config for LHDN API call
        const tenantConfig = await this.repository.getTenantConfig(tenantId);
        if (!tenantConfig) {
          throw new Error('Tenant config not found');
        }

        // Initialize services with config
        this.submissionService = new SubmissionService(tenantConfig);
        this.notificationService = new NotificationService(tenantConfig);

        // Call LHDN cancellation API
        try {
          logger.info('Calling LHDN cancellation API', {
            invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            lhdnReferenceNumber: invoice.lhdnReferenceNumber,
          });

          const cancellationResult = await this.submissionService.cancelInvoice(
            invoice.lhdnReferenceNumber!,
            {
              reason,
              cancelledBy,
            }
          );

          if (cancellationResult.success) {
            lhdnCancellationId = cancellationResult.submissionUid;

            logger.info('LHDN cancellation successful', {
              invoiceId,
              lhdnCancellationId,
            });
          } else {
            throw new Error(
              `LHDN cancellation failed: ${cancellationResult.errors?.join(', ') || 'Unknown error'}`
            );
          }
        } catch (lhdnError: any) {
          logger.error('LHDN cancellation API call failed', {
            error: lhdnError.message,
            invoiceId,
          });

          errors.push(`LHDN cancellation failed: ${lhdnError.message}`);
          throw lhdnError;
        }
      }

      // Step 6: Update invoice status to CANCELLED
      await this.repository.updateInvoiceStatus(invoiceId, 'CANCELLED', {
        rejectionReasons: [reason],
      });

      // Step 7: Emit cancellation event
      await this.eventService.emit({
        tenantId,
        invoiceId,
        eventType: 'CANCELLED',
        newState: 'CANCELLED',
        eventData: {
          reason,
          cancellationType,
          lhdnCancellationId,
          cancelledBy,
        },
        actor: cancelledBy,
        actorType: 'USER',
        ipAddress,
        userAgent,
        requestId,
      });

      // Step 8: Send notifications
      if (isPostAcceptance && this.notificationService) {
        await this.notificationService.notify({
          type: 'CANCELLATION',
          invoice: invoice,
          timestamp: new Date(),
          message: `Invoice ${invoice.invoiceNumber} cancelled`,
          details: {
            reason,
            cancellationType,
            lhdnCancellationId,
            cancelledBy,
          },
        });
      }

      // Step 9: Log audit event
      await this.repository.logAuditEvent({
        tenantId,
        invoiceId,
        action: 'INVOICE_CANCELLED',
        actor: cancelledBy,
        requestData: {
          reason,
          cancellationType,
        },
        responseData: {
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          lhdnCancellationId,
          previousStatus: invoice.status,
        },
        success: true,
        ipAddress,
        userAgent,
        requestId,
      });

      logger.info('Cancellation workflow completed', {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        cancellationType,
        lhdnCancellationId,
      });

      return {
        success: true,
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        previousStatus: invoice.status,
        newStatus: 'CANCELLED',
        cancellationType,
        lhdnCancellationId,
        errors: errors.length > 0 ? errors : undefined,
        warnings,
      };
    } catch (error: any) {
      logger.error('Cancellation workflow failed', {
        error: error.message,
        tenantId,
        invoiceId,
      });

      // Log failed audit event
      try {
        await this.repository.logAuditEvent({
          tenantId,
          invoiceId,
          action: 'INVOICE_CANCELLED',
          actor: cancelledBy,
          requestData: {
            reason,
          },
          responseData: {
            error: error.message,
          },
          success: false,
          ipAddress,
          userAgent,
          requestId,
        });
      } catch (auditError: any) {
        logger.error('Failed to log audit event for failed cancellation', {
          error: auditError.message,
        });
      }

      throw error;
    }
  }

  /**
   * Bulk cancel invoices (for operations)
   * Useful for cleaning up draft/validated invoices in bulk
   */
  async bulkCancel(
    tenantId: string,
    invoiceIds: string[],
    reason: string,
    cancelledBy: string,
    options: {
      skipErrors?: boolean; // Continue on individual failures
      requestId?: string;
    } = {}
  ): Promise<{
    succeeded: string[];
    failed: Array<{ invoiceId: string; error: string }>;
    total: number;
    successCount: number;
    failureCount: number;
  }> {
    const { skipErrors = false, requestId } = options;

    const succeeded: string[] = [];
    const failed: Array<{ invoiceId: string; error: string }> = [];

    logger.info('Starting bulk cancellation', {
      tenantId,
      invoiceCount: invoiceIds.length,
      cancelledBy,
      skipErrors,
    });

    for (const invoiceId of invoiceIds) {
      try {
        const result = await this.execute({
          tenantId,
          invoiceId,
          reason,
          cancelledBy,
          requestId,
        });

        if (result.success) {
          succeeded.push(invoiceId);
        } else {
          failed.push({
            invoiceId,
            error: result.errors?.join(', ') || 'Unknown error',
          });
        }
      } catch (error: any) {
        logger.error('Bulk cancel failed for invoice', {
          invoiceId,
          error: error.message,
        });

        failed.push({
          invoiceId,
          error: error.message,
        });

        if (!skipErrors) {
          throw error;
        }
      }
    }

    logger.info('Bulk cancellation completed', {
      total: invoiceIds.length,
      succeeded: succeeded.length,
      failed: failed.length,
    });

    return {
      succeeded,
      failed,
      total: invoiceIds.length,
      successCount: succeeded.length,
      failureCount: failed.length,
    };
  }

  /**
   * Check if invoice is cancellable
   * Used for UI to disable cancel button
   */
  async isCancellable(
    invoiceId: string
  ): Promise<{
    cancellable: boolean;
    reason?: string;
    cancellationType?: 'PRE_ACCEPTANCE' | 'POST_ACCEPTANCE';
    windowExpiry?: Date;
    hoursRemaining?: number;
  }> {
    try {
      const invoice = await this.repository.getInvoiceById(invoiceId);

      if (!invoice) {
        return {
          cancellable: false,
          reason: 'Invoice not found',
        };
      }

      // Already cancelled
      if (invoice.status === 'CANCELLED') {
        return {
          cancellable: false,
          reason: 'Invoice is already cancelled',
        };
      }

      // Cannot cancel SUBMITTED
      if (invoice.status === 'SUBMITTED') {
        return {
          cancellable: false,
          reason: 'Cannot cancel invoice in SUBMITTED state. Wait for acceptance or rejection.',
        };
      }

      // Pre-acceptance: always cancellable
      if (invoice.status !== 'ACCEPTED') {
        return {
          cancellable: true,
          cancellationType: 'PRE_ACCEPTANCE',
        };
      }

      // Post-acceptance: check 72-hour window
      if (!invoice.acceptedAt) {
        return {
          cancellable: false,
          reason: 'ACCEPTED invoice missing acceptance timestamp',
        };
      }

      const now = new Date();
      const hoursSinceAcceptance =
        (now.getTime() - invoice.acceptedAt.getTime()) / (1000 * 60 * 60);

      const hoursRemaining = this.CANCELLATION_WINDOW_HOURS - hoursSinceAcceptance;

      if (hoursRemaining <= 0) {
        return {
          cancellable: false,
          reason: `Cancellation window expired (${this.CANCELLATION_WINDOW_HOURS} hours after acceptance)`,
        };
      }

      const windowExpiry = new Date(
        invoice.acceptedAt.getTime() + this.CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000
      );

      return {
        cancellable: true,
        cancellationType: 'POST_ACCEPTANCE',
        windowExpiry,
        hoursRemaining,
      };
    } catch (error: any) {
      logger.error('Failed to check if invoice is cancellable', {
        error: error.message,
        invoiceId,
      });

      return {
        cancellable: false,
        reason: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Get cancellation statistics for operational dashboard
   */
  async getStats(
    tenantId: string,
    options: {
      fromDate?: Date;
      toDate?: Date;
    } = {}
  ): Promise<{
    totalCancellations: number;
    preAcceptance: number;
    postAcceptance: number;
    byReason: Record<string, number>;
    recentCancellations: Array<{
      invoiceId: string;
      invoiceNumber: string;
      cancelledAt: Date;
      reason: string;
      cancellationType: string;
    }>;
  }> {
    try {
      const { fromDate, toDate } = options;

      // Build query conditions
      const conditions: string[] = ['tenant_id = $1', "status = 'CANCELLED'"];
      const params: any[] = [tenantId];
      let paramIndex = 2;

      if (fromDate) {
        conditions.push(`cancelled_at >= $${paramIndex++}`);
        params.push(fromDate);
      }

      if (toDate) {
        conditions.push(`cancelled_at <= $${paramIndex++}`);
        params.push(toDate);
      }

      const whereClause = conditions.join(' AND ');

      // Get statistics
      const result = await this.repository['pool'].query(
        `
        SELECT
          COUNT(*) as total_cancellations,
          COUNT(*) FILTER (WHERE lhdn_cancellation_id IS NULL) as pre_acceptance,
          COUNT(*) FILTER (WHERE lhdn_cancellation_id IS NOT NULL) as post_acceptance,
          jsonb_object_agg(
            COALESCE(cancellation_reason, 'No reason provided'),
            reason_count
          ) as by_reason
        FROM (
          SELECT
            lhdn_cancellation_id,
            cancellation_reason,
            COUNT(*) OVER (PARTITION BY cancellation_reason) as reason_count
          FROM lhdn_einvoices
          WHERE ${whereClause}
        ) sub
        `,
        params
      );

      const statsRow = result.rows[0];

      // Get recent cancellations
      const recentResult = await this.repository['pool'].query(
        `
        SELECT
          id as invoice_id,
          invoice_number,
          cancelled_at,
          cancellation_reason,
          CASE
            WHEN lhdn_cancellation_id IS NOT NULL THEN 'POST_ACCEPTANCE'
            ELSE 'PRE_ACCEPTANCE'
          END as cancellation_type
        FROM lhdn_einvoices
        WHERE ${whereClause}
        ORDER BY cancelled_at DESC
        LIMIT 10
        `,
        params
      );

      const recentCancellations = recentResult.rows.map((row) => ({
        invoiceId: row.invoice_id,
        invoiceNumber: row.invoice_number,
        cancelledAt: new Date(row.cancelled_at),
        reason: row.cancellation_reason || 'No reason provided',
        cancellationType: row.cancellation_type,
      }));

      return {
        totalCancellations: parseInt(statsRow.total_cancellations || '0', 10),
        preAcceptance: parseInt(statsRow.pre_acceptance || '0', 10),
        postAcceptance: parseInt(statsRow.post_acceptance || '0', 10),
        byReason: statsRow.by_reason || {},
        recentCancellations,
      };
    } catch (error: any) {
      logger.error('Failed to get cancellation stats', {
        error: error.message,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.repository.close();
    await this.eventService.close();
  }
}
