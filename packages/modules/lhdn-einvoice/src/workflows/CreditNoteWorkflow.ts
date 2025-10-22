/**
 * Credit Note Workflow
 *
 * Handles credit note issuance for full or partial refunds
 * Links to original invoice and submits to LHDN with document type '02'
 *
 * Business Rules:
 * - Can only issue CN for ACCEPTED invoices
 * - CN amount must not exceed original invoice amount
 * - CN creates a new document linked to original
 * - Original invoice status remains ACCEPTED
 *
 * Phase: 7 (Document Type Coverage)
 */

import { LHDNInvoiceRepository } from '../repository/LHDNInvoiceRepository';
import { EventService } from '../services/EventService';
import { ValidationService } from '../services/ValidationService';
import { SubmissionService } from '../services/SubmissionService';
import { QRCodeService } from '../services/QRCodeService';
import { NotificationService } from '../services/NotificationService';
import { LHDNInvoice, LHDNLineItem, ValidationResult } from '../types';
import { logger } from '../utils/logger';

export interface IssueCreditNoteRequest {
  tenantId: string;
  originalInvoiceId: string;
  creditNoteType: 'FULL' | 'PARTIAL';
  reason: string;

  // For partial CN: specify line items and amounts
  lineItems?: Array<{
    originalLineNumber: number;
    creditQuantity: number;
    creditAmount: number;
  }>;

  // For full CN: derived from original invoice
  creditAmount?: number;

  // Metadata
  createdBy: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface IssueCreditNoteResult {
  success: boolean;
  creditNoteId: string;
  creditNoteNumber: string;
  status: string;
  lhdnReferenceNumber?: string;
  qrCodeDataUrl?: string;
  validationResult: ValidationResult;
  errors?: string[];
  warnings?: string[];
}

export class CreditNoteWorkflow {
  private repository: LHDNInvoiceRepository;
  private eventService: EventService;
  private validationService: ValidationService;
  private submissionService: SubmissionService;
  private qrCodeService: QRCodeService;
  private notificationService: NotificationService;

  constructor(databaseUrl: string) {
    this.repository = new LHDNInvoiceRepository(databaseUrl);
    this.eventService = new EventService(databaseUrl);
    this.validationService = new ValidationService();
    this.qrCodeService = new QRCodeService();

    // These will be initialized with tenant config in execute()
    this.submissionService = null as any;
    this.notificationService = null as any;
  }

  /**
   * Execute credit note workflow
   */
  async execute(request: IssueCreditNoteRequest): Promise<IssueCreditNoteResult> {
    const {
      tenantId,
      originalInvoiceId,
      creditNoteType,
      reason,
      lineItems,
      createdBy,
      ipAddress,
      userAgent,
      requestId,
    } = request;

    const errors: string[] = [];
    const _warnings: string[] = [];

    try {
      logger.info('Starting credit note workflow', {
        tenantId,
        originalInvoiceId,
        creditNoteType,
        createdBy,
      });

      // Step 1: Validate original invoice exists and is ACCEPTED
      const originalInvoice = await this.repository.getInvoiceById(originalInvoiceId);

      if (!originalInvoice) {
        throw new Error(`Original invoice ${originalInvoiceId} not found`);
      }

      if (originalInvoice.tenantId !== tenantId) {
        throw new Error(`Original invoice belongs to different tenant`);
      }

      if (originalInvoice.status !== 'ACCEPTED') {
        throw new Error(
          `Cannot issue credit note for invoice with status ${originalInvoice.status}. Only ACCEPTED invoices can be credited.`
        );
      }

      // Step 2: Build credit note invoice
      const creditNote = this.buildCreditNote(
        originalInvoice,
        creditNoteType,
        reason,
        createdBy,
        lineItems
      );

      logger.info('Credit note built', {
        creditNoteNumber: creditNote.invoiceNumber,
        creditAmount: creditNote.totalAmount,
      });

      // Step 3: Validate credit note
      const validationResult = await this.validationService.validateForSubmission(creditNote);

      if (!validationResult.isValid) {
        logger.warn('Credit note validation failed', {
          errors: validationResult.errors,
          creditNoteNumber: creditNote.invoiceNumber,
        });

        errors.push(...validationResult.errors.map((e) => e.message));
      }

      // Step 4: Save credit note to database
      const savedCreditNote = await this.repository.createInvoice(creditNote);

      // Step 5: Update validation result
      await this.repository.updateValidationResult(
        savedCreditNote.id,
        validationResult
      );

      // Step 6: Emit event
      await this.eventService.emit({
        tenantId,
        invoiceId: savedCreditNote.id,
        eventType: 'CREATED',
        newState: 'DRAFT',
        eventData: {
          originalInvoiceId,
          creditNoteType,
          reason,
        },
        actor: createdBy,
        actorType: 'USER',
        ipAddress,
        userAgent,
        requestId,
      });

      // Step 7: Submit to LHDN if validation passed
      let lhdnReferenceNumber: string | undefined;
      let qrCodeDataUrl: string | undefined;

      if (validationResult.isValid) {
        try {
          // Get tenant config for submission
          const tenantConfig = await this.repository.getTenantConfig(tenantId);
          if (!tenantConfig) {
            throw new Error('Tenant config not found');
          }

          // Initialize services with config
          this.submissionService = new SubmissionService(tenantConfig);
          this.notificationService = new NotificationService(tenantConfig);

          // Emit validation event
          await this.eventService.emit({
            tenantId,
            invoiceId: savedCreditNote.id,
            eventType: 'VALIDATED',
            newState: 'VALIDATED',
            eventData: validationResult,
            actor: 'system',
            actorType: 'SYSTEM',
            requestId,
          });

          // Update status to VALIDATED
          await this.repository.updateInvoiceStatus(
            savedCreditNote.id,
            'VALIDATED'
          );

          // Submit to LHDN
          logger.info('Submitting credit note to LHDN', {
            creditNoteId: savedCreditNote.id,
          });

          const submissionResult = await this.submissionService.submitInvoice(
            savedCreditNote
          );

          if (submissionResult.success) {
            // Update status to SUBMITTED
            await this.repository.updateInvoiceStatus(
              savedCreditNote.id,
              'SUBMITTED',
              {
                submissionUid: submissionResult.submissionUid,
                submittedAt: new Date(),
              }
            );

            // Emit submitted event
            await this.eventService.emit({
              tenantId,
              invoiceId: savedCreditNote.id,
              eventType: 'SUBMITTED',
              newState: 'SUBMITTED',
              eventData: submissionResult,
              actor: 'system',
              actorType: 'SYSTEM',
              requestId,
            });

            // Query status immediately (synchronous for CN)
            const statusResult = await this.submissionService.queryInvoiceStatus(
              submissionResult.submissionUid!
            );

            if (statusResult.status === 'ACCEPTED') {
              // Update to ACCEPTED
              await this.repository.updateInvoiceStatus(
                savedCreditNote.id,
                'ACCEPTED',
                {
                  lhdnReferenceNumber: statusResult.longId,
                  acceptedAt: new Date(),
                }
              );

              lhdnReferenceNumber = statusResult.longId;

              // Emit accepted event
              await this.eventService.emit({
                tenantId,
                invoiceId: savedCreditNote.id,
                eventType: 'ACCEPTED',
                newState: 'ACCEPTED',
                eventData: statusResult,
                actor: 'system',
                actorType: 'SYSTEM',
                requestId,
              });

              // Generate QR code
              const updatedCN = await this.repository.getInvoiceById(
                savedCreditNote.id
              );
              const qrResult = await this.qrCodeService.generateQRCode(updatedCN!);

              if (qrResult.success) {
                qrCodeDataUrl = qrResult.qrCodeDataUrl;

                // Update with QR code
                await this.repository.updateInvoiceStatus(
                  savedCreditNote.id,
                  'ACCEPTED',
                  {
                    qrCodeData: qrResult.qrCodeBase64,
                  }
                );
              }

              // Link credit note to original invoice
              await this.linkCreditNoteToOriginal(
                originalInvoiceId,
                savedCreditNote.id,
                tenantId,
                requestId
              );

              // Send notifications
              await this.notificationService.notify({
                type: 'ACCEPTANCE',
                invoice: savedCreditNote,
                timestamp: new Date(),
                message: `Credit note ${savedCreditNote.invoiceNumber} accepted by LHDN`,
                details: {
                  lhdnReferenceNumber,
                  originalInvoiceId,
                  originalInvoiceNumber: originalInvoice.invoiceNumber,
                  creditAmount: savedCreditNote.totalAmount,
                  reason,
                },
              });
            } else if (statusResult.status === 'REJECTED') {
              // REJECTED
              await this.repository.updateInvoiceStatus(
                savedCreditNote.id,
                'REJECTED',
                {
                  rejectedAt: new Date(),
                  rejectionReasons: statusResult.messages || [],
                }
              );

              errors.push('Credit note rejected by LHDN');
              if (statusResult.messages) {
                errors.push(...statusResult.messages);
              }
            }
          } else {
            errors.push('Failed to submit credit note to LHDN');
          }
        } catch (submitError: any) {
          logger.error('Credit note submission failed', {
            error: submitError.message,
            creditNoteId: savedCreditNote.id,
          });

          errors.push(`Submission error: ${submitError.message}`);

          // Emit submission failed event
          await this.eventService.emit({
            tenantId,
            invoiceId: savedCreditNote.id,
            eventType: 'SUBMISSION_FAILED',
            newState: 'DRAFT',
            eventData: { error: submitError.message },
            actor: 'system',
            actorType: 'SYSTEM',
            requestId,
          });
        }
      }

      // Step 8: Log audit event
      await this.repository.logAuditEvent({
        tenantId,
        invoiceId: savedCreditNote.id,
        action: 'CN_ISSUED',
        actor: createdBy,
        requestData: {
          originalInvoiceId,
          creditNoteType,
          reason,
        },
        responseData: {
          creditNoteId: savedCreditNote.id,
          creditNoteNumber: savedCreditNote.invoiceNumber,
          lhdnReferenceNumber,
        },
        success: validationResult.isValid && errors.length === 0,
        ipAddress,
        userAgent,
        requestId,
      });

      return {
        success: validationResult.isValid && errors.length === 0,
        creditNoteId: savedCreditNote.id,
        creditNoteNumber: savedCreditNote.invoiceNumber,
        status: savedCreditNote.status,
        lhdnReferenceNumber,
        qrCodeDataUrl,
        validationResult,
        errors: errors.length > 0 ? errors : undefined,
        warnings: validationResult.warnings.map((w) => w.message),
      };
    } catch (error: any) {
      logger.error('Credit note workflow failed', {
        error: error.message,
        tenantId,
        originalInvoiceId,
      });

      throw error;
    }
  }

  /**
   * Build credit note invoice from original invoice
   */
  private buildCreditNote(
    originalInvoice: LHDNInvoice,
    creditNoteType: 'FULL' | 'PARTIAL',
    reason: string,
    createdBy: string,
    lineItems?: Array<{
      originalLineNumber: number;
      creditQuantity: number;
      creditAmount: number;
    }>
  ): LHDNInvoice {
    const creditNoteNumber = `CN-${originalInvoice.invoiceNumber}`;

    let cnLineItems: LHDNLineItem[];
    let subtotalAmount = 0;
    let totalTaxAmount = 0;
    let totalAmount = 0;

    if (creditNoteType === 'FULL') {
      // Full credit: copy all line items with negative amounts
      cnLineItems = originalInvoice.lineItems.map((item, index) => ({
        ...item,
        lineNumber: index + 1,
        quantity: -item.quantity, // Negative for credit
        subtotal: -item.subtotal,
        taxAmount: -item.taxAmount,
        total: -item.total,
      }));

      subtotalAmount = -originalInvoice.subtotalAmount;
      totalTaxAmount = -originalInvoice.totalTaxAmount;
      totalAmount = -originalInvoice.totalAmount;
    } else {
      // Partial credit: only specified line items
      if (!lineItems || lineItems.length === 0) {
        throw new Error('Line items required for partial credit note');
      }

      cnLineItems = lineItems.map((cnItem, index) => {
        const originalLine = originalInvoice.lineItems.find(
          (l) => l.lineNumber === cnItem.originalLineNumber
        );

        if (!originalLine) {
          throw new Error(`Original line ${cnItem.originalLineNumber} not found`);
        }

        // Validate credit amount doesn't exceed original
        if (Math.abs(cnItem.creditAmount) > originalLine.total) {
          throw new Error(
            `Credit amount ${cnItem.creditAmount} exceeds original line amount ${originalLine.total}`
          );
        }

        const creditSubtotal = -Math.abs(cnItem.creditAmount);
        const creditTaxAmount = (creditSubtotal * originalLine.taxRate) / 100;
        const creditTotal = creditSubtotal + creditTaxAmount;

        subtotalAmount += creditSubtotal;
        totalTaxAmount += creditTaxAmount;
        totalAmount += creditTotal;

        return {
          lineNumber: index + 1,
          description: `Credit: ${originalLine.description}`,
          classification: originalLine.classification,
          quantity: -Math.abs(cnItem.creditQuantity),
          unitPrice: originalLine.unitPrice,
          taxType: originalLine.taxType,
          taxRate: originalLine.taxRate,
          taxAmount: creditTaxAmount,
          subtotal: creditSubtotal,
          total: creditTotal,
        };
      });
    }

    const creditNote: LHDNInvoice = {
      ...originalInvoice,
      id: undefined as any, // Will be generated by DB
      documentType: '02', // Credit Note
      invoiceNumber: creditNoteNumber,
      invoiceDate: new Date(),
      status: 'DRAFT',
      lineItems: cnLineItems,
      subtotalAmount,
      totalTaxAmount,
      totalAmount,

      // Clear LHDN-specific fields
      submissionUid: undefined,
      lhdnReferenceNumber: undefined,
      qrCodeData: undefined,
      submittedAt: undefined,
      acceptedAt: undefined,
      rejectedAt: undefined,
      validatedAt: undefined,

      // Link to original
      purchaseOrderRef: `Original: ${originalInvoice.invoiceNumber}`,

      // Audit
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
    };

    return creditNote;
  }

  /**
   * Link credit note to original invoice
   */
  private async linkCreditNoteToOriginal(
    originalInvoiceId: string,
    creditNoteId: string,
    tenantId: string,
    requestId?: string
  ): Promise<void> {
    try {
      // Emit CN_ISSUED event on original invoice
      await this.eventService.emit({
        tenantId,
        invoiceId: originalInvoiceId,
        eventType: 'CN_ISSUED',
        newState: 'ACCEPTED', // Original stays ACCEPTED
        eventData: {
          creditNoteId,
          linkedAt: new Date(),
        },
        actor: 'system',
        actorType: 'SYSTEM',
        requestId,
      });

      logger.info('Credit note linked to original invoice', {
        originalInvoiceId,
        creditNoteId,
      });
    } catch (error: any) {
      logger.error('Failed to link credit note', {
        error: error.message,
        originalInvoiceId,
        creditNoteId,
      });
      // Don't throw - this is non-critical
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
