/**
 * LHDNInvoiceEngine Unit Tests
 *
 * Tests the main orchestration engine for LHDN e-invoicing
 */

import { LHDNInvoiceEngine } from '../../src/engine/LHDNInvoiceEngine';
import { LHDNInvoiceRepository } from '../../src/repository/LHDNInvoiceRepository';
import { MappingService } from '../../src/services/MappingService';
import { ValidationService } from '../../src/services/ValidationService';
import { SubmissionService } from '../../src/services/SubmissionService';
import { QRCodeService } from '../../src/services/QRCodeService';
import { NotificationService } from '../../src/services/NotificationService';
import { LHDNInvoice, LHDNTenantConfig } from '../../src/types';

// Mock all dependencies
jest.mock('../../src/repository/LHDNInvoiceRepository');
jest.mock('../../src/services/MappingService');
jest.mock('../../src/services/ValidationService');
jest.mock('../../src/services/SubmissionService');
jest.mock('../../src/services/QRCodeService');
jest.mock('../../src/services/NotificationService');

describe('LHDNInvoiceEngine', () => {
  let engine: LHDNInvoiceEngine;
  let mockRepository: jest.Mocked<LHDNInvoiceRepository>;
  let mockMappingService: jest.Mocked<MappingService>;
  let mockValidationService: jest.Mocked<ValidationService>;
  let mockSubmissionService: jest.Mocked<SubmissionService>;
  let mockQRCodeService: jest.Mocked<QRCodeService>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockSAPConnector: any;

  const mockTenantConfig: LHDNTenantConfig = {
    tenantId: 'tenant-123',
    clientId: 'client-123',
    clientSecret: 'secret-123',
    apiBaseUrl: 'https://api-sandbox.myinvois.hasil.gov.my',
    environment: 'SANDBOX',
    companyTin: '009876543210',
    companyName: 'XYZ Sdn Bhd',
    companyAddress: {
      line1: 'Jalan Sultan Ismail',
      city: 'Kuala Lumpur',
      state: 'Wilayah Persekutuan Kuala Lumpur',
      postalCode: '50250',
      country: 'MY',
    },
    companyContact: {
      phone: '+60387654321',
      email: 'billing@xyz.com.my',
    },
    invoicePrefix: 'INV-',
    autoSubmit: false,
    validateBeforePost: true,
    generateQrCode: true,
    notificationEmails: ['finance@xyz.com.my'],
    taxCodeMapping: { V6: 'SR' },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockInvoice = (): LHDNInvoice => ({
    id: 'inv-123',
    tenantId: 'tenant-123',
    invoiceNumber: 'INV-2024-001',
    documentType: '01',
    status: 'DRAFT',
    invoiceDate: new Date('2024-01-15'),
    currency: 'MYR',
    supplier: {
      tin: '009876543210',
      name: 'XYZ Sdn Bhd',
      address: {
        line1: 'Jalan Sultan Ismail',
        city: 'Kuala Lumpur',
        state: 'Wilayah Persekutuan Kuala Lumpur',
        postalCode: '50250',
        country: 'MY',
      },
    },
    buyer: {
      tin: '001234567890',
      name: 'ABC Sdn Bhd',
      address: {
        line1: 'Jalan Ampang',
        city: 'Kuala Lumpur',
        state: 'Wilayah Persekutuan Kuala Lumpur',
        postalCode: '50450',
        country: 'MY',
      },
    },
    lineItems: [
      {
        lineNumber: 1,
        description: 'Test Product',
        quantity: 10,
        unitPrice: 100,
        taxType: 'SR',
        taxRate: 6,
        taxAmount: 60,
        subtotal: 1000,
        total: 1060,
      },
    ],
    subtotalAmount: 1000,
    totalTaxAmount: 60,
    totalAmount: 1060,
    sapBillingDocument: '9000000001',
    sapCompanyCode: '1000',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  });

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create engine instance
    engine = new LHDNInvoiceEngine({
      databaseUrl: 'postgresql://localhost:5432/test',
      tenantId: 'tenant-123',
      createdBy: 'test-user',
    });

    // Get mocked instances
    mockRepository = (engine as any).repository as jest.Mocked<LHDNInvoiceRepository>;
    mockMappingService = (engine as any).mappingService as jest.Mocked<MappingService>;
    mockValidationService = (engine as any).validationService as jest.Mocked<ValidationService>;
    mockQRCodeService = (engine as any).qrCodeService as jest.Mocked<QRCodeService>;

    // Setup SAP connector mock
    mockSAPConnector = {
      executeRequest: jest.fn(),
    };
  });

  describe('initialize', () => {
    it('should initialize successfully with valid tenant config', async () => {
      mockRepository.getTenantConfig = jest.fn().mockResolvedValue(mockTenantConfig);

      await engine.initialize(mockSAPConnector);

      expect(mockRepository.getTenantConfig).toHaveBeenCalledWith('tenant-123');
      expect((engine as any).tenantConfig).toBeDefined();
      expect((engine as any).sapConnector).toBe(mockSAPConnector);
    });

    it('should throw error if tenant config not found', async () => {
      mockRepository.getTenantConfig = jest.fn().mockResolvedValue(null);

      await expect(engine.initialize(mockSAPConnector)).rejects.toThrow(
        'LHDN configuration not found'
      );
    });
  });

  describe('submitInvoice', () => {
    beforeEach(async () => {
      mockRepository.getTenantConfig = jest.fn().mockResolvedValue(mockTenantConfig);
      await engine.initialize(mockSAPConnector);
    });

    it('should successfully submit a new invoice without auto-submit', async () => {
      const mockInvoice = createMockInvoice();

      // Mock dependencies
      mockRepository.getInvoiceBySAPDocument = jest.fn().mockResolvedValue(null);
      mockSAPConnector.executeRequest = jest.fn().mockResolvedValue({
        d: {
          results: [
            {
              BillingDocument: '9000000001',
              BillingDocumentType: 'F2',
              CompanyCode: '1000',
              TransactionCurrency: 'MYR',
              TotalNetAmount: '1000.00',
              TotalTaxAmount: '60.00',
              TotalGrossAmount: '1060.00',
            },
          ],
        },
      });

      mockMappingService.mapBillingDocumentToInvoice = jest.fn().mockResolvedValue({
        success: true,
        invoice: mockInvoice,
        errors: [],
        warnings: [],
      });

      mockValidationService.validateForSubmission = jest.fn().mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        validatedAt: new Date(),
      });

      mockRepository.createInvoice = jest.fn().mockResolvedValue(mockInvoice);
      mockRepository.updateValidationResult = jest.fn().mockResolvedValue(undefined);
      mockRepository.logAuditEvent = jest.fn().mockResolvedValue(undefined);

      const result = await engine.submitInvoice({
        sapBillingDocument: '9000000001',
        sapCompanyCode: '1000',
        autoSubmit: false,
      });

      expect(result.invoiceId).toBe('inv-123');
      expect(result.status).toBe('DRAFT');
      expect(result.validationResult.isValid).toBe(true);
      expect(result.submissionResult).toBeUndefined(); // Not auto-submitted
      expect(mockRepository.createInvoice).toHaveBeenCalled();
      expect(mockRepository.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATED',
          success: true,
        })
      );
    });

    it('should return early if invoice already exists', async () => {
      const existingInvoice = createMockInvoice();
      existingInvoice.status = 'ACCEPTED';

      mockRepository.getInvoiceBySAPDocument = jest.fn().mockResolvedValue(existingInvoice);

      const result = await engine.submitInvoice({
        sapBillingDocument: '9000000001',
        sapCompanyCode: '1000',
      });

      expect(result.invoiceId).toBe('inv-123');
      expect(result.status).toBe('ACCEPTED');
      expect(result.errors).toContain('Invoice already exists for this SAP billing document');
      expect(mockRepository.createInvoice).not.toHaveBeenCalled();
    });

    it('should handle validation failures', async () => {
      const mockInvoice = createMockInvoice();

      mockRepository.getInvoiceBySAPDocument = jest.fn().mockResolvedValue(null);
      mockSAPConnector.executeRequest = jest.fn().mockResolvedValue({
        d: { results: [{}] },
      });

      mockMappingService.mapBillingDocumentToInvoice = jest.fn().mockResolvedValue({
        success: true,
        invoice: mockInvoice,
        errors: [],
        warnings: [],
      });

      mockValidationService.validateForSubmission = jest.fn().mockResolvedValue({
        isValid: false,
        errors: [
          {
            code: 'LHDN-001',
            field: 'invoiceNumber',
            message: 'Invalid invoice number',
            severity: 'ERROR' as const,
          },
        ],
        warnings: [],
        validatedAt: new Date(),
      });

      mockRepository.createInvoice = jest.fn().mockResolvedValue(mockInvoice);
      mockRepository.updateValidationResult = jest.fn().mockResolvedValue(undefined);
      mockRepository.logAuditEvent = jest.fn().mockResolvedValue(undefined);

      const result = await engine.submitInvoice({
        sapBillingDocument: '9000000001',
        sapCompanyCode: '1000',
      });

      expect(result.status).toBe('DRAFT');
      expect(result.validationResult.isValid).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.submissionResult).toBeUndefined();
    });

    it('should throw error if SAP document not found', async () => {
      mockRepository.getInvoiceBySAPDocument = jest.fn().mockResolvedValue(null);
      mockSAPConnector.executeRequest = jest.fn().mockResolvedValue({
        d: { results: [] }, // Empty results
      });

      await expect(
        engine.submitInvoice({
          sapBillingDocument: '9999999999',
          sapCompanyCode: '1000',
        })
      ).rejects.toThrow('SAP billing document 9999999999 not found');
    });
  });

  describe('getInvoiceStatus', () => {
    beforeEach(async () => {
      mockRepository.getTenantConfig = jest.fn().mockResolvedValue(mockTenantConfig);
      await engine.initialize(mockSAPConnector);
      mockSubmissionService = (engine as any).submissionService as jest.Mocked<SubmissionService>;
    });

    it('should retrieve invoice status from database', async () => {
      const mockInvoice = createMockInvoice();
      mockInvoice.status = 'ACCEPTED';
      mockInvoice.submissionUid = 'sub-123';

      mockRepository.getInvoiceById = jest.fn().mockResolvedValue(mockInvoice);
      mockSubmissionService.queryInvoiceStatus = jest.fn().mockResolvedValue({
        submissionUid: 'sub-123',
        status: 'ACCEPTED',
        longId: 'LHDN-123',
        timestamp: new Date().toISOString(),
      });

      const result = await engine.getInvoiceStatus('inv-123');

      expect(result.invoice).toBeDefined();
      expect(result.invoice.id).toBe('inv-123');
      expect(result.lhdnStatus).toBeDefined();
    });

    it('should throw error if invoice not found', async () => {
      mockRepository.getInvoiceById = jest.fn().mockResolvedValue(null);

      await expect(engine.getInvoiceStatus('inv-999')).rejects.toThrow(
        'Invoice inv-999 not found'
      );
    });
  });

  describe('cancelInvoice', () => {
    beforeEach(async () => {
      mockRepository.getTenantConfig = jest.fn().mockResolvedValue(mockTenantConfig);
      await engine.initialize(mockSAPConnector);
      mockSubmissionService = (engine as any).submissionService as jest.Mocked<SubmissionService>;
    });

    it('should successfully cancel an accepted invoice', async () => {
      const mockInvoice = createMockInvoice();
      mockInvoice.status = 'ACCEPTED';
      mockInvoice.submissionUid = 'sub-123';

      mockRepository.getInvoiceById = jest.fn().mockResolvedValue(mockInvoice);
      mockSubmissionService.cancelInvoice = jest.fn().mockResolvedValue({
        success: true,
        submissionUid: 'sub-123',
        timestamp: new Date(),
      });
      mockRepository.updateInvoiceStatus = jest.fn().mockResolvedValue(undefined);
      mockRepository.logAuditEvent = jest.fn().mockResolvedValue(undefined);
      mockNotificationService = (engine as any).notificationService as jest.Mocked<NotificationService>;
      mockNotificationService.notify = jest.fn().mockResolvedValue(undefined);

      const result = await engine.cancelInvoice('inv-123', 'Customer request');

      expect(result.success).toBe(true);
      expect(mockSubmissionService.cancelInvoice).toHaveBeenCalledWith(
        'sub-123',
        expect.objectContaining({ reason: 'Customer request' })
      );
      expect(mockRepository.updateInvoiceStatus).toHaveBeenCalledWith(
        'inv-123',
        'CANCELLED',
        expect.anything()
      );
    });

    it('should throw error if invoice not accepted', async () => {
      const mockInvoice = createMockInvoice();
      mockInvoice.status = 'DRAFT';

      mockRepository.getInvoiceById = jest.fn().mockResolvedValue(mockInvoice);

      await expect(
        engine.cancelInvoice('inv-123', 'Test cancellation')
      ).rejects.toThrow('Only accepted invoices can be cancelled');
    });
  });

  describe('getComplianceReport', () => {
    beforeEach(async () => {
      mockRepository.getTenantConfig = jest.fn().mockResolvedValue(mockTenantConfig);
      await engine.initialize(mockSAPConnector);
    });

    it('should generate compliance report for date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockRepository.getComplianceReport = jest.fn().mockResolvedValue({
        tenantId: 'tenant-123',
        reportPeriod: { startDate, endDate },
        statistics: {
          totalInvoices: 100,
          submitted: 95,
          accepted: 90,
          rejected: 5,
          cancelled: 2,
          pending: 3,
        },
        byDocumentType: {
          '01': 80,
          '02': 15,
          '03': 5,
        },
        byStatus: {
          DRAFT: 3,
          VALIDATED: 2,
          SUBMITTED: 5,
          ACCEPTED: 90,
          REJECTED: 5,
          CANCELLED: 2,
        },
        totalRevenue: 1000000,
        totalTax: 60000,
        rejectionReasons: [],
        generatedAt: new Date(),
      });

      const report = await engine.getComplianceReport(startDate, endDate);

      expect(report).toBeDefined();
      expect(report.statistics.totalInvoices).toBe(100);
      expect(report.statistics.accepted).toBe(90);
      expect(mockRepository.getComplianceReport).toHaveBeenCalledWith(
        'tenant-123',
        startDate,
        endDate
      );
    });
  });
});
