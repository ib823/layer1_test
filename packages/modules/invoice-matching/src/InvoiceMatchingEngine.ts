/**
 * Invoice Matching Module - Main Engine
 * Orchestrates three-way matching and fraud detection
 */

import { v4 as uuidv4 } from 'uuid';
import {
  MatchingConfig,
  InvoiceMatchingResult,
  MatchingAnalysisRun,
  PurchaseOrder,
  GoodsReceipt,
  SupplierInvoice,
  VendorPaymentPattern,
} from './types';
import { ThreeWayMatcher } from './ThreeWayMatcher';
import { STANDARD_TOLERANCE_RULES } from './rules/toleranceRules';

export interface DataSource {
  getPurchaseOrders(filter?: {
    poNumbers?: string[];
    vendorIds?: string[];
    fromDate?: Date;
    toDate?: Date;
  }): Promise<PurchaseOrder[]>;

  getGoodsReceipts(filter?: {
    poNumbers?: string[];
    grNumbers?: string[];
    fromDate?: Date;
    toDate?: Date;
  }): Promise<GoodsReceipt[]>;

  getSupplierInvoices(filter?: {
    invoiceNumbers?: string[];
    vendorIds?: string[];
    status?: SupplierInvoice['invoiceStatus'][];
    fromDate?: Date;
    toDate?: Date;
  }): Promise<SupplierInvoice[]>;
}

export class InvoiceMatchingEngine {
  private matcher: ThreeWayMatcher;
  private config: MatchingConfig;
  private dataSource: DataSource;

  constructor(dataSource: DataSource, config?: Partial<MatchingConfig>) {
    this.dataSource = dataSource;
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

    this.matcher = new ThreeWayMatcher(this.config);
  }

  /**
   * Run complete invoice matching analysis
   */
  async runAnalysis(
    tenantId: string,
    filter?: {
      vendorIds?: string[];
      fromDate?: Date;
      toDate?: Date;
      invoiceStatus?: SupplierInvoice['invoiceStatus'][];
    }
  ): Promise<InvoiceMatchingResult> {
    const runId = uuidv4();

    console.log(`[InvoiceMatching] Starting analysis run ${runId} for tenant ${tenantId}`);

    // Fetch data from SAP
    const invoices = await this.dataSource.getSupplierInvoices({
      vendorIds: filter?.vendorIds,
      fromDate: filter?.fromDate,
      toDate: filter?.toDate,
      status: filter?.invoiceStatus || ['PENDING'],
    });

    console.log(`[InvoiceMatching] Fetched ${invoices.length} invoices`);

    // Get related POs
    const poNumbers = [...new Set(invoices.map(inv => inv.poNumber).filter(Boolean) as string[])];
    const purchaseOrders = poNumbers.length > 0
      ? await this.dataSource.getPurchaseOrders({ poNumbers })
      : [];

    console.log(`[InvoiceMatching] Fetched ${purchaseOrders.length} purchase orders`);

    // Get related GRs
    const grNumbers = [...new Set(invoices.map(inv => inv.grNumber).filter(Boolean) as string[])];
    const goodsReceipts = grNumbers.length > 0
      ? await this.dataSource.getGoodsReceipts({ grNumbers })
      : [];

    console.log(`[InvoiceMatching] Fetched ${goodsReceipts.length} goods receipts`);

    // Perform matching
    const matches = await this.matcher.matchInvoices(invoices, purchaseOrders, goodsReceipts);

    // Calculate statistics
    const statistics = this.calculateStatistics(matches);

    console.log(`[InvoiceMatching] Analysis complete:`, statistics);

    return {
      runId,
      tenantId,
      matches,
      statistics,
      completedAt: new Date(),
    };
  }

  /**
   * Match a single invoice
   */
  async matchSingleInvoice(
    invoiceNumber: string,
    allInvoices?: SupplierInvoice[]
  ): Promise<InvoiceMatchingResult> {
    const invoices = allInvoices || await this.dataSource.getSupplierInvoices({
      invoiceNumbers: [invoiceNumber],
    });

    const invoice = invoices.find(inv => inv.invoiceNumber === invoiceNumber);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceNumber} not found`);
    }

    // Fetch related PO
    const po = invoice.poNumber
      ? (await this.dataSource.getPurchaseOrders({
          poNumbers: [invoice.poNumber],
        }))[0]
      : null;

    // Fetch related GR
    const gr = invoice.grNumber
      ? (await this.dataSource.getGoodsReceipts({
          grNumbers: [invoice.grNumber],
        }))[0]
      : null;

    const match = await this.matcher.matchInvoice(invoice, po || null, gr || null, invoices);

    return {
      runId: uuidv4(),
      tenantId: 'single-match',
      matches: [match],
      statistics: this.calculateStatistics([match]),
      completedAt: new Date(),
    };
  }

  /**
   * Analyze vendor payment patterns for fraud detection
   */
  async analyzeVendorPatterns(
    vendorIds?: string[],
    fromDate?: Date
  ): Promise<VendorPaymentPattern[]> {
    const invoices = await this.dataSource.getSupplierInvoices({
      vendorIds,
      fromDate,
    });

    const vendorMap = new Map<string, SupplierInvoice[]>();

    // Group invoices by vendor
    for (const invoice of invoices) {
      const existing = vendorMap.get(invoice.vendorId) || [];
      existing.push(invoice);
      vendorMap.set(invoice.vendorId, existing);
    }

    const patterns: VendorPaymentPattern[] = [];

    for (const [vendorId, vendorInvoices] of vendorMap.entries()) {
      const totalAmount = vendorInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const averageAmount = totalAmount / vendorInvoices.length;

      // Calculate average payment days
      const paymentDays = vendorInvoices
        .filter(inv => inv.invoiceStatus === 'PAID')
        .map(inv => {
          const invoiceDate = new Date(inv.invoiceDate);
          const dueDate = new Date(inv.dueDate);
          return (dueDate.getTime() - invoiceDate.getTime()) / (24 * 60 * 60 * 1000);
        });

      const averagePaymentDays =
        paymentDays.length > 0
          ? paymentDays.reduce((sum, days) => sum + days, 0) / paymentDays.length
          : 0;

      // Detect duplicates (simple check)
      const duplicateCount = this.detectDuplicates(vendorInvoices);

      // Get last invoice date
      const lastInvoiceDate = vendorInvoices.reduce((latest, inv) =>
        new Date(inv.invoiceDate) > new Date(latest.invoiceDate) ? inv : latest
      ).invoiceDate;

      // Calculate basic risk score
      let riskScore = 0;
      if (duplicateCount > 0) riskScore += 30;
      if (vendorInvoices.length === 1) riskScore += 20; // New vendor
      if (averageAmount > 100000) riskScore += 10; // High-value transactions

      patterns.push({
        vendorId,
        vendorName: vendorInvoices[0].vendorName,
        totalInvoices: vendorInvoices.length,
        totalAmount,
        averageInvoiceAmount: averageAmount,
        averagePaymentDays,
        duplicateCount,
        fraudAlertCount: 0, // Would need to run fraud detection
        riskScore,
        lastInvoiceDate,
      });
    }

    return patterns.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Calculate analysis statistics
   */
  private calculateStatistics(matches: InvoiceMatchingResult['matches']): MatchingAnalysisRun['statistics'] {
    return {
      totalInvoices: matches.length,
      fullyMatched: matches.filter(m => m.matchStatus === 'FULLY_MATCHED').length,
      partiallyMatched: matches.filter(m => m.matchStatus === 'PARTIALLY_MATCHED').length,
      notMatched: matches.filter(m => m.matchStatus === 'NOT_MATCHED').length,
      toleranceExceeded: matches.filter(m => m.matchStatus === 'TOLERANCE_EXCEEDED').length,
      fraudAlerts: matches.reduce((sum, m) => sum + m.fraudAlerts.length, 0),
      totalDiscrepanciesFound: matches.reduce((sum, m) => sum + m.discrepancies.length, 0),
      totalAmountProcessed: 0, // Would need invoice amounts
      totalAmountBlocked: 0, // Would need invoice amounts for blocked ones
    };
  }

  /**
   * Simple duplicate detection
   */
  private detectDuplicates(invoices: SupplierInvoice[]): number {
    let duplicateCount = 0;
    const seen = new Set<string>();

    for (const invoice of invoices) {
      const key = `${invoice.vendorId}-${invoice.invoicedAmount}-${new Date(invoice.invoiceDate).toDateString()}`;
      if (seen.has(key)) {
        duplicateCount++;
      }
      seen.add(key);
    }

    return duplicateCount;
  }

  /**
   * Get configuration
   */
  getConfig(): MatchingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MatchingConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    this.matcher = new ThreeWayMatcher(this.config);
  }
}
