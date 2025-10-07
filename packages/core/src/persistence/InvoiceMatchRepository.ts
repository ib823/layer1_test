/**
 * Invoice Match Repository
 * Handles database persistence for invoice matching results
 */

import { Pool, PoolClient } from 'pg';

// Type definitions (would normally import from @sap-framework/invoice-matching)
interface ThreeWayMatchResult {
  matchId: string;
  poNumber: string;
  poItem: string;
  grNumber: string | null;
  grItem: string | null;
  invoiceNumber: string;
  invoiceItem: string;
  matchStatus: string;
  matchType: string;
  discrepancies: any[];
  toleranceViolations: any[];
  fraudAlerts: any[];
  matchedAt: Date;
  matchedBy?: string;
  approvalRequired: boolean;
  riskScore: number;
}

interface MatchingAnalysisRun {
  runId: string;
  status: string;
  config: any;
  statistics?: {
    totalInvoices: number;
    fullyMatched: number;
    partiallyMatched: number;
    notMatched: number;
    toleranceExceeded: number;
    fraudAlerts: number;
    totalDiscrepanciesFound: number;
    totalAmountProcessed: number;
    totalAmountBlocked: number;
  };
  startedAt?: Date;
  completedAt?: Date;
}

interface VendorPaymentPattern {
  vendorId: string;
  vendorName: string;
  totalInvoices: number;
  totalAmount: number;
  averageInvoiceAmount: number;
  averagePaymentDays: number;
  duplicateCount: number;
  fraudAlertCount: number;
  riskScore: number;
  lastInvoiceDate: Date;
}

export interface InvoiceMatchRecord extends ThreeWayMatchResult {
  tenantId: string;
  runId: string;
  vendorId?: string;
  vendorName?: string;
  invoiceAmount?: number;
  poAmount?: number;
}

export class InvoiceMatchRepository {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  /**
   * Create a new analysis run
   */
  async createAnalysisRun(
    tenantId: string,
    run: Partial<MatchingAnalysisRun>
  ): Promise<{ id: string; runId: string }> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO invoice_matching_runs (
          tenant_id, run_id, status, config,
          total_invoices, fully_matched, partially_matched,
          not_matched, tolerance_exceeded, fraud_alerts_count,
          total_discrepancies, total_amount_processed, total_amount_blocked,
          started_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id, run_id`,
        [
          tenantId,
          run.runId,
          run.status,
          JSON.stringify(run.config),
          run.statistics?.totalInvoices || 0,
          run.statistics?.fullyMatched || 0,
          run.statistics?.partiallyMatched || 0,
          run.statistics?.notMatched || 0,
          run.statistics?.toleranceExceeded || 0,
          run.statistics?.fraudAlerts || 0,
          run.statistics?.totalDiscrepanciesFound || 0,
          run.statistics?.totalAmountProcessed || 0,
          run.statistics?.totalAmountBlocked || 0,
          run.startedAt || new Date(),
          run.completedAt,
        ]
      );

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Update analysis run with final statistics
   */
  async updateAnalysisRun(
    runId: string,
    updates: {
      status?: string;
      completedAt?: Date;
      error?: string;
      statistics?: MatchingAnalysisRun['statistics'];
    }
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.status) {
        setClauses.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }

      if (updates.completedAt) {
        setClauses.push(`completed_at = $${paramIndex++}`);
        values.push(updates.completedAt);
      }

      if (updates.error) {
        setClauses.push(`error_message = $${paramIndex++}`);
        values.push(updates.error);
      }

      if (updates.statistics) {
        const stats = updates.statistics;
        setClauses.push(
          `total_invoices = $${paramIndex++}`,
          `fully_matched = $${paramIndex++}`,
          `partially_matched = $${paramIndex++}`,
          `not_matched = $${paramIndex++}`,
          `tolerance_exceeded = $${paramIndex++}`,
          `fraud_alerts_count = $${paramIndex++}`,
          `total_discrepancies = $${paramIndex++}`,
          `total_amount_processed = $${paramIndex++}`,
          `total_amount_blocked = $${paramIndex++}`
        );
        values.push(
          stats.totalInvoices,
          stats.fullyMatched,
          stats.partiallyMatched,
          stats.notMatched,
          stats.toleranceExceeded,
          stats.fraudAlerts,
          stats.totalDiscrepanciesFound,
          stats.totalAmountProcessed,
          stats.totalAmountBlocked
        );
      }

      values.push(runId);

      await client.query(
        `UPDATE invoice_matching_runs
         SET ${setClauses.join(', ')}
         WHERE run_id = $${paramIndex}`,
        values
      );
    } finally {
      client.release();
    }
  }

  /**
   * Save match results in batch
   */
  async saveMatchResults(
    tenantId: string,
    runDbId: string,
    matches: InvoiceMatchRecord[]
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const match of matches) {
        // Insert match result
        const matchResult = await client.query(
          `INSERT INTO invoice_match_results (
            tenant_id, run_id, match_id,
            po_number, po_item, gr_number, gr_item,
            invoice_number, invoice_item, vendor_id, vendor_name,
            match_status, match_type, risk_score, approval_required,
            invoice_amount, po_amount,
            matched_at, matched_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          RETURNING id`,
          [
            tenantId,
            runDbId,
            match.matchId,
            match.poNumber,
            match.poItem,
            match.grNumber,
            match.grItem,
            match.invoiceNumber,
            match.invoiceItem,
            match.vendorId,
            match.vendorName,
            match.matchStatus,
            match.matchType,
            match.riskScore,
            match.approvalRequired,
            match.invoiceAmount,
            match.poAmount,
            match.matchedAt,
            match.matchedBy,
          ]
        );

        const matchDbId = matchResult.rows[0].id;

        // Insert discrepancies
        if (match.discrepancies.length > 0) {
          const discrepancyValues = match.discrepancies
            .map(
              (d, idx) =>
                `($${idx * 7 + 1}, $${idx * 7 + 2}, $${idx * 7 + 3}, $${idx * 7 + 4}, $${idx * 7 + 5}, $${idx * 7 + 6}, $${idx * 7 + 7})`
            )
            .join(', ');

          const discrepancyParams = match.discrepancies.flatMap(d => [
            matchDbId,
            d.type,
            d.severity,
            d.field,
            JSON.stringify(d.expectedValue),
            JSON.stringify(d.actualValue),
            d.variance,
            d.description,
          ]);

          // Remove extra params from flatMap
          const cleanParams = discrepancyParams.filter((_, idx) => idx % 8 !== 7);

          await client.query(
            `INSERT INTO invoice_match_discrepancies
             (match_id, discrepancy_type, severity, field, expected_value, actual_value, variance, description)
             VALUES ${discrepancyValues}`,
            cleanParams
          );
        }

        // Insert tolerance violations
        if (match.toleranceViolations.length > 0) {
          const violationValues = match.toleranceViolations
            .map(
              (_, idx) =>
                `($${idx * 7 + 1}, $${idx * 7 + 2}, $${idx * 7 + 3}, $${idx * 7 + 4}, $${idx * 7 + 5}, $${idx * 7 + 6}, $${idx * 7 + 7})`
            )
            .join(', ');

          const violationParams = match.toleranceViolations.flatMap(v => [
            matchDbId,
            v.ruleId,
            v.ruleName,
            v.field,
            v.threshold,
            v.actualVariance,
            v.exceededBy,
            v.requiresApproval,
          ]);

          // Remove extra params
          const cleanViolationParams = violationParams.filter((_, idx) => idx % 8 !== 7);

          await client.query(
            `INSERT INTO invoice_tolerance_violations
             (match_id, rule_id, rule_name, field, threshold, actual_variance, exceeded_by, requires_approval)
             VALUES ${violationValues}`,
            cleanViolationParams
          );
        }

        // Insert fraud alerts
        if (match.fraudAlerts.length > 0) {
          for (const alert of match.fraudAlerts) {
            await client.query(
              `INSERT INTO invoice_fraud_alerts (
                tenant_id, match_id, alert_id, pattern, severity,
                confidence, description, evidence, triggered_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                tenantId,
                matchDbId,
                alert.alertId,
                alert.pattern,
                alert.severity,
                alert.confidence,
                alert.description,
                JSON.stringify(alert.evidence),
                alert.triggeredAt,
              ]
            );
          }
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get match results for a run
   */
  async getMatchResults(
    runId: string,
    filters?: {
      matchStatus?: string[];
      minRiskScore?: number;
      maxRiskScore?: number;
      limit?: number;
      offset?: number;
    }
  ): Promise<any[]> {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT
          mr.*,
          COALESCE(
            json_agg(DISTINCT jsonb_build_object(
              'type', d.discrepancy_type,
              'severity', d.severity,
              'field', d.field,
              'expectedValue', d.expected_value,
              'actualValue', d.actual_value,
              'variance', d.variance,
              'description', d.description
            )) FILTER (WHERE d.id IS NOT NULL),
            '[]'
          ) as discrepancies,
          COALESCE(
            json_agg(DISTINCT jsonb_build_object(
              'ruleId', tv.rule_id,
              'ruleName', tv.rule_name,
              'field', tv.field,
              'threshold', tv.threshold,
              'actualVariance', tv.actual_variance,
              'exceededBy', tv.exceeded_by,
              'requiresApproval', tv.requires_approval
            )) FILTER (WHERE tv.id IS NOT NULL),
            '[]'
          ) as tolerance_violations,
          COALESCE(
            json_agg(DISTINCT jsonb_build_object(
              'alertId', fa.alert_id,
              'pattern', fa.pattern,
              'severity', fa.severity,
              'confidence', fa.confidence,
              'description', fa.description,
              'evidence', fa.evidence,
              'triggeredAt', fa.triggered_at
            )) FILTER (WHERE fa.id IS NOT NULL),
            '[]'
          ) as fraud_alerts
        FROM invoice_match_results mr
        LEFT JOIN invoice_match_discrepancies d ON d.match_id = mr.id
        LEFT JOIN invoice_tolerance_violations tv ON tv.match_id = mr.id
        LEFT JOIN invoice_fraud_alerts fa ON fa.match_id = mr.id
        JOIN invoice_matching_runs run ON run.id = mr.run_id
        WHERE run.run_id = $1
      `;

      const params: any[] = [runId];
      let paramIndex = 2;

      if (filters?.matchStatus && filters.matchStatus.length > 0) {
        query += ` AND mr.match_status = ANY($${paramIndex++})`;
        params.push(filters.matchStatus);
      }

      if (filters?.minRiskScore !== undefined) {
        query += ` AND mr.risk_score >= $${paramIndex++}`;
        params.push(filters.minRiskScore);
      }

      if (filters?.maxRiskScore !== undefined) {
        query += ` AND mr.risk_score <= $${paramIndex++}`;
        params.push(filters.maxRiskScore);
      }

      query += ` GROUP BY mr.id ORDER BY mr.risk_score DESC, mr.matched_at DESC`;

      if (filters?.limit) {
        query += ` LIMIT $${paramIndex++}`;
        params.push(filters.limit);
      }

      if (filters?.offset) {
        query += ` OFFSET $${paramIndex++}`;
        params.push(filters.offset);
      }

      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get fraud alerts
   */
  async getFraudAlerts(
    tenantId: string,
    filters?: {
      pattern?: string[];
      severity?: string[];
      status?: string[];
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<any[]> {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT fa.*, mr.invoice_number, mr.vendor_name
        FROM invoice_fraud_alerts fa
        LEFT JOIN invoice_match_results mr ON mr.id = fa.match_id
        WHERE fa.tenant_id = $1
      `;

      const params: any[] = [tenantId];
      let paramIndex = 2;

      if (filters?.pattern && filters.pattern.length > 0) {
        query += ` AND fa.pattern = ANY($${paramIndex++})`;
        params.push(filters.pattern);
      }

      if (filters?.severity && filters.severity.length > 0) {
        query += ` AND fa.severity = ANY($${paramIndex++})`;
        params.push(filters.severity);
      }

      if (filters?.status && filters.status.length > 0) {
        query += ` AND fa.status = ANY($${paramIndex++})`;
        params.push(filters.status);
      }

      if (filters?.fromDate) {
        query += ` AND fa.triggered_at >= $${paramIndex++}`;
        params.push(filters.fromDate);
      }

      if (filters?.toDate) {
        query += ` AND fa.triggered_at <= $${paramIndex++}`;
        params.push(filters.toDate);
      }

      query += ` ORDER BY fa.triggered_at DESC`;

      if (filters?.limit) {
        query += ` LIMIT $${paramIndex++}`;
        params.push(filters.limit);
      }

      if (filters?.offset) {
        query += ` OFFSET $${paramIndex++}`;
        params.push(filters.offset);
      }

      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Save or update vendor payment pattern
   */
  async saveVendorPattern(
    tenantId: string,
    pattern: VendorPaymentPattern
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO vendor_payment_patterns (
          tenant_id, vendor_id, vendor_name,
          total_invoices, total_amount, average_invoice_amount,
          average_payment_days, duplicate_count, fraud_alert_count,
          risk_score, first_invoice_date, last_invoice_date,
          last_analyzed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT (tenant_id, vendor_id)
        DO UPDATE SET
          vendor_name = EXCLUDED.vendor_name,
          total_invoices = EXCLUDED.total_invoices,
          total_amount = EXCLUDED.total_amount,
          average_invoice_amount = EXCLUDED.average_invoice_amount,
          average_payment_days = EXCLUDED.average_payment_days,
          duplicate_count = EXCLUDED.duplicate_count,
          fraud_alert_count = EXCLUDED.fraud_alert_count,
          risk_score = EXCLUDED.risk_score,
          last_invoice_date = EXCLUDED.last_invoice_date,
          last_analyzed_at = NOW()`,
        [
          tenantId,
          pattern.vendorId,
          pattern.vendorName,
          pattern.totalInvoices,
          pattern.totalAmount,
          pattern.averageInvoiceAmount,
          pattern.averagePaymentDays,
          pattern.duplicateCount,
          pattern.fraudAlertCount,
          pattern.riskScore,
          pattern.lastInvoiceDate,
          pattern.lastInvoiceDate,
        ]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get vendor patterns
   */
  async getVendorPatterns(
    tenantId: string,
    filters?: {
      vendorIds?: string[];
      minRiskScore?: number;
      limit?: number;
      offset?: number;
    }
  ): Promise<VendorPaymentPattern[]> {
    const client = await this.pool.connect();
    try {
      let query = `SELECT * FROM vendor_payment_patterns WHERE tenant_id = $1`;
      const params: any[] = [tenantId];
      let paramIndex = 2;

      if (filters?.vendorIds && filters.vendorIds.length > 0) {
        query += ` AND vendor_id = ANY($${paramIndex++})`;
        params.push(filters.vendorIds);
      }

      if (filters?.minRiskScore !== undefined) {
        query += ` AND risk_score >= $${paramIndex++}`;
        params.push(filters.minRiskScore);
      }

      query += ` ORDER BY risk_score DESC, total_amount DESC`;

      if (filters?.limit) {
        query += ` LIMIT $${paramIndex++}`;
        params.push(filters.limit);
      }

      if (filters?.offset) {
        query += ` OFFSET $${paramIndex++}`;
        params.push(filters.offset);
      }

      const result = await client.query(query, params);
      return result.rows.map(row => ({
        vendorId: row.vendor_id,
        vendorName: row.vendor_name,
        totalInvoices: row.total_invoices,
        totalAmount: parseFloat(row.total_amount),
        averageInvoiceAmount: parseFloat(row.average_invoice_amount),
        averagePaymentDays: parseFloat(row.average_payment_days),
        duplicateCount: row.duplicate_count,
        fraudAlertCount: row.fraud_alert_count,
        riskScore: row.risk_score,
        lastInvoiceDate: row.last_invoice_date,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
