/**
 * LHDNInvoiceRepository Unit Tests
 *
 * Tests database persistence layer for LHDN e-invoices
 */

import { LHDNInvoiceRepository } from '../../src/repository/LHDNInvoiceRepository';
import { LHDNInvoice, InvoiceStatus } from '../../src/types';
import { Pool } from 'pg';

// Mock pg Pool
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    end: jest.fn(),
  })),
}));

describe('LHDNInvoiceRepository', () => {
  let repository: LHDNInvoiceRepository;
  let mockPool: jest.Mocked<Pool>;

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
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    createdBy: 'test-user',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new LHDNInvoiceRepository('postgresql://localhost:5432/test');
    mockPool = (repository as any).pool as jest.Mocked<Pool>;
  });

  describe('createInvoice', () => {
    it('should insert invoice into database', async () => {
      const invoice = createMockInvoice();
      const mockDbRow = {
        ...invoice,
        tenant_id: invoice.tenantId,
        invoice_number: invoice.invoiceNumber,
        document_type: invoice.documentType,
        invoice_date: invoice.invoiceDate,
        subtotal_amount: invoice.subtotalAmount.toString(),
        total_tax_amount: invoice.totalTaxAmount.toString(),
        total_discount_amount: '0',
        total_amount: invoice.totalAmount.toString(),
        sap_billing_document: invoice.sapBillingDocument,
        sap_company_code: invoice.sapCompanyCode,
        created_at: invoice.createdAt,
        updated_at: invoice.updatedAt,
        created_by: invoice.createdBy,
      };

      mockPool.query = jest.fn().mockResolvedValue({
        rows: [mockDbRow],
      });

      const result = await repository.createInvoice(invoice);

      expect(result).toBeDefined();
      expect(result.id).toBe('inv-123');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO lhdn_einvoices'),
        expect.any(Array)
      );
    });
  });

  describe('getInvoiceById', () => {
    it('should retrieve invoice by ID', async () => {
      const mockDbRow = {
        id: 'inv-123',
        tenant_id: 'tenant-123',
        invoice_number: 'INV-2024-001',
        document_type: '01',
        status: 'DRAFT',
        invoice_date: new Date('2024-01-15'),
        due_date: null,
        currency: 'MYR',
        supplier: { tin: '009876543210', name: 'XYZ Sdn Bhd' },
        buyer: { tin: '001234567890', name: 'ABC Sdn Bhd' },
        line_items: [],
        subtotal_amount: '1000.00',
        total_tax_amount: '60.00',
        total_discount_amount: '0.00',
        total_amount: '1060.00',
        payment_mode: null,
        payment_terms: null,
        sap_billing_document: '9000000001',
        sap_company_code: '1000',
        purchase_order_ref: null,
        submission_uid: null,
        lhdn_reference_number: null,
        qr_code_data: null,
        submitted_at: null,
        accepted_at: null,
        rejected_at: null,
        rejection_reasons: null,
        validated_at: null,
        validation_errors: null,
        validation_warnings: null,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'test-user',
      };

      mockPool.query = jest.fn().mockResolvedValue({
        rows: [mockDbRow],
      });

      const result = await repository.getInvoiceById('inv-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('inv-123');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT e.*, t.tenant_id'),
        ['inv-123']
      );
    });

    it('should return null if invoice not found', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [] });

      const result = await repository.getInvoiceById('inv-999');

      expect(result).toBeNull();
    });
  });

  describe('getInvoiceByNumber', () => {
    it('should retrieve invoice by invoice number and tenant', async () => {
      const mockDbRow = {
        id: 'inv-123',
        tenant_id: 'tenant-123',
        invoice_number: 'INV-2024-001',
        document_type: '01',
        status: 'DRAFT',
        invoice_date: new Date('2024-01-15'),
        due_date: null,
        currency: 'MYR',
        supplier: {},
        buyer: {},
        line_items: [],
        subtotal_amount: '1000.00',
        total_tax_amount: '60.00',
        total_discount_amount: '0.00',
        total_amount: '1060.00',
        payment_mode: null,
        payment_terms: null,
        sap_billing_document: '9000000001',
        sap_company_code: '1000',
        purchase_order_ref: null,
        submission_uid: null,
        lhdn_reference_number: null,
        qr_code_data: null,
        submitted_at: null,
        accepted_at: null,
        rejected_at: null,
        rejection_reasons: null,
        validated_at: null,
        validation_errors: null,
        validation_warnings: null,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'test-user',
      };

      mockPool.query = jest.fn().mockResolvedValue({
        rows: [mockDbRow],
      });

      const result = await repository.getInvoiceByNumber('tenant-123', 'INV-2024-001');

      expect(result).toBeDefined();
      expect(result?.invoiceNumber).toBe('INV-2024-001');
    });
  });

  describe('updateInvoiceStatus', () => {
    it('should update invoice status and related fields', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [] });

      await repository.updateInvoiceStatus('inv-123', 'SUBMITTED', {
        submissionUid: 'sub-123',
        submittedAt: new Date('2024-01-15T11:00:00Z'),
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE lhdn_einvoices'),
        expect.arrayContaining(['inv-123', 'SUBMITTED', 'sub-123'])
      );
    });

    it('should update to ACCEPTED status with LHDN reference', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [] });

      await repository.updateInvoiceStatus('inv-123', 'ACCEPTED', {
        lhdnReferenceNumber: 'LHDN-2024-123456789',
        acceptedAt: new Date('2024-01-15T12:00:00Z'),
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE lhdn_einvoices'),
        expect.arrayContaining(['inv-123', 'ACCEPTED'])
      );
    });
  });

  describe('getInvoicesByTenant', () => {
    it('should retrieve invoices with filters', async () => {
      mockPool.query = jest.fn().mockResolvedValue({
        rows: [
          {
            id: 'inv-123',
            tenant_id: 'tenant-123',
            invoice_number: 'INV-2024-001',
            document_type: '01',
            status: 'ACCEPTED',
            invoice_date: new Date('2024-01-15'),
            due_date: null,
            currency: 'MYR',
            supplier: {},
            buyer: {},
            line_items: [],
            subtotal_amount: '1000.00',
            total_tax_amount: '60.00',
            total_discount_amount: '0.00',
            total_amount: '1060.00',
            payment_mode: null,
            payment_terms: null,
            sap_billing_document: '9000000001',
            sap_company_code: '1000',
            purchase_order_ref: null,
            submission_uid: 'sub-123',
            lhdn_reference_number: 'LHDN-123',
            qr_code_data: null,
            submitted_at: new Date(),
            accepted_at: new Date(),
            rejected_at: null,
            rejection_reasons: null,
            validated_at: new Date(),
            validation_errors: null,
            validation_warnings: null,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: 'test-user',
          },
        ],
      });

      const result = await repository.getInvoicesByTenant('tenant-123', {
        status: 'ACCEPTED',
        limit: 10,
        offset: 0,
      });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('ACCEPTED');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE t.tenant_id = $1'),
        expect.arrayContaining(['tenant-123'])
      );
    });

    it('should apply date range filters', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [] });

      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      await repository.getInvoicesByTenant('tenant-123', {
        fromDate,
        toDate,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND e.invoice_date >='),
        expect.arrayContaining(['tenant-123', fromDate, toDate])
      );
    });
  });

  describe('getComplianceReport', () => {
    it('should generate compliance report with statistics', async () => {
      // Mock statistics query
      mockPool.query = jest.fn()
        .mockResolvedValueOnce({
          rows: [
            {
              total_invoices: '100',
              submitted: '95',
              accepted: '90',
              rejected: '5',
              cancelled: '2',
              pending: '3',
              total_revenue: '1000000.00',
              total_tax: '60000.00',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            { document_type: '01', count: '80' },
            { document_type: '02', count: '15' },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            { status: 'ACCEPTED', count: '90' },
            { status: 'REJECTED', count: '5' },
          ],
        })
        .mockResolvedValueOnce({
          rows: [],
        });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const report = await repository.getComplianceReport('tenant-123', startDate, endDate);

      expect(report).toBeDefined();
      expect(report.statistics.totalInvoices).toBe(100);
      expect(report.statistics.accepted).toBe(90);
      expect(report.totalRevenue).toBe(1000000);
      expect(report.totalTax).toBe(60000);
    });
  });

  describe('logAuditEvent', () => {
    it('should log audit event to database', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [] });

      await repository.logAuditEvent({
        tenantId: 'tenant-123',
        invoiceId: 'inv-123',
        action: 'SUBMITTED',
        actor: 'test-user',
        requestData: { test: 'data' },
        responseData: { status: 'success' },
        success: true,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        requestId: 'req-123',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO lhdn_audit_log'),
        expect.arrayContaining([
          'tenant-123',
          'inv-123',
          'SUBMITTED',
          'test-user',
        ])
      );
    });
  });

  describe('close', () => {
    it('should close database connection', async () => {
      mockPool.end = jest.fn().mockResolvedValue(undefined);

      await repository.close();

      expect(mockPool.end).toHaveBeenCalled();
    });
  });
});
