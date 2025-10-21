/**
 * LHDN Invoice Repository Integration Tests
 *
 * Tests repository operations with real database
 */

import { LHDNInvoiceRepository } from '../../src/repository/LHDNInvoiceRepository';
import { TestEnvironment } from './setup';
import { Pool } from 'pg';

describe('LHDNInvoiceRepository Integration Tests', () => {
  let repository: LHDNInvoiceRepository;
  let pool: Pool;
  const tenantId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    pool = TestEnvironment.getPool();
    repository = new LHDNInvoiceRepository(pool);
  }, 300000);

  beforeEach(async () => {
    await TestEnvironment.cleanup();
    await TestEnvironment.insertFixtures();
  });

  describe('Invoice Creation', () => {
    it('should create new invoice', async () => {
      const invoice = await repository.create({
        tenantId,
        invoiceNumber: 'INV-TEST-001',
        documentType: '01',
        invoiceDate: new Date(),
        status: 'DRAFT',
        currency: 'MYR',
        sapBillingDocument: '9000001000',
        sapCompanyCode: 'TEST01',
        supplierTin: 'C12345678901',
        supplierName: 'Test Supplier Sdn Bhd',
        buyerTin: 'C98765432109',
        buyerName: 'Test Buyer Sdn Bhd',
        subtotalAmount: 1000.0,
        totalTaxAmount: 60.0,
        totalAmount: 1060.0,
        lineItems: [],
        createdBy: 'test-user',
      });

      expect(invoice.id).toBeDefined();
      expect(invoice.invoiceNumber).toBe('INV-TEST-001');
    });

    it('should generate UUID for new invoice', async () => {
      const invoice1 = await repository.create({
        tenantId,
        invoiceNumber: 'INV-UUID-1',
        documentType: '01',
        invoiceDate: new Date(),
        status: 'DRAFT',
        currency: 'MYR',
        sapBillingDocument: '9000001001',
        sapCompanyCode: 'TEST01',
        supplierTin: 'C12345678901',
        supplierName: 'Test Supplier',
        buyerTin: 'C98765432109',
        buyerName: 'Test Buyer',
        subtotalAmount: 100.0,
        totalTaxAmount: 6.0,
        totalAmount: 106.0,
        lineItems: [],
        createdBy: 'test-user',
      });

      const invoice2 = await repository.create({
        tenantId,
        invoiceNumber: 'INV-UUID-2',
        documentType: '01',
        invoiceDate: new Date(),
        status: 'DRAFT',
        currency: 'MYR',
        sapBillingDocument: '9000001002',
        sapCompanyCode: 'TEST01',
        supplierTin: 'C12345678901',
        supplierName: 'Test Supplier',
        buyerTin: 'C98765432109',
        buyerName: 'Test Buyer',
        subtotalAmount: 100.0,
        totalTaxAmount: 6.0,
        totalAmount: 106.0,
        lineItems: [],
        createdBy: 'test-user',
      });

      expect(invoice1.id).not.toBe(invoice2.id);
      expect(invoice1.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });
  });

  describe('Invoice Retrieval', () => {
    it('should find invoice by ID', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';

      const invoice = await repository.findById(invoiceId);

      expect(invoice).toBeDefined();
      expect(invoice?.id).toBe(invoiceId);
      expect(invoice?.invoiceNumber).toBe('INV-2024-001');
    });

    it('should return null for non-existent ID', async () => {
      const invoice = await repository.findById(
        '00000000-0000-0000-0000-999999999999'
      );

      expect(invoice).toBeNull();
    });

    it('should find invoice by invoice number', async () => {
      const invoice = await repository.findByInvoiceNumber(
        tenantId,
        'INV-2024-001'
      );

      expect(invoice).toBeDefined();
      expect(invoice?.invoiceNumber).toBe('INV-2024-001');
    });

    it('should find invoice by SAP billing document', async () => {
      const invoice = await repository.findBySAPDocument(tenantId, '9000000001');

      expect(invoice).toBeDefined();
      expect(invoice?.sapBillingDocument).toBe('9000000001');
    });
  });

  describe('Invoice Updates', () => {
    it('should update invoice status', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';

      await repository.updateStatus(invoiceId, 'SUBMITTED');

      const updated = await repository.findById(invoiceId);
      expect(updated?.status).toBe('SUBMITTED');
    });

    it('should update invoice with LHDN response', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';

      await repository.updateWithLHDNResponse(invoiceId, {
        lhdnUuid: 'LHDN-UUID-12345',
        lhdnInvoiceNumber: 'LHDN-INV-001',
        status: 'ACCEPTED',
        qrCodeUrl: 'https://myinvois.hasil.gov.my/qr/12345',
      });

      const updated = await repository.findById(invoiceId);
      expect(updated?.lhdnUuid).toBe('LHDN-UUID-12345');
      expect(updated?.status).toBe('ACCEPTED');
      expect(updated?.qrCodeUrl).toBe('https://myinvois.hasil.gov.my/qr/12345');
    });

    it('should update multiple fields', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';

      await repository.update(invoiceId, {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        lhdnUuid: 'NEW-UUID',
      });

      const updated = await repository.findById(invoiceId);
      expect(updated?.status).toBe('SUBMITTED');
      expect(updated?.submittedAt).toBeDefined();
      expect(updated?.lhdnUuid).toBe('NEW-UUID');
    });
  });

  describe('Invoice Queries', () => {
    it('should find invoices by status', async () => {
      const invoices = await repository.findByStatus(tenantId, 'ACCEPTED');

      expect(invoices.length).toBeGreaterThan(0);
      expect(invoices.every((inv) => inv.status === 'ACCEPTED')).toBe(true);
    });

    it('should find invoices by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const invoices = await repository.findByDateRange(
        tenantId,
        startDate,
        endDate
      );

      expect(invoices.length).toBeGreaterThan(0);
      invoices.forEach((inv) => {
        const invDate = new Date(inv.invoiceDate);
        expect(invDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(invDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should find pending submissions', async () => {
      // Create pending invoice
      await repository.create({
        tenantId,
        invoiceNumber: 'INV-PENDING-001',
        documentType: '01',
        invoiceDate: new Date(),
        status: 'PENDING_SUBMISSION',
        currency: 'MYR',
        sapBillingDocument: '9000002000',
        sapCompanyCode: 'TEST01',
        supplierTin: 'C12345678901',
        supplierName: 'Test Supplier',
        buyerTin: 'C98765432109',
        buyerName: 'Test Buyer',
        subtotalAmount: 100.0,
        totalTaxAmount: 6.0,
        totalAmount: 106.0,
        lineItems: [],
        createdBy: 'test-user',
      });

      const pending = await repository.findPendingSubmissions(tenantId);

      expect(pending.length).toBeGreaterThan(0);
      expect(pending.every((inv) => inv.status === 'PENDING_SUBMISSION')).toBe(
        true
      );
    });

    it('should find failed submissions', async () => {
      // Create failed invoice
      await repository.create({
        tenantId,
        invoiceNumber: 'INV-FAILED-001',
        documentType: '01',
        invoiceDate: new Date(),
        status: 'FAILED',
        currency: 'MYR',
        sapBillingDocument: '9000003000',
        sapCompanyCode: 'TEST01',
        supplierTin: 'C12345678901',
        supplierName: 'Test Supplier',
        buyerTin: 'C98765432109',
        buyerName: 'Test Buyer',
        subtotalAmount: 100.0,
        totalTaxAmount: 6.0,
        totalAmount: 106.0,
        lineItems: [],
        createdBy: 'test-user',
        errorMessage: 'Submission failed',
      });

      const failed = await repository.findFailedSubmissions(tenantId);

      expect(failed.length).toBeGreaterThan(0);
      expect(failed.every((inv) => inv.status === 'FAILED')).toBe(true);
    });
  });

  describe('Statistics and Aggregations', () => {
    it('should count invoices by status', async () => {
      const stats = await repository.getStatusCounts(tenantId);

      expect(stats).toBeDefined();
      expect(stats.ACCEPTED).toBeGreaterThan(0);
    });

    it('should calculate total amounts by period', async () => {
      const totals = await repository.getTotalAmountsByPeriod(
        tenantId,
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(totals.totalInvoices).toBeGreaterThan(0);
      expect(totals.totalAmount).toBeGreaterThan(0);
    });

    it('should get submission success rate', async () => {
      const rate = await repository.getSubmissionSuccessRate(tenantId);

      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });

    it('should find top buyers by volume', async () => {
      const topBuyers = await repository.getTopBuyers(tenantId, 10);

      expect(topBuyers.length).toBeGreaterThan(0);
      topBuyers.forEach((buyer) => {
        expect(buyer.buyerTin).toBeDefined();
        expect(buyer.buyerName).toBeDefined();
        expect(buyer.invoiceCount).toBeGreaterThan(0);
        expect(buyer.totalAmount).toBeGreaterThan(0);
      });
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should only return invoices for specified tenant', async () => {
      const tenant1Id = '00000000-0000-0000-0000-000000000001';
      const tenant2Id = '00000000-0000-0000-0000-000000000002';

      // Create invoice for tenant 2
      await pool.query(
        `INSERT INTO tenants (id, name, slug, is_active)
         VALUES ($1, 'Tenant 2', 'tenant-2', true)
         ON CONFLICT (id) DO NOTHING`,
        [tenant2Id]
      );

      await repository.create({
        tenantId: tenant2Id,
        invoiceNumber: 'INV-TENANT2-001',
        documentType: '01',
        invoiceDate: new Date(),
        status: 'DRAFT',
        currency: 'MYR',
        sapBillingDocument: '9000004000',
        sapCompanyCode: 'TEST02',
        supplierTin: 'C11111111111',
        supplierName: 'Tenant 2 Supplier',
        buyerTin: 'C22222222222',
        buyerName: 'Tenant 2 Buyer',
        subtotalAmount: 100.0,
        totalTaxAmount: 6.0,
        totalAmount: 106.0,
        lineItems: [],
        createdBy: 'tenant2-user',
      });

      // Query for tenant 1
      const tenant1Invoices = await repository.findByStatus(tenant1Id, 'DRAFT');

      // Should not include tenant 2's invoices
      const hasTenant2Invoice = tenant1Invoices.some(
        (inv) => inv.invoiceNumber === 'INV-TENANT2-001'
      );

      expect(hasTenant2Invoice).toBe(false);
    });
  });

  describe('Pagination', () => {
    it('should paginate results', async () => {
      // Create multiple invoices
      for (let i = 0; i < 15; i++) {
        await repository.create({
          tenantId,
          invoiceNumber: `INV-PAGE-${i}`,
          documentType: '01',
          invoiceDate: new Date(),
          status: 'ACCEPTED',
          currency: 'MYR',
          sapBillingDocument: `9000005${String(i).padStart(3, '0')}`,
          sapCompanyCode: 'TEST01',
          supplierTin: 'C12345678901',
          supplierName: 'Test Supplier',
          buyerTin: 'C98765432109',
          buyerName: 'Test Buyer',
          subtotalAmount: 100.0,
          totalTaxAmount: 6.0,
          totalAmount: 106.0,
          lineItems: [],
          createdBy: 'test-user',
        });
      }

      const page1 = await repository.findByStatus(tenantId, 'ACCEPTED', {
        limit: 10,
        offset: 0,
      });

      const page2 = await repository.findByStatus(tenantId, 'ACCEPTED', {
        limit: 10,
        offset: 10,
      });

      expect(page1.length).toBe(10);
      expect(page2.length).toBeGreaterThan(0);

      // Pages should have different invoices
      const page1Ids = page1.map((inv) => inv.id);
      const page2Ids = page2.map((inv) => inv.id);
      const overlap = page1Ids.filter((id) => page2Ids.includes(id));

      expect(overlap.length).toBe(0);
    });
  });

  describe('Sorting', () => {
    it('should sort by invoice date descending', async () => {
      const invoices = await repository.findByStatus(tenantId, 'ACCEPTED', {
        sortBy: 'invoiceDate',
        sortOrder: 'DESC',
      });

      for (let i = 1; i < invoices.length; i++) {
        const prev = new Date(invoices[i - 1].invoiceDate).getTime();
        const curr = new Date(invoices[i].invoiceDate).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it('should sort by total amount ascending', async () => {
      const invoices = await repository.findByStatus(tenantId, 'ACCEPTED', {
        sortBy: 'totalAmount',
        sortOrder: 'ASC',
      });

      for (let i = 1; i < invoices.length; i++) {
        expect(invoices[i - 1].totalAmount).toBeLessThanOrEqual(
          invoices[i].totalAmount
        );
      }
    });
  });

  describe('Deletion', () => {
    it('should soft delete invoice', async () => {
      const invoice = await repository.create({
        tenantId,
        invoiceNumber: 'INV-DELETE-001',
        documentType: '01',
        invoiceDate: new Date(),
        status: 'DRAFT',
        currency: 'MYR',
        sapBillingDocument: '9000006000',
        sapCompanyCode: 'TEST01',
        supplierTin: 'C12345678901',
        supplierName: 'Test Supplier',
        buyerTin: 'C98765432109',
        buyerName: 'Test Buyer',
        subtotalAmount: 100.0,
        totalTaxAmount: 6.0,
        totalAmount: 106.0,
        lineItems: [],
        createdBy: 'test-user',
      });

      await repository.softDelete(invoice.id);

      // Should not appear in normal queries
      const found = await repository.findById(invoice.id);
      expect(found).toBeNull();

      // But should exist with deleted flag
      const result = await pool.query(
        'SELECT deleted_at FROM lhdn_einvoices WHERE id = $1',
        [invoice.id]
      );

      expect(result.rows[0].deleted_at).toBeDefined();
    });

    it('should not allow hard delete of submitted invoices', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010'; // ACCEPTED invoice

      await expect(repository.hardDelete(invoiceId)).rejects.toThrow(
        /cannot delete/i
      );
    });
  });

  describe('Performance', () => {
    it('should efficiently query large datasets', async () => {
      // Create 100 invoices
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          repository.create({
            tenantId,
            invoiceNumber: `INV-PERF-${i}`,
            documentType: '01',
            invoiceDate: new Date(),
            status: 'ACCEPTED',
            currency: 'MYR',
            sapBillingDocument: `9000007${String(i).padStart(3, '0')}`,
            sapCompanyCode: 'TEST01',
            supplierTin: 'C12345678901',
            supplierName: 'Test Supplier',
            buyerTin: 'C98765432109',
            buyerName: 'Test Buyer',
            subtotalAmount: 100.0 * (i + 1),
            totalTaxAmount: 6.0 * (i + 1),
            totalAmount: 106.0 * (i + 1),
            lineItems: [],
            createdBy: 'test-user',
          })
        );
      }

      await Promise.all(promises);

      const startTime = Date.now();

      const results = await repository.findByStatus(tenantId, 'ACCEPTED', {
        limit: 50,
      });

      const duration = Date.now() - startTime;

      expect(results.length).toBe(50);
      expect(duration).toBeLessThan(1000); // Should complete in < 1 second
    });
  });
});
