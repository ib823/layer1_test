/**
 * LHDN Invoice Repository
 *
 * Database persistence layer for LHDN e-invoices
 */

import { Pool, PoolClient } from 'pg';
import {
  LHDNInvoice,
  InvoiceStatus,
  ValidationResult,
  LHDNTenantConfig,
  ComplianceReport,
  LHDNDocumentType,
} from '../types';

export interface LHDNInvoiceRecord {
  id: string;
  tenant_id: string;
  invoice_number: string;
  document_type: string;
  status: InvoiceStatus;
  invoice_date: Date;
  due_date: Date | null;
  currency: string;
  supplier: any;
  buyer: any;
  line_items: any;
  subtotal_amount: string;
  total_tax_amount: string;
  total_discount_amount: string;
  total_amount: string;
  payment_mode: string | null;
  payment_terms: string | null;
  sap_billing_document: string;
  sap_company_code: string;
  purchase_order_ref: string | null;
  submission_uid: string | null;
  lhdn_reference_number: string | null;
  qr_code_data: string | null;
  submitted_at: Date | null;
  accepted_at: Date | null;
  rejected_at: Date | null;
  rejection_reasons: any;
  validated_at: Date | null;
  validation_errors: any;
  validation_warnings: any;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export class LHDNInvoiceRepository {
  private pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
    });
  }

  /**
   * Create a new LHDN invoice
   */
  async createInvoice(invoice: LHDNInvoice): Promise<LHDNInvoice> {
    const result = await this.pool.query<LHDNInvoiceRecord>(
      `INSERT INTO lhdn_einvoices (
        id, tenant_id, invoice_number, document_type, status,
        invoice_date, due_date, currency,
        supplier, buyer, line_items,
        subtotal_amount, total_tax_amount, total_discount_amount, total_amount,
        payment_mode, payment_terms,
        sap_billing_document, sap_company_code, purchase_order_ref,
        created_by
      ) VALUES (
        $1, (SELECT id FROM tenants WHERE tenant_id = $2),
        $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *`,
      [
        invoice.id,
        invoice.tenantId,
        invoice.invoiceNumber,
        invoice.documentType,
        invoice.status,
        invoice.invoiceDate,
        invoice.dueDate || null,
        invoice.currency,
        JSON.stringify(invoice.supplier),
        JSON.stringify(invoice.buyer),
        JSON.stringify(invoice.lineItems),
        invoice.subtotalAmount,
        invoice.totalTaxAmount,
        invoice.totalDiscountAmount || 0,
        invoice.totalAmount,
        invoice.paymentMode || null,
        invoice.paymentTerms || null,
        invoice.sapBillingDocument,
        invoice.sapCompanyCode,
        invoice.purchaseOrderRef || null,
        invoice.createdBy,
      ]
    );

    return this.mapRecordToInvoice(result.rows[0]);
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(invoiceId: string): Promise<LHDNInvoice | null> {
    const result = await this.pool.query<LHDNInvoiceRecord>(
      `SELECT e.*, t.tenant_id
       FROM lhdn_einvoices e
       JOIN tenants t ON e.tenant_id = t.id
       WHERE e.id = $1`,
      [invoiceId]
    );

    return result.rows[0] ? this.mapRecordToInvoice(result.rows[0]) : null;
  }

  /**
   * Get invoice by invoice number and tenant
   */
  async getInvoiceByNumber(
    tenantId: string,
    invoiceNumber: string
  ): Promise<LHDNInvoice | null> {
    const result = await this.pool.query<LHDNInvoiceRecord>(
      `SELECT e.*, t.tenant_id
       FROM lhdn_einvoices e
       JOIN tenants t ON e.tenant_id = t.id
       WHERE t.tenant_id = $1 AND e.invoice_number = $2`,
      [tenantId, invoiceNumber]
    );

    return result.rows[0] ? this.mapRecordToInvoice(result.rows[0]) : null;
  }

  /**
   * Get invoice by SAP billing document
   */
  async getInvoiceBySAPDocument(
    tenantId: string,
    sapBillingDocument: string
  ): Promise<LHDNInvoice | null> {
    const result = await this.pool.query<LHDNInvoiceRecord>(
      `SELECT e.*, t.tenant_id
       FROM lhdn_einvoices e
       JOIN tenants t ON e.tenant_id = t.id
       WHERE t.tenant_id = $1 AND e.sap_billing_document = $2`,
      [tenantId, sapBillingDocument]
    );

    return result.rows[0] ? this.mapRecordToInvoice(result.rows[0]) : null;
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(
    invoiceId: string,
    status: InvoiceStatus,
    statusData?: {
      submissionUid?: string;
      lhdnReferenceNumber?: string;
      qrCodeData?: string;
      submittedAt?: Date;
      acceptedAt?: Date;
      rejectedAt?: Date;
      rejectionReasons?: string[];
    }
  ): Promise<void> {
    const updates: string[] = ['status = $2'];
    const params: any[] = [invoiceId, status];
    let paramIndex = 3;

    if (statusData?.submissionUid) {
      updates.push(`submission_uid = $${paramIndex++}`);
      params.push(statusData.submissionUid);
    }
    if (statusData?.lhdnReferenceNumber) {
      updates.push(`lhdn_reference_number = $${paramIndex++}`);
      params.push(statusData.lhdnReferenceNumber);
    }
    if (statusData?.qrCodeData) {
      updates.push(`qr_code_data = $${paramIndex++}`);
      params.push(statusData.qrCodeData);
    }
    if (statusData?.submittedAt) {
      updates.push(`submitted_at = $${paramIndex++}`);
      params.push(statusData.submittedAt);
    }
    if (statusData?.acceptedAt) {
      updates.push(`accepted_at = $${paramIndex++}`);
      params.push(statusData.acceptedAt);
    }
    if (statusData?.rejectedAt) {
      updates.push(`rejected_at = $${paramIndex++}`);
      params.push(statusData.rejectedAt);
    }
    if (statusData?.rejectionReasons) {
      updates.push(`rejection_reasons = $${paramIndex++}`);
      params.push(JSON.stringify(statusData.rejectionReasons));
    }

    await this.pool.query(
      `UPDATE lhdn_einvoices
       SET ${updates.join(', ')}
       WHERE id = $1`,
      params
    );
  }

  /**
   * Update validation result
   */
  async updateValidationResult(
    invoiceId: string,
    validationResult: ValidationResult
  ): Promise<void> {
    await this.pool.query(
      `UPDATE lhdn_einvoices
       SET validated_at = $2,
           validation_errors = $3,
           validation_warnings = $4,
           status = CASE
             WHEN $5 = true THEN 'VALIDATED'
             ELSE status
           END
       WHERE id = $1`,
      [
        invoiceId,
        validationResult.validatedAt,
        JSON.stringify(validationResult.errors),
        JSON.stringify(validationResult.warnings),
        validationResult.isValid,
      ]
    );
  }

  /**
   * Get all invoices for a tenant
   */
  async getInvoicesByTenant(
    tenantId: string,
    options?: {
      status?: InvoiceStatus;
      documentType?: LHDNDocumentType;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<LHDNInvoice[]> {
    let query = `
      SELECT e.*, t.tenant_id
      FROM lhdn_einvoices e
      JOIN tenants t ON e.tenant_id = t.id
      WHERE t.tenant_id = $1
    `;
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (options?.status) {
      query += ` AND e.status = $${paramIndex++}`;
      params.push(options.status);
    }
    if (options?.documentType) {
      query += ` AND e.document_type = $${paramIndex++}`;
      params.push(options.documentType);
    }
    if (options?.fromDate) {
      query += ` AND e.invoice_date >= $${paramIndex++}`;
      params.push(options.fromDate);
    }
    if (options?.toDate) {
      query += ` AND e.invoice_date <= $${paramIndex++}`;
      params.push(options.toDate);
    }

    query += ' ORDER BY e.invoice_date DESC';

    if (options?.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(options.limit);
    }
    if (options?.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(options.offset);
    }

    const result = await this.pool.query<LHDNInvoiceRecord>(query, params);
    return result.rows.map((row) => this.mapRecordToInvoice(row));
  }

  /**
   * Get compliance report for a date range
   */
  async getComplianceReport(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    const statsResult = await this.pool.query(
      `SELECT
         COUNT(*) as total_invoices,
         COUNT(*) FILTER (WHERE status = 'SUBMITTED') as submitted,
         COUNT(*) FILTER (WHERE status = 'ACCEPTED') as accepted,
         COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected,
         COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled,
         COUNT(*) FILTER (WHERE status IN ('DRAFT', 'VALIDATED')) as pending,
         SUM(total_amount::numeric) as total_revenue,
         SUM(total_tax_amount::numeric) as total_tax
       FROM lhdn_einvoices e
       JOIN tenants t ON e.tenant_id = t.id
       WHERE t.tenant_id = $1
         AND e.invoice_date >= $2
         AND e.invoice_date <= $3`,
      [tenantId, startDate, endDate]
    );

    const byTypeResult = await this.pool.query(
      `SELECT document_type, COUNT(*) as count
       FROM lhdn_einvoices e
       JOIN tenants t ON e.tenant_id = t.id
       WHERE t.tenant_id = $1
         AND e.invoice_date >= $2
         AND e.invoice_date <= $3
       GROUP BY document_type`,
      [tenantId, startDate, endDate]
    );

    const byStatusResult = await this.pool.query(
      `SELECT status, COUNT(*) as count
       FROM lhdn_einvoices e
       JOIN tenants t ON e.tenant_id = t.id
       WHERE t.tenant_id = $1
         AND e.invoice_date >= $2
         AND e.invoice_date <= $3
       GROUP BY status`,
      [tenantId, startDate, endDate]
    );

    const rejectionReasonsResult = await this.pool.query(
      `SELECT jsonb_array_elements_text(rejection_reasons) as reason, COUNT(*) as count
       FROM lhdn_einvoices e
       JOIN tenants t ON e.tenant_id = t.id
       WHERE t.tenant_id = $1
         AND e.invoice_date >= $2
         AND e.invoice_date <= $3
         AND rejection_reasons IS NOT NULL
       GROUP BY reason
       ORDER BY count DESC
       LIMIT 10`,
      [tenantId, startDate, endDate]
    );

    const stats = statsResult.rows[0];

    return {
      tenantId,
      reportPeriod: { startDate, endDate },
      statistics: {
        totalInvoices: parseInt(stats.total_invoices) || 0,
        submitted: parseInt(stats.submitted) || 0,
        accepted: parseInt(stats.accepted) || 0,
        rejected: parseInt(stats.rejected) || 0,
        cancelled: parseInt(stats.cancelled) || 0,
        pending: parseInt(stats.pending) || 0,
      },
      byDocumentType: byTypeResult.rows.reduce((acc, row) => {
        acc[row.document_type as LHDNDocumentType] = parseInt(row.count);
        return acc;
      }, {} as Record<LHDNDocumentType, number>),
      byStatus: byStatusResult.rows.reduce((acc, row) => {
        acc[row.status as InvoiceStatus] = parseInt(row.count);
        return acc;
      }, {} as Record<InvoiceStatus, number>),
      totalRevenue: parseFloat(stats.total_revenue) || 0,
      totalTax: parseFloat(stats.total_tax) || 0,
      rejectionReasons: rejectionReasonsResult.rows.map((row) => ({
        reason: row.reason,
        count: parseInt(row.count),
      })),
      generatedAt: new Date(),
    };
  }

  /**
   * Log audit event
   */
  async logAuditEvent(data: {
    tenantId: string;
    invoiceId?: string;
    action: string;
    actor: string;
    requestData?: any;
    responseData?: any;
    success: boolean;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO lhdn_audit_log (
        tenant_id, invoice_id, action, actor,
        request_data, response_data, success, error_message,
        ip_address, user_agent, request_id
      ) VALUES (
        (SELECT id FROM tenants WHERE tenant_id = $1),
        $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )`,
      [
        data.tenantId,
        data.invoiceId || null,
        data.action,
        data.actor,
        data.requestData ? JSON.stringify(data.requestData) : null,
        data.responseData ? JSON.stringify(data.responseData) : null,
        data.success,
        data.errorMessage || null,
        data.ipAddress || null,
        data.userAgent || null,
        data.requestId || null,
      ]
    );
  }

  /**
   * Get tenant configuration
   */
  async getTenantConfig(tenantId: string): Promise<LHDNTenantConfig | null> {
    const result = await this.pool.query(
      `SELECT c.*, t.tenant_id
       FROM lhdn_tenant_config c
       JOIN tenants t ON c.tenant_id = t.id
       WHERE t.tenant_id = $1 AND c.is_active = true`,
      [tenantId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      tenantId: row.tenant_id,
      clientId: row.client_id_encrypted,
      clientSecret: row.client_secret_encrypted,
      apiBaseUrl: row.api_base_url,
      environment: row.environment,
      companyTin: row.company_tin,
      companyName: row.company_name,
      companyAddress: row.company_address,
      companyContact: row.company_contact,
      invoicePrefix: row.invoice_prefix,
      autoSubmit: row.auto_submit,
      validateBeforePost: row.validate_before_post,
      generateQrCode: row.generate_qr_code,
      notificationEmails: row.notification_emails || [],
      webhookUrl: row.webhook_url,
      taxCodeMapping: row.tax_code_mapping,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Map database record to LHDNInvoice
   */
  private mapRecordToInvoice(record: LHDNInvoiceRecord): LHDNInvoice {
    return {
      id: record.id,
      tenantId: record.tenant_id,
      invoiceNumber: record.invoice_number,
      documentType: record.document_type as LHDNDocumentType,
      status: record.status,
      invoiceDate: new Date(record.invoice_date),
      dueDate: record.due_date ? new Date(record.due_date) : undefined,
      currency: record.currency,
      supplier: record.supplier,
      buyer: record.buyer,
      lineItems: record.line_items,
      subtotalAmount: parseFloat(record.subtotal_amount),
      totalTaxAmount: parseFloat(record.total_tax_amount),
      totalDiscountAmount: parseFloat(record.total_discount_amount),
      totalAmount: parseFloat(record.total_amount),
      paymentMode: record.payment_mode || undefined,
      paymentTerms: record.payment_terms || undefined,
      sapBillingDocument: record.sap_billing_document,
      sapCompanyCode: record.sap_company_code,
      purchaseOrderRef: record.purchase_order_ref || undefined,
      submissionUid: record.submission_uid || undefined,
      lhdnReferenceNumber: record.lhdn_reference_number || undefined,
      qrCodeData: record.qr_code_data || undefined,
      submittedAt: record.submitted_at ? new Date(record.submitted_at) : undefined,
      acceptedAt: record.accepted_at ? new Date(record.accepted_at) : undefined,
      rejectedAt: record.rejected_at ? new Date(record.rejected_at) : undefined,
      rejectionReasons: record.rejection_reasons || undefined,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      createdBy: record.created_by,
      validatedAt: record.validated_at ? new Date(record.validated_at) : undefined,
    };
  }
}
