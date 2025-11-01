import { Request, Response, NextFunction } from 'express';
import {
  TenantProfileRepository,
  IPSConnector,
  SoDViolationRepository
} from '@sap-framework/core';
import { UserAccessReviewer } from '@sap-framework/user-access-review';
import { ApiResponseUtil } from '../utils/response';
import { config } from '../config';
import logger from '../utils/logger';
import { AuthenticatedRequest } from '../types';
import { getTenantId, validateResourceOwnership } from '../middleware/tenantIsolation';
import { sanitizeInput, sanitizeViolationDescription } from '../utils/sanitization';

export class SoDController {
  private sodRepo: SoDViolationRepository;

  constructor(private tenantRepo: TenantProfileRepository) {
    this.sodRepo = new SoDViolationRepository(config.databaseUrl);
  }

  /**
   * @swagger
   * /modules/sod/{tenantId}/violations:
   *   get:
   *     summary: List SoD violations
   *     description: Retrieve paginated list of Segregation of Duties violations for a tenant
   *     tags: [SoD]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantId
   *         required: true
   *         schema:
   *           type: string
   *         description: Tenant ID
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           default: 20
   *       - in: query
   *         name: riskLevel
   *         schema:
   *           type: string
   *           enum: [HIGH, MEDIUM, LOW]
   *         description: Filter by risk level
   *     responses:
   *       200:
   *         description: List of violations
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaginatedResponse'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  async listViolations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // ✅ SECURITY FIX: Use validated tenant ID from middleware
      // DEFECT-033: Prevents horizontal privilege escalation
      // DEFECT-034: Fixes IDOR vulnerability
      const tenantId = getTenantId(req);

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const riskLevel = req.query.riskLevel as string;

      logger.info('Listing SoD violations', {
        tenantId,
        page,
        pageSize,
        riskLevel,
        userId: req.user?.id
      });

      const tenant = await this.tenantRepo.getTenant(tenantId);
      if (!tenant) {
        ApiResponseUtil.notFound(res, 'Tenant');
        return;
      }

      // ✅ SECURITY FIX: Additional ownership validation
      // Verify tenant belongs to user (defense-in-depth)
      try {
        validateResourceOwnership(tenant.tenant_id, req);
      } catch (error) {
        logger.warn('Tenant ownership validation failed', {
          userId: req.user?.id,
          requestedTenant: tenantId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        ApiResponseUtil.forbidden(res, 'Access denied to this tenant');
        return;
      }

      // Check if SoD module is active
      const activeModules = await this.tenantRepo.getActiveModules(tenantId);
      if (!activeModules.includes('SoD_Analysis')) {
        ApiResponseUtil.badRequest(res, 'SoD Analysis module not activated for this tenant');
        return;
      }

      // Get violations from database
      const filters: any = {};
      if (riskLevel) {
        filters.riskLevel = [riskLevel];
      }

      const { violations, total } = await this.sodRepo.getViolations(
        tenantId,
        filters,
        { page, pageSize }
      );

      ApiResponseUtil.paginated(
        res,
        violations,
        page,
        pageSize,
        total
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/modules/sod/:tenantId/violations/:violationId
   * Get violation details
   */
  async getViolation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, violationId } = req.params;

      logger.info('Getting violation details', { tenantId, violationId });

      const tenant = await this.tenantRepo.getTenant(tenantId);
      if (!tenant) {
        ApiResponseUtil.notFound(res, 'Tenant');
        return;
      }

      // Get violation from database
      const violation = await this.sodRepo.getViolation(tenantId, violationId);

      if (!violation) {
        ApiResponseUtil.notFound(res, 'Violation');
        return;
      }

      ApiResponseUtil.success(res, violation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/modules/sod/:tenantId/violations/:violationId/acknowledge
   * Acknowledge violation
   */
  async acknowledgeViolation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // ✅ SECURITY FIX: Use validated tenant ID
      const tenantId = getTenantId(req);
      const { violationId } = req.params;
      const { justification, approvedBy } = req.body;

      // ✅ SECURITY FIX: Sanitize user inputs to prevent XSS
      // DEFECT-035: Stored XSS vulnerability fix
      const sanitizedJustification = sanitizeViolationDescription(justification);
      const sanitizedApprovedBy = sanitizeInput(approvedBy, {
        trim: true,
        maxLength: 255,
      });

      logger.info('Acknowledging violation', {
        tenantId,
        violationId,
        userId: req.user?.id
      });

      const tenant = await this.tenantRepo.getTenant(tenantId);
      if (!tenant) {
        ApiResponseUtil.notFound(res, 'Tenant');
        return;
      }

      // ✅ SECURITY FIX: Validate resource ownership
      try {
        validateResourceOwnership(tenant.tenant_id, req);
      } catch (error) {
        ApiResponseUtil.forbidden(res, 'Access denied to this tenant');
        return;
      }

      // Update violation status in database with sanitized data
      await this.sodRepo.updateViolationStatus(violationId, {
        status: 'ACKNOWLEDGED',
        remediationNotes: sanitizedJustification,
        acknowledgedBy: sanitizedApprovedBy,
      });

      logger.info('Violation acknowledged', { tenantId, violationId });

      ApiResponseUtil.success(res, {
        message: 'Violation acknowledged successfully',
        violationId,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/modules/sod/:tenantId/analysis
   * Get latest analysis result
   */
  async getAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = req.params;

      logger.info('Getting latest analysis', { tenantId });

      const tenant = await this.tenantRepo.getTenant(tenantId);
      if (!tenant) {
        ApiResponseUtil.notFound(res, 'Tenant');
        return;
      }

      // Get latest analysis from database
      const analysis = await this.sodRepo.getLatestAnalysis(tenantId);

      if (!analysis) {
        ApiResponseUtil.notFound(res, 'Analysis results');
        return;
      }

      ApiResponseUtil.success(res, analysis);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /modules/sod/{tenantId}/analyze:
   *   post:
   *     summary: Run SoD analysis
   *     description: Trigger a new Segregation of Duties analysis for a tenant
   *     tags: [SoD]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantId
   *         required: true
   *         schema:
   *           type: string
   *         description: Tenant ID
   *     responses:
   *       200:
   *         description: Analysis completed successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponse'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  async runAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = req.params;

      logger.info('Running SoD analysis', { tenantId });

      const tenant = await this.tenantRepo.getTenant(tenantId);
      if (!tenant) {
        ApiResponseUtil.notFound(res, 'Tenant');
        return;
      }

      // Check if module is active
      const activeModules = await this.tenantRepo.getActiveModules(tenantId);
      if (!activeModules.includes('SoD_Analysis')) {
        ApiResponseUtil.badRequest(res, 'SoD Analysis module not activated');
        return;
      }

      // Get IPS connection
      const connection = await this.tenantRepo.getSAPConnection(tenantId);
      if (!connection || connection.connection_type !== 'IPS') {
        ApiResponseUtil.badRequest(res, 'IPS connection not configured');
        return;
      }

      // Create IPS connector
      const ipsConnector = new IPSConnector({
        baseUrl: connection.base_url,
        auth: connection.auth_credentials,
        scim: { version: '2.0' },
      });

      // Create analysis run
      const analysisRun = await this.sodRepo.createAnalysisRun(tenantId, 0);

      try {
        // Run analysis
        const reviewer = new UserAccessReviewer(ipsConnector);
        const result = await reviewer.analyze();

        // Store violations in database
        const violationData = result.violations.map((v: any) => ({
          tenantId,
          analysisId: analysisRun.id!,
          userId: v.userId,
          userName: v.userName,
          userEmail: v.userEmail,
          conflictType: v.conflictType,
          riskLevel: v.riskLevel,
          conflictingRoles: v.conflictingRoles,
          affectedTransactions: v.affectedTransactions,
          businessProcess: v.businessProcess,
          status: 'OPEN' as const,
          detectedAt: new Date(),
        }));

        if (violationData.length > 0) {
          await this.sodRepo.storeViolations(violationData);
        }

        // Complete analysis run
        await this.sodRepo.completeAnalysisRun(analysisRun.id!, {
          total: result.violations.length,
          high: result.violations.filter((v: any) => v.riskLevel === 'HIGH').length,
          medium: result.violations.filter((v: any) => v.riskLevel === 'MEDIUM').length,
          low: result.violations.filter((v: any) => v.riskLevel === 'LOW').length,
        });

        logger.info('SoD analysis completed', {
          tenantId,
          violations: result.violations.length,
        });

        ApiResponseUtil.success(res, result);
      } catch (analysisError: any) {
        // Mark analysis as failed
        await this.sodRepo.failAnalysisRun(analysisRun.id!, analysisError.message);
        throw analysisError;
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/modules/sod/:tenantId/export
   * Export violations report
   */
  async exportReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = req.params;
      const format = (req.query.format as string) || 'json';

      logger.info('Exporting SoD report', { tenantId, format });

      const tenant = await this.tenantRepo.getTenant(tenantId);
      if (!tenant) {
        ApiResponseUtil.notFound(res, 'Tenant');
        return;
      }

      const { violations } = await this.sodRepo.getViolations(tenantId, {});

      if (format === 'csv') {
        // Generate CSV
        const csv = this.generateCSV(violations);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=sod-violations-${tenantId}.csv`);
        res.send(csv);
      } else {
        ApiResponseUtil.success(res, { violations });
      }
    } catch (error) {
      next(error);
    }
  }

  // Helper methods
  private generateCSV(violations: any[]): string {
    if (violations.length === 0) {
      return 'No violations found';
    }

    // CSV headers
    const headers = [
      'User ID',
      'User Name',
      'User Email',
      'Conflict Type',
      'Risk Level',
      'Conflicting Roles',
      'Affected Transactions',
      'Business Process',
      'Status',
      'Detected At',
    ];

    // CSV rows
    const rows = violations.map(v => [
      v.userId || '',
      v.userName || '',
      v.userEmail || '',
      v.conflictType || '',
      v.riskLevel || '',
      Array.isArray(v.conflictingRoles) ? v.conflictingRoles.join('; ') : '',
      Array.isArray(v.affectedTransactions) ? v.affectedTransactions.join('; ') : '',
      v.businessProcess || '',
      v.status || '',
      v.detectedAt ? new Date(v.detectedAt).toISOString() : '',
    ]);

    // Combine headers and rows
    const csvLines = [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell => {
          // Escape quotes and wrap in quotes if contains comma
          const escaped = String(cell).replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('"') ? `"${escaped}"` : escaped;
        }).join(',')
      ),
    ];

    return csvLines.join('\n');
  }
}