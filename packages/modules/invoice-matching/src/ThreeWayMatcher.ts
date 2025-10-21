/**
 * Three-Way Match Engine
 * Matches Purchase Orders → Goods Receipts → Supplier Invoices
 */

import { v4 as uuidv4 } from 'uuid';
import {
  PurchaseOrder,
  GoodsReceipt,
  SupplierInvoice,
  ThreeWayMatchResult,
  Discrepancy,
  MatchingConfig,
} from './types';
import { validateAllTolerances, STANDARD_TOLERANCE_RULES } from './rules/toleranceRules';
import { detectAllFraudPatterns } from './rules/fraudPatterns';

export class ThreeWayMatcher {
  private config: MatchingConfig;

  constructor(config?: Partial<MatchingConfig>) {
    this.config = {
      toleranceRules: config?.toleranceRules || STANDARD_TOLERANCE_RULES,
      fraudDetection: {
        enabled: true,
        patterns: [
          'DUPLICATE_INVOICE',
          'SPLIT_INVOICE',
          'ROUND_NUMBER',
          'WEEKEND_SUBMISSION',
          'NEW_VENDOR',
          'PRICE_MANIPULATION',
          'QUANTITY_MANIPULATION',
          'INVOICE_AGING',
        ],
        minimumConfidence: 50,
        ...config?.fraudDetection,
      },
      matching: {
        requireGoodsReceipt: true,
        autoApproveWithinTolerance: false,
        blockOnFraudAlert: true,
        ...config?.matching,
      },
      notifications: {
        enabled: true,
        recipients: [],
        notifyOnMismatch: true,
        notifyOnFraud: true,
        ...config?.notifications,
      },
    };
  }

  /**
   * Perform three-way match for a single invoice
   */
  async matchInvoice(
    invoice: SupplierInvoice,
    po: PurchaseOrder | null,
    gr: GoodsReceipt | null,
    allInvoices: SupplierInvoice[]
  ): Promise<ThreeWayMatchResult> {
    const matchId = uuidv4();

    // Determine match type
    const matchType = this.determineMatchType(po, gr);

    // Initialize result
    const result: ThreeWayMatchResult = {
      matchId,
      poNumber: po?.poNumber || '',
      poItem: po?.poItem || '',
      grNumber: gr?.grNumber || null,
      grItem: gr?.grItem || null,
      invoiceNumber: invoice.invoiceNumber,
      invoiceItem: invoice.invoiceItem,
      matchStatus: 'NOT_MATCHED',
      matchType,
      discrepancies: [],
      toleranceViolations: [],
      fraudAlerts: [],
      matchedAt: new Date(),
      approvalRequired: false,
      riskScore: 0,
    };

    // If no PO, cannot match
    if (!po) {
      result.discrepancies.push({
        type: 'VENDOR',
        severity: 'CRITICAL',
        field: 'poNumber',
        expectedValue: 'Purchase Order',
        actualValue: null,
        variance: 100,
        description: 'No purchase order found for this invoice. Manual review required.',
      });
      result.matchStatus = 'NOT_MATCHED';
      result.riskScore = 100;
      result.approvalRequired = true;
      return result;
    }

    // Detect discrepancies
    result.discrepancies = this.detectDiscrepancies(invoice, po, gr);

    // Check tolerance violations
    const toleranceCheck = validateAllTolerances(
      {
        unitPrice: po.unitPrice,
        orderedQuantity: po.orderedQuantity,
        taxAmount: po.taxAmount,
        orderedValue: po.orderedValue,
      },
      {
        invoicedAmount: invoice.invoicedAmount,
        invoicedQuantity: invoice.invoicedQuantity,
        taxAmount: invoice.taxAmount,
        totalAmount: invoice.totalAmount,
      },
      this.config.toleranceRules
    );

    if (!toleranceCheck.valid) {
      result.toleranceViolations = toleranceCheck.violations.map(v => ({
        ruleId: v.rule.ruleId,
        ruleName: v.rule.name,
        field: v.rule.field,
        threshold: v.rule.thresholdValue,
        actualVariance: v.variance,
        exceededBy: v.exceededBy,
        requiresApproval: v.rule.requiresApproval,
      }));
    }

    // Run fraud detection
    if (this.config.fraudDetection.enabled) {
      const fraudAlerts = detectAllFraudPatterns(
        invoice,
        po,
        allInvoices,
        this.config.fraudDetection.patterns
      );

      result.fraudAlerts = fraudAlerts.filter(
        alert => alert.confidence >= this.config.fraudDetection.minimumConfidence
      );
    }

    // Determine match status
    result.matchStatus = this.determineMatchStatus(result);

    // Calculate risk score
    result.riskScore = this.calculateRiskScore(result);

    // Determine if approval required
    result.approvalRequired = this.requiresApproval(result);

    return result;
  }

  /**
   * Batch match multiple invoices
   */
  async matchInvoices(
    invoices: SupplierInvoice[],
    purchaseOrders: PurchaseOrder[],
    goodsReceipts: GoodsReceipt[]
  ): Promise<ThreeWayMatchResult[]> {
    const results: ThreeWayMatchResult[] = [];

    for (const invoice of invoices) {
      // Find matching PO
      const po = purchaseOrders.find(
        p => p.poNumber === invoice.poNumber && p.poItem === invoice.poItem
      );

      // Find matching GR
      const gr = goodsReceipts.find(
        g =>
          g.grNumber === invoice.grNumber &&
          g.grItem === invoice.grItem &&
          g.poNumber === invoice.poNumber
      );

      const result = await this.matchInvoice(invoice, po || null, gr || null, invoices);
      results.push(result);
    }

    return results;
  }

  /**
   * Determine match type (three-way, two-way, or no match)
   */
  private determineMatchType(
    po: PurchaseOrder | null,
    gr: GoodsReceipt | null
  ): ThreeWayMatchResult['matchType'] {
    if (po && gr) return 'THREE_WAY';
    if (po && !gr) {
      return this.config.matching.requireGoodsReceipt ? 'NO_MATCH' : 'TWO_WAY';
    }
    return 'NO_MATCH';
  }

  /**
   * Detect all discrepancies between invoice, PO, and GR
   */
  private detectDiscrepancies(
    invoice: SupplierInvoice,
    po: PurchaseOrder,
    gr: GoodsReceipt | null
  ): Discrepancy[] {
    const discrepancies: Discrepancy[] = [];

    // Vendor mismatch
    if (invoice.vendorId !== po.vendorId) {
      discrepancies.push({
        type: 'VENDOR',
        severity: 'CRITICAL',
        field: 'vendorId',
        expectedValue: po.vendorId,
        actualValue: invoice.vendorId,
        variance: 100,
        description: `Vendor mismatch: PO is for ${po.vendorName} (${po.vendorId}), but invoice is from ${invoice.vendorName} (${invoice.vendorId})`,
      });
    }

    // Material number mismatch
    if (invoice.materialNumber && invoice.materialNumber !== po.materialNumber) {
      discrepancies.push({
        type: 'MATERIAL',
        severity: 'HIGH',
        field: 'materialNumber',
        expectedValue: po.materialNumber,
        actualValue: invoice.materialNumber,
        variance: 100,
        description: `Material mismatch: PO specifies ${po.materialNumber}, invoice shows ${invoice.materialNumber}`,
      });
    }

    // Currency mismatch
    if (invoice.currency !== po.currency) {
      discrepancies.push({
        type: 'CURRENCY',
        severity: 'HIGH',
        field: 'currency',
        expectedValue: po.currency,
        actualValue: invoice.currency,
        variance: 100,
        description: `Currency mismatch: PO uses ${po.currency}, invoice uses ${invoice.currency}`,
      });
    }

    // Quantity discrepancy
    const qtyVariance = Math.abs(invoice.invoicedQuantity - po.orderedQuantity);
    const qtyVariancePercent = (qtyVariance / po.orderedQuantity) * 100;
    if (qtyVariance > 0) {
      discrepancies.push({
        type: 'QUANTITY',
        severity: qtyVariancePercent > 10 ? 'HIGH' : qtyVariancePercent > 5 ? 'MEDIUM' : 'LOW',
        field: 'quantity',
        expectedValue: po.orderedQuantity,
        actualValue: invoice.invoicedQuantity,
        variance: qtyVariancePercent,
        description: `Quantity variance of ${qtyVariancePercent.toFixed(2)}%: PO ordered ${po.orderedQuantity}, invoice shows ${invoice.invoicedQuantity}`,
      });
    }

    // Price discrepancy
    const invoiceUnitPrice = invoice.invoicedAmount / invoice.invoicedQuantity;
    const priceVariance = Math.abs(invoiceUnitPrice - po.unitPrice);
    const priceVariancePercent = (priceVariance / po.unitPrice) * 100;
    if (priceVariance > 0.01) {
      // Ignore tiny rounding differences
      discrepancies.push({
        type: 'PRICE',
        severity: priceVariancePercent > 10 ? 'HIGH' : priceVariancePercent > 5 ? 'MEDIUM' : 'LOW',
        field: 'unitPrice',
        expectedValue: po.unitPrice,
        actualValue: invoiceUnitPrice,
        variance: priceVariancePercent,
        description: `Price variance of ${priceVariancePercent.toFixed(2)}%: PO unit price ${po.unitPrice}, invoice unit price ${invoiceUnitPrice.toFixed(2)}`,
      });
    }

    // Tax discrepancy
    const taxVariance = Math.abs(invoice.taxAmount - po.taxAmount);
    const taxVariancePercent = po.taxAmount > 0 ? (taxVariance / po.taxAmount) * 100 : 0;
    if (taxVariance > 0.01) {
      discrepancies.push({
        type: 'TAX',
        severity: taxVariancePercent > 5 ? 'HIGH' : taxVariancePercent > 2 ? 'MEDIUM' : 'LOW',
        field: 'taxAmount',
        expectedValue: po.taxAmount,
        actualValue: invoice.taxAmount,
        variance: taxVariancePercent,
        description: `Tax variance of ${taxVariancePercent.toFixed(2)}%: PO tax ${po.taxAmount}, invoice tax ${invoice.taxAmount}`,
      });
    }

    // Date discrepancy (invoice date before PO date is suspicious)
    if (new Date(invoice.invoiceDate) < new Date(po.createdAt)) {
      discrepancies.push({
        type: 'DATE',
        severity: 'MEDIUM',
        field: 'invoiceDate',
        expectedValue: po.createdAt,
        actualValue: invoice.invoiceDate,
        variance: 100,
        description: `Invoice dated before PO creation: PO created ${po.createdAt.toDateString()}, invoice dated ${new Date(invoice.invoiceDate).toDateString()}`,
      });
    }

    // GR-specific discrepancies
    if (gr) {
      const grQtyVariance = Math.abs(invoice.invoicedQuantity - gr.receivedQuantity);
      const grQtyVariancePercent = (grQtyVariance / gr.receivedQuantity) * 100;

      if (grQtyVariance > 0) {
        discrepancies.push({
          type: 'QUANTITY',
          severity: grQtyVariancePercent > 10 ? 'HIGH' : grQtyVariancePercent > 5 ? 'MEDIUM' : 'LOW',
          field: 'receivedQuantity',
          expectedValue: gr.receivedQuantity,
          actualValue: invoice.invoicedQuantity,
          variance: grQtyVariancePercent,
          description: `Goods receipt quantity variance of ${grQtyVariancePercent.toFixed(2)}%: GR received ${gr.receivedQuantity}, invoice shows ${invoice.invoicedQuantity}`,
        });
      }
    }

    return discrepancies;
  }

  /**
   * Determine overall match status
   */
  private determineMatchStatus(result: ThreeWayMatchResult): ThreeWayMatchResult['matchStatus'] {
    // Check for critical discrepancies
    const hasCriticalDiscrepancy = result.discrepancies.some(d => d.severity === 'CRITICAL');
    if (hasCriticalDiscrepancy) {
      return 'BLOCKED';
    }

    // Check for critical fraud alerts
    const hasCriticalFraud = result.fraudAlerts.some(f => f.severity === 'CRITICAL');
    if (hasCriticalFraud && this.config.matching.blockOnFraudAlert) {
      return 'BLOCKED';
    }

    // Check tolerance violations
    if (result.toleranceViolations.length > 0) {
      return 'TOLERANCE_EXCEEDED';
    }

    // Check for any discrepancies
    if (result.discrepancies.length > 0) {
      return 'PARTIALLY_MATCHED';
    }

    return 'FULLY_MATCHED';
  }

  /**
   * Calculate risk score (0-100)
   */
  private calculateRiskScore(result: ThreeWayMatchResult): number {
    let score = 0;

    // Discrepancies contribution (max 40 points)
    const criticalCount = result.discrepancies.filter(d => d.severity === 'CRITICAL').length;
    const highCount = result.discrepancies.filter(d => d.severity === 'HIGH').length;
    const mediumCount = result.discrepancies.filter(d => d.severity === 'MEDIUM').length;

    score += criticalCount * 40;
    score += highCount * 20;
    score += mediumCount * 10;

    // Tolerance violations contribution (max 30 points)
    score += Math.min(result.toleranceViolations.length * 15, 30);

    // Fraud alerts contribution (max 30 points)
    const fraudScore = result.fraudAlerts.reduce((sum, alert) => {
      const alertScore =
        alert.severity === 'CRITICAL' ? 30 : alert.severity === 'HIGH' ? 20 : alert.severity === 'MEDIUM' ? 10 : 5;
      return sum + alertScore;
    }, 0);

    score += Math.min(fraudScore, 30);

    return Math.min(score, 100);
  }

  /**
   * Determine if manual approval is required
   */
  private requiresApproval(result: ThreeWayMatchResult): boolean {
    // Always require approval for blocked invoices
    if (result.matchStatus === 'BLOCKED') {
      return true;
    }

    // Check if any tolerance violations require approval
    const hasApprovalRequiredViolation = result.toleranceViolations.some(v => v.requiresApproval);
    if (hasApprovalRequiredViolation) {
      return true;
    }

    // Check for high-severity fraud alerts
    const hasHighRiskFraud = result.fraudAlerts.some(
      f => f.severity === 'CRITICAL' || f.severity === 'HIGH'
    );
    if (hasHighRiskFraud) {
      return true;
    }

    // Check risk score threshold
    if (result.riskScore >= 50) {
      return true;
    }

    // Auto-approve if configured and fully matched
    if (
      this.config.matching.autoApproveWithinTolerance &&
      result.matchStatus === 'FULLY_MATCHED'
    ) {
      return false;
    }

    // Default: require approval for anything not fully matched
    return result.matchStatus !== 'FULLY_MATCHED';
  }
}
