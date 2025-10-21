/**
 * Full Submission Workflow Integration Tests
 *
 * Tests complete end-to-end invoice submission workflow
 * including validation, submission, idempotency, queuing, and circuit breaker
 */

import { LHDNInvoiceEngine } from '../../src/engine/LHDNInvoiceEngine';
import { TestEnvironment } from './setup';
import { Pool } from 'pg';

describe('Full Submission Workflow Integration Tests', () => {
  let engine: LHDNInvoiceEngine;
  let pool: Pool;
  const tenantId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    pool = TestEnvironment.getPool();
  }, 300000);

  beforeEach(async () => {
    await TestEnvironment.cleanup();
    await TestEnvironment.insertFixtures();

    engine = new LHDNInvoiceEngine(pool);
  });

  afterEach(async () => {
    await engine.close();
  });

  describe('Complete Invoice Submission Flow', () => {
    it('should process invoice from creation to LHDN submission', async () => {
      const invoiceData = {
        tenantId,
        sapBillingDocument: '9000000100',
        sapCompanyCode: 'TEST01',
        invoiceNumber: 'INV-2024-100',
        invoiceDate: new Date(),
        currency: 'MYR',
        supplierTin: 'C12345678901',
        supplierName: 'Test Supplier Sdn Bhd',
        buyerTin: 'C98765432109',
        buyerName: 'Test Buyer Sdn Bhd',
        lineItems: [
          {
            lineNumber: 1,
            description: 'Consulting Services',
            classification: 'Service',
            quantity: 10,
            unitPrice: 100.0,
            taxType: 'SST',
            taxRate: 0.06,
            taxAmount: 60.0,
            totalAmount: 1060.0,
          },
        ],
        createdBy: 'test-user',
      };

      const result = await engine.processInvoice(invoiceData);

      expect(result.success).toBe(true);
      expect(result.invoiceId).toBeDefined();
      expect(result.status).toBe('SUBMITTED');

      // Verify invoice in database
      const dbResult = await pool.query(
        'SELECT * FROM lhdn_einvoices WHERE id = $1',
        [result.invoiceId]
      );

      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].status).toBe('SUBMITTED');
    });

    it('should validate invoice before submission', async () => {
      const invalidInvoiceData = {
        tenantId,
        sapBillingDocument: '9000000101',
        sapCompanyCode: 'TEST01',
        invoiceNumber: '', // Invalid: empty invoice number
        invoiceDate: new Date(),
        currency: 'MYR',
        supplierTin: 'INVALID', // Invalid TIN format
        supplierName: 'Test Supplier',
        buyerTin: 'C98765432109',
        buyerName: 'Test Buyer',
        lineItems: [],
        createdBy: 'test-user',
      };

      await expect(engine.processInvoice(invalidInvoiceData)).rejects.toThrow(
        /validation/i
      );
    });

    it('should calculate totals correctly', async () => {
      const invoiceData = {
        tenantId,
        sapBillingDocument: '9000000102',
        sapCompanyCode: 'TEST01',
        invoiceNumber: 'INV-2024-102',
        invoiceDate: new Date(),
        currency: 'MYR',
        supplierTin: 'C12345678901',
        supplierName: 'Test Supplier Sdn Bhd',
        buyerTin: 'C98765432109',
        buyerName: 'Test Buyer Sdn Bhd',
        lineItems: [
          {
            lineNumber: 1,
            description: 'Product A',
            classification: 'Goods',
            quantity: 5,
            unitPrice: 200.0,
            taxType: 'SST',
            taxRate: 0.06,
            taxAmount: 60.0,
            totalAmount: 1060.0,
          },
          {
            lineNumber: 2,
            description: 'Product B',
            classification: 'Goods',
            quantity: 3,
            unitPrice: 150.0,
            taxType: 'SST',
            taxRate: 0.06,
            taxAmount: 27.0,
            totalAmount: 477.0,
          },
        ],
        createdBy: 'test-user',
      };

      const result = await engine.processInvoice(invoiceData);

      const dbResult = await pool.query(
        'SELECT subtotal_amount, total_tax_amount, total_amount FROM lhdn_einvoices WHERE id = $1',
        [result.invoiceId]
      );

      const invoice = dbResult.rows[0];
      expect(parseFloat(invoice.subtotal_amount)).toBe(1450.0); // 1000 + 450
      expect(parseFloat(invoice.total_tax_amount)).toBe(87.0); // 60 + 27
      expect(parseFloat(invoice.total_amount)).toBe(1537.0); // 1450 + 87
    });
  });

  describe('Idempotency Handling', () => {
    it('should prevent duplicate submissions with same idempotency key', async () => {
      const idempotencyKey = 'unique-invoice-key-001';

      const invoiceData = {
        tenantId,
        sapBillingDocument: '9000000200',
        sapCompanyCode: 'TEST01',
        invoiceNumber: 'INV-2024-200',
        invoiceDate: new Date(),
        currency: 'MYR',
        supplierTin: 'C12345678901',
        supplierName: 'Test Supplier Sdn Bhd',
        buyerTin: 'C98765432109',
        buyerName: 'Test Buyer Sdn Bhd',
        lineItems: [
          {
            lineNumber: 1,
            description: 'Service',
            classification: 'Service',
            quantity: 1,
            unitPrice: 100.0,
            taxRate: 0.06,
            taxAmount: 6.0,
            totalAmount: 106.0,
          },
        ],
        createdBy: 'test-user',
        idempotencyKey,
      };

      // First submission
      const result1 = await engine.processInvoice(invoiceData);
      expect(result1.success).toBe(true);

      // Second submission with same key - should return cached result
      const result2 = await engine.processInvoice(invoiceData);
      expect(result2.success).toBe(true);
      expect(result2.invoiceId).toBe(result1.invoiceId);
      expect(result2.cached).toBe(true);

      // Verify only one invoice created
      const countResult = await pool.query(
        'SELECT COUNT(*) FROM lhdn_einvoices WHERE invoice_number = $1',
        ['INV-2024-200']
      );

      expect(parseInt(countResult.rows[0].count)).toBe(1);
    });
  });

  describe('Queue Integration', () => {
    it('should queue invoice for async submission', async () => {
      const invoiceData = {
        tenantId,
        sapBillingDocument: '9000000300',
        sapCompanyCode: 'TEST01',
        invoiceNumber: 'INV-2024-300',
        invoiceDate: new Date(),
        currency: 'MYR',
        supplierTin: 'C12345678901',
        supplierName: 'Test Supplier Sdn Bhd',
        buyerTin: 'C98765432109',
        buyerName: 'Test Buyer Sdn Bhd',
        lineItems: [
          {
            lineNumber: 1,
            description: 'Queued item',
            classification: 'Service',
            quantity: 1,
            unitPrice: 100.0,
            taxRate: 0.06,
            taxAmount: 6.0,
            totalAmount: 106.0,
          },
        ],
        createdBy: 'test-user',
        async: true, // Queue for async processing
      };

      const result = await engine.processInvoice(invoiceData);

      expect(result.success).toBe(true);
      expect(result.queued).toBe(true);

      // Verify in queue
      const queueResult = await pool.query(
        'SELECT * FROM lhdn_submission_queue WHERE invoice_id = $1',
        [result.invoiceId]
      );

      expect(queueResult.rows).toHaveLength(1);
      expect(queueResult.rows[0].status).toBe('PENDING');
    });

    it('should process queued items', async () => {
      // Create and queue invoice
      const invoiceData = {
        tenantId,
        sapBillingDocument: '9000000301',
        sapCompanyCode: 'TEST01',
        invoiceNumber: 'INV-2024-301',
        invoiceDate: new Date(),
        currency: 'MYR',
        supplierTin: 'C12345678901',
        supplierName: 'Test Supplier Sdn Bhd',
        buyerTin: 'C98765432109',
        buyerName: 'Test Buyer Sdn Bhd',
        lineItems: [
          {
            lineNumber: 1,
            description: 'Process queue item',
            classification: 'Service',
            quantity: 1,
            unitPrice: 100.0,
            taxRate: 0.06,
            taxAmount: 6.0,
            totalAmount: 106.0,
          },
        ],
        createdBy: 'test-user',
        async: true,
      };

      const result = await engine.processInvoice(invoiceData);

      // Process the queue
      await engine.processQueue();

      // Check invoice status updated
      const invoiceResult = await pool.query(
        'SELECT status FROM lhdn_einvoices WHERE id = $1',
        [result.invoiceId]
      );

      expect(invoiceResult.rows[0].status).toBe('SUBMITTED');
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should open circuit after multiple failures', async () => {
      // Set invalid API config to force failures
      await pool.query(
        `UPDATE lhdn_tenant_config
         SET api_base_url = 'https://invalid-api.local'
         WHERE tenant_id = $1`,
        [tenantId]
      );

      const createInvoice = async (num: number) => ({
        tenantId,
        sapBillingDocument: `9000000${400 + num}`,
        sapCompanyCode: 'TEST01',
        invoiceNumber: `INV-2024-${400 + num}`,
        invoiceDate: new Date(),
        currency: 'MYR',
        supplierTin: 'C12345678901',
        supplierName: 'Test Supplier Sdn Bhd',
        buyerTin: 'C98765432109',
        buyerName: 'Test Buyer Sdn Bhd',
        lineItems: [
          {
            lineNumber: 1,
            description: 'Circuit breaker test',
            classification: 'Service',
            quantity: 1,
            unitPrice: 100.0,
            taxRate: 0.06,
            taxAmount: 6.0,
            totalAmount: 106.0,
          },
        ],
        createdBy: 'test-user',
      });

      // Submit multiple invoices to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await engine.processInvoice(await createInvoice(i));
        } catch (error) {
          // Expected to fail
        }
      }

      // Check circuit breaker state
      const cbState = await pool.query(
        `SELECT state FROM lhdn_circuit_breaker_state
         WHERE service_name = 'LHDN_API'`
      );

      expect(cbState.rows[0].state).toBe('OPEN');
    });

    it('should use fallback when circuit is open', async () => {
      // Open circuit by setting invalid config and failing
      await pool.query(
        `UPDATE lhdn_tenant_config
         SET api_base_url = 'https://invalid-api.local'
         WHERE tenant_id = $1`,
        [tenantId]
      );

      // Fail 5 times to open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await engine.processInvoice({
            tenantId,
            sapBillingDocument: `9000000${500 + i}`,
            sapCompanyCode: 'TEST01',
            invoiceNumber: `INV-FAIL-${i}`,
            invoiceDate: new Date(),
            currency: 'MYR',
            supplierTin: 'C12345678901',
            supplierName: 'Test Supplier Sdn Bhd',
            buyerTin: 'C98765432109',
            buyerName: 'Test Buyer Sdn Bhd',
            lineItems: [],
            createdBy: 'test-user',
          });
        } catch (error) {
          // Expected
        }
      }

      // Now try with fallback (should queue instead of immediate submission)
      const result = await engine.processInvoice({
        tenantId,
        sapBillingDocument: '9000000600',
        sapCompanyCode: 'TEST01',
        invoiceNumber: 'INV-FALLBACK',
        invoiceDate: new Date(),
        currency: 'MYR',
        supplierTin: 'C12345678901',
        supplierName: 'Test Supplier Sdn Bhd',
        buyerTin: 'C98765432109',
        buyerName: 'Test Buyer Sdn Bhd',
        lineItems: [],
        createdBy: 'test-user',
        fallbackToQueue: true,
      });

      expect(result.queued).toBe(true);
    });
  });

  describe('Audit Logging', () => {
    it('should create audit trail for entire workflow', async () => {
      const invoiceData = {
        tenantId,
        sapBillingDocument: '9000000700',
        sapCompanyCode: 'TEST01',
        invoiceNumber: 'INV-2024-700',
        invoiceDate: new Date(),
        currency: 'MYR',
        supplierTin: 'C12345678901',
        supplierName: 'Test Supplier Sdn Bhd',
        buyerTin: 'C98765432109',
        buyerName: 'Test Buyer Sdn Bhd',
        lineItems: [
          {
            lineNumber: 1,
            description: 'Audit test',
            classification: 'Service',
            quantity: 1,
            unitPrice: 100.0,
            taxRate: 0.06,
            taxAmount: 6.0,
            totalAmount: 106.0,
          },
        ],
        createdBy: 'audit-test-user',
      };

      const result = await engine.processInvoice(invoiceData);

      // Check audit logs
      const auditLogs = await pool.query(
        `SELECT * FROM lhdn_audit_log
         WHERE invoice_id = $1
         ORDER BY created_at ASC`,
        [result.invoiceId]
      );

      expect(auditLogs.rows.length).toBeGreaterThan(0);

      const actions = auditLogs.rows.map((log) => log.action);
      expect(actions).toContain('INVOICE_CREATED');
      expect(actions).toContain('INVOICE_VALIDATED');
      expect(actions).toContain('INVOICE_SUBMITTED');

      // Verify user tracking
      expect(auditLogs.rows[0].user_id).toBe('audit-test-user');
    });
  });

  describe('Event Publishing', () => {
    it('should publish events throughout workflow', async () => {
      const invoiceData = {
        tenantId,
        sapBillingDocument: '9000000800',
        sapCompanyCode: 'TEST01',
        invoiceNumber: 'INV-2024-800',
        invoiceDate: new Date(),
        currency: 'MYR',
        supplierTin: 'C12345678901',
        supplierName: 'Test Supplier Sdn Bhd',
        buyerTin: 'C98765432109',
        buyerName: 'Test Buyer Sdn Bhd',
        lineItems: [
          {
            lineNumber: 1,
            description: 'Event test',
            classification: 'Service',
            quantity: 1,
            unitPrice: 100.0,
            taxRate: 0.06,
            taxAmount: 6.0,
            totalAmount: 106.0,
          },
        ],
        createdBy: 'event-test-user',
      };

      const result = await engine.processInvoice(invoiceData);

      // Check events published
      const events = await pool.query(
        `SELECT * FROM lhdn_doc_events
         WHERE invoice_id = $1
         ORDER BY created_at ASC`,
        [result.invoiceId]
      );

      expect(events.rows.length).toBeGreaterThan(0);

      const eventTypes = events.rows.map((e) => e.event_type);
      expect(eventTypes).toContain('INVOICE_CREATED');
      expect(eventTypes).toContain('INVOICE_SUBMITTED');
    });
  });

  describe('Performance', () => {
    it('should process multiple invoices efficiently', async () => {
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          engine.processInvoice({
            tenantId,
            sapBillingDocument: `9000000${900 + i}`,
            sapCompanyCode: 'TEST01',
            invoiceNumber: `INV-PERF-${i}`,
            invoiceDate: new Date(),
            currency: 'MYR',
            supplierTin: 'C12345678901',
            supplierName: 'Test Supplier Sdn Bhd',
            buyerTin: 'C98765432109',
            buyerName: 'Test Buyer Sdn Bhd',
            lineItems: [
              {
                lineNumber: 1,
                description: `Performance test ${i}`,
                classification: 'Service',
                quantity: 1,
                unitPrice: 100.0,
                taxRate: 0.06,
                taxAmount: 6.0,
                totalAmount: 106.0,
              },
            ],
            createdBy: 'perf-test-user',
          })
        );
      }

      await Promise.all(promises);

      const duration = Date.now() - startTime;

      // Should process 10 invoices in reasonable time (< 10 seconds)
      expect(duration).toBeLessThan(10000);

      // Verify all created
      const countResult = await pool.query(
        "SELECT COUNT(*) FROM lhdn_einvoices WHERE invoice_number LIKE 'INV-PERF-%'"
      );

      expect(parseInt(countResult.rows[0].count)).toBe(10);
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed submissions', async () => {
      const invoiceData = {
        tenantId,
        sapBillingDocument: '9000001000',
        sapCompanyCode: 'TEST01',
        invoiceNumber: 'INV-RETRY-001',
        invoiceDate: new Date(),
        currency: 'MYR',
        supplierTin: 'C12345678901',
        supplierName: 'Test Supplier Sdn Bhd',
        buyerTin: 'C98765432109',
        buyerName: 'Test Buyer Sdn Bhd',
        lineItems: [
          {
            lineNumber: 1,
            description: 'Retry test',
            classification: 'Service',
            quantity: 1,
            unitPrice: 100.0,
            taxRate: 0.06,
            taxAmount: 6.0,
            totalAmount: 106.0,
          },
        ],
        createdBy: 'retry-test-user',
        maxRetries: 3,
      };

      // First attempt will fail (invalid API)
      await pool.query(
        `UPDATE lhdn_tenant_config
         SET api_base_url = 'https://will-fail.local'
         WHERE tenant_id = $1`,
        [tenantId]
      );

      try {
        await engine.processInvoice(invoiceData);
      } catch (error) {
        // Expected to fail
      }

      // Fix API config
      await pool.query(
        `UPDATE lhdn_tenant_config
         SET api_base_url = 'https://api-sandbox.myinvois.hasil.gov.my'
         WHERE tenant_id = $1`,
        [tenantId]
      );

      // Retry
      const result = await engine.retryFailedInvoices();

      expect(result.retried).toBeGreaterThan(0);
    });
  });
});
