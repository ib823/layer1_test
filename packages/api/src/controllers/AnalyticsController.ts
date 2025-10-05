import { Response } from 'express';
import { Pool } from 'pg';
import { AuthenticatedRequest } from '../types';

export class AnalyticsController {
  private pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async getTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    const tenantId = req.user?.tenantId || 'test-tenant';
    const months = parseInt(req.query.months as string) || 6;

    try {
      const result = await this.pool.query(
        `SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
          COUNT(*) FILTER (WHERE status = 'open') as violations,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress
        FROM sod_violations
        WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '1 month' * $2
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)`,
        [tenantId, months]
      );
      res.json({ data: result.rows });
    } catch (error) {
      console.error('Analytics trends error:', error);
      res.status(500).json({ error: 'Failed to fetch trends' });
    }
  }

  async getRiskDistribution(req: AuthenticatedRequest, res: Response): Promise<void> {
    const tenantId = req.user?.tenantId || 'test-tenant';

    try {
      const result = await this.pool.query(
        `SELECT risk_level as name, COUNT(*) as value
        FROM sod_violations
        WHERE tenant_id = $1 AND status = 'open'
        GROUP BY risk_level`,
        [tenantId]
      );
      res.json({ data: result.rows, total: result.rows.reduce((s, r) => s + parseInt(r.value), 0) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch risk distribution' });
    }
  }

  async getDepartmentBreakdown(req: AuthenticatedRequest, res: Response): Promise<void> {
    const tenantId = req.user?.tenantId || 'test-tenant';

    try {
      const result = await this.pool.query(
        `SELECT department, COUNT(*) as violations, ROUND(AVG(risk_score), 1) as avg_risk_score,
          COUNT(*) FILTER (WHERE risk_level = 'critical') as critical_count,
          COUNT(*) FILTER (WHERE risk_level = 'high') as high_count
        FROM sod_violations
        WHERE tenant_id = $1 AND status = 'open'
        GROUP BY department ORDER BY violations DESC LIMIT 10`,
        [tenantId]
      );
      res.json({ data: result.rows });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch departments' });
    }
  }

  async getTopViolationTypes(req: AuthenticatedRequest, res: Response): Promise<void> {
    const tenantId = req.user?.tenantId || 'test-tenant';

    try {
      const result = await this.pool.query(
        `SELECT violation_type as type, COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
        FROM sod_violations
        WHERE tenant_id = $1 AND status = 'open'
        GROUP BY violation_type ORDER BY count DESC LIMIT 10`,
        [tenantId]
      );
      res.json({ data: result.rows });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch types' });
    }
  }

  async getComplianceScore(req: AuthenticatedRequest, res: Response): Promise<void> {
    const tenantId = req.user?.tenantId || 'test-tenant';

    try {
      const result = await this.pool.query(
        `WITH stats AS (
          SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
            COUNT(*) FILTER (WHERE risk_level = 'critical') as critical_open,
            COUNT(*) FILTER (WHERE risk_level = 'high') as high_open
          FROM sod_violations
          WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '90 days'
        )
        SELECT CASE WHEN total = 0 THEN 100 ELSE ROUND(100 - ((critical_open * 20 + high_open * 10) / NULLIF(total, 0))) END as score,
          total as total_violations, resolved, critical_open, high_open
        FROM stats`,
        [tenantId]
      );
      res.json({ data: result.rows[0] || { score: 100, total_violations: 0 } });
    } catch (error) {
      res.status(500).json({ error: 'Failed to calculate score' });
    }
  }
}
