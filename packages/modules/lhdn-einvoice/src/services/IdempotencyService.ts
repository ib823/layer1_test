/**
 * IdempotencyService
 *
 * Ensures exactly-once semantics for invoice submissions
 * Prevents duplicate submissions using canonical payload hashing
 *
 * Phase: 5 (Idempotency & Resilience Foundation)
 */

import crypto from 'crypto';
import { Pool } from 'pg';
import { logger } from '../utils/logger';

/**
 * Canonical invoice submission payload
 * Fields are ordered deterministically for consistent hashing
 */
export interface CanonicalSubmissionPayload {
  // Tenant & SAP References (always first)
  tenantId: string;
  sapBillingDocument: string;
  sapCompanyCode: string;

  // Document Metadata
  documentType: string;
  invoiceNumber: string;
  invoiceDate: string; // ISO 8601

  // Parties (deterministic order)
  supplier: {
    tin: string;
    name: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  buyer: {
    tin: string;
    name: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };

  // Line Items (sorted by lineNumber)
  lineItems: Array<{
    lineNumber: number;
    description: string;
    quantity: number;
    unitPrice: number;
    taxType: string;
    taxRate: number;
    taxAmount: number;
    subtotal: number;
    total: number;
  }>;

  // Amounts (precision to 2 decimals)
  subtotalAmount: number;
  totalTaxAmount: number;
  totalDiscountAmount?: number;
  totalAmount: number;

  // Currency
  currency: string;
}

export interface IdempotencyCheckResult {
  isDuplicate: boolean;
  idempotencyKey: string;
  existingInvoiceId?: string;
  existingResponse?: any;
  status?: 'PROCESSING' | 'SUCCESS' | 'FAILED';
}

export interface IdempotencyStoreOptions {
  idempotencyKey: string;
  tenantId: string;
  sapBillingDocument: string;
  sapCompanyCode: string;
  canonicalPayload: CanonicalSubmissionPayload;
  invoiceId?: string;
  responseData?: any;
  status: 'PROCESSING' | 'SUCCESS' | 'FAILED';
  ttlDays?: number; // Default: 7 days
}

export class IdempotencyService {
  private pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  /**
   * Generate canonical payload from raw invoice data
   * Ensures deterministic field ordering and formatting
   */
  buildCanonicalPayload(invoiceData: any): CanonicalSubmissionPayload {
    // Sort line items by lineNumber for determinism
    const sortedLineItems = [...(invoiceData.lineItems || [])].sort(
      (a, b) => a.lineNumber - b.lineNumber
    );

    // Round amounts to 2 decimal places for consistency
    const roundAmount = (amount: number): number => Math.round(amount * 100) / 100;

    const canonical: CanonicalSubmissionPayload = {
      // Tenant & SAP (always first)
      tenantId: invoiceData.tenantId,
      sapBillingDocument: invoiceData.sapBillingDocument,
      sapCompanyCode: invoiceData.sapCompanyCode,

      // Document
      documentType: invoiceData.documentType,
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceDate: new Date(invoiceData.invoiceDate).toISOString(),

      // Supplier
      supplier: {
        tin: invoiceData.supplier.tin,
        name: invoiceData.supplier.name,
        address: {
          line1: invoiceData.supplier.address.line1,
          line2: invoiceData.supplier.address.line2 || undefined,
          city: invoiceData.supplier.address.city,
          state: invoiceData.supplier.address.state,
          postalCode: invoiceData.supplier.address.postalCode,
          country: invoiceData.supplier.address.country,
        },
      },

      // Buyer
      buyer: {
        tin: invoiceData.buyer.tin,
        name: invoiceData.buyer.name,
        address: {
          line1: invoiceData.buyer.address.line1,
          line2: invoiceData.buyer.address.line2 || undefined,
          city: invoiceData.buyer.address.city,
          state: invoiceData.buyer.address.state,
          postalCode: invoiceData.buyer.address.postalCode,
          country: invoiceData.buyer.address.country,
        },
      },

      // Line Items (sorted and rounded)
      lineItems: sortedLineItems.map((item) => ({
        lineNumber: item.lineNumber,
        description: item.description,
        quantity: roundAmount(item.quantity),
        unitPrice: roundAmount(item.unitPrice),
        taxType: item.taxType,
        taxRate: roundAmount(item.taxRate),
        taxAmount: roundAmount(item.taxAmount),
        subtotal: roundAmount(item.subtotal),
        total: roundAmount(item.total),
      })),

      // Amounts
      subtotalAmount: roundAmount(invoiceData.subtotalAmount),
      totalTaxAmount: roundAmount(invoiceData.totalTaxAmount),
      totalDiscountAmount: invoiceData.totalDiscountAmount
        ? roundAmount(invoiceData.totalDiscountAmount)
        : undefined,
      totalAmount: roundAmount(invoiceData.totalAmount),

      // Currency
      currency: invoiceData.currency,
    };

    return canonical;
  }

  /**
   * Compute SHA-256 hash of canonical payload
   * Returns hex-encoded 64-character string
   */
  computeHash(canonicalPayload: CanonicalSubmissionPayload): string {
    // Stringify with deterministic key ordering (sorted)
    const jsonString = JSON.stringify(canonicalPayload, Object.keys(canonicalPayload).sort());

    // Compute SHA-256 hash
    const hash = crypto.createHash('sha256').update(jsonString, 'utf8').digest('hex');

    logger.debug('Computed idempotency hash', {
      sapBillingDocument: canonicalPayload.sapBillingDocument,
      hash,
      payloadSize: jsonString.length,
    });

    return hash;
  }

  /**
   * Check if idempotency key already exists
   * Returns details of existing submission if duplicate
   */
  async checkIdempotency(
    tenantId: string,
    idempotencyKey: string
  ): Promise<IdempotencyCheckResult> {
    try {
      const result = await this.pool.query(
        `
        SELECT
          idempotency_key,
          invoice_id,
          status,
          response_data,
          created_at
        FROM lhdn_idempotency_keys
        WHERE tenant_id = $1
          AND idempotency_key = $2
          AND expires_at > NOW()
        `,
        [tenantId, idempotencyKey]
      );

      if (result.rows.length === 0) {
        logger.debug('No existing idempotency key found', { tenantId, idempotencyKey });
        return {
          isDuplicate: false,
          idempotencyKey,
        };
      }

      const existing = result.rows[0];

      logger.info('Duplicate submission detected', {
        tenantId,
        idempotencyKey,
        existingInvoiceId: existing.invoice_id,
        status: existing.status,
        createdAt: existing.created_at,
      });

      return {
        isDuplicate: true,
        idempotencyKey,
        existingInvoiceId: existing.invoice_id,
        existingResponse: existing.response_data,
        status: existing.status,
      };
    } catch (error: any) {
      logger.error('Idempotency check failed', {
        error: error.message,
        tenantId,
        idempotencyKey,
      });
      throw error;
    }
  }

  /**
   * Store idempotency key with result
   * Used for both initial storage (PROCESSING) and updates (SUCCESS/FAILED)
   */
  async storeIdempotencyKey(options: IdempotencyStoreOptions): Promise<void> {
    const {
      idempotencyKey,
      tenantId,
      sapBillingDocument,
      sapCompanyCode,
      canonicalPayload,
      invoiceId,
      responseData,
      status,
      ttlDays = 7,
    } = options;

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + ttlDays);

      await this.pool.query(
        `
        INSERT INTO lhdn_idempotency_keys (
          tenant_id,
          idempotency_key,
          sap_billing_document,
          sap_company_code,
          canonical_payload,
          invoice_id,
          response_data,
          status,
          expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (tenant_id, idempotency_key)
        DO UPDATE SET
          invoice_id = EXCLUDED.invoice_id,
          response_data = EXCLUDED.response_data,
          status = EXCLUDED.status,
          updated_at = NOW()
        `,
        [
          tenantId,
          idempotencyKey,
          sapBillingDocument,
          sapCompanyCode,
          canonicalPayload,
          invoiceId || null,
          responseData || null,
          status,
          expiresAt,
        ]
      );

      logger.info('Idempotency key stored', {
        tenantId,
        idempotencyKey,
        status,
        invoiceId,
        expiresAt,
      });
    } catch (error: any) {
      logger.error('Failed to store idempotency key', {
        error: error.message,
        tenantId,
        idempotencyKey,
      });
      throw error;
    }
  }

  /**
   * Update existing idempotency key with result
   */
  async updateIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
    updates: {
      invoiceId?: string;
      responseData?: any;
      status: 'SUCCESS' | 'FAILED';
    }
  ): Promise<void> {
    try {
      await this.pool.query(
        `
        UPDATE lhdn_idempotency_keys
        SET
          invoice_id = COALESCE($3, invoice_id),
          response_data = COALESCE($4, response_data),
          status = $5,
          updated_at = NOW()
        WHERE tenant_id = $1
          AND idempotency_key = $2
        `,
        [
          tenantId,
          idempotencyKey,
          updates.invoiceId || null,
          updates.responseData || null,
          updates.status,
        ]
      );

      logger.info('Idempotency key updated', {
        tenantId,
        idempotencyKey,
        status: updates.status,
      });
    } catch (error: any) {
      logger.error('Failed to update idempotency key', {
        error: error.message,
        tenantId,
        idempotencyKey,
      });
      throw error;
    }
  }

  /**
   * Cleanup expired idempotency keys (TTL maintenance)
   * Should be called by cron job daily
   */
  async cleanupExpiredKeys(): Promise<number> {
    try {
      const result = await this.pool.query('SELECT cleanup_expired_idempotency_keys()');
      const deletedCount = result.rows[0].cleanup_expired_idempotency_keys;

      logger.info('Cleaned up expired idempotency keys', { deletedCount });
      return deletedCount;
    } catch (error: any) {
      logger.error('Failed to cleanup expired keys', { error: error.message });
      throw error;
    }
  }

  /**
   * Get idempotency statistics for monitoring
   */
  async getStats(tenantId?: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    oldestKey: Date | null;
    newestKey: Date | null;
  }> {
    try {
      const whereClause = tenantId ? 'WHERE tenant_id = $1' : '';
      const params = tenantId ? [tenantId] : [];

      const result = await this.pool.query(
        `
        SELECT
          COUNT(*) as total,
          MIN(created_at) as oldest,
          MAX(created_at) as newest,
          jsonb_object_agg(status, cnt) as by_status
        FROM (
          SELECT
            status,
            COUNT(*) as cnt,
            MIN(created_at) as created_at
          FROM lhdn_idempotency_keys
          ${whereClause}
          GROUP BY status
        ) sub
        `,
        params
      );

      const row = result.rows[0];

      return {
        total: parseInt(row.total || '0', 10),
        byStatus: row.by_status || {},
        oldestKey: row.oldest ? new Date(row.oldest) : null,
        newestKey: row.newest ? new Date(row.newest) : null,
      };
    } catch (error: any) {
      logger.error('Failed to get idempotency stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
