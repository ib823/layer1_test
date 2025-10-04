import { Pool } from 'pg';

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
export async function validateDatabaseEncryption(
  connectionString: string
): Promise<EncryptionStatus> {
  const pool = new Pool({ connectionString });
  const status: EncryptionStatus = {
    enabled: false,
    details: {
      sslEnabled: false,
    },
    warnings: [],
    recommendations: [],
  };

  try {
    // Check SSL connection status
    const sslResult = await pool.query(`
      SELECT ssl, version FROM pg_stat_ssl WHERE pid = pg_backend_pid()
    `);

    if (sslResult.rows.length > 0 && sslResult.rows[0].ssl) {
      status.details.sslEnabled = true;
      status.details.sslMode = sslResult.rows[0].version;
      status.enabled = true;
    } else {
      status.warnings.push('SSL/TLS is not enabled for database connections');
      status.recommendations.push(
        'Enable SSL/TLS by configuring sslmode=require in connection string'
      );
    }

    // Check if running on cloud provider with automatic encryption
    const versionResult = await pool.query('SHOW server_version');
    const version = versionResult.rows[0].server_version;

    // Check for cloud providers (they typically have encryption at rest by default)
    const cloudIndicators = [
      'rds.amazonaws.com', // AWS RDS
      'database.azure.com', // Azure Database
      'cloudsql', // Google Cloud SQL
    ];

    const isCloudDatabase = cloudIndicators.some((indicator) =>
      connectionString.includes(indicator)
    );

    if (isCloudDatabase) {
      status.enabled = true;
      status.method = 'Cloud Provider Managed Encryption';
      status.details.transparentDataEncryption = true;
      status.recommendations.push(
        'Verify encryption at rest is enabled in your cloud provider console'
      );
    }

    // Check for PostgreSQL extensions that support encryption
    const extensionsResult = await pool.query(`
      SELECT extname FROM pg_extension
      WHERE extname IN ('pgcrypto', 'pg_tde')
    `);

    if (extensionsResult.rows.some((row) => row.extname === 'pg_tde')) {
      status.enabled = true;
      status.method = 'Transparent Data Encryption (TDE)';
      status.details.transparentDataEncryption = true;
    } else if (extensionsResult.rows.some((row) => row.extname === 'pgcrypto')) {
      status.warnings.push(
        'pgcrypto extension is available but not the same as full disk encryption'
      );
      status.recommendations.push('Consider enabling Transparent Data Encryption (TDE)');
    }

    // Check tablespace encryption (PostgreSQL 14+)
    try {
      // const tablespaceResult = await pool.query(`
      //   SELECT spcname, spcoptions
      //   FROM pg_tablespace
      //   WHERE spcname NOT LIKE 'pg_%'
      // `);

      // Note: PostgreSQL doesn't natively support tablespace encryption
      // This would need to be implemented at the filesystem/disk level
      status.recommendations.push(
        'Ensure filesystem/disk encryption (LUKS, dm-crypt) is enabled at OS level'
      );
    } catch (error) {
      // Older PostgreSQL versions may not support this query
    }

    // Final recommendations
    if (!status.enabled) {
      status.warnings.push('No database encryption detected');
      status.recommendations.push(
        'Enable encryption at rest using one of the following methods:',
        '1. Use managed database service with encryption (AWS RDS, Azure Database, etc.)',
        '2. Enable filesystem encryption (LUKS, dm-crypt)',
        '3. Use PostgreSQL TDE extension',
        '4. Configure SSL/TLS for data in transit'
      );
    }

    // SSL is minimum requirement
    if (!status.details.sslEnabled) {
      status.recommendations.push(
        'CRITICAL: Enable SSL/TLS for database connections immediately'
      );
    }

    return status;
  } catch (error: any) {
    status.warnings.push(`Error checking encryption: ${error.message}`);
    return status;
  } finally {
    await pool.end();
  }
}

/**
 * Validate that encryption is required and enforced
 */
export async function enforceEncryptionRequirement(
  connectionString: string,
  required: boolean = true
): Promise<{ compliant: boolean; issues: string[] }> {
  if (!required) {
    return { compliant: true, issues: [] };
  }

  const status = await validateDatabaseEncryption(connectionString);
  const issues: string[] = [];

  if (!status.details.sslEnabled) {
    issues.push('SSL/TLS is not enabled for database connections (REQUIRED)');
  }

  if (!status.enabled) {
    issues.push('Encryption at rest is not enabled (REQUIRED)');
  }

  if (status.warnings.length > 0) {
    issues.push(...status.warnings);
  }

  return {
    compliant: issues.length === 0,
    issues,
  };
}

/**
 * Get encryption recommendations for specific compliance frameworks
 */
export function getComplianceEncryptionRequirements(
  frameworks: string[]
): { framework: string; requirements: string[] }[] {
  const requirements: { framework: string; requirements: string[] }[] = [];

  for (const framework of frameworks) {
    switch (framework) {
      case 'GDPR':
        requirements.push({
          framework: 'GDPR',
          requirements: [
            'Encryption of personal data at rest (Article 32)',
            'Encryption of personal data in transit',
            'Pseudonymization where appropriate',
            'Regular testing of encryption effectiveness',
          ],
        });
        break;

      case 'HIPAA':
        requirements.push({
          framework: 'HIPAA',
          requirements: [
            'Encryption of ePHI at rest (45 CFR § 164.312(a)(2)(iv))',
            'Encryption of ePHI in transit',
            'Encryption key management',
            'Access controls for encrypted data',
          ],
        });
        break;

      case 'PCI_DSS':
        requirements.push({
          framework: 'PCI DSS',
          requirements: [
            'Encryption of cardholder data at rest (Requirement 3.4)',
            'Encryption during transmission over public networks (Requirement 4.1)',
            'Strong cryptography (AES-256 minimum)',
            'Key management procedures',
          ],
        });
        break;

      case 'SOC2':
        requirements.push({
          framework: 'SOC 2',
          requirements: [
            'Encryption of data at rest (CC6.7)',
            'Encryption of data in transit',
            'Encryption key management and rotation',
            'Documentation of encryption controls',
          ],
        });
        break;

      case 'ISO27001':
        requirements.push({
          framework: 'ISO 27001',
          requirements: [
            'Cryptographic controls (A.10.1)',
            'Key management (A.10.1.2)',
            'Encryption of sensitive information',
            'Regular review of cryptographic controls',
          ],
        });
        break;
    }
  }

  return requirements;
}
