/**
 * Invoice Matching Controller
 * Handles three-way match operations and fraud detection
 */

import { Request, Response } from 'express';
import { InvoiceMatchingEngine, DataSource } from '@sap-framework/invoice-matching';
import { S4HANAConnector } from '@sap-framework/core';
import { ApiResponseUtil } from '../utils/response';
import logger from '../utils/logger';

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
        baseUrl: process.env.SAP_BASE_URL!,
        auth: {
          type: 'OAUTH' as const,
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
          const sapPos = await connector.getPurchaseOrders({
            poNumbers: filter?.poNumbers,
            suppliers: filter?.vendorIds,
            fromDate: filter?.fromDate,
            toDate: filter?.toDate,
          });

          return sapPos.map(po => ({
            poNumber: po.PurchaseOrder,
            poItem: po.PurchaseOrderItem,
            vendorId: po.Supplier,
            vendorName: po.SupplierName || '',
            materialNumber: po.Material || '',
            materialDescription: po.MaterialName || '',
            orderedQuantity: po.OrderQuantity,
            orderedValue: po.NetPriceAmount * po.OrderQuantity,
            currency: po.Currency,
            unitPrice: po.NetPriceAmount,
            taxAmount: po.TaxAmount || 0,
            deliveryDate: po.DeliveryDate ? new Date(po.DeliveryDate) : new Date(),
            poStatus: (po.PurchasingDocumentStatus as any) || 'OPEN',
            createdBy: po.CreatedByUser || '',
            createdAt: new Date(po.PurchaseOrderDate),
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
          const sapInvoices = await connector.getSupplierInvoices({
            invoiceNumbers: filter?.invoiceNumbers,
            suppliers: filter?.vendorIds,
            fromDate: filter?.fromDate,
            toDate: filter?.toDate,
          });

          return sapInvoices.map(inv => ({
            invoiceNumber: inv.SupplierInvoice,
            invoiceItem: inv.SupplierInvoiceItem || '1',
            vendorId: inv.Supplier,
            vendorName: inv.SupplierName || '',
            poNumber: inv.PurchaseOrder,
            poItem: inv.PurchaseOrderItem,
            grNumber: inv.ReferenceDocument,
            grItem: inv.ReferenceDocumentItem,
            materialNumber: inv.Material,
            invoicedQuantity: inv.QuantityInPurchaseOrderUnit || 1,
            invoicedAmount: inv.SupplierInvoiceItemAmount,
            taxAmount: inv.TaxAmount || 0,
            totalAmount: inv.SupplierInvoiceItemAmount + (inv.TaxAmount || 0),
            currency: inv.DocumentCurrency,
            invoiceDate: new Date(inv.InvoicingDate),
            postingDate: new Date(inv.PostingDate),
            dueDate: new Date(inv.NetDueDate || inv.PostingDate),
            paymentTerms: inv.PaymentTerms || '',
            invoiceStatus: (filter?.status?.[0] as any) || 'PENDING',
            submittedBy: inv.CreatedByUser,
            submittedAt: new Date(inv.DocumentDate || inv.PostingDate),
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

      ApiResponseUtil.success(res, {
        runId: result.runId,
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
   * NOTE: Currently returns empty as database persistence is not yet implemented
   */
  static async getMatchResults(req: Request, res: Response): Promise<void> {
    try {
      const { runId } = req.params;

      logger.info('Getting match results for run', { runId });

      // TODO: Implement database persistence
      ApiResponseUtil.success(res, {
        runId,
        count: 0,
        matches: [],
        message: 'Database persistence not yet implemented. Use POST /api/matching/analyze to run real-time analysis.',
      });
    } catch (error: any) {
      logger.error('Failed to get match results', error);
      ApiResponseUtil.error(res, 'GET_RESULTS_ERROR', 'Failed to retrieve results', 500, { error: error.message });
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
        baseUrl: process.env.SAP_BASE_URL!,
        auth: {
          type: 'OAUTH' as const,
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
          const sapPos = await connector.getPurchaseOrders({
            poNumbers: filter?.poNumbers,
            suppliers: filter?.vendorIds,
          });
          return sapPos.map(po => ({
            poNumber: po.PurchaseOrder,
            poItem: po.PurchaseOrderItem,
            vendorId: po.Supplier,
            vendorName: po.SupplierName || '',
            materialNumber: po.Material || '',
            materialDescription: po.MaterialName || '',
            orderedQuantity: po.OrderQuantity,
            orderedValue: po.NetPriceAmount * po.OrderQuantity,
            currency: po.Currency,
            unitPrice: po.NetPriceAmount,
            taxAmount: po.TaxAmount || 0,
            deliveryDate: po.DeliveryDate ? new Date(po.DeliveryDate) : new Date(),
            poStatus: (po.PurchasingDocumentStatus as any) || 'OPEN',
            createdBy: po.CreatedByUser || '',
            createdAt: new Date(po.PurchaseOrderDate),
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
          const sapInvoices = await connector.getSupplierInvoices({
            invoiceNumbers: filter?.invoiceNumbers || [invoiceNumber],
          });
          return sapInvoices.map(inv => ({
            invoiceNumber: inv.SupplierInvoice,
            invoiceItem: inv.SupplierInvoiceItem || '1',
            vendorId: inv.Supplier,
            vendorName: inv.SupplierName || '',
            poNumber: inv.PurchaseOrder,
            poItem: inv.PurchaseOrderItem,
            grNumber: inv.ReferenceDocument,
            grItem: inv.ReferenceDocumentItem,
            materialNumber: inv.Material,
            invoicedQuantity: inv.QuantityInPurchaseOrderUnit || 1,
            invoicedAmount: inv.SupplierInvoiceItemAmount,
            taxAmount: inv.TaxAmount || 0,
            totalAmount: inv.SupplierInvoiceItemAmount + (inv.TaxAmount || 0),
            currency: inv.DocumentCurrency,
            invoiceDate: new Date(inv.InvoicingDate),
            postingDate: new Date(inv.PostingDate),
            dueDate: new Date(inv.NetDueDate || inv.PostingDate),
            paymentTerms: inv.PaymentTerms || '',
            invoiceStatus: 'PENDING' as any,
            submittedBy: inv.CreatedByUser,
            submittedAt: new Date(inv.DocumentDate || inv.PostingDate),
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
   * Get fraud alerts
   * NOTE: Currently returns empty as database persistence is not yet implemented
   */
  static async getFraudAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.query;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId is required');
        return;
      }

      logger.info('Getting fraud alerts', { tenantId });

      // TODO: Implement database persistence
      ApiResponseUtil.success(res, {
        count: 0,
        alerts: [],
        message: 'Database persistence not yet implemented. Run POST /api/matching/analyze to see fraud alerts in real-time.',
      });
    } catch (error: any) {
      logger.error('Failed to get fraud alerts', error);
      ApiResponseUtil.error(res, 'GET_FRAUD_ALERTS_ERROR', 'Failed to retrieve alerts', 500, { error: error.message });
    }
  }

  /**
   * GET /api/matching/vendor-patterns
   * Get vendor payment patterns
   * NOTE: Currently returns empty as database persistence is not yet implemented
   */
  static async getVendorPatterns(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.query;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId is required');
        return;
      }

      logger.info('Getting vendor patterns', { tenantId });

      // TODO: Implement database persistence
      ApiResponseUtil.success(res, {
        count: 0,
        vendors: [],
        message: 'Database persistence not yet implemented. Use POST /api/matching/vendor-patterns/analyze for real-time analysis.',
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
        baseUrl: process.env.SAP_BASE_URL!,
        auth: {
          type: 'OAUTH' as const,
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
          const sapInvoices = await connector.getSupplierInvoices({
            suppliers: filter?.vendorIds,
            fromDate: filter?.fromDate,
          });
          return sapInvoices.map(inv => ({
            invoiceNumber: inv.SupplierInvoice,
            invoiceItem: inv.SupplierInvoiceItem || '1',
            vendorId: inv.Supplier,
            vendorName: inv.SupplierName || '',
            poNumber: inv.PurchaseOrder,
            poItem: inv.PurchaseOrderItem,
            grNumber: inv.ReferenceDocument,
            grItem: inv.ReferenceDocumentItem,
            materialNumber: inv.Material,
            invoicedQuantity: inv.QuantityInPurchaseOrderUnit || 1,
            invoicedAmount: inv.SupplierInvoiceItemAmount,
            taxAmount: inv.TaxAmount || 0,
            totalAmount: inv.SupplierInvoiceItemAmount + (inv.TaxAmount || 0),
            currency: inv.DocumentCurrency,
            invoiceDate: new Date(inv.InvoicingDate),
            postingDate: new Date(inv.PostingDate),
            dueDate: new Date(inv.NetDueDate || inv.PostingDate),
            paymentTerms: inv.PaymentTerms || '',
            invoiceStatus: 'PAID' as any,
            submittedBy: inv.CreatedByUser,
            submittedAt: new Date(inv.DocumentDate || inv.PostingDate),
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
