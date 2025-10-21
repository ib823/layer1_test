/**
 * SoD Control Module Routes
 *
 * Fastify routes for Segregation of Duties analysis
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Pool } from 'pg';
import { SODAnalyzerEngine, RuleEngine } from '@sap-framework/sod-control';
import { z } from 'zod';
import { Knex, knex } from 'knex';

const analyzeRequestSchema = z.object({
  mode: z.enum(['snapshot', 'delta']).optional().default('snapshot'),
  riskLevels: z.array(z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])).optional(),
  includeInactive: z.boolean().optional().default(false),
});

export async function registerSODRoutes(app: FastifyInstance, pool: Pool) {
  // Create Knex instance for SoD module (uses Knex query builder)
  const db: Knex = knex({
    client: 'pg',
    connection: process.env.DATABASE_URL,
  });

  /**
   * POST /api/modules/sod/analyze
   * Run SoD analysis for tenant
   */
  app.post('/api/modules/sod/analyze', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = analyzeRequestSchema.parse(req.body);
      const tenantId = req.headers['x-tenant'] as string;

      if (!tenantId) {
        return reply.code(400).send({ error: 'x-tenant header required' });
      }

      // Create rule engine instance
      const ruleEngine = new RuleEngine(db);

      // Run analysis
      const result = await ruleEngine.analyze(tenantId, body);

      return reply.send({
        success: true,
        data: {
          analysisId: result.analysisId,
          tenantId: result.tenantId,
          totalFindings: result.totalFindings,
          criticalCount: result.criticalCount,
          highCount: result.highCount,
          mediumCount: result.mediumCount,
          lowCount: result.lowCount,
          analysisStats: result.analysisStats,
        },
      });
    } catch (error: any) {
      app.log.error('SoD analysis error:', error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * GET /api/modules/sod/results
   * Get latest SoD analysis results
   */
  app.get('/api/modules/sod/results', async (req, reply) => {
    try {
      const tenantId = req.headers['x-tenant'] as string;

      const client = await pool.connect();
      try {
        const result = await client.query(
          `SELECT * FROM sod_analysis_runs
           WHERE tenant_id = $1
           ORDER BY created_at DESC
           LIMIT 1`,
          [tenantId]
        );

        if (result.rows.length === 0) {
          return reply.send({ success: true, data: null });
        }

        return reply.send({ success: true, data: result.rows[0] });
      } finally {
        client.release();
      }
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * GET /api/modules/sod/violations
   * List all SoD violations for tenant
   */
  app.get('/api/modules/sod/violations', async (req, reply) => {
    try {
      const tenantId = req.headers['x-tenant'] as string;
      const { severity, limit = '100' } = req.query as any;

      const client = await pool.connect();
      try {
        let query = `
          SELECT f.*, r.risk_name, r.risk_description
          FROM sod_findings f
          JOIN sod_risks r ON f.risk_id = r.id
          WHERE f.tenant_id = $1
        `;
        const params: any[] = [tenantId];

        if (severity) {
          query += ` AND f.severity = $2`;
          params.push(severity.toUpperCase());
        }

        query += ` ORDER BY f.detected_at DESC LIMIT $${params.length + 1}`;
        params.push(parseInt(limit, 10));

        const result = await client.query(query, params);

        return reply.send({ success: true, data: result.rows });
      } finally {
        client.release();
      }
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * GET /api/modules/sod/recommendations
   * Get SoD remediation recommendations
   */
  app.get('/api/modules/sod/recommendations', async (req, reply) => {
    try {
      const tenantId = req.headers['x-tenant'] as string;

      const client = await pool.connect();
      try {
        const result = await client.query(
          `SELECT DISTINCT ON (f.risk_id)
             f.risk_id,
             r.risk_name,
             f.remediation_options,
             f.severity,
             COUNT(*) OVER (PARTITION BY f.risk_id) as occurrence_count
           FROM sod_findings f
           JOIN sod_risks r ON f.risk_id = r.id
           WHERE f.tenant_id = $1
           AND f.status = 'OPEN'
           ORDER BY f.risk_id, f.detected_at DESC`,
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
   * POST /api/modules/sod/exceptions/approve
   * Approve SoD exception
   */
  app.post<{ Body: { findingId: string; justification: string; expiresAt?: string } }>(
    '/api/modules/sod/exceptions/approve',
    async (req, reply) => {
      try {
        const { findingId, justification, expiresAt } = req.body;
        const tenantId = req.headers['x-tenant'] as string;
        const actor = (req as any).actor;

        if (!findingId || !justification) {
          return reply.code(400).send({ error: 'findingId and justification required' });
        }

        const client = await pool.connect();
        try {
          // Update finding status
          await client.query(
            `UPDATE sod_findings
             SET status = 'EXCEPTION_APPROVED',
                 updated_at = NOW()
             WHERE id = $1 AND tenant_id = $2`,
            [findingId, tenantId]
          );

          // Log exception approval (would create exception record)
          return reply.send({
            success: true,
            data: { findingId, status: 'EXCEPTION_APPROVED', approvedBy: actor?.userId },
          });
        } finally {
          client.release();
        }
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * POST /api/modules/sod/exceptions/reject
   * Reject SoD exception
   */
  app.post<{ Body: { findingId: string; reason: string } }>(
    '/api/modules/sod/exceptions/reject',
    async (req, reply) => {
      try {
        const { findingId, reason } = req.body;
        const tenantId = req.headers['x-tenant'] as string;

        if (!findingId || !reason) {
          return reply.code(400).send({ error: 'findingId and reason required' });
        }

        const client = await pool.connect();
        try {
          await client.query(
            `UPDATE sod_findings
             SET status = 'OPEN',
                 updated_at = NOW()
             WHERE id = $1 AND tenant_id = $2`,
            [findingId, tenantId]
          );

          return reply.send({
            success: true,
            data: { findingId, status: 'OPEN' },
          });
        } finally {
          client.release();
        }
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * GET /api/modules/sod/compliance/report
   * Get SoD compliance report
   */
  app.get('/api/modules/sod/compliance/report', async (req, reply) => {
    try {
      const tenantId = req.headers['x-tenant'] as string;

      const client = await pool.connect();
      try {
        const stats = await client.query(
          `SELECT
            COUNT(*) as total_findings,
            COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical,
            COUNT(*) FILTER (WHERE severity = 'HIGH') as high,
            COUNT(*) FILTER (WHERE severity = 'MEDIUM') as medium,
            COUNT(*) FILTER (WHERE severity = 'LOW') as low,
            COUNT(*) FILTER (WHERE status = 'OPEN') as open_findings,
            COUNT(*) FILTER (WHERE status = 'EXCEPTION_APPROVED') as approved_exceptions
          FROM sod_findings
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
   * GET /api/modules/sod/health
   * Module health check
   */
  app.get('/api/modules/sod/health', async (req, reply) => {
    return reply.send({ success: true, module: 'SoD Control', status: 'healthy' });
  });
}
