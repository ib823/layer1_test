import { Response } from 'express';
import { Pool } from 'pg';
import { AuthenticatedRequest } from '../types';

export class DashboardController {
  private pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async getKPIs(req: AuthenticatedRequest, res: Response): Promise<void> {
    const tenantId = req.user?.tenantId || 'test-tenant';

    try {
      const result = await this.pool.query(
        `WITH current AS (
          SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE risk_level = 'critical') as critical,
            COUNT(*) FILTER (WHERE status = 'open') as open_count,
            COUNT(DISTINCT user_id) as users
          FROM sod_violations WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
        ),
        previous AS (
          SELECT COUNT(*) as total FROM sod_violations
          WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days'
        ),
        compliance AS (
          SELECT CASE WHEN COUNT(*) = 0 THEN 100 ELSE ROUND(100 - (COUNT(*) FILTER (WHERE status = 'open') * 100.0 / COUNT(*))) END as score
          FROM sod_violations WHERE tenant_id = $1
        )
        SELECT current.total, current.critical, current.open_count, current.users,
          previous.total as prev_total, compliance.score,
          ROUND((current.total - previous.total) * 100.0 / NULLIF(previous.total, 0), 1) as trend
        FROM current, previous, compliance`,
        [tenantId]
      );
      res.json({ data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch KPIs' });
    }
  }
}
