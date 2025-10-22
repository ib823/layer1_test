/**
 * LHDN Invoice Engine
 *
 * Main orchestration engine for LHDN MyInvois e-invoicing workflow
 *
 * Workflow:
 * 1. Fetch SAP billing document
 * 2. Transform to LHDN invoice format
 * 3. Validate against business rules
 * 4. Submit to LHDN MyInvois API
 * 5. Generate QR code
 * 6. Store in database
 * 7. Send notifications
 */

import { v4 as uuidv4 } from 'uuid';
import { S4HANAConnector } from '@sap-framework/core';
import { MappingService } from '../services/MappingService';
import { ValidationService } from '../services/ValidationService';
import { SubmissionService } from '../services/SubmissionService';
import { QRCodeService } from '../services/QRCodeService';
import { NotificationService } from '../services/NotificationService';
import { LHDNInvoiceRepository } from '../repository/LHDNInvoiceRepository';
import {
  LHDNInvoice,
  LHDNTenantConfig,
  ValidationResult,
  SubmissionResult,
  InvoiceStatus,
  BulkSubmissionRequest,
  BulkSubmissionResult,
  ComplianceReport,
} from '../types';
import { SAPBillingDocument } from '../types/sap-mapping';
import { logger } from '../utils/logger';

export interface LHDNInvoiceEngineConfig {
  databaseUrl: string;
  tenantId: string;
  createdBy: string; // User ID or 'SYSTEM'
}

export interface SubmitInvoiceOptions {
  sapBillingDocument: string;
  sapCompanyCode: string;
  autoSubmit?: boolean;
}

export interface SubmitInvoiceResult {
  invoiceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  validationResult: ValidationResult;
  submissionResult?: SubmissionResult;
  qrCodeData?: string;
  errors?: string[];
}

export class LHDNInvoiceEngine {
  private repository: LHDNInvoiceRepository;
  private mappingService: MappingService;
  private validationService: ValidationService;
  private submissionService: SubmissionService | null = null;
  private qrCodeService: QRCodeService;
  private notificationService: NotificationService | null = null;
  private sapConnector: S4HANAConnector | null = null;
  private config: LHDNInvoiceEngineConfig;
  private tenantConfig: LHDNTenantConfig | null = null;

  constructor(config: LHDNInvoiceEngineConfig) {
    this.config = config;
    this.repository = new LHDNInvoiceRepository(config.databaseUrl);
    this.mappingService = new MappingService();
    this.validationService = new ValidationService();
    this.qrCodeService = new QRCodeService();
  }

  /**
   * Initialize the engine with tenant configuration and SAP connector
   */
  async initialize(sapConnector: S4HANAConnector): Promise<void> {
    // Load tenant configuration
    this.tenantConfig = await this.repository.getTenantConfig(this.config.tenantId);
    if (!this.tenantConfig) {
      throw new Error(
        `LHDN configuration not found for tenant ${this.config.tenantId}. ` +
        'Please configure the module before use.'
      );
    }

    // Initialize SAP connector
    this.sapConnector = sapConnector;

    // Initialize submission service and notification service with tenant credentials
    this.submissionService = new SubmissionService(this.tenantConfig);
    this.notificationService = new NotificationService(this.tenantConfig);

    logger.info('LHDN Invoice Engine initialized', {
      tenantId: this.config.tenantId,
      environment: this.tenantConfig.environment,
    });
  }

  /**
   * Submit SAP billing document as LHDN e-invoice
   */
  async submitInvoice(options: SubmitInvoiceOptions): Promise<SubmitInvoiceResult> {
    const startTime = Date.now();
    this.ensureInitialized();

    logger.info('Starting invoice submission', {
      tenantId: this.config.tenantId,
      sapDocument: options.sapBillingDocument,
    });

    try {
      // Step 1: Check if invoice already exists
      const existingInvoice = await this.repository.getInvoiceBySAPDocument(
        this.config.tenantId,
        options.sapBillingDocument
      );

      if (existingInvoice) {
        logger.warn('Invoice already exists for SAP document', {
          invoiceId: existingInvoice.id,
          sapDocument: options.sapBillingDocument,
          status: existingInvoice.status,
        });

        return {
          invoiceId: existingInvoice.id,
          invoiceNumber: existingInvoice.invoiceNumber,
          status: existingInvoice.status,
          validationResult: {
            isValid: existingInvoice.status !== 'REJECTED',
            errors: [],
            warnings: [],
            validatedAt: existingInvoice.validatedAt || new Date(),
          },
          errors: ['Invoice already exists for this SAP billing document'],
        };
      }

      // Step 2: Fetch SAP billing document
      logger.info('Fetching SAP billing document', {
        document: options.sapBillingDocument,
      });

      const sapDocument = await this.fetchSAPDocument(
        options.sapBillingDocument,
        options.sapCompanyCode
      );

      // Step 3: Transform SAP document to LHDN invoice
      logger.info('Transforming SAP document to LHDN invoice');
      const lhdnInvoice = await this.transformSAPToLHDN(sapDocument);

      // Step 4: Validate the invoice
      logger.info('Validating LHDN invoice');
      const validationResult = await this.validationService.validateForSubmission(lhdnInvoice);

      // Step 5: Create invoice record in database
      const invoice = await this.repository.createInvoice(lhdnInvoice);
      await this.repository.updateValidationResult(invoice.id, validationResult);

      // Log audit event
      await this.repository.logAuditEvent({
        tenantId: this.config.tenantId,
        invoiceId: invoice.id,
        action: 'CREATED',
        actor: this.config.createdBy,
        requestData: { sapBillingDocument: options.sapBillingDocument },
        success: true,
      });

      // If validation failed, return early
      if (!validationResult.isValid) {
        logger.warn('Invoice validation failed', {
          invoiceId: invoice.id,
          errors: validationResult.errors,
        });

        return {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: 'DRAFT',
          validationResult,
          errors: validationResult.errors.map((e) => e.message),
        };
      }

      // Step 6: Submit to LHDN (if autoSubmit is enabled or explicitly requested)
      const shouldSubmit = options.autoSubmit ?? this.tenantConfig!.autoSubmit;
      let submissionResult: SubmissionResult | undefined;
      let qrCodeData: string | undefined;

      if (shouldSubmit) {
        logger.info('Submitting invoice to LHDN MyInvois');
        submissionResult = await this.submitToLHDN(invoice);

        // Step 7: Generate QR code if submission was successful
        if (submissionResult.success && this.tenantConfig!.generateQrCode) {
          logger.info('Generating QR code');
          qrCodeData = await this.generateQRCode(invoice, submissionResult);
        }

        // Step 8: Send notification
        if (submissionResult.success && this.notificationService) {
          await this.notificationService.notify({
            type: 'SUBMISSION',
            invoice,
            timestamp: new Date(),
            message: `Invoice ${invoice.invoiceNumber} submitted successfully`,
          });
        }
      }

      const duration = Date.now() - startTime;
      logger.info('Invoice submission completed', {
        invoiceId: invoice.id,
        status: invoice.status,
        duration: `${duration}ms`,
      });

      return {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        validationResult,
        submissionResult,
        qrCodeData,
      };
    } catch (error: any) {
      logger.error('Invoice submission failed', {
        error: error.message,
        sapDocument: options.sapBillingDocument,
      });

      // Log audit event
      await this.repository.logAuditEvent({
        tenantId: this.config.tenantId,
        action: 'SUBMISSION_FAILED',
        actor: this.config.createdBy,
        requestData: options,
        success: false,
        errorMessage: error.message,
      });

      throw error;
    }
  }

  /**
   * Submit multiple invoices in bulk
   */
  async submitBulk(request: BulkSubmissionRequest): Promise<BulkSubmissionResult> {
    this.ensureInitialized();

    logger.info('Starting bulk submission', {
      tenantId: request.tenantId,
      count: request.invoiceIds.length,
    });

    const results: BulkSubmissionResult['results'] = [];
    let successful = 0;
    let failed = 0;

    for (const invoiceId of request.invoiceIds) {
      try {
        const invoice = await this.repository.getInvoiceById(invoiceId);
        if (!invoice) {
          results.push({
            invoiceId,
            invoiceNumber: 'UNKNOWN',
            success: false,
            errors: ['Invoice not found'],
          });
          failed++;
          continue;
        }

        if (request.validateOnly) {
          // Only validate
          const validationResult = await this.validationService.validateForSubmission(invoice);
          await this.repository.updateValidationResult(invoiceId, validationResult);

          results.push({
            invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            success: validationResult.isValid,
            errors: validationResult.isValid
              ? undefined
              : validationResult.errors.map((e) => e.message),
          });

          if (validationResult.isValid) successful++;
          else failed++;
        } else {
          // Submit to LHDN
          const submissionResult = await this.submitToLHDN(invoice);

          results.push({
            invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            success: submissionResult.success,
            submissionUid: submissionResult.submissionUid,
            errors: submissionResult.errors,
          });

          if (submissionResult.success) successful++;
          else failed++;
        }
      } catch (error: any) {
        logger.error('Bulk submission item failed', {
          invoiceId,
          error: error.message,
        });

        results.push({
          invoiceId,
          invoiceNumber: 'ERROR',
          success: false,
          errors: [error.message],
        });
        failed++;
      }
    }

    logger.info('Bulk submission completed', {
      total: request.invoiceIds.length,
      successful,
      failed,
    });

    return {
      totalInvoices: request.invoiceIds.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Get invoice status from LHDN
   */
  async getInvoiceStatus(invoiceId: string): Promise<{
    invoice: LHDNInvoice;
    lhdnStatus?: any;
  }> {
    this.ensureInitialized();

    const invoice = await this.repository.getInvoiceById(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    // If invoice has submission UID, query LHDN status
    let lhdnStatus;
    if (invoice.submissionUid && this.submissionService) {
      try {
        lhdnStatus = await this.submissionService.queryInvoiceStatus(invoice.submissionUid);

        // Update invoice status if changed
        if (lhdnStatus.status === 'ACCEPTED' && invoice.status !== 'ACCEPTED') {
          await this.repository.updateInvoiceStatus(invoiceId, 'ACCEPTED', {
            acceptedAt: new Date(),
            lhdnReferenceNumber: lhdnStatus.longId,
          });

          // Send acceptance notification
          if (this.notificationService) {
            await this.notificationService.notify({
              type: 'ACCEPTANCE',
              invoice,
              timestamp: new Date(),
              message: `Invoice ${invoice.invoiceNumber} accepted by LHDN`,
            });
          }
        } else if (lhdnStatus.status === 'REJECTED' && invoice.status !== 'REJECTED') {
          await this.repository.updateInvoiceStatus(invoiceId, 'REJECTED', {
            rejectedAt: new Date(),
            rejectionReasons: lhdnStatus.messages || [],
          });

          // Send rejection notification
          if (this.notificationService) {
            await this.notificationService.notify({
              type: 'REJECTION',
              invoice,
              timestamp: new Date(),
              message: `Invoice ${invoice.invoiceNumber} rejected by LHDN`,
              details: { reasons: lhdnStatus.messages },
            });
          }
        }
      } catch (error: any) {
        logger.error('Failed to fetch LHDN status', {
          invoiceId,
          error: error.message,
        });
      }
    }

    return { invoice, lhdnStatus };
  }

  /**
   * Cancel an accepted invoice
   */
  async cancelInvoice(
    invoiceId: string,
    cancellationReason: string
  ): Promise<{ success: boolean; message?: string }> {
    this.ensureInitialized();

    const invoice = await this.repository.getInvoiceById(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    if (invoice.status !== 'ACCEPTED') {
      throw new Error('Only accepted invoices can be cancelled');
    }

    if (!invoice.submissionUid) {
      throw new Error('Invoice has no submission UID');
    }

    try {
      const result = await this.submissionService!.cancelInvoice(
        invoice.submissionUid,
        {
          reason: cancellationReason,
          cancelledBy: this.config.createdBy,
        }
      );

      if (result.success) {
        await this.repository.updateInvoiceStatus(invoiceId, 'CANCELLED', {
          rejectionReasons: [cancellationReason],
        });

        // Log audit event
        await this.repository.logAuditEvent({
          tenantId: this.config.tenantId,
          invoiceId,
          action: 'CANCELLED',
          actor: this.config.createdBy,
          requestData: { reason: cancellationReason },
          responseData: result,
          success: true,
        });

        // Send cancellation notification
        if (this.notificationService) {
          await this.notificationService.notify({
            type: 'CANCELLATION',
            invoice,
            timestamp: new Date(),
            message: `Invoice ${invoice.invoiceNumber} cancelled`,
            details: { reason: cancellationReason },
          });
        }
      }

      return result;
    } catch (error: any) {
      logger.error('Invoice cancellation failed', {
        invoiceId,
        error: error.message,
      });

      await this.repository.logAuditEvent({
        tenantId: this.config.tenantId,
        invoiceId,
        action: 'CANCELLATION_FAILED',
        actor: this.config.createdBy,
        requestData: { reason: cancellationReason },
        success: false,
        errorMessage: error.message,
      });

      throw error;
    }
  }

  /**
   * Get compliance report
   */
  async getComplianceReport(startDate: Date, endDate: Date): Promise<ComplianceReport> {
    this.ensureInitialized();
    return this.repository.getComplianceReport(this.config.tenantId, startDate, endDate);
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await this.repository.close();
  }

  // Private helper methods

  private ensureInitialized(): void {
    if (!this.sapConnector || !this.tenantConfig || !this.submissionService) {
      throw new Error('Engine not initialized. Call initialize() first.');
    }
  }

  private async fetchSAPDocument(
    billingDocument: string,
    companyCode: string
  ): Promise<SAPBillingDocument> {
    // Fetch billing document from SAP
    const url = `/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument` +
      `?$filter=BillingDocument eq '${billingDocument}' and CompanyCode eq '${companyCode}'` +
      `&$expand=to_Item,to_Partner,to_PricingElement`;

    const response = await this.sapConnector!.executeRequest<{ d: { results: SAPBillingDocument[] } }>({
      method: 'GET',
      url,
    });

    const sapData = response.d?.results || [];

    if (!sapData || sapData.length === 0) {
      throw new Error(
        `SAP billing document ${billingDocument} not found for company code ${companyCode}`
      );
    }

    return sapData[0];
  }

  private async transformSAPToLHDN(sapDocument: SAPBillingDocument): Promise<LHDNInvoice> {
    // Build mapping context
    const context = {
      tenantId: this.config.tenantId,
      sapBillingDocument: sapDocument,
      sapItems: [], // Would need to be fetched from expanded data
      tenantConfig: this.tenantConfig!,
    };

    const mappingResult = await this.mappingService.mapBillingDocumentToInvoice(context);

    if (!mappingResult.success || !mappingResult.invoice) {
      throw new Error(
        `Failed to map SAP document: ${mappingResult.errors.map(e => e.reason).join(', ')}`
      );
    }

    // Generate invoice ID and set metadata
    return {
      ...mappingResult.invoice as LHDNInvoice,
      id: uuidv4(),
      tenantId: this.config.tenantId,
      status: 'DRAFT',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: this.config.createdBy,
    };
  }

  private async submitToLHDN(invoice: LHDNInvoice): Promise<SubmissionResult> {
    try {
      const submissionResult = await this.submissionService!.submitInvoice(invoice);

      // Update invoice with submission data
      await this.repository.updateInvoiceStatus(
        invoice.id,
        submissionResult.success ? 'SUBMITTED' : 'REJECTED',
        {
          submissionUid: submissionResult.submissionUid,
          lhdnReferenceNumber: submissionResult.lhdnReferenceNumber,
          submittedAt: new Date(),
          acceptedAt: submissionResult.success ? new Date() : undefined,
          rejectedAt: !submissionResult.success ? new Date() : undefined,
          rejectionReasons: submissionResult.errors,
        }
      );

      // Log audit event
      await this.repository.logAuditEvent({
        tenantId: this.config.tenantId,
        invoiceId: invoice.id,
        action: submissionResult.success ? 'SUBMITTED' : 'REJECTED',
        actor: this.config.createdBy,
        requestData: { invoiceNumber: invoice.invoiceNumber },
        responseData: submissionResult,
        success: submissionResult.success,
        errorMessage: submissionResult.errors?.join(', '),
      });

      return submissionResult;
    } catch (error: any) {
      logger.error('LHDN submission failed', {
        invoiceId: invoice.id,
        error: error.message,
      });

      await this.repository.updateInvoiceStatus(invoice.id, 'REJECTED', {
        rejectedAt: new Date(),
        rejectionReasons: [error.message],
      });

      return {
        success: false,
        timestamp: new Date(),
        errors: [error.message],
      };
    }
  }

  private async generateQRCode(
    invoice: LHDNInvoice,
    submissionResult: SubmissionResult
  ): Promise<string | undefined> {
    if (!submissionResult.lhdnReferenceNumber) {
      return undefined;
    }

    try {
      // Update invoice with LHDN reference before generating QR
      const updatedInvoice = {
        ...invoice,
        lhdnReferenceNumber: submissionResult.lhdnReferenceNumber,
        status: 'ACCEPTED' as const,
      };

      const qrResult = await this.qrCodeService.generateQRCode(updatedInvoice);

      if (!qrResult.success || !qrResult.qrCodeDataUrl) {
        logger.warn('QR code generation failed', {
          invoiceId: invoice.id,
          error: qrResult.error,
        });
        return undefined;
      }

      // Update invoice with QR code data
      await this.repository.updateInvoiceStatus(invoice.id, 'ACCEPTED', {
        qrCodeData: qrResult.qrCodeDataUrl,
      });

      return qrResult.qrCodeDataUrl;
    } catch (error: any) {
      logger.error('QR code generation failed', {
        invoiceId: invoice.id,
        error: error.message,
      });
      return undefined;
    }
  }
}
