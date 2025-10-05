"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataRetentionService = void 0;
const pg_1 = require("pg");
const SoDViolationRepository_1 = require("../persistence/SoDViolationRepository");
class DataRetentionService {
    pool;
    constructor(connectionString) {
        this.pool = new pg_1.Pool({ connectionString });
    }
    /**
     * Create or update retention policy
     */
    async setRetentionPolicy(policy) {
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
    async getRetentionPolicy(tenantId, tableName) {
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
    async listRetentionPolicies(tenantId) {
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
    async executeCleanup(tenantId, tableName) {
        const policy = await this.getRetentionPolicy(tenantId, tableName);
        if (!policy) {
            throw new Error(`No retention policy found for ${tableName}`);
        }
        if (!policy.autoDelete) {
            throw new Error(`Auto-delete not enabled for ${tableName}`);
        }
        const result = {
            tenantId,
            tableName,
            recordsDeleted: 0,
            recordsArchived: 0,
            executedAt: new Date(),
        };
        try {
            // Archive before delete if enabled
            if (policy.archiveBeforeDelete) {
                result.recordsArchived = await this.archiveOldRecords(tenantId, tableName, policy.retentionDays);
            }
            // Delete old records
            result.recordsDeleted = await this.deleteOldRecords(tenantId, tableName, policy.retentionDays);
            // Update last cleanup timestamp
            await this.pool.query(`UPDATE data_retention_policies
         SET last_cleanup_at = NOW(),
             next_cleanup_at = NOW() + INTERVAL '1 day'
         WHERE tenant_id = $1 AND table_name = $2`, [tenantId, tableName]);
            return result;
        }
        catch (error) {
            result.error = error.message;
            throw error;
        }
    }
    /**
     * Execute cleanup for all tables with auto-delete enabled
     */
    async executeAllCleanups(tenantId) {
        const query = `
      SELECT * FROM data_retention_policies
      WHERE tenant_id = $1
        AND auto_delete = true
        AND (next_cleanup_at IS NULL OR next_cleanup_at <= NOW())
    `;
        const result = await this.pool.query(query, [tenantId]);
        const policies = result.rows.map(this.mapPolicy);
        const results = [];
        for (const policy of policies) {
            try {
                const cleanupResult = await this.executeCleanup(tenantId, policy.tableName);
                results.push(cleanupResult);
            }
            catch (error) {
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
    async archiveOldRecords(tenantId, tableName, retentionDays) {
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
    async deleteOldRecords(tenantId, tableName, retentionDays) {
        // Special handling for different tables
        if (tableName === 'audit_logs') {
            return await this.deleteOldAuditLogs(tenantId, retentionDays);
        }
        else if (tableName === 'sod_violations') {
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
    async deleteOldAuditLogs(tenantId, retentionDays) {
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
    async deleteOldSoDViolations(tenantId, retentionDays) {
        const sodRepo = new SoDViolationRepository_1.SoDViolationRepository(this.pool.options.connectionString);
        const deleted = await sodRepo.deleteOldViolations(tenantId, retentionDays);
        await sodRepo.close();
        return deleted;
    }
    /**
     * Get cleanup statistics
     */
    async getCleanupStats(tenantId) {
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
    mapPolicy(row) {
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
    async close() {
        await this.pool.end();
    }
}
exports.DataRetentionService = DataRetentionService;
//# sourceMappingURL=DataRetentionService.js.map