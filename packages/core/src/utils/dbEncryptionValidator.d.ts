/**
 * Database Encryption at Rest Validator
 * Validates that database encryption is properly configured
 */
export interface EncryptionStatus {
    enabled: boolean;
    method?: string;
    details: {
        sslEnabled: boolean;
        sslMode?: string;
        tablespacesEncrypted?: boolean;
        transparentDataEncryption?: boolean;
    };
    warnings: string[];
    recommendations: string[];
}
/**
 * Validate PostgreSQL database encryption configuration
 */
export declare function validateDatabaseEncryption(connectionString: string): Promise<EncryptionStatus>;
/**
 * Validate that encryption is required and enforced
 */
export declare function enforceEncryptionRequirement(connectionString: string, required?: boolean): Promise<{
    compliant: boolean;
    issues: string[];
}>;
/**
 * Get encryption recommendations for specific compliance frameworks
 */
export declare function getComplianceEncryptionRequirements(frameworks: string[]): {
    framework: string;
    requirements: string[];
}[];
//# sourceMappingURL=dbEncryptionValidator.d.ts.map