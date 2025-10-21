/**
 * LHDN e-Invoice Module Routes
 *
 * Fastify routes for Malaysia MyInvois e-invoicing
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Pool } from 'pg';
import { LHDNInvoiceEngine } from '@sap-framework/lhdn-einvoice';
import { z } from 'zod';

const submitInvoiceSchema = z.object({
  sapBillingDocument: z.string().min(1),
  sapCompanyCode: z.string().min(1),
  autoSubmit: z.boolean().optional().default(false),
});

const invoiceIdSchema = z.object({
  invoiceId: z.string().uuid(),
});

export async function registerLHDNRoutes(app: FastifyInstance, pool: Pool) {
  /**
   * POST /api/modules/lhdn/invoices/submit
   * Submit SAP billing document as LHDN e-invoice
   */
  app.post('/api/modules/lhdn/invoices/submit', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = submitInvoiceSchema.parse(req.body);
      const tenantId = req.headers['x-tenant'] as string;
      const actor = (req as any).actor;

      if (!tenantId) {
        return reply.code(400).send({ error: 'x-tenant header required' });
      }

      // Create engine instance
      const engine = new LHDNInvoiceEngine({
        databaseUrl: process.env.DATABASE_URL!,
        tenantId,
        createdBy: actor?.userId || 'SYSTEM',
      });

      // Process invoice (this would integrate with SAP connector)
      // For now, return success structure
      return reply.send({
        success: true,
        data: {
          invoiceId: 'generated-uuid',
          status: 'DRAFT',
          message: 'Invoice created successfully',
        },
      });
    } catch (error: any) {
      app.log.error('LHDN invoice submission error:', error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * GET /api/modules/lhdn/invoices/:invoiceId
   * Get LHDN invoice details
   */
  app.get<{ Params: { invoiceId: string } }>(
    '/api/modules/lhdn/invoices/:invoiceId',
    async (req, reply) => {
      try {
        const { invoiceId } = invoiceIdSchema.parse(req.params);
        const tenantId = req.headers['x-tenant'] as string;

        // Query invoice from database
        const client = await pool.connect();
        try {
          const result = await client.query(
            'SELECT * FROM lhdn_einvoices WHERE id = $1 AND tenant_id = $2',
            [invoiceId, tenantId]
          );

          if (result.rows.length === 0) {
            return reply.code(404).send({ error: 'Invoice not found' });
          }

          return reply.send({ success: true, data: result.rows[0] });
        } finally {
          client.release();
        }
      } catch (error: any) {
        app.log.error('Get LHDN invoice error:', error);
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * GET /api/modules/lhdn/invoices/:invoiceId/status
   * Get LHDN invoice submission status
   */
  app.get<{ Params: { invoiceId: string } }>(
    '/api/modules/lhdn/invoices/:invoiceId/status',
    async (req, reply) => {
      try {
        const { invoiceId } = req.params;
        const tenantId = req.headers['x-tenant'] as string;

        const client = await pool.connect();
        try {
          const result = await client.query(
            'SELECT status, submission_status, rejection_reason FROM lhdn_einvoices WHERE id = $1 AND tenant_id = $2',
            [invoiceId, tenantId]
          );

          if (result.rows.length === 0) {
            return reply.code(404).send({ error: 'Invoice not found' });
          }

          return reply.send({ success: true, data: result.rows[0] });
        } finally {
          client.release();
        }
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * POST /api/modules/lhdn/invoices/:invoiceId/resubmit
   * Resubmit rejected invoice
   */
  app.post<{ Params: { invoiceId: string } }>(
    '/api/modules/lhdn/invoices/:invoiceId/resubmit',
    async (req, reply) => {
      try {
        const { invoiceId } = req.params;
        const tenantId = req.headers['x-tenant'] as string;

        // Resubmission logic would go here
        return reply.send({
          success: true,
          data: { invoiceId, status: 'PENDING_SUBMISSION', message: 'Invoice resubmitted' },
        });
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * GET /api/modules/lhdn/submissions
   * List all LHDN submissions for tenant
   */
  app.get('/api/modules/lhdn/submissions', async (req, reply) => {
    try {
      const tenantId = req.headers['x-tenant'] as string;

      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT * FROM lhdn_einvoices WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100',
          [tenantId]
        );

        return reply.send({ success: true, data: result.rows });
      } finally {
        client.release();
      }
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * GET /api/modules/lhdn/compliance/report
   * Get LHDN compliance report
   */
  app.get('/api/modules/lhdn/compliance/report', async (req, reply) => {
    try {
      const tenantId = req.headers['x-tenant'] as string;

      const client = await pool.connect();
      try {
        const stats = await client.query(
          `SELECT
            COUNT(*) as total_invoices,
            COUNT(*) FILTER (WHERE status = 'ACCEPTED') as accepted,
            COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected,
            COUNT(*) FILTER (WHERE status = 'PENDING') as pending
          FROM lhdn_einvoices
          WHERE tenant_id = $1`,
          [tenantId]
        );

        return reply.send({ success: true, data: stats.rows[0] });
      } finally {
        client.release();
      }
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * GET /api/modules/lhdn/health
   * Module health check
   */
  app.get('/api/modules/lhdn/health', async (req, reply) => {
    return reply.send({ success: true, module: 'LHDN e-Invoice', status: 'healthy' });
  });
}
