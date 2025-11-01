/**
 * Invoice Matching Controller
 * Handles three-way match operations and fraud detection
 */

import { Request, Response } from 'express';
import { InvoiceMatchingEngine, DataSource } from '@sap-framework/invoice-matching';
import { S4HANAConnector, InvoiceMatchRepository, PrismaClient } from '@sap-framework/core';
import { ApiResponseUtil } from '../utils/response';
import logger from '../utils/logger';

const prisma = new PrismaClient();
const repository = new InvoiceMatchRepository(prisma);

export class InvoiceMatchingController {
  /**
   * POST /api/matching/analyze
   * Run invoice matching analysis
   */
  static async runAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const {
        tenantId,
        vendorIds,
        fromDate,
        toDate,
        invoiceStatus,
        config,
      } = req.body;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId is required');
        return;
      }

      logger.info('Starting invoice matching analysis', { tenantId, fromDate, toDate });

      // Get SAP connector for tenant (would come from tenant service)
      const connector = new S4HANAConnector({
        erpSystem: 'SAP',
        baseUrl: process.env.SAP_BASE_URL!,
        auth: {
          provider: 'SAP',
          type: 'OAUTH2' as const,
          credentials: {
            clientId: process.env.SAP_CLIENT_ID!,
            clientSecret: process.env.SAP_CLIENT_SECRET!,
            tokenUrl: process.env.SAP_TOKEN_URL!,
          },
        },
      });

      // Create data source adapter
      const dataSource: DataSource = {
        async getPurchaseOrders(filter) {
          const erpPos = await connector.getPurchaseOrders({
            poNumbers: filter?.poNumbers,
            vendorIds: filter?.vendorIds,
            fromDate: filter?.fromDate,
            toDate: filter?.toDate,
          });

          // Map from ERPPurchaseOrder to module-specific PurchaseOrder
          return erpPos.map(po => ({
            poNumber: po.poNumber,
            poItem: po.lineItems[0]?.lineNumber.toString() || '1',
            vendorId: po.vendorId,
            vendorName: po.vendorName || '',
            materialNumber: po.lineItems[0]?.materialId || '',
            materialDescription: po.lineItems[0]?.description || '',
            orderedQuantity: po.lineItems[0]?.quantity || 0,
            orderedValue: po.totalAmount,
            currency: po.currency,
            unitPrice: po.lineItems[0]?.unitPrice || 0,
            taxAmount: 0, // Not available in base ERPPurchaseOrder
            deliveryDate: po.deliveryDate || new Date(),
            poStatus: po.status as any || 'OPEN',
            createdBy: po.requester || '',
            createdAt: po.poDate,
          }));
        },

        async getGoodsReceipts(filter) {
          const sapGrs = await connector.getGoodsReceipts({
            grNumbers: filter?.grNumbers,
            poNumbers: filter?.poNumbers,
            fromDate: filter?.fromDate,
            toDate: filter?.toDate,
          });

          return sapGrs.map(gr => ({
            grNumber: gr.MaterialDocument,
            grItem: gr.MaterialDocumentItem,
            poNumber: gr.PurchaseOrder || '',
            poItem: gr.PurchaseOrderItem || '',
            materialNumber: gr.Material || '',
            receivedQuantity: gr.QuantityInEntryUnit,
            receivedValue: gr.TotalGoodsMvtAmtInCCCrcy || 0,
            currency: gr.Currency || '',
            grDate: new Date(gr.PostingDate),
            plant: gr.Plant || '',
            storageLocation: gr.StorageLocation || '',
            createdBy: gr.CreatedByUser || '',
            createdAt: new Date(gr.PostingDate),
          }));
        },

        async getSupplierInvoices(filter) {
          const erpInvoices = await connector.getInvoices({
            documentNumbers: filter?.invoiceNumbers,
            vendorIds: filter?.vendorIds,
            fromDate: filter?.fromDate,
            toDate: filter?.toDate,
          });

          // Map from ERPInvoice to module-specific SupplierInvoice
          return erpInvoices.map(inv => ({
            invoiceNumber: inv.invoiceNumber,
            invoiceItem: inv.lineItems[0]?.lineNumber.toString() || '1',
            vendorId: inv.vendorId,
            vendorName: inv.vendorName || '',
            poNumber: inv.purchaseOrderNumber || '',
            poItem: '1', // Not available in base ERPInvoice
            grNumber: '', // Not available in base ERPInvoice
            grItem: '', // Not available in base ERPInvoice
            materialNumber: '', // Not available in base ERPInvoice
            invoicedQuantity: inv.lineItems[0]?.quantity || 1,
            invoicedAmount: inv.amount,
            taxAmount: inv.taxAmount || 0,
            totalAmount: inv.totalAmount,
            currency: inv.currency,
            invoiceDate: inv.invoiceDate,
            postingDate: inv.invoiceDate, // Use invoice date as posting date
            dueDate: inv.dueDate || inv.invoiceDate,
            paymentTerms: inv.paymentTerms || '',
            invoiceStatus: (filter?.status?.[0] as any) || 'PENDING',
            submittedBy: '', // Not available in base ERPInvoice
            submittedAt: inv.invoiceDate,
          }));
        },
      };

      // Initialize matching engine
      const engine = new InvoiceMatchingEngine(dataSource, config);

      // Run analysis
      const result = await engine.runAnalysis(tenantId, {
        vendorIds,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
        invoiceStatus: invoiceStatus || ['PENDING'],
      });

      logger.info('Invoice matching analysis completed', {
        tenantId,
        runId: result.runId,
        totalInvoices: result.statistics.totalInvoices,
        fraudAlerts: result.statistics.fraudAlerts,
      });

      // Persist results to database
      const dbRun = await repository.createRun({
        tenantId,
        totalInvoices: result.statistics.totalInvoices,
        matchedInvoices: result.statistics.fullyMatched + result.statistics.partiallyMatched,
        unmatchedInvoices: result.statistics.notMatched,
        fraudAlertsCount: result.statistics.fraudAlerts,
        parameters: {
          vendorIds,
          fromDate,
          toDate,
          invoiceStatus,
          config,
        },
      });

      // Persist match results
      if (result.matches.length > 0) {
        await repository.saveResults(dbRun.id, result.matches.map((match: any) => ({
          invoiceNumber: match.invoice.invoiceNumber,
          poNumber: match.purchaseOrder?.poNumber,
          grNumber: match.goodsReceipt?.grNumber,
          matchStatus: match.matchScore >= 95 ? 'matched' : match.matchScore >= 60 ? 'partial' : 'unmatched',
          matchScore: match.matchScore,
          discrepancies: match.discrepancies || {},
          amounts: {
            invoiced: match.invoice.totalAmount,
            po: match.purchaseOrder?.orderedValue,
            gr: match.goodsReceipt?.receivedValue,
          },
          vendorId: match.invoice.vendorId,
          vendorName: match.invoice.vendorName,
        })));
      }

      // Persist fraud alerts
      const fraudAlertsArray = (result as any).fraudAlerts || [];
      if (fraudAlertsArray.length > 0) {
        await repository.saveFraudAlerts(dbRun.id, fraudAlertsArray.map((alert: any) => ({
          alertType: alert.pattern || 'pattern',
          severity: alert.severity || 'medium',
          invoiceNumber: alert.invoiceNumber || '',
          description: alert.description || alert.message,
          evidence: alert.evidence || {},
        })));
      }

      ApiResponseUtil.success(res, {
        runId: dbRun.id,
        statistics: result.statistics,
        matches: result.matches,
        matchCount: result.matches.length,
        message: `Analyzed ${result.statistics.totalInvoices} invoices`,
      });
    } catch (error: any) {
      logger.error('Invoice matching analysis failed', error);
      ApiResponseUtil.error(res, 'MATCHING_ANALYSIS_ERROR', 'Analysis failed', 500, { error: error.message });
    }
  }

  /**
   * GET /api/matching/runs/:runId
   * Get match results for a specific run
   */
  static async getMatchResults(req: Request, res: Response): Promise<void> {
    try {
      const { runId } = req.params;

      logger.info('Getting match results for run', { runId });

      const run = await repository.getRun(runId);

      if (!run) {
        ApiResponseUtil.notFound(res, `Run ${runId} not found`);
        return;
      }

      ApiResponseUtil.success(res, {
        runId: run.id,
        runDate: run.runDate,
        status: run.status,
        totalInvoices: run.totalInvoices,
        matchedInvoices: run.matchedInvoices,
        unmatchedInvoices: run.unmatchedInvoices,
        fraudAlertsCount: run.fraudAlertsCount,
        parameters: run.parameters,
      });
    } catch (error: any) {
      logger.error('Failed to get match results', error);
      ApiResponseUtil.error(res, 'GET_RESULTS_ERROR', 'Failed to retrieve results', 500, { error: error.message });
    }
  }

  /**
   * GET /api/matching/runs
   * Get all runs for a tenant
   */
  static async getRuns(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.query;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId is required');
        return;
      }

      logger.info('Getting runs for tenant', { tenantId });

      const runs = await repository.getRunsByTenant(tenantId as string);

      ApiResponseUtil.success(res, {
        count: runs.length,
        runs,
      });
    } catch (error: any) {
      logger.error('Failed to get runs', error);
      ApiResponseUtil.error(res, 'GET_RUNS_ERROR', 'Failed to retrieve runs', 500, { error: error.message });
    }
  }

  /**
   * POST /api/matching/invoice/:invoiceNumber
   * Match a single invoice
   */
  static async matchSingleInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { invoiceNumber } = req.params;
      const { tenantId } = req.body;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId is required');
        return;
      }

      logger.info('Matching single invoice', { tenantId, invoiceNumber });

      // Initialize connector and data source (same as runAnalysis)
      const connector = new S4HANAConnector({
        erpSystem: 'SAP',
        baseUrl: process.env.SAP_BASE_URL!,
        auth: {
          provider: 'SAP',
          type: 'OAUTH2' as const,
          credentials: {
            clientId: process.env.SAP_CLIENT_ID!,
            clientSecret: process.env.SAP_CLIENT_SECRET!,
            tokenUrl: process.env.SAP_TOKEN_URL!,
          },
        },
      });

      const dataSource: DataSource = {
        // Same implementation as above
        getPurchaseOrders: async (filter) => {
          const erpPos = await connector.getPurchaseOrders({
            poNumbers: filter?.poNumbers,
            vendorIds: filter?.vendorIds,
          });
          return erpPos.map(po => ({
            poNumber: po.poNumber,
            poItem: po.lineItems[0]?.lineNumber.toString() || '1',
            vendorId: po.vendorId,
            vendorName: po.vendorName || '',
            materialNumber: po.lineItems[0]?.materialId || '',
            materialDescription: po.lineItems[0]?.description || '',
            orderedQuantity: po.lineItems[0]?.quantity || 0,
            orderedValue: po.totalAmount,
            currency: po.currency,
            unitPrice: po.lineItems[0]?.unitPrice || 0,
            taxAmount: 0,
            deliveryDate: po.deliveryDate || new Date(),
            poStatus: po.status as any || 'OPEN',
            createdBy: po.requester || '',
            createdAt: po.poDate,
          }));
        },
        getGoodsReceipts: async (filter) => {
          const sapGrs = await connector.getGoodsReceipts({
            grNumbers: filter?.grNumbers,
            poNumbers: filter?.poNumbers,
          });
          return sapGrs.map(gr => ({
            grNumber: gr.MaterialDocument,
            grItem: gr.MaterialDocumentItem,
            poNumber: gr.PurchaseOrder || '',
            poItem: gr.PurchaseOrderItem || '',
            materialNumber: gr.Material || '',
            receivedQuantity: gr.QuantityInEntryUnit,
            receivedValue: gr.TotalGoodsMvtAmtInCCCrcy || 0,
            currency: gr.Currency || '',
            grDate: new Date(gr.PostingDate),
            plant: gr.Plant || '',
            storageLocation: gr.StorageLocation || '',
            createdBy: gr.CreatedByUser || '',
            createdAt: new Date(gr.PostingDate),
          }));
        },
        getSupplierInvoices: async (filter) => {
          const erpInvoices = await connector.getInvoices({
            documentNumbers: filter?.invoiceNumbers || [invoiceNumber],
          });
          return erpInvoices.map(inv => ({
            invoiceNumber: inv.invoiceNumber,
            invoiceItem: inv.lineItems[0]?.lineNumber.toString() || '1',
            vendorId: inv.vendorId,
            vendorName: inv.vendorName || '',
            poNumber: inv.purchaseOrderNumber || '',
            poItem: '1',
            grNumber: '',
            grItem: '',
            materialNumber: '',
            invoicedQuantity: inv.lineItems[0]?.quantity || 1,
            invoicedAmount: inv.amount,
            taxAmount: inv.taxAmount || 0,
            totalAmount: inv.totalAmount,
            currency: inv.currency,
            invoiceDate: inv.invoiceDate,
            postingDate: inv.invoiceDate,
            dueDate: inv.dueDate || inv.invoiceDate,
            paymentTerms: inv.paymentTerms || '',
            invoiceStatus: 'PENDING' as any,
            submittedBy: '',
            submittedAt: inv.invoiceDate,
          }));
        },
      };

      const engine = new InvoiceMatchingEngine(dataSource);
      const result = await engine.matchSingleInvoice(invoiceNumber);

      ApiResponseUtil.success(res, {
        match: result.matches[0],
        statistics: result.statistics,
      });
    } catch (error: any) {
      logger.error('Failed to match single invoice', error);
      ApiResponseUtil.error(res, 'SINGLE_MATCH_ERROR', 'Match failed', 500, { error: error.message });
    }
  }

  /**
   * GET /api/matching/fraud-alerts
   * Get fraud alerts for a tenant
   */
  static async getFraudAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, runId, severity } = req.query;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId is required');
        return;
      }

      logger.info('Getting fraud alerts', { tenantId, runId, severity });

      // Get all runs for tenant
      const runs = await repository.getRunsByTenant(tenantId as string);

      let alerts: any[] = [];

      if (runId) {
        // Get alerts for specific run
        const run = await repository.getRun(runId as string) as any;
        if (run && run.fraudAlerts) {
          alerts = run.fraudAlerts;
        }
      } else {
        // Get alerts from all runs
        for (const run of runs) {
          const fullRun = await repository.getRun(run.id) as any;
          if (fullRun && fullRun.fraudAlerts && fullRun.fraudAlerts.length > 0) {
            alerts.push(...fullRun.fraudAlerts.map((alert: any) => ({
              ...alert,
              runId: run.id,
              runDate: run.runDate,
            })));
          }
        }
      }

      // Filter by severity if provided
      if (severity) {
        alerts = alerts.filter(alert => alert.severity === severity);
      }

      // Sort by severity (critical > high > medium > low)
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      alerts.sort((a, b) =>
        (severityOrder[a.severity as keyof typeof severityOrder] || 99) -
        (severityOrder[b.severity as keyof typeof severityOrder] || 99)
      );

      ApiResponseUtil.success(res, {
        count: alerts.length,
        alerts,
      });
    } catch (error: any) {
      logger.error('Failed to get fraud alerts', error);
      ApiResponseUtil.error(res, 'GET_FRAUD_ALERTS_ERROR', 'Failed to retrieve alerts', 500, { error: error.message });
    }
  }

  /**
   * GET /api/matching/vendor-patterns
   * Get vendor payment patterns from historical data
   */
  static async getVendorPatterns(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.query;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId is required');
        return;
      }

      logger.info('Getting vendor patterns', { tenantId });

      // Get statistics which includes vendor patterns
      const stats = await repository.getStatistics(tenantId as string);

      // Group match results by vendor
      const runs = await repository.getRunsByTenant(tenantId as string);
      const vendorMap = new Map<string, any>();

      for (const run of runs) {
        const fullRun = await repository.getRun(run.id) as any;
        if (fullRun && fullRun.matchResults) {
          for (const result of fullRun.matchResults) {
            const vendorId = result.vendorId;
            if (!vendorId) continue;

            if (!vendorMap.has(vendorId)) {
              vendorMap.set(vendorId, {
                vendorId,
                vendorName: result.vendorName,
                totalInvoices: 0,
                matchedInvoices: 0,
                totalAmount: 0,
                averageMatchScore: 0,
                matchScores: [] as number[],
                fraudAlerts: 0,
              });
            }

            const vendor = vendorMap.get(vendorId);
            vendor.totalInvoices++;
            vendor.totalAmount += result.amounts?.invoiced || 0;
            vendor.matchScores.push(result.matchScore || 0);

            if (result.matchStatus === 'matched') {
              vendor.matchedInvoices++;
            }
          }
        }

        // Count fraud alerts per vendor
        if (fullRun && fullRun.fraudAlerts) {
          for (const alert of fullRun.fraudAlerts) {
            const vendorId = (alert as any).vendorId;
            if (vendorId && vendorMap.has(vendorId)) {
              vendorMap.get(vendorId).fraudAlerts++;
            }
          }
        }
      }

      // Calculate averages and convert to array
      const vendors = Array.from(vendorMap.values()).map(vendor => ({
        ...vendor,
        averageMatchScore: vendor.matchScores.length > 0
          ? vendor.matchScores.reduce((a: number, b: number) => a + b, 0) / vendor.matchScores.length
          : 0,
        matchRate: vendor.totalInvoices > 0
          ? (vendor.matchedInvoices / vendor.totalInvoices) * 100
          : 0,
        matchScores: undefined, // Remove raw scores array
      }));

      // Sort by total amount descending
      vendors.sort((a, b) => b.totalAmount - a.totalAmount);

      ApiResponseUtil.success(res, {
        count: vendors.length,
        vendors,
        summary: {
          totalVendors: vendors.length,
          totalInvoices: stats.totalInvoices,
          averageMatchRate: vendors.length > 0
            ? vendors.reduce((sum, v) => sum + v.matchRate, 0) / vendors.length
            : 0,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get vendor patterns', error);
      ApiResponseUtil.error(res, 'GET_VENDOR_PATTERNS_ERROR', 'Failed to retrieve patterns', 500, { error: error.message });
    }
  }

  /**
   * POST /api/matching/vendor-patterns/analyze
   * Analyze vendor payment patterns
   */
  static async analyzeVendorPatterns(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, vendorIds, fromDate } = req.body;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId is required');
        return;
      }

      // Create connector and data source
      const connector = new S4HANAConnector({
        erpSystem: 'SAP',
        baseUrl: process.env.SAP_BASE_URL!,
        auth: {
          provider: 'SAP',
          type: 'OAUTH2' as const,
          credentials: {
            clientId: process.env.SAP_CLIENT_ID!,
            clientSecret: process.env.SAP_CLIENT_SECRET!,
            tokenUrl: process.env.SAP_TOKEN_URL!,
          },
        },
      });

      const dataSource: DataSource = {
        getPurchaseOrders: async () => [],
        getGoodsReceipts: async () => [],
        getSupplierInvoices: async (filter) => {
          const erpInvoices = await connector.getInvoices({
            vendorIds: filter?.vendorIds,
            fromDate: filter?.fromDate,
          });
          return erpInvoices.map(inv => ({
            invoiceNumber: inv.invoiceNumber,
            invoiceItem: inv.lineItems[0]?.lineNumber.toString() || '1',
            vendorId: inv.vendorId,
            vendorName: inv.vendorName || '',
            poNumber: inv.purchaseOrderNumber || '',
            poItem: '1',
            grNumber: '',
            grItem: '',
            materialNumber: '',
            invoicedQuantity: inv.lineItems[0]?.quantity || 1,
            invoicedAmount: inv.amount,
            taxAmount: inv.taxAmount || 0,
            totalAmount: inv.totalAmount,
            currency: inv.currency,
            invoiceDate: inv.invoiceDate,
            postingDate: inv.invoiceDate,
            dueDate: inv.dueDate || inv.invoiceDate,
            paymentTerms: inv.paymentTerms || '',
            invoiceStatus: 'PAID' as any,
            submittedBy: '',
            submittedAt: inv.invoiceDate,
          }));
        },
      };

      const engine = new InvoiceMatchingEngine(dataSource);
      const patterns = await engine.analyzeVendorPatterns(
        vendorIds,
        fromDate ? new Date(fromDate) : undefined
      );

      logger.info('Vendor pattern analysis completed', {
        tenantId,
        vendorCount: patterns.length,
      });

      ApiResponseUtil.success(res, {
        count: patterns.length,
        vendors: patterns,
        message: 'Analysis completed successfully',
      });
    } catch (error: any) {
      logger.error('Failed to analyze vendor patterns', error);
      ApiResponseUtil.error(res, 'VENDOR_PATTERN_ANALYSIS_ERROR', 'Analysis failed', 500, { error: error.message });
    }
  }
}
