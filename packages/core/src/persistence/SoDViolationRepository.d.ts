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
export declare class SoDViolationRepository {
    private pool;
    constructor(connectionString: string);
    /**
     * Create new analysis run
     */
    createAnalysisRun(tenantId: string, totalUsers: number, config?: any): Promise<SoDAnalysisRun>;
    /**
     * Complete analysis run with results
     */
    completeAnalysisRun(analysisId: string, violationCounts: {
        total: number;
        high: number;
        medium: number;
        low: number;
    }): Promise<void>;
    /**
     * Mark analysis run as failed
     */
    failAnalysisRun(analysisId: string, errorMessage: string): Promise<void>;
    /**
     * Store violations from analysis (Optimized batch insert)
     */
    storeViolations(violations: Omit<SoDViolation, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void>;
    /**
     * Get violations with filters and pagination
     */
    getViolations(tenantId: string, filters?: ViolationFilters, pagination?: PaginationOptions): Promise<{
        violations: SoDViolation[];
        total: number;
    }>;
    /**
     * Get single violation by ID
     */
    getViolation(tenantId: string, violationId: string): Promise<SoDViolation | null>;
    /**
     * Update violation status
     */
    updateViolationStatus(violationId: string, updates: {
        status?: string;
        remediationNotes?: string;
        remediationPlan?: string;
        acknowledgedBy?: string;
        resolvedBy?: string;
    }): Promise<void>;
    /**
     * Get latest analysis run for tenant
     */
    getLatestAnalysis(tenantId: string): Promise<SoDAnalysisRun | null>;
    /**
     * Get violation statistics for tenant
     */
    getViolationStats(tenantId: string): Promise<{
        total: number;
        byStatus: {
            [key: string]: number;
        };
        byRiskLevel: {
            [key: string]: number;
        };
    }>;
    /**
     * Get violations for a specific user
     */
    getViolationsByUser(tenantId: string, userId: string): Promise<SoDViolation[]>;
    /**
     * Delete old violations (data retention)
     */
    deleteOldViolations(tenantId: string, olderThanDays: number): Promise<number>;
    /**
     * Close database connection
     */
    close(): Promise<void>;
    private mapViolation;
    private mapAnalysisRun;
}
//# sourceMappingURL=SoDViolationRepository.d.ts.map