/**
 * Debit Note Workflow
 *
 * Handles debit note issuance for additional charges post-invoice
 * Common scenarios: freight charges, penalties, price corrections (upward)
 *
 * Business Rules:
 * - Can only issue DN for ACCEPTED invoices
 * - DN creates a new document linked to original
 * - Original invoice status remains ACCEPTED
 * - DN has document type '03'
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

export interface IssueDebitNoteRequest {
  tenantId: string;
  originalInvoiceId: string;
  reason: string;

  // Debit note line items (additional charges)
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxType: string;
    taxRate: number;
  }>;

  // Metadata
  createdBy: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface IssueDebitNoteResult {
  success: boolean;
  debitNoteId: string;
  debitNoteNumber: string;
  status: string;
  lhdnReferenceNumber?: string;
  qrCodeDataUrl?: string;
  validationResult: ValidationResult;
  errors?: string[];
  warnings?: string[];
}

export class DebitNoteWorkflow {
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
   * Execute debit note workflow
   */
  async execute(request: IssueDebitNoteRequest): Promise<IssueDebitNoteResult> {
    const {
      tenantId,
      originalInvoiceId,
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
      logger.info('Starting debit note workflow', {
        tenantId,
        originalInvoiceId,
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
          `Cannot issue debit note for invoice with status ${originalInvoice.status}. Only ACCEPTED invoices can have debit notes.`
        );
      }

      // Step 2: Build debit note invoice
      const debitNote = this.buildDebitNote(
        originalInvoice,
        reason,
        lineItems,
        createdBy
      );

      logger.info('Debit note built', {
        debitNoteNumber: debitNote.invoiceNumber,
        debitAmount: debitNote.totalAmount,
      });

      // Step 3: Validate debit note
      const validationResult = await this.validationService.validateForSubmission(debitNote);

      if (!validationResult.isValid) {
        logger.warn('Debit note validation failed', {
          errors: validationResult.errors,
          debitNoteNumber: debitNote.invoiceNumber,
        });

        errors.push(...validationResult.errors.map((e) => e.message));
      }

      // Step 4: Save debit note to database
      const savedDebitNote = await this.repository.createInvoice(debitNote);

      // Step 5: Update validation result
      await this.repository.updateValidationResult(
        savedDebitNote.id,
        validationResult
      );

      // Step 6: Emit event
      await this.eventService.emit({
        tenantId,
        invoiceId: savedDebitNote.id,
        eventType: 'CREATED',
        newState: 'DRAFT',
        eventData: {
          originalInvoiceId,
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
            invoiceId: savedDebitNote.id,
            eventType: 'VALIDATED',
            newState: 'VALIDATED',
            eventData: validationResult,
            actor: 'system',
            actorType: 'SYSTEM',
            requestId,
          });

          // Update status to VALIDATED
          await this.repository.updateInvoiceStatus(
            savedDebitNote.id,
            'VALIDATED'
          );

          // Submit to LHDN
          logger.info('Submitting debit note to LHDN', {
            debitNoteId: savedDebitNote.id,
          });

          const submissionResult = await this.submissionService.submitInvoice(
            savedDebitNote
          );

          if (submissionResult.success) {
            // Update status to SUBMITTED
            await this.repository.updateInvoiceStatus(
              savedDebitNote.id,
              'SUBMITTED',
              {
                submissionUid: submissionResult.submissionUid,
                submittedAt: new Date(),
              }
            );

            // Emit submitted event
            await this.eventService.emit({
              tenantId,
              invoiceId: savedDebitNote.id,
              eventType: 'SUBMITTED',
              newState: 'SUBMITTED',
              eventData: submissionResult,
              actor: 'system',
              actorType: 'SYSTEM',
              requestId,
            });

            // Query status
            const statusResult = await this.submissionService.queryInvoiceStatus(
              submissionResult.submissionUid!
            );

            if (statusResult.status === 'ACCEPTED') {
              // Update to ACCEPTED
              await this.repository.updateInvoiceStatus(
                savedDebitNote.id,
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
                invoiceId: savedDebitNote.id,
                eventType: 'ACCEPTED',
                newState: 'ACCEPTED',
                eventData: statusResult,
                actor: 'system',
                actorType: 'SYSTEM',
                requestId,
              });

              // Generate QR code
              const updatedDN = await this.repository.getInvoiceById(
                savedDebitNote.id
              );
              const qrResult = await this.qrCodeService.generateQRCode(updatedDN!);

              if (qrResult.success) {
                qrCodeDataUrl = qrResult.qrCodeDataUrl;

                // Update with QR code
                await this.repository.updateInvoiceStatus(
                  savedDebitNote.id,
                  'ACCEPTED',
                  {
                    qrCodeData: qrResult.qrCodeBase64,
                  }
                );
              }

              // Link debit note to original invoice
              await this.linkDebitNoteToOriginal(
                originalInvoiceId,
                savedDebitNote.id,
                tenantId,
                requestId
              );

              // Send notifications
              await this.notificationService.notify({
                type: 'ACCEPTANCE',
                invoice: savedDebitNote,
                timestamp: new Date(),
                message: `Debit note ${savedDebitNote.invoiceNumber} accepted by LHDN`,
                details: {
                  lhdnReferenceNumber,
                  originalInvoiceId,
                  originalInvoiceNumber: originalInvoice.invoiceNumber,
                  debitAmount: savedDebitNote.totalAmount,
                  reason,
                },
              });
            } else if (statusResult.status === 'REJECTED') {
              // REJECTED
              await this.repository.updateInvoiceStatus(
                savedDebitNote.id,
                'REJECTED',
                {
                  rejectedAt: new Date(),
                  rejectionReasons: statusResult.messages || [],
                }
              );

              errors.push('Debit note rejected by LHDN');
              if (statusResult.messages) {
                errors.push(...statusResult.messages);
              }
            }
          } else {
            errors.push('Failed to submit debit note to LHDN');
          }
        } catch (submitError: any) {
          logger.error('Debit note submission failed', {
            error: submitError.message,
            debitNoteId: savedDebitNote.id,
          });

          errors.push(`Submission error: ${submitError.message}`);

          // Emit submission failed event
          await this.eventService.emit({
            tenantId,
            invoiceId: savedDebitNote.id,
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
        invoiceId: savedDebitNote.id,
        action: 'DN_ISSUED',
        actor: createdBy,
        requestData: {
          originalInvoiceId,
          reason,
        },
        responseData: {
          debitNoteId: savedDebitNote.id,
          debitNoteNumber: savedDebitNote.invoiceNumber,
          lhdnReferenceNumber,
        },
        success: validationResult.isValid && errors.length === 0,
        ipAddress,
        userAgent,
        requestId,
      });

      return {
        success: validationResult.isValid && errors.length === 0,
        debitNoteId: savedDebitNote.id,
        debitNoteNumber: savedDebitNote.invoiceNumber,
        status: savedDebitNote.status,
        lhdnReferenceNumber,
        qrCodeDataUrl,
        validationResult,
        errors: errors.length > 0 ? errors : undefined,
        warnings: validationResult.warnings.map((w) => w.message),
      };
    } catch (error: any) {
      logger.error('Debit note workflow failed', {
        error: error.message,
        tenantId,
        originalInvoiceId,
      });

      throw error;
    }
  }

  /**
   * Build debit note invoice from original invoice + additional charges
   */
  private buildDebitNote(
    originalInvoice: LHDNInvoice,
    reason: string,
    lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      taxType: string;
      taxRate: number;
    }>,
    createdBy: string
  ): LHDNInvoice {
    const debitNoteNumber = `DN-${originalInvoice.invoiceNumber}`;

    if (!lineItems || lineItems.length === 0) {
      throw new Error('Line items required for debit note');
    }

    // Build debit note line items with positive amounts
    let subtotalAmount = 0;
    let totalTaxAmount = 0;
    let totalAmount = 0;

    const dnLineItems: LHDNLineItem[] = lineItems.map((item, index) => {
      const subtotal = item.quantity * item.unitPrice;
      const taxAmount = (subtotal * item.taxRate) / 100;
      const total = subtotal + taxAmount;

      subtotalAmount += subtotal;
      totalTaxAmount += taxAmount;
      totalAmount += total;

      return {
        lineNumber: index + 1,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxType: item.taxType as any, // Type assertion for tax type
        taxRate: item.taxRate,
        taxAmount,
        subtotal,
        total,
      };
    });

    const debitNote: LHDNInvoice = {
      ...originalInvoice,
      id: undefined as any, // Will be generated by DB
      documentType: '03', // Debit Note
      invoiceNumber: debitNoteNumber,
      invoiceDate: new Date(),
      status: 'DRAFT',
      lineItems: dnLineItems,
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

    return debitNote;
  }

  /**
   * Link debit note to original invoice
   */
  private async linkDebitNoteToOriginal(
    originalInvoiceId: string,
    debitNoteId: string,
    tenantId: string,
    requestId?: string
  ): Promise<void> {
    try {
      // Emit DN_ISSUED event on original invoice
      await this.eventService.emit({
        tenantId,
        invoiceId: originalInvoiceId,
        eventType: 'DN_ISSUED',
        newState: 'ACCEPTED', // Original stays ACCEPTED
        eventData: {
          debitNoteId,
          linkedAt: new Date(),
        },
        actor: 'system',
        actorType: 'SYSTEM',
        requestId,
      });

      logger.info('Debit note linked to original invoice', {
        originalInvoiceId,
        debitNoteId,
      });
    } catch (error: any) {
      logger.error('Failed to link debit note', {
        error: error.message,
        originalInvoiceId,
        debitNoteId,
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
