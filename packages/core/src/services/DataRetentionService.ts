import { Pool } from 'pg';
import { SoDViolationRepository } from '../persistence/SoDViolationRepository';

/**
 * Data Retention and Cleanup Service
 * Implements automated data retention policies for compliance (GDPR, SAP Audit, etc.)
 */

export interface RetentionPolicy {
  id?: string;
  tenantId: string;
  tableName: string;
  retentionDays: number;
  autoDelete: boolean;
  archiveBeforeDelete: boolean;
  complianceRequirement?: string;
  lastCleanupAt?: Date;
  nextCleanupAt?: Date;
}

export interface CleanupResult {
  tenantId: string;
  tableName: string;
  recordsDeleted: number;
  recordsArchived: number;
  executedAt: Date;
  error?: string;
}

export class DataRetentionService {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  /**
   * Create or update retention policy
   */
  async setRetentionPolicy(policy: RetentionPolicy): Promise<RetentionPolicy> {
    const query = `
      INSERT INTO data_retention_policies (
        tenant_id, table_name, retention_days, auto_delete,
        archive_before_delete, compliance_requirement
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (tenant_id, table_name)
      DO UPDATE SET
        retention_days = EXCLUDED.retention_days,
        auto_delete = EXCLUDED.auto_delete,
        archive_before_delete = EXCLUDED.archive_before_delete,
        compliance_requirement = EXCLUDED.compliance_requirement
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      policy.tenantId,
      policy.tableName,
      policy.retentionDays,
      policy.autoDelete,
      policy.archiveBeforeDelete,
      policy.complianceRequirement || null,
    ]);

    return this.mapPolicy(result.rows[0]);
  }

  /**
   * Get retention policy for a table
   */
  async getRetentionPolicy(tenantId: string, tableName: string): Promise<RetentionPolicy | null> {
    const query = `
      SELECT * FROM data_retention_policies
      WHERE tenant_id = $1 AND table_name = $2
    `;

    const result = await this.pool.query(query, [tenantId, tableName]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapPolicy(result.rows[0]);
  }

  /**
   * List all retention policies for a tenant
   */
  async listRetentionPolicies(tenantId: string): Promise<RetentionPolicy[]> {
    const query = `
      SELECT * FROM data_retention_policies
      WHERE tenant_id = $1
      ORDER BY table_name
    `;

    const result = await this.pool.query(query, [tenantId]);
    return result.rows.map(this.mapPolicy);
  }

  /**
   * Execute cleanup for a specific table
   */
  async executeCleanup(tenantId: string, tableName: string): Promise<CleanupResult> {
    const policy = await this.getRetentionPolicy(tenantId, tableName);

    if (!policy) {
      throw new Error(`No retention policy found for ${tableName}`);
    }

    if (!policy.autoDelete) {
      throw new Error(`Auto-delete not enabled for ${tableName}`);
    }

    const result: CleanupResult = {
      tenantId,
      tableName,
      recordsDeleted: 0,
      recordsArchived: 0,
      executedAt: new Date(),
    };

    try {
      // Archive before delete if enabled
      if (policy.archiveBeforeDelete) {
        result.recordsArchived = await this.archiveOldRecords(
          tenantId,
          tableName,
          policy.retentionDays
        );
      }

      // Delete old records
      result.recordsDeleted = await this.deleteOldRecords(
        tenantId,
        tableName,
        policy.retentionDays
      );

      // Update last cleanup timestamp
      await this.pool.query(
        `UPDATE data_retention_policies
         SET last_cleanup_at = NOW(),
             next_cleanup_at = NOW() + INTERVAL '1 day'
         WHERE tenant_id = $1 AND table_name = $2`,
        [tenantId, tableName]
      );

      return result;
    } catch (error: any) {
      result.error = error.message;
      throw error;
    }
  }

  /**
   * Execute cleanup for all tables with auto-delete enabled
   */
  async executeAllCleanups(tenantId: string): Promise<CleanupResult[]> {
    const query = `
      SELECT * FROM data_retention_policies
      WHERE tenant_id = $1
        AND auto_delete = true
        AND (next_cleanup_at IS NULL OR next_cleanup_at <= NOW())
    `;

    const result = await this.pool.query(query, [tenantId]);
    const policies = result.rows.map(this.mapPolicy);

    const results: CleanupResult[] = [];

    for (const policy of policies) {
      try {
        const cleanupResult = await this.executeCleanup(tenantId, policy.tableName);
        results.push(cleanupResult);
      } catch (error: any) {
        results.push({
          tenantId,
          tableName: policy.tableName,
          recordsDeleted: 0,
          recordsArchived: 0,
          executedAt: new Date(),
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Archive old records to archive table
   */
  private async archiveOldRecords(
    tenantId: string,
    tableName: string,
    retentionDays: number
  ): Promise<number> {
    const archiveTableName = `${tableName}_archive`;

    // Create archive table if it doesn't exist (copy structure)
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${archiveTableName} (LIKE ${tableName} INCLUDING ALL)
    `);

    // Copy old records to archive
    const archiveQuery = `
      INSERT INTO ${archiveTableName}
      SELECT * FROM ${tableName}
      WHERE tenant_id = $1
        AND created_at < NOW() - INTERVAL '${retentionDays} days'
      ON CONFLICT DO NOTHING
    `;

    const result = await this.pool.query(archiveQuery, [tenantId]);
    return result.rowCount || 0;
  }

  /**
   * Delete old records from a table
   */
  private async deleteOldRecords(
    tenantId: string,
    tableName: string,
    retentionDays: number
  ): Promise<number> {
    // Special handling for different tables
    if (tableName === 'audit_logs') {
      return await this.deleteOldAuditLogs(tenantId, retentionDays);
    } else if (tableName === 'sod_violations') {
      return await this.deleteOldSoDViolations(tenantId, retentionDays);
    }

    // Generic deletion for other tables
    const query = `
      DELETE FROM ${tableName}
      WHERE tenant_id = $1
        AND created_at < NOW() - INTERVAL '${retentionDays} days'
    `;

    const result = await this.pool.query(query, [tenantId]);
    return result.rowCount || 0;
  }

  /**
   * Delete old audit logs
   */
  private async deleteOldAuditLogs(tenantId: string, retentionDays: number): Promise<number> {
    const query = `
      DELETE FROM audit_logs
      WHERE tenant_id = $1
        AND timestamp < NOW() - INTERVAL '${retentionDays} days'
    `;

    const result = await this.pool.query(query, [tenantId]);
    return result.rowCount || 0;
  }

  /**
   * Delete old SoD violations (only resolved ones)
   */
  private async deleteOldSoDViolations(tenantId: string, retentionDays: number): Promise<number> {
    const sodRepo = new SoDViolationRepository(this.pool.options.connectionString as string);
    const deleted = await sodRepo.deleteOldViolations(tenantId, retentionDays);
    await sodRepo.close();
    return deleted;
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(tenantId: string): Promise<{
    totalPolicies: number;
    autoDeleteEnabled: number;
    pendingCleanups: number;
  }> {
    const query = `
      SELECT
        COUNT(*) as total_policies,
        COUNT(*) FILTER (WHERE auto_delete = true) as auto_delete_enabled,
        COUNT(*) FILTER (WHERE auto_delete = true AND (next_cleanup_at IS NULL OR next_cleanup_at <= NOW())) as pending_cleanups
      FROM data_retention_policies
      WHERE tenant_id = $1
    `;

    const result = await this.pool.query(query, [tenantId]);
    const row = result.rows[0];

    return {
      totalPolicies: parseInt(row.total_policies),
      autoDeleteEnabled: parseInt(row.auto_delete_enabled),
      pendingCleanups: parseInt(row.pending_cleanups),
    };
  }

  private mapPolicy(row: any): RetentionPolicy {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      tableName: row.table_name,
      retentionDays: row.retention_days,
      autoDelete: row.auto_delete,
      archiveBeforeDelete: row.archive_before_delete,
      complianceRequirement: row.compliance_requirement,
      lastCleanupAt: row.last_cleanup_at,
      nextCleanupAt: row.next_cleanup_at,
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
