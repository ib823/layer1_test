/**
 * LHDN Invoice API Controller
 *
 * REST API endpoints for LHDN MyInvois e-invoicing
 */

import { Request, Response, NextFunction } from 'express';
import { LHDNInvoiceEngine } from '../engine/LHDNInvoiceEngine';
import { LHDNInvoiceRepository } from '../repository/LHDNInvoiceRepository';
import { logger } from '../utils/logger';

export interface LHDNInvoiceControllerConfig {
  databaseUrl: string;
}

/**
 * LHDN Invoice Controller
 *
 * Provides REST API endpoints for LHDN e-invoicing operations
 */
export class LHDNInvoiceController {
  private repository: LHDNInvoiceRepository;

  constructor(private config: LHDNInvoiceControllerConfig) {
    this.repository = new LHDNInvoiceRepository(config.databaseUrl);
  }

  /**
   * @swagger
   * /lhdn/invoices/submit:
   *   post:
   *     summary: Submit SAP billing document as LHDN e-invoice
   *     description: Convert and submit SAP billing document to LHDN MyInvois
   *     tags: [LHDN e-Invoice]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - sapBillingDocument
   *               - sapCompanyCode
   *             properties:
   *               sapBillingDocument:
   *                 type: string
   *                 description: SAP billing document number
   *               sapCompanyCode:
   *                 type: string
   *                 description: SAP company code
   *               autoSubmit:
   *                 type: boolean
   *                 description: Auto-submit to LHDN after validation
   *                 default: false
   *     responses:
   *       200:
   *         description: Invoice submission result
   *       400:
   *         description: Validation errors
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   */
  async submitInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.params.tenantId || res.locals.tenantId;
      const userId = res.locals.userId || 'SYSTEM';
      const { sapBillingDocument, sapCompanyCode, autoSubmit } = req.body;

      if (!sapBillingDocument || !sapCompanyCode) {
        res.status(400).json({
          success: false,
          error: 'sapBillingDocument and sapCompanyCode are required',
        });
        return;
      }

      logger.info('Submitting LHDN invoice', {
        tenantId,
        sapBillingDocument,
        autoSubmit,
      });

      // Create engine instance
      const engine = new LHDNInvoiceEngine({
        databaseUrl: this.config.databaseUrl,
        tenantId,
        createdBy: userId,
      });

      // Initialize with SAP connector (from request context)
      const sapConnector = res.locals.sapConnector;
      if (!sapConnector) {
        res.status(400).json({
          success: false,
          error: 'SAP connector not available. Ensure tenant is properly configured.',
        });
        return;
      }

      await engine.initialize(sapConnector);

      // Submit invoice
      const result = await engine.submitInvoice({
        sapBillingDocument,
        sapCompanyCode,
        autoSubmit,
      });

      await engine.close();

      res.status(200).json({
        success: true,
        data: result,
        requestId: res.locals.requestId,
      });
    } catch (error: any) {
      logger.error('Submit invoice failed', { error: error.message });
      next(error);
    }
  }

  /**
   * @swagger
   * /lhdn/invoices/{invoiceId}:
   *   get:
   *     summary: Get invoice details and status
   *     description: Retrieve LHDN invoice details and query LHDN status
   *     tags: [LHDN e-Invoice]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: invoiceId
   *         required: true
   *         schema:
   *           type: string
   *         description: Invoice ID
   *     responses:
   *       200:
   *         description: Invoice details
   *       404:
   *         description: Invoice not found
   */
  async getInvoiceStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.params.tenantId || res.locals.tenantId;
      const userId = res.locals.userId || 'SYSTEM';
      const { invoiceId } = req.params;

      logger.info('Getting invoice status', { tenantId, invoiceId });

      const engine = new LHDNInvoiceEngine({
        databaseUrl: this.config.databaseUrl,
        tenantId,
        createdBy: userId,
      });

      const sapConnector = res.locals.sapConnector;
      await engine.initialize(sapConnector);

      const result = await engine.getInvoiceStatus(invoiceId);
      await engine.close();

      if (!result.invoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found',
          requestId: res.locals.requestId,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
        requestId: res.locals.requestId,
      });
    } catch (error: any) {
      logger.error('Get invoice status failed', { error: error.message });
      next(error);
    }
  }

  /**
   * @swagger
   * /lhdn/invoices:
   *   get:
   *     summary: List LHDN invoices
   *     description: Get paginated list of LHDN e-invoices for tenant
   *     tags: [LHDN e-Invoice]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [DRAFT, VALIDATED, SUBMITTED, ACCEPTED, REJECTED, CANCELLED]
   *       - in: query
   *         name: documentType
   *         schema:
   *           type: string
   *           enum: ['01', '02', '03', '04', '11']
   *       - in: query
   *         name: fromDate
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: toDate
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *     responses:
   *       200:
   *         description: List of invoices
   */
  async listInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.params.tenantId || res.locals.tenantId;
      const { status, documentType, fromDate, toDate, limit, offset } = req.query;

      logger.info('Listing LHDN invoices', { tenantId, status, documentType });

      const invoices = await this.repository.getInvoicesByTenant(tenantId, {
        status: status as any,
        documentType: documentType as any,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
      });

      res.status(200).json({
        success: true,
        data: invoices,
        count: invoices.length,
        requestId: res.locals.requestId,
      });
    } catch (error: any) {
      logger.error('List invoices failed', { error: error.message });
      next(error);
    }
  }

  /**
   * @swagger
   * /lhdn/invoices/{invoiceId}/cancel:
   *   post:
   *     summary: Cancel an accepted invoice
   *     description: Cancel a previously accepted LHDN invoice
   *     tags: [LHDN e-Invoice]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: invoiceId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - cancellationReason
   *             properties:
   *               cancellationReason:
   *                 type: string
   *     responses:
   *       200:
   *         description: Cancellation result
   */
  async cancelInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.params.tenantId || res.locals.tenantId;
      const userId = res.locals.userId || 'SYSTEM';
      const { invoiceId } = req.params;
      const { cancellationReason } = req.body;

      if (!cancellationReason) {
        res.status(400).json({
          success: false,
          error: 'cancellationReason is required',
        });
        return;
      }

      logger.info('Cancelling LHDN invoice', { tenantId, invoiceId });

      const engine = new LHDNInvoiceEngine({
        databaseUrl: this.config.databaseUrl,
        tenantId,
        createdBy: userId,
      });

      const sapConnector = res.locals.sapConnector;
      await engine.initialize(sapConnector);

      const result = await engine.cancelInvoice(invoiceId, cancellationReason);
      await engine.close();

      res.status(200).json({
        success: result.success,
        data: result,
        requestId: res.locals.requestId,
      });
    } catch (error: any) {
      logger.error('Cancel invoice failed', { error: error.message });
      next(error);
    }
  }

  /**
   * @swagger
   * /lhdn/invoices/bulk-submit:
   *   post:
   *     summary: Submit multiple invoices in bulk
   *     description: Validate or submit multiple invoices at once
   *     tags: [LHDN e-Invoice]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - invoiceIds
   *             properties:
   *               invoiceIds:
   *                 type: array
   *                 items:
   *                   type: string
   *               validateOnly:
   *                 type: boolean
   *                 default: false
   *     responses:
   *       200:
   *         description: Bulk submission result
   */
  async bulkSubmit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.params.tenantId || res.locals.tenantId;
      const userId = res.locals.userId || 'SYSTEM';
      const { invoiceIds, validateOnly } = req.body;

      if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'invoiceIds array is required',
        });
        return;
      }

      logger.info('Bulk submitting LHDN invoices', {
        tenantId,
        count: invoiceIds.length,
        validateOnly,
      });

      const engine = new LHDNInvoiceEngine({
        databaseUrl: this.config.databaseUrl,
        tenantId,
        createdBy: userId,
      });

      const sapConnector = res.locals.sapConnector;
      await engine.initialize(sapConnector);

      const result = await engine.submitBulk({
        tenantId,
        invoiceIds,
        validateOnly,
      });

      await engine.close();

      res.status(200).json({
        success: true,
        data: result,
        requestId: res.locals.requestId,
      });
    } catch (error: any) {
      logger.error('Bulk submit failed', { error: error.message });
      next(error);
    }
  }

  /**
   * @swagger
   * /lhdn/compliance/report:
   *   get:
   *     summary: Get compliance report
   *     description: Generate compliance report for date range
   *     tags: [LHDN e-Invoice]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *     responses:
   *       200:
   *         description: Compliance report
   */
  async getComplianceReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.params.tenantId || res.locals.tenantId;
      const userId = res.locals.userId || 'SYSTEM';
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'startDate and endDate are required',
        });
        return;
      }

      logger.info('Generating compliance report', { tenantId, startDate, endDate });

      const engine = new LHDNInvoiceEngine({
        databaseUrl: this.config.databaseUrl,
        tenantId,
        createdBy: userId,
      });

      const sapConnector = res.locals.sapConnector;
      await engine.initialize(sapConnector);

      const report = await engine.getComplianceReport(
        new Date(startDate as string),
        new Date(endDate as string)
      );

      await engine.close();

      res.status(200).json({
        success: true,
        data: report,
        requestId: res.locals.requestId,
      });
    } catch (error: any) {
      logger.error('Get compliance report failed', { error: error.message });
      next(error);
    }
  }
}
