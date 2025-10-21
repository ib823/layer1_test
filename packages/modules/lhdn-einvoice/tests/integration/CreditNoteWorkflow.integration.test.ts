/**
 * Credit Note Workflow Integration Tests
 *
 * Tests the complete credit note workflow end-to-end with real database
 */

import { CreditNoteWorkflow } from '../../src/workflows/CreditNoteWorkflow';
import { LHDNInvoiceRepository } from '../../src/repository/LHDNInvoiceRepository';
import { TestEnvironment } from './setup';

describe('CreditNoteWorkflow Integration Tests', () => {
  let workflow: CreditNoteWorkflow;
  let repository: LHDNInvoiceRepository;
  let connectionString: string;
  let originalInvoiceId: string;

  beforeAll(async () => {
    connectionString = TestEnvironment.getConnectionString();
  }, 300000); // 5 minute timeout for container startup

  beforeEach(async () => {
    await TestEnvironment.cleanup();
    await TestEnvironment.insertFixtures();

    workflow = new CreditNoteWorkflow(connectionString);
    repository = new LHDNInvoiceRepository(connectionString);

    // Get test invoice ID
    const pool = TestEnvironment.getPool();
    const result = await pool.query(
      "SELECT id FROM lhdn_einvoices WHERE invoice_number = 'INV-2024-001'"
    );
    originalInvoiceId = result.rows[0].id;
  });

  afterEach(async () => {
    await workflow.close();
    await repository.close();
  });

  describe('Full Credit Note', () => {
    it('should create full credit note for ACCEPTED invoice', async () => {
      const result = await workflow.execute({
        tenantId: '00000000-0000-0000-0000-000000000001',
        originalInvoiceId,
        creditNoteType: 'FULL',
        reason: 'Customer returned goods',
        createdBy: 'test-user',
        requestId: 'test-request-001',
      });

      // Assertions
      expect(result.success).toBe(false); // Will fail submission due to no LHDN API
      expect(result.creditNoteId).toBeDefined();
      expect(result.creditNoteNumber).toBe('CN-INV-2024-001');
      expect(result.status).toBe('DRAFT');
      expect(result.validationResult.isValid).toBe(true);

      // Verify credit note was saved
      const creditNote = await repository.getInvoiceById(result.creditNoteId);
      expect(creditNote).toBeDefined();
      expect(creditNote!.documentType).toBe('02');
      expect(creditNote!.totalAmount).toBe(-1060.00);
      expect(creditNote!.subtotalAmount).toBe(-1000.00);
      expect(creditNote!.totalTaxAmount).toBe(-60.00);
    });

    it('should reject credit note for non-ACCEPTED invoice', async () => {
      // Update invoice to DRAFT
      await TestEnvironment.getPool().query(
        `UPDATE lhdn_einvoices SET status = 'DRAFT' WHERE id = $1`,
        [originalInvoiceId]
      );

      await expect(
        workflow.execute({
          tenantId: '00000000-0000-0000-0000-000000000001',
          originalInvoiceId,
          creditNoteType: 'FULL',
          reason: 'Test',
          createdBy: 'test-user',
        })
      ).rejects.toThrow('Only ACCEPTED invoices can be credited');
    });

    it('should create event log for credit note creation', async () => {
      const result = await workflow.execute({
        tenantId: '00000000-0000-0000-0000-000000000001',
        originalInvoiceId,
        creditNoteType: 'FULL',
        reason: 'Customer returned goods',
        createdBy: 'test-user',
      });

      // Check events were created
      const pool = TestEnvironment.getPool();
      const events = await pool.query(
        `SELECT * FROM lhdn_doc_events WHERE invoice_id = $1 ORDER BY occurred_at`,
        [result.creditNoteId]
      );

      expect(events.rows.length).toBeGreaterThan(0);
      expect(events.rows[0].event_type).toBe('CREATED');
      expect(events.rows[0].new_state).toBe('DRAFT');
    });
  });

  describe('Partial Credit Note', () => {
    it('should create partial credit note with specified line items', async () => {
      // First, update the original invoice with actual line items
      await TestEnvironment.getPool().query(
        `UPDATE lhdn_einvoices SET line_items = $1 WHERE id = $2`,
        [
          JSON.stringify([
            {
              lineNumber: 1,
              description: 'Product A',
              quantity: 10,
              unitPrice: 100,
              taxType: 'SR',
              taxRate: 6,
              taxAmount: 60,
              subtotal: 1000,
              total: 1060,
            },
          ]),
          originalInvoiceId,
        ]
      );

      const result = await workflow.execute({
        tenantId: '00000000-0000-0000-0000-000000000001',
        originalInvoiceId,
        creditNoteType: 'PARTIAL',
        reason: 'Partial return',
        lineItems: [
          {
            originalLineNumber: 1,
            creditQuantity: 5,
            creditAmount: 500,
          },
        ],
        createdBy: 'test-user',
      });

      expect(result.success).toBe(false); // No LHDN API
      expect(result.creditNoteNumber).toBe('CN-INV-2024-001');

      const creditNote = await repository.getInvoiceById(result.creditNoteId);
      expect(creditNote).toBeDefined();
      expect(creditNote!.subtotalAmount).toBeLessThan(0);
      expect(Math.abs(creditNote!.subtotalAmount)).toBe(500);
    });

    it('should reject partial credit exceeding original amount', async () => {
      await TestEnvironment.getPool().query(
        `UPDATE lhdn_einvoices SET line_items = $1 WHERE id = $2`,
        [
          JSON.stringify([
            {
              lineNumber: 1,
              description: 'Product A',
              quantity: 10,
              unitPrice: 100,
              taxType: 'SR',
              taxRate: 6,
              taxAmount: 60,
              subtotal: 1000,
              total: 1060,
            },
          ]),
          originalInvoiceId,
        ]
      );

      await expect(
        workflow.execute({
          tenantId: '00000000-0000-0000-0000-000000000001',
          originalInvoiceId,
          creditNoteType: 'PARTIAL',
          reason: 'Invalid partial credit',
          lineItems: [
            {
              originalLineNumber: 1,
              creditQuantity: 10,
              creditAmount: 2000, // Exceeds original
            },
          ],
          createdBy: 'test-user',
        })
      ).rejects.toThrow('exceeds original line amount');
    });
  });

  describe('Tenant Isolation', () => {
    it('should reject credit note for invoice from different tenant', async () => {
      await expect(
        workflow.execute({
          tenantId: '00000000-0000-0000-0000-000000000099', // Different tenant
          originalInvoiceId,
          creditNoteType: 'FULL',
          reason: 'Test',
          createdBy: 'test-user',
        })
      ).rejects.toThrow('belongs to different tenant');
    });
  });

  describe('Audit Trail', () => {
    it('should create audit log entry', async () => {
      const result = await workflow.execute({
        tenantId: '00000000-0000-0000-0000-000000000001',
        originalInvoiceId,
        creditNoteType: 'FULL',
        reason: 'Audit test',
        createdBy: 'test-user',
        ipAddress: '192.168.1.1',
        requestId: 'test-request-audit',
      });

      const pool = TestEnvironment.getPool();
      const auditLogs = await pool.query(
        `SELECT * FROM lhdn_audit_log WHERE invoice_id = $1`,
        [result.creditNoteId]
      );

      expect(auditLogs.rows.length).toBeGreaterThan(0);
      expect(auditLogs.rows[0].action).toBe('CN_ISSUED');
      expect(auditLogs.rows[0].actor).toBe('test-user');
      expect(auditLogs.rows[0].ip_address).toBe('192.168.1.1');
      expect(auditLogs.rows[0].request_id).toBe('test-request-audit');
    });
  });

  describe('Idempotency', () => {
    it('should handle duplicate submissions with same payload', async () => {
      const request = {
        tenantId: '00000000-0000-0000-0000-000000000001',
        originalInvoiceId,
        creditNoteType: 'FULL' as const,
        reason: 'Duplicate test',
        createdBy: 'test-user',
      };

      const result1 = await workflow.execute(request);
      const result2 = await workflow.execute(request);

      // Both should succeed but create different credit notes
      // (idempotency is at submission level, not workflow level)
      expect(result1.creditNoteId).toBeDefined();
      expect(result2.creditNoteId).toBeDefined();
      expect(result1.creditNoteId).not.toBe(result2.creditNoteId);
    });
  });
});
