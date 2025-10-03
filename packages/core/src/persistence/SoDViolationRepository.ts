import { Pool, PoolClient } from 'pg';

/**
 * SoD Violation Types
 */
export interface SoDViolation {
  id: string;
  tenantId: string;
  analysisId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  conflictType: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  conflictingRoles: string[];
  affectedTransactions?: string[];
  businessProcess?: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'REMEDIATED' | 'ACCEPTED_RISK';
  remediationNotes?: string;
  remediationPlan?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  detectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SoDAnalysisRun {
  id: string;
  tenantId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  totalUsersAnalyzed?: number;
  violationsFound: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  config?: any;
  createdAt: Date;
}

export interface ViolationFilters {
  status?: string[];
  riskLevel?: string[];
  userId?: string;
  conflictType?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Repository for SoD violation data persistence
 */
export class SoDViolationRepository {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  /**
   * Create new analysis run
   */
  async createAnalysisRun(
    tenantId: string,
    totalUsers: number,
    config?: any
  ): Promise<SoDAnalysisRun> {
    const query = `
      INSERT INTO sod_analysis_runs (tenant_id, status, total_users_analyzed, config)
      VALUES ($1, 'RUNNING', $2, $3)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      tenantId,
      totalUsers,
      config ? JSON.stringify(config) : null,
    ]);

    return this.mapAnalysisRun(result.rows[0]);
  }

  /**
   * Complete analysis run with results
   */
  async completeAnalysisRun(
    analysisId: string,
    violationCounts: {
      total: number;
      high: number;
      medium: number;
      low: number;
    }
  ): Promise<void> {
    const query = `
      UPDATE sod_analysis_runs
      SET status = 'COMPLETED',
          violations_found = $1,
          high_risk_count = $2,
          medium_risk_count = $3,
          low_risk_count = $4,
          completed_at = NOW()
      WHERE id = $5
    `;

    await this.pool.query(query, [
      violationCounts.total,
      violationCounts.high,
      violationCounts.medium,
      violationCounts.low,
      analysisId,
    ]);
  }

  /**
   * Mark analysis run as failed
   */
  async failAnalysisRun(analysisId: string, errorMessage: string): Promise<void> {
    const query = `
      UPDATE sod_analysis_runs
      SET status = 'FAILED',
          error_message = $1,
          completed_at = NOW()
      WHERE id = $2
    `;

    await this.pool.query(query, [errorMessage, analysisId]);
  }

  /**
   * Store violations from analysis
   */
  async storeViolations(
    violations: Omit<SoDViolation, 'id' | 'createdAt' | 'updatedAt'>[]
  ): Promise<void> {
    if (violations.length === 0) return;

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO sod_violations (
          tenant_id, analysis_id, user_id, user_name, user_email,
          conflict_type, risk_level, conflicting_roles, affected_transactions,
          business_process, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;

      for (const violation of violations) {
        await client.query(query, [
          violation.tenantId,
          violation.analysisId,
          violation.userId,
          violation.userName,
          violation.userEmail,
          violation.conflictType,
          violation.riskLevel,
          violation.conflictingRoles,
          violation.affectedTransactions || null,
          violation.businessProcess || null,
          violation.status || 'OPEN',
        ]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get violations with filters and pagination
   */
  async getViolations(
    tenantId: string,
    filters?: ViolationFilters,
    pagination?: PaginationOptions
  ): Promise<{ violations: SoDViolation[]; total: number }> {
    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    // Apply filters
    if (filters?.status && filters.status.length > 0) {
      conditions.push(`status = ANY($${paramIndex})`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.riskLevel && filters.riskLevel.length > 0) {
      conditions.push(`risk_level = ANY($${paramIndex})`);
      params.push(filters.riskLevel);
      paramIndex++;
    }

    if (filters?.userId) {
      conditions.push(`user_id = $${paramIndex}`);
      params.push(filters.userId);
      paramIndex++;
    }

    if (filters?.conflictType) {
      conditions.push(`conflict_type = $${paramIndex}`);
      params.push(filters.conflictType);
      paramIndex++;
    }

    if (filters?.dateFrom) {
      conditions.push(`detected_at >= $${paramIndex}`);
      params.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters?.dateTo) {
      conditions.push(`detected_at <= $${paramIndex}`);
      params.push(filters.dateTo);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Count total
    const countQuery = `SELECT COUNT(*) FROM sod_violations WHERE ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get violations with pagination
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 50;
    const offset = (page - 1) * pageSize;
    const sortBy = pagination?.sortBy || 'detected_at';
    const sortOrder = pagination?.sortOrder || 'DESC';

    const query = `
      SELECT * FROM sod_violations
      WHERE ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await this.pool.query(query, [...params, pageSize, offset]);

    return {
      violations: result.rows.map(this.mapViolation),
      total,
    };
  }

  /**
   * Get single violation by ID
   */
  async getViolation(tenantId: string, violationId: string): Promise<SoDViolation | null> {
    const query = `
      SELECT * FROM sod_violations
      WHERE id = $1 AND tenant_id = $2
    `;

    const result = await this.pool.query(query, [violationId, tenantId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapViolation(result.rows[0]);
  }

  /**
   * Update violation status
   */
  async updateViolationStatus(
    violationId: string,
    updates: {
      status?: string;
      remediationNotes?: string;
      remediationPlan?: string;
      acknowledgedBy?: string;
      resolvedBy?: string;
    }
  ): Promise<void> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.status) {
      fields.push(`status = $${paramIndex}`);
      params.push(updates.status);
      paramIndex++;

      // Auto-set timestamps based on status
      if (updates.status === 'ACKNOWLEDGED' && updates.acknowledgedBy) {
        fields.push(`acknowledged_by = $${paramIndex}, acknowledged_at = NOW()`);
        params.push(updates.acknowledgedBy);
        paramIndex++;
      }

      if ((updates.status === 'REMEDIATED' || updates.status === 'ACCEPTED_RISK') && updates.resolvedBy) {
        fields.push(`resolved_by = $${paramIndex}, resolved_at = NOW()`);
        params.push(updates.resolvedBy);
        paramIndex++;
      }
    }

    if (updates.remediationNotes) {
      fields.push(`remediation_notes = $${paramIndex}`);
      params.push(updates.remediationNotes);
      paramIndex++;
    }

    if (updates.remediationPlan) {
      fields.push(`remediation_plan = $${paramIndex}`);
      params.push(updates.remediationPlan);
      paramIndex++;
    }

    if (fields.length === 0) return;

    const query = `
      UPDATE sod_violations
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
    `;

    params.push(violationId);
    await this.pool.query(query, params);
  }

  /**
   * Get latest analysis run for tenant
   */
  async getLatestAnalysis(tenantId: string): Promise<SoDAnalysisRun | null> {
    const query = `
      SELECT * FROM sod_analysis_runs
      WHERE tenant_id = $1
      ORDER BY started_at DESC
      LIMIT 1
    `;

    const result = await this.pool.query(query, [tenantId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapAnalysisRun(result.rows[0]);
  }

  /**
   * Get violation statistics for tenant
   */
  async getViolationStats(tenantId: string): Promise<{
    total: number;
    byStatus: { [key: string]: number };
    byRiskLevel: { [key: string]: number };
  }> {
    const query = `
      SELECT
        COUNT(*) as total,
        status,
        risk_level
      FROM sod_violations
      WHERE tenant_id = $1
      GROUP BY status, risk_level
    `;

    const result = await this.pool.query(query, [tenantId]);

    const stats = {
      total: 0,
      byStatus: {} as { [key: string]: number },
      byRiskLevel: {} as { [key: string]: number },
    };

    for (const row of result.rows) {
      const count = parseInt(row.count);
      stats.total += count;

      if (row.status) {
        stats.byStatus[row.status] = (stats.byStatus[row.status] || 0) + count;
      }

      if (row.risk_level) {
        stats.byRiskLevel[row.risk_level] = (stats.byRiskLevel[row.risk_level] || 0) + count;
      }
    }

    return stats;
  }

  /**
   * Get violations for a specific user
   */
  async getViolationsByUser(tenantId: string, userId: string): Promise<SoDViolation[]> {
    const query = `
      SELECT * FROM sod_violations
      WHERE tenant_id = $1 AND user_id = $2
      ORDER BY detected_at DESC
    `;

    const result = await this.pool.query(query, [tenantId, userId]);
    return result.rows.map(this.mapViolation);
  }

  /**
   * Delete old violations (data retention)
   */
  async deleteOldViolations(tenantId: string, olderThanDays: number): Promise<number> {
    const query = `
      DELETE FROM sod_violations
      WHERE tenant_id = $1
        AND detected_at < NOW() - INTERVAL '${olderThanDays} days'
        AND status IN ('REMEDIATED', 'ACCEPTED_RISK')
    `;

    const result = await this.pool.query(query, [tenantId]);
    return result.rowCount || 0;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  // Helper methods

  private mapViolation(row: any): SoDViolation {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      analysisId: row.analysis_id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      conflictType: row.conflict_type,
      riskLevel: row.risk_level,
      conflictingRoles: row.conflicting_roles,
      affectedTransactions: row.affected_transactions,
      businessProcess: row.business_process,
      status: row.status,
      remediationNotes: row.remediation_notes,
      remediationPlan: row.remediation_plan,
      acknowledgedBy: row.acknowledged_by,
      acknowledgedAt: row.acknowledged_at,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at,
      detectedAt: row.detected_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapAnalysisRun(row: any): SoDAnalysisRun {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      status: row.status,
      totalUsersAnalyzed: row.total_users_analyzed,
      violationsFound: row.violations_found || 0,
      highRiskCount: row.high_risk_count || 0,
      mediumRiskCount: row.medium_risk_count || 0,
      lowRiskCount: row.low_risk_count || 0,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      errorMessage: row.error_message,
      config: row.config,
      createdAt: row.created_at,
    };
  }
}
