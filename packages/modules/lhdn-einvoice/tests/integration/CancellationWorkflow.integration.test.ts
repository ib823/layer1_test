/**
 * Cancellation Workflow Integration Tests
 *
 * Tests invoice cancellation workflow with real database
 */

import { CancellationWorkflow } from '../../src/workflows/CancellationWorkflow';
import { TestEnvironment } from './setup';
import { Pool } from 'pg';

describe('CancellationWorkflow Integration Tests', () => {
  let workflow: CancellationWorkflow;
  let pool: Pool;
  const tenantId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    pool = TestEnvironment.getPool();
  }, 300000);

  beforeEach(async () => {
    await TestEnvironment.cleanup();
    await TestEnvironment.insertFixtures();

    workflow = new CancellationWorkflow(pool);
  });

  describe('Cancellation Request Creation', () => {
    it('should create cancellation request for accepted invoice', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';

      const cancellation = await workflow.createCancellationRequest({
        invoiceId,
        tenantId,
        reason: 'Invoice issued in error',
        reasonCode: 'ERROR',
        requestedBy: 'test-user',
      });

      expect(cancellation).toBeDefined();
      expect(cancellation.status).toBe('PENDING');
      expect(cancellation.reason).toBe('Invoice issued in error');

      // Verify in database
      const result = await pool.query(
        `SELECT * FROM lhdn_cancellation_requests
         WHERE invoice_id = $1`,
        [invoiceId]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].reason_code).toBe('ERROR');
    });

    it('should validate reason is provided', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';

      await expect(
        workflow.createCancellationRequest({
          invoiceId,
          tenantId,
          reason: '', // Empty reason
          reasonCode: 'ERROR',
          requestedBy: 'test-user',
        })
      ).rejects.toThrow();
    });

    it('should set cancellation request metadata', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';

      const cancellation = await workflow.createCancellationRequest({
        invoiceId,
        tenantId,
        reason: 'Customer request',
        reasonCode: 'CUSTOMER_REQUEST',
        requestedBy: 'test-user',
        metadata: {
          customerReference: 'CR-12345',
          approvedBy: 'manager@example.com',
        },
      });

      const result = await pool.query(
        `SELECT metadata FROM lhdn_cancellation_requests
         WHERE id = $1`,
        [cancellation.id]
      );

      expect(result.rows[0].metadata).toEqual({
        customerReference: 'CR-12345',
        approvedBy: 'manager@example.com',
      });
    });
  });

  describe('Cancellation Validation', () => {
    it('should validate cancellable invoice status', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';

      const validation = await workflow.validateCancellation(invoiceId);

      expect(validation.canCancel).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should not allow cancellation of draft invoice', async () => {
      // Create draft invoice
      const draftInvoice = await pool.query(
        `INSERT INTO lhdn_einvoices (
          id, tenant_id, invoice_number, document_type, invoice_date,
          status, currency, sap_billing_document, sap_company_code,
          supplier_tin, supplier_name, buyer_tin, buyer_name,
          subtotal_amount, total_tax_amount, total_amount,
          line_items, created_by
        ) VALUES (
          '00000000-0000-0000-0000-000000000020',
          $1, 'DRAFT-001', '01', NOW(), 'DRAFT', 'MYR',
          '9000000002', 'TEST01', 'C12345678901', 'Test Company Sdn Bhd',
          'C98765432109', 'Test Customer Sdn Bhd',
          100.00, 6.00, 106.00, '[]'::jsonb, 'test-user'
        ) RETURNING id`,
        [tenantId]
      );

      const validation = await workflow.validateCancellation(
        draftInvoice.rows[0].id
      );

      expect(validation.canCancel).toBe(false);
      expect(validation.errors.some((e) => e.includes('DRAFT'))).toBe(true);
    });

    it('should not allow cancellation of already cancelled invoice', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';

      // Mark as cancelled
      await pool.query(
        `UPDATE lhdn_einvoices
         SET status = 'CANCELLED'
         WHERE id = $1`,
        [invoiceId]
      );

      const validation = await workflow.validateCancellation(invoiceId);

      expect(validation.canCancel).toBe(false);
      expect(validation.errors.some((e) => e.includes('already cancelled'))).toBe(
        true
      );
    });

    it('should check cancellation time window', async () => {
      // Create invoice older than allowed cancellation window
      const oldInvoice = await pool.query(
        `INSERT INTO lhdn_einvoices (
          id, tenant_id, invoice_number, document_type, invoice_date,
          status, currency, sap_billing_document, sap_company_code,
          supplier_tin, supplier_name, buyer_tin, buyer_name,
          subtotal_amount, total_tax_amount, total_amount,
          line_items, created_by, created_at
        ) VALUES (
          '00000000-0000-0000-0000-000000000030',
          $1, 'OLD-001', '01', NOW() - INTERVAL '80 days',
          'ACCEPTED', 'MYR', '9000000003', 'TEST01',
          'C12345678901', 'Test Company Sdn Bhd',
          'C98765432109', 'Test Customer Sdn Bhd',
          100.00, 6.00, 106.00, '[]'::jsonb, 'test-user',
          NOW() - INTERVAL '80 days'
        ) RETURNING id`,
        [tenantId]
      );

      const validation = await workflow.validateCancellation(
        oldInvoice.rows[0].id,
        { maxDaysOld: 72 } // 72 hour window (LHDN requirement)
      );

      expect(validation.canCancel).toBe(false);
      expect(validation.errors.some((e) => e.includes('time window'))).toBe(true);
    });
  });

  describe('Cancellation Submission to LHDN', () => {
    it('should submit cancellation to LHDN API', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';

      const cancellation = await workflow.createCancellationRequest({
        invoiceId,
        tenantId,
        reason: 'Duplicate invoice',
        reasonCode: 'DUPLICATE',
        requestedBy: 'test-user',
      });

      const result = await workflow.submitCancellation(cancellation.id);

      expect(result.success).toBe(true);
      expect(result.lhdnCancellationId).toBeDefined();

      // Check status updated
      const dbResult = await pool.query(
        `SELECT status FROM lhdn_cancellation_requests
         WHERE id = $1`,
        [cancellation.id]
      );

      expect(dbResult.rows[0].status).toBe('SUBMITTED');
    });

    it('should update invoice status on successful cancellation', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';

      const cancellation = await workflow.createCancellationRequest({
        invoiceId,
        tenantId,
        reason: 'Cancel request',
        reasonCode: 'ERROR',
        requestedBy: 'test-user',
      });

      await workflow.submitCancellation(cancellation.id);

      // Simulate LHDN approval
      await workflow.approveCancellation(cancellation.id, 'LHDN-CANCEL-001');

      const invoiceResult = await pool.query(
        `SELECT status FROM lhdn_einvoices WHERE id = $1`,
        [invoiceId]
      );

      expect(invoiceResult.rows[0].status).toBe('CANCELLED');
    });

    it('should handle LHDN rejection of cancellation', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';

      const cancellation = await workflow.createCancellationRequest({
        invoiceId,
        tenantId,
        reason: 'Test rejection',
        reasonCode: 'ERROR',
        requestedBy: 'test-user',
      });

      await workflow.submitCancellation(cancellation.id);

      await workflow.rejectCancellation(cancellation.id, 'Invalid reason provided');

      const result = await pool.query(
        `SELECT status, rejection_reason FROM lhdn_cancellation_requests
         WHERE id = $1`,
        [cancellation.id]
      );

      expect(result.rows[0].status).toBe('REJECTED');
      expect(result.rows[0].rejection_reason).toBe('Invalid reason provided');
    });
  });

  describe('Cancellation Lifecycle', () => {
    it('should track complete cancellation lifecycle', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';

      // Create request
      const cancellation = await workflow.createCancellationRequest({
        invoiceId,
        tenantId,
        reason: 'Lifecycle test',
        reasonCode: 'ERROR',
        requestedBy: 'test-user',
      });

      let status = await workflow.getCancellationStatus(cancellation.id);
      expect(status).toBe('PENDING');

      // Submit
      await workflow.submitCancellation(cancellation.id);
      status = await workflow.getCancellationStatus(cancellation.id);
      expect(status).toBe('SUBMITTED');

      // Approve
      await workflow.approveCancellation(cancellation.id, 'LHDN-CANCEL-123');
      status = await workflow.getCancellationStatus(cancellation.id);
      expect(status).toBe('APPROVED');
    });

    it('should allow withdrawal of pending cancellation', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';

      const cancellation = await workflow.createCancellationRequest({
        invoiceId,
        tenantId,
        reason: 'Will withdraw',
        reasonCode: 'ERROR',
        requestedBy: 'test-user',
      });

      await workflow.withdrawCancellation(cancellation.id, 'Changed mind');

      const result = await pool.query(
        `SELECT status FROM lhdn_cancellation_requests WHERE id = $1`,
        [cancellation.id]
      );

      expect(result.rows[0].status).toBe('WITHDRAWN');
    });

    it('should not allow withdrawal of submitted cancellation', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';

      const cancellation = await workflow.createCancellationRequest({
        invoiceId,
        tenantId,
        reason: 'Already submitted',
        reasonCode: 'ERROR',
        requestedBy: 'test-user',
      });

      await workflow.submitCancellation(cancellation.id);

      await expect(
        workflow.withdrawCancellation(cancellation.id, 'Too late')
      ).rejects.toThrow();
    });
  });

  describe('Bulk Cancellations', () => {
    it('should create bulk cancellation requests', async () => {
      // Create multiple invoices first
      const invoiceIds: string[] = [];

      for (let i = 0; i < 5; i++) {
        const result = await pool.query(
          `INSERT INTO lhdn_einvoices (
            id, tenant_id, invoice_number, document_type, invoice_date,
            status, currency, sap_billing_document, sap_company_code,
            supplier_tin, supplier_name, buyer_tin, buyer_name,
            subtotal_amount, total_tax_amount, total_amount,
            line_items, created_by
          ) VALUES (
            gen_random_uuid(), $1, $2, '01', NOW(),
            'ACCEPTED', 'MYR', $3, 'TEST01',
            'C12345678901', 'Test Company Sdn Bhd',
            'C98765432109', 'Test Customer Sdn Bhd',
            100.00, 6.00, 106.00, '[]'::jsonb, 'test-user'
          ) RETURNING id`,
          [tenantId, `BULK-${i}`, `9000000${100 + i}`]
        );

        invoiceIds.push(result.rows[0].id);
      }

      const cancellations = await workflow.createBulkCancellations({
        invoiceIds,
        tenantId,
        reason: 'Bulk cancellation test',
        reasonCode: 'BULK_ERROR',
        requestedBy: 'test-user',
      });

      expect(cancellations).toHaveLength(5);
    });

    it('should submit bulk cancellations', async () => {
      const invoiceIds: string[] = [];

      for (let i = 0; i < 3; i++) {
        const result = await pool.query(
          `INSERT INTO lhdn_einvoices (
            id, tenant_id, invoice_number, document_type, invoice_date,
            status, currency, sap_billing_document, sap_company_code,
            supplier_tin, supplier_name, buyer_tin, buyer_name,
            subtotal_amount, total_tax_amount, total_amount,
            line_items, created_by
          ) VALUES (
            gen_random_uuid(), $1, $2, '01', NOW(),
            'ACCEPTED', 'MYR', $3, 'TEST01',
            'C12345678901', 'Test Company Sdn Bhd',
            'C98765432109', 'Test Customer Sdn Bhd',
            100.00, 6.00, 106.00, '[]'::jsonb, 'test-user'
          ) RETURNING id`,
          [tenantId, `SUBMIT-BULK-${i}`, `9000000${200 + i}`]
        );

        invoiceIds.push(result.rows[0].id);
      }

      const cancellations = await workflow.createBulkCancellations({
        invoiceIds,
        tenantId,
        reason: 'Bulk submit test',
        reasonCode: 'BULK_ERROR',
        requestedBy: 'test-user',
      });

      const cancellationIds = cancellations.map((c) => c.id);

      const results = await workflow.submitBulkCancellations(cancellationIds);

      expect(results.successful).toHaveLength(3);
      expect(results.failed).toHaveLength(0);
    });
  });

  describe('Event Tracking', () => {
    it('should emit events during cancellation workflow', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';

      const cancellation = await workflow.createCancellationRequest({
        invoiceId,
        tenantId,
        reason: 'Event tracking test',
        reasonCode: 'ERROR',
        requestedBy: 'test-user',
      });

      await workflow.submitCancellation(cancellation.id);
      await workflow.approveCancellation(cancellation.id, 'LHDN-CANCEL-999');

      const events = await pool.query(
        `SELECT * FROM lhdn_doc_events
         WHERE invoice_id = $1
         ORDER BY created_at ASC`,
        [invoiceId]
      );

      expect(events.rows.length).toBeGreaterThan(0);

      const eventTypes = events.rows.map((e) => e.event_type);
      expect(eventTypes).toContain('CANCELLATION_REQUESTED');
      expect(eventTypes).toContain('CANCELLATION_SUBMITTED');
      expect(eventTypes).toContain('CANCELLATION_APPROVED');
    });
  });

  describe('Audit Trail', () => {
    it('should record complete audit trail for cancellation', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';

      const cancellation = await workflow.createCancellationRequest({
        invoiceId,
        tenantId,
        reason: 'Audit trail test',
        reasonCode: 'ERROR',
        requestedBy: 'test-user',
      });

      await workflow.submitCancellation(cancellation.id);

      const auditLogs = await pool.query(
        `SELECT * FROM lhdn_audit_log
         WHERE invoice_id = $1
         AND action LIKE '%CANCEL%'
         ORDER BY created_at ASC`,
        [invoiceId]
      );

      expect(auditLogs.rows.length).toBeGreaterThan(0);

      const actions = auditLogs.rows.map((log) => log.action);
      expect(actions).toContain('CANCELLATION_REQUESTED');
      expect(actions).toContain('CANCELLATION_SUBMITTED');
    });

    it('should record user who requested cancellation', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';

      const cancellation = await workflow.createCancellationRequest({
        invoiceId,
        tenantId,
        reason: 'User tracking',
        reasonCode: 'ERROR',
        requestedBy: 'specific-user@example.com',
      });

      const result = await pool.query(
        `SELECT requested_by FROM lhdn_cancellation_requests WHERE id = $1`,
        [cancellation.id]
      );

      expect(result.rows[0].requested_by).toBe('specific-user@example.com');
    });
  });

  describe('Notifications', () => {
    it('should trigger notification on cancellation approval', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';

      const cancellation = await workflow.createCancellationRequest({
        invoiceId,
        tenantId,
        reason: 'Notification test',
        reasonCode: 'ERROR',
        requestedBy: 'test-user',
      });

      await workflow.submitCancellation(cancellation.id);
      await workflow.approveCancellation(cancellation.id, 'LHDN-CANCEL-NOTIFY');

      // Check notification was created
      const notifications = await pool.query(
        `SELECT * FROM notifications
         WHERE reference_id = $1
         AND notification_type = 'CANCELLATION_APPROVED'`,
        [cancellation.id]
      );

      expect(notifications.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing invoice gracefully', async () => {
      await expect(
        workflow.createCancellationRequest({
          invoiceId: '00000000-0000-0000-0000-999999999999',
          tenantId,
          reason: 'Missing invoice',
          reasonCode: 'ERROR',
          requestedBy: 'test-user',
        })
      ).rejects.toThrow();
    });

    it('should handle duplicate cancellation requests', async () => {
      const invoiceId = '00000000-0000-0000-0000-000000000010';

      await workflow.createCancellationRequest({
        invoiceId,
        tenantId,
        reason: 'First request',
        reasonCode: 'ERROR',
        requestedBy: 'test-user',
      });

      await expect(
        workflow.createCancellationRequest({
          invoiceId,
          tenantId,
          reason: 'Duplicate request',
          reasonCode: 'ERROR',
          requestedBy: 'test-user',
        })
      ).rejects.toThrow(/already has a pending/i);
    });
  });
});
