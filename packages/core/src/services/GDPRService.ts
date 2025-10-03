import { Pool } from 'pg';
import crypto from 'crypto';

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

export class GDPRService {
  private pool: Pool;

  /**
   * Tables that should be checked for user data
   * Customize based on your schema
   */
  private readonly USER_DATA_TABLES = [
    'audit_logs',
    'sod_violations',
    'user_consents',
    'tenant_module_activations',
    'service_discovery_history',
  ];

  /**
   * Tables that should be anonymized instead of deleted (for audit/compliance)
   */
  private readonly ANONYMIZE_ONLY_TABLES = [
    'audit_logs',
    'sod_violations',
  ];

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  /**
   * Create a data subject request
   */
  async createRequest(request: DataSubjectRequest): Promise<DataSubjectRequest> {
    const verificationToken = this.generateVerificationToken();
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const query = `
      INSERT INTO gdpr_data_requests (
        tenant_id, request_type, subject_type, subject_id, subject_email,
        subject_identifiers, requested_by, verification_token, verification_expires_at,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING')
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      request.tenantId,
      request.requestType,
      request.subjectType,
      request.subjectId,
      request.subjectEmail || null,
      request.subjectIdentifiers ? JSON.stringify(request.subjectIdentifiers) : null,
      request.requestedBy || null,
      verificationToken,
      verificationExpiresAt,
    ]);

    return this.mapRequest(result.rows[0]);
  }

  /**
   * Verify data subject request
   */
  async verifyRequest(requestId: string, token: string): Promise<boolean> {
    const query = `
      UPDATE gdpr_data_requests
      SET verified_at = NOW()
      WHERE id = $1
        AND verification_token = $2
        AND verification_expires_at > NOW()
        AND verified_at IS NULL
    `;

    const result = await this.pool.query(query, [requestId, token]);
    return (result.rowCount || 0) > 0;
  }

  /**
   * Execute Right to be Forgotten request
   * Deletes or anonymizes all personal data for a subject
   */
  async executeForgetRequest(requestId: string, executedBy: string): Promise<void> {
    const request = await this.getRequest(requestId);

    if (!request) {
      throw new Error('Request not found');
    }

    if (request.status !== 'PENDING' || !request.verifiedAt) {
      throw new Error('Request must be verified and pending');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Update request status
      await client.query(
        `UPDATE gdpr_data_requests SET status = 'IN_PROGRESS', completed_by = $1 WHERE id = $2`,
        [executedBy, requestId]
      );

      const affectedTables: string[] = [];
      let totalAffected = 0;

      // Process each table
      for (const tableName of this.USER_DATA_TABLES) {
        const affected = await this.processTableForDeletion(
          client,
          tableName,
          request.subjectId,
          this.ANONYMIZE_ONLY_TABLES.includes(tableName)
        );

        if (affected > 0) {
          affectedTables.push(tableName);
          totalAffected += affected;
        }
      }

      // Mark request as completed
      await client.query(
        `UPDATE gdpr_data_requests
         SET status = 'COMPLETED',
             completed_at = NOW(),
             affected_tables = $1,
             affected_records = $2
         WHERE id = $3`,
        [affectedTables, totalAffected, requestId]
      );

      await client.query('COMMIT');
    } catch (error: any) {
      await client.query('ROLLBACK');

      // Mark request as failed
      await client.query(
        `UPDATE gdpr_data_requests SET status = 'FAILED', error_message = $1 WHERE id = $2`,
        [error.message, requestId]
      );

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute Data Access request (GDPR Article 15)
   * Exports all personal data for a subject
   */
  async executeAccessRequest(requestId: string, executedBy: string): Promise<DataExportResult> {
    const request = await this.getRequest(requestId);

    if (!request) {
      throw new Error('Request not found');
    }

    if (request.status !== 'PENDING' || !request.verifiedAt) {
      throw new Error('Request must be verified and pending');
    }

    try {
      // Update request status
      await this.pool.query(
        `UPDATE gdpr_data_requests SET status = 'IN_PROGRESS', completed_by = $1 WHERE id = $2`,
        [executedBy, requestId]
      );

      const exportData: { [tableName: string]: any[] } = {};
      let totalRecords = 0;

      // Export data from each table
      for (const tableName of this.USER_DATA_TABLES) {
        const data = await this.exportTableData(tableName, request.subjectId);

        if (data.length > 0) {
          exportData[tableName] = data;
          totalRecords += data.length;
        }
      }

      // Mark request as completed
      await this.pool.query(
        `UPDATE gdpr_data_requests
         SET status = 'COMPLETED',
             completed_at = NOW(),
             affected_tables = $1,
             affected_records = $2
         WHERE id = $3`,
        [Object.keys(exportData), totalRecords, requestId]
      );

      return {
        subjectId: request.subjectId,
        exportedAt: new Date(),
        data: exportData,
        summary: {
          totalTables: Object.keys(exportData).length,
          totalRecords,
        },
      };
    } catch (error: any) {
      // Mark request as failed
      await this.pool.query(
        `UPDATE gdpr_data_requests SET status = 'FAILED', error_message = $1 WHERE id = $2`,
        [error.message, requestId]
      );

      throw error;
    }
  }

  /**
   * Get data subject request
   */
  async getRequest(requestId: string): Promise<DataSubjectRequest | null> {
    const query = `SELECT * FROM gdpr_data_requests WHERE id = $1`;
    const result = await this.pool.query(query, [requestId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRequest(result.rows[0]);
  }

  /**
   * List data subject requests for a tenant
   */
  async listRequests(
    tenantId: string,
    filters?: {
      status?: string;
      requestType?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<{ requests: DataSubjectRequest[]; total: number }> {
    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (filters?.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters?.requestType) {
      conditions.push(`request_type = $${paramIndex++}`);
      params.push(filters.requestType);
    }

    const whereClause = conditions.join(' AND ');

    // Count total
    const countQuery = `SELECT COUNT(*) FROM gdpr_data_requests WHERE ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get requests
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const offset = (page - 1) * pageSize;

    const query = `
      SELECT * FROM gdpr_data_requests
      WHERE ${whereClause}
      ORDER BY requested_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await this.pool.query(query, [...params, pageSize, offset]);

    return {
      requests: result.rows.map(this.mapRequest),
      total,
    };
  }

  /**
   * Process table for deletion or anonymization
   */
  private async processTableForDeletion(
    client: any,
    tableName: string,
    subjectId: string,
    anonymizeOnly: boolean
  ): Promise<number> {
    if (anonymizeOnly) {
      // Anonymize instead of delete (for audit trails)
      const query = `
        UPDATE ${tableName}
        SET user_id = 'ANONYMIZED',
            user_name = 'ANONYMIZED',
            user_email = 'anonymized@gdpr.deleted'
        WHERE user_id = $1
      `;

      const result = await client.query(query, [subjectId]);
      return result.rowCount || 0;
    } else {
      // Delete records
      const query = `DELETE FROM ${tableName} WHERE user_id = $1`;
      const result = await client.query(query, [subjectId]);
      return result.rowCount || 0;
    }
  }

  /**
   * Export data from a table
   */
  private async exportTableData(tableName: string, subjectId: string): Promise<any[]> {
    const query = `SELECT * FROM ${tableName} WHERE user_id = $1`;
    const result = await this.pool.query(query, [subjectId]);
    return result.rows;
  }

  /**
   * Generate verification token
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Map database row to request object
   */
  private mapRequest(row: any): DataSubjectRequest {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      requestType: row.request_type,
      subjectType: row.subject_type,
      subjectId: row.subject_id,
      subjectEmail: row.subject_email,
      subjectIdentifiers: row.subject_identifiers,
      status: row.status,
      requestedBy: row.requested_by,
      requestedAt: row.requested_at,
      completedAt: row.completed_at,
      completedBy: row.completed_by,
      affectedTables: row.affected_tables,
      affectedRecords: row.affected_records,
      verificationToken: row.verification_token,
      verificationExpiresAt: row.verification_expires_at,
      verifiedAt: row.verified_at,
      notes: row.notes,
      errorMessage: row.error_message,
      metadata: row.metadata,
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
