/**
 * Invoice Matching Controller
 * Handles three-way match operations and fraud detection
 */

import { Request, Response } from 'express';
import { InvoiceMatchingEngine, DataSource } from '@sap-framework/invoice-matching';
import { S4HANAConnector } from '@sap-framework/core';
import { InvoiceMatchRepository } from '@sap-framework/core';
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
        client: process.env.SAP_CLIENT!,
        auth: {
          type: 'OAUTH' as const,
          clientId: process.env.SAP_CLIENT_ID!,
          clientSecret: process.env.SAP_CLIENT_SECRET!,
          tokenUrl: process.env.SAP_TOKEN_URL!,
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
            poNumbers: filter?.poNumbers,
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

      // Save to database
      const repository = new InvoiceMatchRepository(process.env.DATABASE_URL!);

      try {
        // Create run record
        const runRecord = await repository.createAnalysisRun(tenantId, {
          runId: result.runId,
          status: 'COMPLETED',
          config: engine.getConfig(),
          statistics: result.statistics,
          startedAt: new Date(),
          completedAt: result.completedAt,
        });

        // Save match results
        const matchRecords = result.matches.map(m => ({
          ...m,
          tenantId,
          runId: result.runId,
        }));

        await repository.saveMatchResults(tenantId, runRecord.id, matchRecords);

        logger.info('Invoice matching analysis completed', {
          tenantId,
          runId: result.runId,
          totalInvoices: result.statistics.totalInvoices,
          fraudAlerts: result.statistics.fraudAlerts,
        });

        ApiResponseUtil.success(res, {
          runId: result.runId,
          statistics: result.statistics,
          matchCount: result.matches.length,
          message: `Analyzed ${result.statistics.totalInvoices} invoices`,
        });
      } finally {
        await repository.close();
      }
    } catch (error: any) {
      logger.error('Invoice matching analysis failed', error);
      ApiResponseUtil.error(res, 'Analysis failed', 500, error.message);
    }
  }

  /**
   * GET /api/matching/runs/:runId
   * Get match results for a specific run
   */
  static async getMatchResults(req: Request, res: Response): Promise<void> {
    try {
      const { runId } = req.params;
      const {
        matchStatus,
        minRiskScore,
        maxRiskScore,
        limit = 100,
        offset = 0,
      } = req.query;

      const repository = new InvoiceMatchRepository(process.env.DATABASE_URL!);

      try {
        const results = await repository.getMatchResults(runId, {
          matchStatus: matchStatus ? (matchStatus as string).split(',') : undefined,
          minRiskScore: minRiskScore ? parseInt(minRiskScore as string) : undefined,
          maxRiskScore: maxRiskScore ? parseInt(maxRiskScore as string) : undefined,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        });

        ApiResponseUtil.success(res, {
          runId,
          count: results.length,
          matches: results,
        });
      } finally {
        await repository.close();
      }
    } catch (error: any) {
      logger.error('Failed to get match results', error);
      ApiResponseUtil.error(res, 'Failed to retrieve results', 500, error.message);
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
        client: process.env.SAP_CLIENT!,
        auth: {
          type: 'OAUTH' as const,
          clientId: process.env.SAP_CLIENT_ID!,
          clientSecret: process.env.SAP_CLIENT_SECRET!,
          tokenUrl: process.env.SAP_TOKEN_URL!,
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
      ApiResponseUtil.error(res, 'Match failed', 500, error.message);
    }
  }

  /**
   * GET /api/matching/fraud-alerts
   * Get fraud alerts
   */
  static async getFraudAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.query;
      const {
        pattern,
        severity,
        status,
        fromDate,
        toDate,
        limit = 100,
        offset = 0,
      } = req.query;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId is required');
        return;
      }

      const repository = new InvoiceMatchRepository(process.env.DATABASE_URL!);

      try {
        const alerts = await repository.getFraudAlerts(tenantId as string, {
          pattern: pattern ? (pattern as string).split(',') : undefined,
          severity: severity ? (severity as string).split(',') : undefined,
          status: status ? (status as string).split(',') : undefined,
          fromDate: fromDate ? new Date(fromDate as string) : undefined,
          toDate: toDate ? new Date(toDate as string) : undefined,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        });

        ApiResponseUtil.success(res, {
          count: alerts.length,
          alerts,
        });
      } finally {
        await repository.close();
      }
    } catch (error: any) {
      logger.error('Failed to get fraud alerts', error);
      ApiResponseUtil.error(res, 'Failed to retrieve alerts', 500, error.message);
    }
  }

  /**
   * GET /api/matching/vendor-patterns
   * Get vendor payment patterns
   */
  static async getVendorPatterns(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.query;
      const {
        vendorIds,
        minRiskScore,
        limit = 100,
        offset = 0,
      } = req.query;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId is required');
        return;
      }

      const repository = new InvoiceMatchRepository(process.env.DATABASE_URL!);

      try {
        const patterns = await repository.getVendorPatterns(tenantId as string, {
          vendorIds: vendorIds ? (vendorIds as string).split(',') : undefined,
          minRiskScore: minRiskScore ? parseInt(minRiskScore as string) : undefined,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        });

        ApiResponseUtil.success(res, {
          count: patterns.length,
          vendors: patterns,
        });
      } finally {
        await repository.close();
      }
    } catch (error: any) {
      logger.error('Failed to get vendor patterns', error);
      ApiResponseUtil.error(res, 'Failed to retrieve patterns', 500, error.message);
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
        client: process.env.SAP_CLIENT!,
        auth: {
          type: 'OAUTH' as const,
          clientId: process.env.SAP_CLIENT_ID!,
          clientSecret: process.env.SAP_CLIENT_SECRET!,
          tokenUrl: process.env.SAP_TOKEN_URL!,
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

      // Save to database
      const repository = new InvoiceMatchRepository(process.env.DATABASE_URL!);
      try {
        for (const pattern of patterns) {
          await repository.saveVendorPattern(tenantId, pattern);
        }

        ApiResponseUtil.success(res, {
          count: patterns.length,
          vendors: patterns,
        });
      } finally {
        await repository.close();
      }
    } catch (error: any) {
      logger.error('Failed to analyze vendor patterns', error);
      ApiResponseUtil.error(res, 'Analysis failed', 500, error.message);
    }
  }
}
