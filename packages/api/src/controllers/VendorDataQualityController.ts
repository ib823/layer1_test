/**
 * Vendor Data Quality Controller
 * Handles vendor master data validation and duplicate detection
 */

import { Request, Response } from 'express';
import { VendorDataQualityEngine, VendorDataSource } from '@sap-framework/vendor-data-quality';
import { S4HANAConnector, VendorQualityRepository, PrismaClient } from '@sap-framework/core';
import { ApiResponseUtil } from '../utils/response';
import logger from '../utils/logger';

const prisma = new PrismaClient();
const repository = new VendorQualityRepository(prisma);

export class VendorDataQualityController {
  /**
   * POST /api/modules/vendor-quality/analyze
   * Run vendor data quality analysis
   */
  static async analyzeVendorQuality(req: Request, res: Response): Promise<void> {
    try {
      const {
        tenantId,
        vendorIds,
        countries,
        isBlocked,
        modifiedSince,
      } = req.body;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId is required');
        return;
      }

      logger.info('Starting vendor data quality analysis', { tenantId });

      // Get SAP connector for tenant
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
      const dataSource = {
        async getVendors(filter?: any) {
          const businessPartners = await connector.getBusinessPartners({
            businessPartnerIds: filter?.vendorIds,
            countries: filter?.countries,
            isBlocked: filter?.isBlocked,
          });

          return businessPartners.map((bp: any) => ({
            vendorId: bp.BusinessPartner,
            vendorName: bp.BusinessPartnerFullName || bp.BusinessPartnerName,
            taxId: bp.TaxNumber1 || undefined,
            country: bp.Country,
            city: bp.CityName || undefined,
            postalCode: bp.PostalCode || undefined,
            street: bp.StreetName || undefined,
            bankAccounts: (bp.BankAccounts || []).map((ba: any) => ({
              bankKey: ba.BankInternalID || '',
              bankAccountNumber: ba.BankAccount || '',
              bankCountry: ba.BankCountry || bp.Country || '',
              iban: ba.IBAN || undefined,
              swift: ba.SWIFTCode || undefined,
              accountHolderName: ba.BankAccountHolderName || undefined,
            })),
            email: bp.EmailAddress || undefined,
            phone: bp.PhoneNumber || undefined,
            paymentTerms: bp.PaymentTerms || undefined,
            currency: bp.Currency || undefined,
            createdAt: new Date(bp.CreationDate || Date.now()),
            createdBy: bp.CreatedByUser || undefined,
            lastModifiedAt: bp.LastChangeDate ? new Date(bp.LastChangeDate) : undefined,
            lastModifiedBy: bp.LastChangedByUser || undefined,
            isBlocked: bp.IsBlocked || false,
            blockReason: bp.BlockReason || undefined,
          }));
        },

        async getVendor(vendorId: string) {
          const businessPartners = await connector.getBusinessPartners({
            businessPartnerIds: [vendorId],
          });

          if (businessPartners.length === 0) {
            return null;
          }

          const bp = businessPartners[0];
          return {
            vendorId: bp.BusinessPartner,
            vendorName: bp.BusinessPartnerFullName || bp.BusinessPartnerName,
            taxId: bp.TaxNumber1 || undefined,
            country: bp.Country,
            city: bp.CityName || undefined,
            postalCode: bp.PostalCode || undefined,
            street: bp.StreetName || undefined,
            bankAccounts: (bp.BankAccounts || []).map((ba: any) => ({
              bankKey: ba.BankInternalID || '',
              bankAccountNumber: ba.BankAccount || '',
              bankCountry: ba.BankCountry || bp.Country || '',
              iban: ba.IBAN || undefined,
              swift: ba.SWIFTCode || undefined,
              accountHolderName: ba.BankAccountHolderName || undefined,
            })),
            email: bp.EmailAddress || undefined,
            phone: bp.PhoneNumber || undefined,
            paymentTerms: bp.PaymentTerms || undefined,
            currency: bp.Currency || undefined,
            createdAt: new Date(bp.CreationDate || Date.now()),
            createdBy: bp.CreatedByUser || undefined,
            lastModifiedAt: bp.LastChangeDate ? new Date(bp.LastChangeDate) : undefined,
            lastModifiedBy: bp.LastChangedByUser || undefined,
            isBlocked: bp.IsBlocked || false,
            blockReason: bp.BlockReason || undefined,
          };
        },
      };

      // Initialize quality engine
      const engine = new VendorDataQualityEngine(dataSource as VendorDataSource);

      // Run analysis
      const result = await engine.analyzeVendorQuality(tenantId, {
        vendorIds,
        countries,
        isBlocked,
        modifiedSince: modifiedSince ? new Date(modifiedSince) : undefined,
      });

      logger.info('Vendor data quality analysis completed', {
        tenantId,
        analysisId: result.analysisId,
        totalVendors: result.totalVendors,
        averageQualityScore: result.averageQualityScore,
      });

      // Persist results to database
      const qualityIssues = (result.qualityScores || []).flatMap((qs: any) =>
        (qs.issues || []).map((issue: any) => ({
          vendorId: qs.vendorId,
          vendorName: qs.vendorName || '',
          issueType: issue.type || 'missing_field',
          severity: issue.severity || 'medium',
          fieldName: issue.field,
          currentValue: issue.currentValue,
          suggestedValue: issue.suggestedValue,
          description: issue.description || issue.message || '',
          qualityScore: qs.overallScore || 0,
        }))
      );

      const duplicateClusters = (result.duplicates || []).map((dup: any) => ({
        clusterSize: dup.vendors?.length || 2,
        vendorIds: dup.vendors?.map((v: any) => v.vendorId) || [],
        vendorNames: dup.vendors?.map((v: any) => v.vendorName) || [],
        similarityScore: dup.similarityScore || dup.confidence || 75,
        matchFields: dup.matchedFields || dup.matchFields || [],
        estimatedSavings: dup.estimatedSavings || 0,
        recommendedAction: dup.recommendation || 'Review for potential merge',
        reviewedBy: null,
        reviewedAt: null,
        notes: null,
      }));

      const dbRun = await repository.createRun({
        tenantId,
        totalVendors: result.totalVendors,
        issuesFound: qualityIssues.length,
        duplicatesFound: duplicateClusters.length,
        potentialSavings: duplicateClusters.reduce((sum: number, c: any) => sum + c.estimatedSavings, 0),
        parameters: {
          vendorIds,
          countries,
          isBlocked,
          modifiedSince,
        },
        summary: result.summary || {},
      });

      // Persist quality issues
      if (qualityIssues.length > 0) {
        await repository.saveQualityIssues(dbRun.id, qualityIssues);
      }

      // Persist duplicate clusters
      if (duplicateClusters.length > 0) {
        await repository.saveDuplicateClusters(dbRun.id, duplicateClusters);
      }

      ApiResponseUtil.success(res, {
        runId: dbRun.id,
        analysisId: result.analysisId,
        totalVendors: result.totalVendors,
        averageQualityScore: result.averageQualityScore,
        summary: result.summary,
        qualityScores: result.qualityScores,
        duplicates: result.duplicates,
        riskProfiles: result.riskProfiles,
        message: `Analyzed ${result.totalVendors} vendors, average quality score: ${result.averageQualityScore}/100`,
      });
    } catch (error: any) {
      logger.error('Vendor data quality analysis failed', error);
      ApiResponseUtil.error(res, 'VENDOR_QUALITY_ANALYSIS_ERROR', 'Analysis failed', 500, { error: error.message });
    }
  }

  /**
   * GET /api/modules/vendor-quality/runs/:runId
   * Get vendor quality results for a specific run
   */
  static async getRun(req: Request, res: Response): Promise<void> {
    try {
      const { runId } = req.params;

      logger.info('Getting vendor quality run', { runId });

      const run = await repository.getRun(runId);

      if (!run) {
        ApiResponseUtil.notFound(res, `Run ${runId} not found`);
        return;
      }

      ApiResponseUtil.success(res, {
        runId: run.id,
        runDate: run.runDate,
        status: run.status,
        totalVendors: run.totalVendors,
        issuesFound: run.issuesFound,
        duplicatesFound: run.duplicatesFound,
        potentialSavings: run.potentialSavings,
        summary: run.summary,
        parameters: run.parameters,
      });
    } catch (error: any) {
      logger.error('Failed to get vendor quality run', error);
      ApiResponseUtil.error(res, 'GET_RUN_ERROR', 'Failed to retrieve run', 500, { error: error.message });
    }
  }

  /**
   * GET /api/modules/vendor-quality/runs
   * Get all runs for a tenant
   */
  static async getRuns(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.query;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId is required');
        return;
      }

      logger.info('Getting vendor quality runs for tenant', { tenantId });

      const runs = await repository.getRunsByTenant(tenantId as string);

      ApiResponseUtil.success(res, {
        count: runs.length,
        runs,
      });
    } catch (error: any) {
      logger.error('Failed to get vendor quality runs', error);
      ApiResponseUtil.error(res, 'GET_RUNS_ERROR', 'Failed to retrieve runs', 500, { error: error.message });
    }
  }

  /**
   * POST /api/modules/vendor-quality/analyze-vendor
   * Analyze a single vendor
   */
  static async analyzeSingleVendor(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, vendorId } = req.body;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId is required');
        return;
      }

      if (!vendorId) {
        ApiResponseUtil.badRequest(res, 'vendorId is required');
        return;
      }

      logger.info('Analyzing single vendor', { tenantId, vendorId });

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

      const dataSource = {
        async getVendors(filter?: any) {
          const businessPartners = await connector.getBusinessPartners({
            businessPartnerIds: filter?.vendorIds,
          });

          return businessPartners.map((bp: any) => ({
            vendorId: bp.BusinessPartner,
            vendorName: bp.BusinessPartnerFullName || bp.BusinessPartnerName,
            taxId: bp.TaxNumber1 || undefined,
            country: bp.Country,
            city: bp.CityName || undefined,
            postalCode: bp.PostalCode || undefined,
            street: bp.StreetName || undefined,
            bankAccounts: (bp.BankAccounts || []).map((ba: any) => ({
              bankKey: ba.BankInternalID || '',
              bankAccountNumber: ba.BankAccount || '',
              bankCountry: ba.BankCountry || bp.Country || '',
              iban: ba.IBAN || undefined,
              swift: ba.SWIFTCode || undefined,
              accountHolderName: ba.BankAccountHolderName || undefined,
            })),
            email: bp.EmailAddress || undefined,
            phone: bp.PhoneNumber || undefined,
            paymentTerms: bp.PaymentTerms || undefined,
            currency: bp.Currency || undefined,
            createdAt: new Date(bp.CreationDate || Date.now()),
            createdBy: bp.CreatedByUser || undefined,
            lastModifiedAt: bp.LastChangeDate ? new Date(bp.LastChangeDate) : undefined,
            lastModifiedBy: bp.LastChangedByUser || undefined,
            isBlocked: bp.IsBlocked || false,
            blockReason: bp.BlockReason || undefined,
          }));
        },

        async getVendor(id: string) {
          const businessPartners = await connector.getBusinessPartners({
            businessPartnerIds: [id],
          });

          if (businessPartners.length === 0) {
            return null;
          }

          const bp = businessPartners[0];
          return {
            vendorId: bp.BusinessPartner,
            vendorName: bp.BusinessPartnerFullName || bp.BusinessPartnerName,
            taxId: bp.TaxNumber1 || undefined,
            country: bp.Country,
            city: bp.CityName || undefined,
            postalCode: bp.PostalCode || undefined,
            street: bp.StreetName || undefined,
            bankAccounts: (bp.BankAccounts || []).map((ba: any) => ({
              bankKey: ba.BankInternalID || '',
              bankAccountNumber: ba.BankAccount || '',
              bankCountry: ba.BankCountry || bp.Country || '',
              iban: ba.IBAN || undefined,
              swift: ba.SWIFTCode || undefined,
              accountHolderName: ba.BankAccountHolderName || undefined,
            })),
            email: bp.EmailAddress || undefined,
            phone: bp.PhoneNumber || undefined,
            paymentTerms: bp.PaymentTerms || undefined,
            currency: bp.Currency || undefined,
            createdAt: new Date(bp.CreationDate || Date.now()),
            createdBy: bp.CreatedByUser || undefined,
            lastModifiedAt: bp.LastChangeDate ? new Date(bp.LastChangeDate) : undefined,
            lastModifiedBy: bp.LastChangedByUser || undefined,
            isBlocked: bp.IsBlocked || false,
            blockReason: bp.BlockReason || undefined,
          };
        },
      };

      const engine = new VendorDataQualityEngine(dataSource as VendorDataSource);
      const result = await engine.analyzeSingleVendor(tenantId, vendorId);

      if (!result) {
        ApiResponseUtil.notFound(res, `Vendor ${vendorId} not found`);
        return;
      }

      logger.info('Single vendor analysis completed', {
        tenantId,
        vendorId,
        qualityScore: result.qualityScore.overallScore,
        riskScore: result.riskProfile.riskScore,
      });

      ApiResponseUtil.success(res, {
        vendor: result.vendor,
        qualityScore: result.qualityScore,
        duplicates: result.duplicates,
        riskProfile: result.riskProfile,
      });
    } catch (error: any) {
      logger.error('Single vendor analysis failed', error);
      ApiResponseUtil.error(res, 'SINGLE_VENDOR_ANALYSIS_ERROR', 'Analysis failed', 500, { error: error.message });
    }
  }

  /**
   * POST /api/modules/vendor-quality/deduplicate
   * Run deduplication analysis
   */
  static async runDeduplication(req: Request, res: Response): Promise<void> {
    try {
      const {
        tenantId,
        vendorIds,
        countries,
      } = req.body;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId is required');
        return;
      }

      logger.info('Running vendor deduplication', { tenantId });

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

      const dataSource = {
        async getVendors(filter?: any) {
          const businessPartners = await connector.getBusinessPartners({
            businessPartnerIds: filter?.vendorIds,
            countries: filter?.countries,
          });

          return businessPartners.map((bp: any) => ({
            vendorId: bp.BusinessPartner,
            vendorName: bp.BusinessPartnerFullName || bp.BusinessPartnerName,
            taxId: bp.TaxNumber1 || undefined,
            country: bp.Country,
            city: bp.CityName || undefined,
            postalCode: bp.PostalCode || undefined,
            street: bp.StreetName || undefined,
            bankAccounts: (bp.BankAccounts || []).map((ba: any) => ({
              bankKey: ba.BankInternalID || '',
              bankAccountNumber: ba.BankAccount || '',
              bankCountry: ba.BankCountry || bp.Country || '',
              iban: ba.IBAN || undefined,
              swift: ba.SWIFTCode || undefined,
              accountHolderName: ba.BankAccountHolderName || undefined,
            })),
            email: bp.EmailAddress || undefined,
            phone: bp.PhoneNumber || undefined,
            paymentTerms: bp.PaymentTerms || undefined,
            currency: bp.Currency || undefined,
            createdAt: new Date(bp.CreationDate || Date.now()),
            createdBy: bp.CreatedByUser || undefined,
            lastModifiedAt: bp.LastChangeDate ? new Date(bp.LastChangeDate) : undefined,
            lastModifiedBy: bp.LastChangedByUser || undefined,
            isBlocked: bp.IsBlocked || false,
            blockReason: bp.BlockReason || undefined,
          }));
        },

        async getVendor(_id: string) {
          return null; // Not needed for deduplication
        },
      };

      const engine = new VendorDataQualityEngine(dataSource as VendorDataSource);
      const result = await engine.runDeduplication(tenantId, {
        vendorIds,
        countries,
      });

      logger.info('Vendor deduplication completed', {
        tenantId,
        totalVendors: result.totalVendors,
        duplicatesFound: result.duplicatesFound,
        potentialSavings: result.potentialSavings,
      });

      ApiResponseUtil.success(res, {
        totalVendors: result.totalVendors,
        duplicatesFound: result.duplicatesFound,
        potentialDuplicates: result.potentialDuplicates,
        confirmedDuplicates: result.confirmedDuplicates,
        falsPositives: result.falsPositives,
        duplicateGroups: result.duplicateGroups,
        potentialSavings: result.potentialSavings,
        message: `Found ${result.duplicatesFound} potential duplicates, estimated savings: $${result.potentialSavings.toLocaleString()}`,
      });
    } catch (error: any) {
      logger.error('Vendor deduplication failed', error);
      ApiResponseUtil.error(res, 'VENDOR_DEDUPLICATION_ERROR', 'Deduplication failed', 500, { error: error.message });
    }
  }

  /**
   * GET /api/modules/vendor-quality/summary
   * Get summary of vendor data quality capabilities
   */
  static async getSummary(req: Request, res: Response): Promise<void> {
    try {
      ApiResponseUtil.success(res, {
        module: 'Vendor Data Quality',
        version: '1.0.0',
        capabilities: [
          {
            name: 'Data Quality Scoring',
            description: '0-100 score per vendor based on completeness/accuracy',
            enabled: true,
          },
          {
            name: 'Duplicate Detection',
            description: 'Fuzzy matching for vendor names, addresses, tax IDs, bank accounts',
            enabled: true,
          },
          {
            name: 'Risk Profiling',
            description: 'Vendor risk assessment based on data quality and duplicates',
            enabled: true,
          },
          {
            name: 'Missing Field Detection',
            description: 'Identify critical missing vendor data',
            enabled: true,
          },
          {
            name: 'Savings Estimation',
            description: 'Calculate potential cost savings from duplicate elimination',
            enabled: true,
          },
        ],
        requiredSAPServices: [
          'API_BUSINESS_PARTNER', // Vendor master data
        ],
        businessValue: {
          costSavings: '$1K-$5K per duplicate eliminated',
          dataAccuracy: 'High',
          auditCompliance: 'Medium-High',
        },
      });
    } catch (error: any) {
      logger.error('Failed to get vendor quality summary', error);
      ApiResponseUtil.error(res, 'VENDOR_SUMMARY_ERROR', 'Failed to retrieve summary', 500, { error: error.message });
    }
  }
}
