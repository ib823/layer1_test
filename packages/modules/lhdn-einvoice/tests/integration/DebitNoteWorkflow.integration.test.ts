/**
 * Debit Note Workflow Integration Tests
 *
 * Tests complete debit note processing workflow with real database
 */

import { DebitNoteWorkflow } from '../../src/workflows/DebitNoteWorkflow';
import { TestEnvironment } from './setup';
import { Pool } from 'pg';

describe('DebitNoteWorkflow Integration Tests', () => {
  let workflow: DebitNoteWorkflow;
  let pool: Pool;
  const tenantId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    pool = TestEnvironment.getPool();
  }, 300000);

  beforeEach(async () => {
    await TestEnvironment.cleanup();
    await TestEnvironment.insertFixtures();

    workflow = new DebitNoteWorkflow(pool);
  });

  describe('Debit Note Creation', () => {
    it('should create debit note from original invoice', async () => {
      const originalInvoiceId = '00000000-0000-0000-0000-000000000010';

      const debitNote = await workflow.createDebitNote({
        tenantId,
        originalInvoiceId,
        reason: 'Additional charges for late delivery',
        adjustmentAmount: 150.0,
        currency: 'MYR',
        lineItems: [
          {
            description: 'Late delivery penalty',
            quantity: 1,
            unitPrice: 150.0,
            taxAmount: 9.0,
            totalAmount: 159.0,
            classification: 'Service',
          },
        ],
        createdBy: 'test-user',
      });

      expect(debitNote).toBeDefined();
      expect(debitNote.documentType).toBe('02'); // Debit Note
      expect(debitNote.status).toBe('DRAFT');
      expect(debitNote.totalAmount).toBe(159.0);

      // Verify in database
      const result = await pool.query(
        'SELECT * FROM lhdn_einvoices WHERE id = $1',
        [debitNote.id]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].document_type).toBe('02');
    });

    it('should link debit note to original invoice', async () => {
      const originalInvoiceId = '00000000-0000-0000-0000-000000000010';

      const debitNote = await workflow.createDebitNote({
        tenantId,
        originalInvoiceId,
        reason: 'Price adjustment',
        adjustmentAmount: 100.0,
        currency: 'MYR',
        lineItems: [],
        createdBy: 'test-user',
      });

      const result = await pool.query(
        'SELECT original_invoice_id FROM lhdn_einvoices WHERE id = $1',
        [debitNote.id]
      );

      expect(result.rows[0].original_invoice_id).toBe(originalInvoiceId);
    });

    it('should calculate tax correctly', async () => {
      const originalInvoiceId = '00000000-0000-0000-0000-000000000010';

      const debitNote = await workflow.createDebitNote({
        tenantId,
        originalInvoiceId,
        reason: 'Additional services',
        adjustmentAmount: 1000.0,
        currency: 'MYR',
        lineItems: [
          {
            description: 'Consulting services',
            quantity: 10,
            unitPrice: 100.0,
            taxRate: 0.06, // 6% SST
            taxAmount: 60.0,
            totalAmount: 1060.0,
            classification: 'Service',
          },
        ],
        createdBy: 'test-user',
      });

      expect(debitNote.subtotalAmount).toBe(1000.0);
      expect(debitNote.totalTaxAmount).toBe(60.0);
      expect(debitNote.totalAmount).toBe(1060.0);
    });

    it('should set supplier and buyer from original invoice', async () => {
      const originalInvoiceId = '00000000-0000-0000-0000-000000000010';

      const debitNote = await workflow.createDebitNote({
        tenantId,
        originalInvoiceId,
        reason: 'Adjustment',
        adjustmentAmount: 50.0,
        currency: 'MYR',
        lineItems: [],
        createdBy: 'test-user',
      });

      expect(debitNote.supplierTin).toBe('C12345678901');
      expect(debitNote.supplierName).toBe('Test Company Sdn Bhd');
      expect(debitNote.buyerTin).toBe('C98765432109');
      expect(debitNote.buyerName).toBe('Test Customer Sdn Bhd');
    });
  });

  describe('Debit Note Validation', () => {
    it('should validate debit note before submission', async () => {
      const debitNoteId = await createTestDebitNote(pool, tenantId);

      const validation = await workflow.validate(debitNoteId);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation if original invoice not found', async () => {
      const debitNote = await workflow.createDebitNote({
        tenantId,
        originalInvoiceId: '00000000-0000-0000-0000-999999999999', // Non-existent
        reason: 'Test',
        adjustmentAmount: 100.0,
        currency: 'MYR',
        lineItems: [],
        createdBy: 'test-user',
      });

      const validation = await workflow.validate(debitNote.id);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('original invoice'))).toBe(true);
    });

    it('should fail validation if adjustment amount is zero', async () => {
      const originalInvoiceId = '00000000-0000-0000-0000-000000000010';

      const debitNote = await workflow.createDebitNote({
        tenantId,
        originalInvoiceId,
        reason: 'No adjustment',
        adjustmentAmount: 0.0,
        currency: 'MYR',
        lineItems: [],
        createdBy: 'test-user',
      });

      const validation = await workflow.validate(debitNote.id);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('adjustment amount'))).toBe(true);
    });

    it('should fail validation if reason is missing', async () => {
      const originalInvoiceId = '00000000-0000-0000-0000-000000000010';

      const debitNote = await workflow.createDebitNote({
        tenantId,
        originalInvoiceId,
        reason: '', // Empty reason
        adjustmentAmount: 100.0,
        currency: 'MYR',
        lineItems: [],
        createdBy: 'test-user',
      });

      const validation = await workflow.validate(debitNote.id);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('reason'))).toBe(true);
    });
  });

  describe('Debit Note Submission', () => {
    it('should submit valid debit note to LHDN', async () => {
      const debitNoteId = await createTestDebitNote(pool, tenantId);

      const result = await workflow.submit(debitNoteId);

      expect(result.success).toBe(true);
      expect(result.lhdnId).toBeDefined();

      // Check status updated
      const dbResult = await pool.query(
        'SELECT status FROM lhdn_einvoices WHERE id = $1',
        [debitNoteId]
      );

      expect(dbResult.rows[0].status).toBe('SUBMITTED');
    });

    it('should not submit invalid debit note', async () => {
      const originalInvoiceId = '00000000-0000-0000-0000-000000000010';

      const debitNote = await workflow.createDebitNote({
        tenantId,
        originalInvoiceId,
        reason: '',
        adjustmentAmount: 0.0,
        currency: 'MYR',
        lineItems: [],
        createdBy: 'test-user',
      });

      await expect(workflow.submit(debitNote.id)).rejects.toThrow();
    });

    it('should record submission in audit log', async () => {
      const debitNoteId = await createTestDebitNote(pool, tenantId);

      await workflow.submit(debitNoteId);

      const auditResult = await pool.query(
        `SELECT * FROM lhdn_audit_log
         WHERE invoice_id = $1
         AND action = 'SUBMIT_DEBIT_NOTE'`,
        [debitNoteId]
      );

      expect(auditResult.rows.length).toBeGreaterThan(0);
    });

    it('should handle LHDN API errors gracefully', async () => {
      const debitNoteId = await createTestDebitNote(pool, tenantId);

      // Mock API failure by setting invalid config
      await pool.query(
        `UPDATE lhdn_tenant_config
         SET api_base_url = 'https://invalid-api.local'
         WHERE tenant_id = $1`,
        [tenantId]
      );

      await expect(workflow.submit(debitNoteId)).rejects.toThrow();

      // Status should be FAILED
      const result = await pool.query(
        'SELECT status FROM lhdn_einvoices WHERE id = $1',
        [debitNoteId]
      );

      expect(result.rows[0].status).toBe('FAILED');
    });
  });

  describe('Debit Note Lifecycle', () => {
    it('should track complete lifecycle from draft to accepted', async () => {
      const debitNoteId = await createTestDebitNote(pool, tenantId);

      // Initial state
      let status = await workflow.getStatus(debitNoteId);
      expect(status).toBe('DRAFT');

      // Validate
      await workflow.validate(debitNoteId);

      // Submit
      await workflow.submit(debitNoteId);
      status = await workflow.getStatus(debitNoteId);
      expect(status).toBe('SUBMITTED');

      // Simulate LHDN acceptance
      await pool.query(
        `UPDATE lhdn_einvoices
         SET status = 'ACCEPTED', lhdn_uuid = 'DN-12345-UUID'
         WHERE id = $1`,
        [debitNoteId]
      );

      status = await workflow.getStatus(debitNoteId);
      expect(status).toBe('ACCEPTED');
    });

    it('should allow editing draft debit notes', async () => {
      const debitNoteId = await createTestDebitNote(pool, tenantId);

      await workflow.update(debitNoteId, {
        reason: 'Updated reason for adjustment',
        adjustmentAmount: 200.0,
      });

      const result = await pool.query(
        'SELECT reason, subtotal_amount FROM lhdn_einvoices WHERE id = $1',
        [debitNoteId]
      );

      expect(result.rows[0].reason).toBe('Updated reason for adjustment');
      expect(parseFloat(result.rows[0].subtotal_amount)).toBe(200.0);
    });

    it('should not allow editing submitted debit notes', async () => {
      const debitNoteId = await createTestDebitNote(pool, tenantId);

      await workflow.submit(debitNoteId);

      await expect(
        workflow.update(debitNoteId, {
          reason: 'Try to update',
        })
      ).rejects.toThrow();
    });

    it('should allow cancellation of submitted debit notes', async () => {
      const debitNoteId = await createTestDebitNote(pool, tenantId);

      await workflow.submit(debitNoteId);

      await workflow.cancel(debitNoteId, 'Submitted in error');

      const result = await pool.query(
        'SELECT status FROM lhdn_einvoices WHERE id = $1',
        [debitNoteId]
      );

      expect(result.rows[0].status).toBe('CANCELLED');
    });
  });

  describe('Multiple Debit Notes', () => {
    it('should allow multiple debit notes for same original invoice', async () => {
      const originalInvoiceId = '00000000-0000-0000-0000-000000000010';

      const debitNote1 = await workflow.createDebitNote({
        tenantId,
        originalInvoiceId,
        reason: 'First adjustment',
        adjustmentAmount: 100.0,
        currency: 'MYR',
        lineItems: [],
        createdBy: 'test-user',
      });

      const debitNote2 = await workflow.createDebitNote({
        tenantId,
        originalInvoiceId,
        reason: 'Second adjustment',
        adjustmentAmount: 50.0,
        currency: 'MYR',
        lineItems: [],
        createdBy: 'test-user',
      });

      expect(debitNote1.id).not.toBe(debitNote2.id);

      const result = await pool.query(
        `SELECT COUNT(*) FROM lhdn_einvoices
         WHERE original_invoice_id = $1
         AND document_type = '02'`,
        [originalInvoiceId]
      );

      expect(parseInt(result.rows[0].count)).toBeGreaterThanOrEqual(2);
    });

    it('should calculate total adjustments across multiple debit notes', async () => {
      const originalInvoiceId = '00000000-0000-0000-0000-000000000010';

      await workflow.createDebitNote({
        tenantId,
        originalInvoiceId,
        reason: 'First',
        adjustmentAmount: 100.0,
        currency: 'MYR',
        lineItems: [],
        createdBy: 'test-user',
      });

      await workflow.createDebitNote({
        tenantId,
        originalInvoiceId,
        reason: 'Second',
        adjustmentAmount: 50.0,
        currency: 'MYR',
        lineItems: [],
        createdBy: 'test-user',
      });

      const totalAdjustments = await workflow.getTotalAdjustments(originalInvoiceId);

      expect(totalAdjustments).toBe(150.0);
    });
  });

  describe('Event Tracking', () => {
    it('should emit events during debit note workflow', async () => {
      const debitNoteId = await createTestDebitNote(pool, tenantId);

      await workflow.submit(debitNoteId);

      const events = await pool.query(
        `SELECT * FROM lhdn_doc_events
         WHERE invoice_id = $1
         ORDER BY created_at ASC`,
        [debitNoteId]
      );

      expect(events.rows.length).toBeGreaterThan(0);

      const eventTypes = events.rows.map((e) => e.event_type);
      expect(eventTypes).toContain('DEBIT_NOTE_CREATED');
      expect(eventTypes).toContain('DEBIT_NOTE_SUBMITTED');
    });
  });

  describe('Error Handling', () => {
    it('should rollback on submission failure', async () => {
      const debitNoteId = await createTestDebitNote(pool, tenantId);

      // Force an error
      await pool.query(
        `UPDATE lhdn_tenant_config
         SET client_id = ''
         WHERE tenant_id = $1`,
        [tenantId]
      );

      try {
        await workflow.submit(debitNoteId);
      } catch (error) {
        // Expected to fail
      }

      const result = await pool.query(
        'SELECT status FROM lhdn_einvoices WHERE id = $1',
        [debitNoteId]
      );

      expect(result.rows[0].status).toBe('FAILED');
    });
  });
});

/**
 * Helper function to create a test debit note
 */
async function createTestDebitNote(pool: Pool, tenantId: string): Promise<string> {
  const workflow = new DebitNoteWorkflow(pool);
  const originalInvoiceId = '00000000-0000-0000-0000-000000000010';

  const debitNote = await workflow.createDebitNote({
    tenantId,
    originalInvoiceId,
    reason: 'Test debit note for additional charges',
    adjustmentAmount: 150.0,
    currency: 'MYR',
    lineItems: [
      {
        description: 'Additional service charge',
        quantity: 1,
        unitPrice: 150.0,
        taxRate: 0.06,
        taxAmount: 9.0,
        totalAmount: 159.0,
        classification: 'Service',
      },
    ],
    createdBy: 'test-user',
  });

  return debitNote.id;
}
