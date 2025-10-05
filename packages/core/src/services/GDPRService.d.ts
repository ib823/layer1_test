/**
 * GDPR Compliance Service
 * Implements Right to be Forgotten, Data Access, Rectification, and Portability
 */
export interface DataSubjectRequest {
    id?: string;
    tenantId: string;
    requestType: 'FORGET' | 'ACCESS' | 'RECTIFY' | 'PORTABILITY';
    subjectType: 'USER' | 'CUSTOMER' | 'EMPLOYEE';
    subjectId: string;
    subjectEmail?: string;
    subjectIdentifiers?: any;
    status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    requestedBy?: string;
    requestedAt?: Date;
    completedAt?: Date;
    completedBy?: string;
    affectedTables?: string[];
    affectedRecords?: number;
    verificationToken?: string;
    verificationExpiresAt?: Date;
    verifiedAt?: Date;
    notes?: string;
    errorMessage?: string;
    metadata?: any;
}
export interface DataExportResult {
    subjectId: string;
    exportedAt: Date;
    data: {
        [tableName: string]: any[];
    };
    summary: {
        totalTables: number;
        totalRecords: number;
    };
}
export declare class GDPRService {
    private pool;
    /**
     * Tables that should be checked for user data
     * Customize based on your schema
     */
    private readonly USER_DATA_TABLES;
    /**
     * Tables that should be anonymized instead of deleted (for audit/compliance)
     */
    private readonly ANONYMIZE_ONLY_TABLES;
    constructor(connectionString: string);
    /**
     * Create a data subject request
     */
    createRequest(request: DataSubjectRequest): Promise<DataSubjectRequest>;
    /**
     * Verify data subject request
     */
    verifyRequest(requestId: string, token: string): Promise<boolean>;
    /**
     * Execute Right to be Forgotten request
     * Deletes or anonymizes all personal data for a subject
     */
    executeForgetRequest(requestId: string, executedBy: string): Promise<void>;
    /**
     * Execute Data Access request (GDPR Article 15)
     * Exports all personal data for a subject
     */
    executeAccessRequest(requestId: string, executedBy: string): Promise<DataExportResult>;
    /**
     * Get data subject request
     */
    getRequest(requestId: string): Promise<DataSubjectRequest | null>;
    /**
     * List data subject requests for a tenant
     */
    listRequests(tenantId: string, filters?: {
        status?: string;
        requestType?: string;
        page?: number;
        pageSize?: number;
    }): Promise<{
        requests: DataSubjectRequest[];
        total: number;
    }>;
    /**
     * Process table for deletion or anonymization
     */
    private processTableForDeletion;
    /**
     * Export data from a table
     */
    private exportTableData;
    /**
     * Generate verification token
     */
    private generateVerificationToken;
    /**
     * Map database row to request object
     */
    private mapRequest;
    close(): Promise<void>;
}
//# sourceMappingURL=GDPRService.d.ts.map