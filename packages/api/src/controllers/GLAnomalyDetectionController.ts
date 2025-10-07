/**
 * GL Anomaly Detection Controller
 * Handles statistical fraud detection in GL transactions
 */

import { Request, Response } from 'express';
import { GLAnomalyDetectionEngine, GLDataSource } from '@sap-framework/gl-anomaly-detection';
import { S4HANAConnector } from '@sap-framework/core';
import { ApiResponseUtil } from '../utils/response';
import logger from '../utils/logger';

export class GLAnomalyDetectionController {
  /**
   * POST /api/modules/gl-anomaly/detect
   * Run GL anomaly detection analysis
   */
  static async detectAnomalies(req: Request, res: Response): Promise<void> {
    try {
      const {
        tenantId,
        fiscalYear,
        fiscalPeriod,
        glAccounts,
        fromDate,
        toDate,
        companyCode,
        config,
      } = req.body;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId is required');
        return;
      }

      if (!fiscalYear) {
        ApiResponseUtil.badRequest(res, 'fiscalYear is required');
        return;
      }

      logger.info('Starting GL anomaly detection', { tenantId, fiscalYear, fiscalPeriod });

      // Get SAP connector for tenant
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
      const dataSource = {
        async getGLLineItems(filter?: any) {
          // Fetch GL line items from S/4HANA
          const glLineItems = await connector.getGLLineItems({
            glAccounts: filter?.glAccounts,
            fiscalYear: filter?.fiscalYear || '',
            fiscalPeriod: filter?.fiscalPeriod,
            fromDate: filter?.fromDate,
            toDate: filter?.toDate,
            companyCode: filter?.companyCode,
          });

          return glLineItems.map((item: any) => ({
            documentNumber: item.AccountingDocument,
            lineItem: item.AccountingDocumentItem || '1',
            glAccount: item.GLAccount,
            glAccountName: item.GLAccountName || '',
            companyCode: item.CompanyCode,
            fiscalYear: item.FiscalYear,
            fiscalPeriod: item.FiscalPeriod || item.AccountingDocumentType || '',
            postingDate: new Date(item.PostingDate),
            documentDate: new Date(item.DocumentDate || item.PostingDate),
            amount: parseFloat(item.AmountInCompanyCodeCurrency) || 0,
            currency: item.CompanyCodeCurrency,
            debitCredit: item.DebitCreditCode === 'S' ? 'DEBIT' as const : 'CREDIT' as const,
            documentType: item.AccountingDocumentType || '',
            reference: item.DocumentReferenceID || '',
            description: item.DocumentItemText || item.DocumentHeaderText || '',
            costCenter: item.CostCenter || undefined,
            profitCenter: item.ProfitCenter || undefined,
            userId: item.AccountingDocCreatedByUser || "",
            userName: item.CreatedByUserName || item.AccountingDocCreatedByUser || '',
            postingTime: item.CreationTime || undefined,
          }));
        },
      };

      // Initialize detection engine
      const engine = new GLAnomalyDetectionEngine(dataSource as GLDataSource, config);

      // Run analysis
      const result = await engine.detectAnomalies(tenantId, {
        glAccounts,
        fiscalYear,
        fiscalPeriod,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
        companyCode,
      });

      logger.info('GL anomaly detection completed', {
        tenantId,
        analysisId: result.analysisId,
        totalLineItems: result.totalLineItems,
        anomaliesDetected: result.anomaliesDetected,
      });

      ApiResponseUtil.success(res, {
        analysisId: result.analysisId,
        totalLineItems: result.totalLineItems,
        anomaliesDetected: result.anomaliesDetected,
        summary: result.summary,
        anomalies: result.anomalies,
        accountStats: result.accountStats,
        message: `Analyzed ${result.totalLineItems} GL line items, found ${result.anomaliesDetected} anomalies`,
      });
    } catch (error: any) {
      logger.error('GL anomaly detection failed', error);
      ApiResponseUtil.error(res, 'GL_ANOMALY_DETECTION_ERROR', 'Analysis failed', 500, { error: error.message });
    }
  }

  /**
   * POST /api/modules/gl-anomaly/analyze-account
   * Analyze a specific GL account
   */
  static async analyzeGLAccount(req: Request, res: Response): Promise<void> {
    try {
      const {
        tenantId,
        glAccount,
        fiscalYear,
        fiscalPeriod,
      } = req.body;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId is required');
        return;
      }

      if (!glAccount) {
        ApiResponseUtil.badRequest(res, 'glAccount is required');
        return;
      }

      if (!fiscalYear) {
        ApiResponseUtil.badRequest(res, 'fiscalYear is required');
        return;
      }

      logger.info('Analyzing GL account', { tenantId, glAccount, fiscalYear });

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

      const dataSource = {
        async getGLLineItems(filter?: any) {
          const glLineItems = await connector.getGLLineItems({
            glAccounts: filter?.glAccounts,
            fiscalYear: filter?.fiscalYear || '',
            fiscalPeriod: filter?.fiscalPeriod,
            companyCode: filter?.companyCode,
          });

          return glLineItems.map((item: any) => ({
            documentNumber: item.AccountingDocument,
            lineItem: item.AccountingDocumentItem || '1',
            glAccount: item.GLAccount,
            glAccountName: item.GLAccountName || '',
            companyCode: item.CompanyCode,
            fiscalYear: item.FiscalYear,
            fiscalPeriod: item.FiscalPeriod || item.AccountingDocumentType || '',
            postingDate: new Date(item.PostingDate),
            documentDate: new Date(item.DocumentDate || item.PostingDate),
            amount: parseFloat(item.AmountInCompanyCodeCurrency) || 0,
            currency: item.CompanyCodeCurrency,
            debitCredit: item.DebitCreditCode === 'S' ? 'DEBIT' as const : 'CREDIT' as const,
            documentType: item.AccountingDocumentType || '',
            reference: item.DocumentReferenceID || '',
            description: item.DocumentItemText || item.DocumentHeaderText || '',
            costCenter: item.CostCenter || undefined,
            profitCenter: item.ProfitCenter || undefined,
            userId: item.AccountingDocCreatedByUser || "",
            userName: item.CreatedByUserName || item.AccountingDocCreatedByUser || '',
            postingTime: item.CreationTime || undefined,
          }));
        },
      };

      const engine = new GLAnomalyDetectionEngine(dataSource as GLDataSource);
      const riskProfile = await engine.analyzeGLAccount(tenantId, glAccount, fiscalYear, fiscalPeriod);

      logger.info('GL account analysis completed', {
        tenantId,
        glAccount,
        riskScore: riskProfile.riskScore,
        riskLevel: riskProfile.riskLevel,
      });

      ApiResponseUtil.success(res, {
        glAccount: riskProfile.glAccount,
        glAccountName: riskProfile.glAccountName,
        riskScore: riskProfile.riskScore,
        riskLevel: riskProfile.riskLevel,
        riskFactors: riskProfile.riskFactors,
        anomalyCount: riskProfile.anomalyCount,
        criticalAnomalyCount: riskProfile.criticalAnomalyCount,
        controlWeaknesses: riskProfile.controlWeaknesses,
        recommendations: riskProfile.recommendations,
        lastAssessedAt: riskProfile.lastAssessedAt,
      });
    } catch (error: any) {
      logger.error('GL account analysis failed', error);
      ApiResponseUtil.error(res, 'GL_ACCOUNT_ANALYSIS_ERROR', 'Analysis failed', 500, { error: error.message });
    }
  }

  /**
   * GET /api/modules/gl-anomaly/summary
   * Get summary of anomaly detection capabilities
   */
  static async getSummary(req: Request, res: Response): Promise<void> {
    try {
      ApiResponseUtil.success(res, {
        module: 'GL Anomaly Detection',
        version: '1.0.0',
        capabilities: [
          {
            name: "Benford's Law Analysis",
            description: 'Statistical fraud detection using first-digit distribution',
            enabled: true,
          },
          {
            name: 'Statistical Outliers',
            description: 'IQR and Z-score methods for unusual amounts',
            enabled: true,
          },
          {
            name: 'Behavioral Anomalies',
            description: 'After-hours, weekend, and reversal pattern detection',
            enabled: true,
          },
          {
            name: 'Velocity Analysis',
            description: 'Sudden spikes in transaction volume',
            enabled: true,
          },
          {
            name: 'Round Number Patterns',
            description: 'Detection of suspicious round numbers',
            enabled: true,
          },
          {
            name: 'Duplicate Detection',
            description: 'Identification of duplicate entries',
            enabled: true,
          },
        ],
        requiredSAPServices: [
          'API_FINANCIALPLANDATA_SRV', // GL account data
          'API_JOURNALENTRY_SRV', // Journal entries
        ],
        businessValue: {
          fraudPrevention: 'High',
          auditCompliance: 'High',
          riskReduction: 'Medium-High',
        },
      });
    } catch (error: any) {
      logger.error('Failed to get GL anomaly summary', error);
      ApiResponseUtil.error(res, 'GL_SUMMARY_ERROR', 'Failed to retrieve summary', 500, { error: error.message });
    }
  }
}
