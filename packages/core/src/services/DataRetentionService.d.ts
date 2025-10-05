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
export declare class DataRetentionService {
    private pool;
    constructor(connectionString: string);
    /**
     * Create or update retention policy
     */
    setRetentionPolicy(policy: RetentionPolicy): Promise<RetentionPolicy>;
    /**
     * Get retention policy for a table
     */
    getRetentionPolicy(tenantId: string, tableName: string): Promise<RetentionPolicy | null>;
    /**
     * List all retention policies for a tenant
     */
    listRetentionPolicies(tenantId: string): Promise<RetentionPolicy[]>;
    /**
     * Execute cleanup for a specific table
     */
    executeCleanup(tenantId: string, tableName: string): Promise<CleanupResult>;
    /**
     * Execute cleanup for all tables with auto-delete enabled
     */
    executeAllCleanups(tenantId: string): Promise<CleanupResult[]>;
    /**
     * Archive old records to archive table
     */
    private archiveOldRecords;
    /**
     * Delete old records from a table
     */
    private deleteOldRecords;
    /**
     * Delete old audit logs
     */
    private deleteOldAuditLogs;
    /**
     * Delete old SoD violations (only resolved ones)
     */
    private deleteOldSoDViolations;
    /**
     * Get cleanup statistics
     */
    getCleanupStats(tenantId: string): Promise<{
        totalPolicies: number;
        autoDeleteEnabled: number;
        pendingCleanups: number;
    }>;
    private mapPolicy;
    close(): Promise<void>;
}
//# sourceMappingURL=DataRetentionService.d.ts.map