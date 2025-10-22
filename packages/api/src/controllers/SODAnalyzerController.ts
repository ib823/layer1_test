/**
 * SoD Analyzer Controller
 *
 * Comprehensive API controller for Segregation of Duties analysis
 * Uses SODAnalyzerEngine for multi-system access control violation detection
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient, TenantProfileRepository } from '@sap-framework/core';
import { SODAnalyzerEngine } from '@sap-framework/sod-control';
import { ApiResponseUtil } from '../utils/response';
import { config } from '../config';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class SODAnalyzerController {
  private tenantRepo: TenantProfileRepository;

  constructor() {
    this.tenantRepo = new TenantProfileRepository(config.databaseUrl);
  }

  /**
   * POST /api/modules/sod/analyze
   * Run comprehensive SoD analysis for a tenant
   *
   * @swagger
   * /modules/sod/analyze:
   *   post:
   *     summary: Run SoD Analysis
   *     description: Trigger comprehensive Segregation of Duties analysis across all systems
   *     tags: [SoD]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               tenantId:
   *                 type: string
   *                 description: Tenant ID
   *               config:
   *                 type: object
   *                 properties:
   *                   mode:
   *                     type: string
   *                     enum: [snapshot, delta]
   *                   includeInactive:
   *                     type: boolean
   *                   riskLevels:
   *                     type: array
   *                     items:
   *                       type: string
   *                       enum: [CRITICAL, HIGH, MEDIUM, LOW]
   *     responses:
   *       200:
   *         description: Analysis completed successfully
   *       400:
   *         description: Bad request
   *       401:
   *         description: Unauthorized
   */
  async runAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, config: analysisConfig } = req.body;

      logger.info('Starting SoD analysis', { tenantId });

      // Validate tenant
      const tenant = await this.tenantRepo.getTenant(tenantId);
      if (!tenant) {
        ApiResponseUtil.notFound(res, 'Tenant');
        return;
      }

      // Check if SoD module is active
      const activeModules = await this.tenantRepo.getActiveModules(tenantId);
      if (!activeModules.includes('SoD_Analysis')) {
        ApiResponseUtil.badRequest(res, 'SoD Analysis module not activated for this tenant');
        return;
      }

      // Create analyzer engine with database connection
      const analyzer = new SODAnalyzerEngine({
        database: prisma,
      });

      // Run comprehensive analysis
      const result = await analyzer.analyzeAllUsers(tenantId, analysisConfig);

      logger.info('SoD analysis completed', {
        tenantId,
        totalFindings: result.totalFindings,
        criticalCount: result.criticalCount,
        highCount: result.highCount,
      });

      ApiResponseUtil.success(res, {
        analysisId: result.analysisId,
        totalFindings: result.totalFindings,
        findings: result.findings,
        summary: {
          critical: result.criticalCount,
          high: result.highCount,
          medium: result.mediumCount,
          low: result.lowCount,
        },
        statistics: {
          totalUsersAnalyzed: result.analysisStats.totalUsersAnalyzed,
          totalRolesAnalyzed: result.analysisStats.totalRolesAnalyzed,
          totalRulesEvaluated: result.analysisStats.totalRulesEvaluated,
          analysisDuration: result.analysisStats.analysisDuration,
        },
      });
    } catch (error: any) {
      logger.error('SoD analysis failed', { error: error.message });
      next(error);
    }
  }

  /**
   * GET /api/modules/sod/results/:runId
   * Get specific analysis run results
   *
   * @swagger
   * /modules/sod/results/{runId}:
   *   get:
   *     summary: Get Analysis Results
   *     description: Retrieve detailed results from a specific analysis run
   *     tags: [SoD]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: runId
   *         required: true
   *         schema:
   *           type: string
   *         description: Analysis run ID
   *     responses:
   *       200:
   *         description: Analysis results
   *       404:
   *         description: Run not found
   */
  async getAnalysisResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { runId } = req.params;
      const { tenantId } = req.query;

      logger.info('Retrieving analysis results', { runId, tenantId });

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId query parameter is required');
        return;
      }

      // Get analysis run from database
      const run = await prisma.sod_analysis_runs.findFirst({
        where: {
          id: runId,
          tenant_id: tenantId as string,
        },
      });

      if (!run) {
        ApiResponseUtil.notFound(res, 'Analysis run');
        return;
      }

      // Get findings for this run
      const findings = await prisma.sod_findings.findMany({
        where: {
          run_id: runId,
          tenant_id: tenantId as string,
        },
        orderBy: {
          severity: 'asc',
        },
      });

      ApiResponseUtil.success(res, {
        run: {
          id: run.id,
          tenantId: run.tenant_id,
          status: run.status,
          mode: run.mode,
          startedAt: run.started_at,
          completedAt: run.completed_at,
          summary: run.summary,
        },
        findings: findings.map((f: any) => ({
          id: f.id,
          userId: f.user_id,
          ruleId: f.rule_id,
          ruleName: f.rule_name,
          severity: f.severity,
          riskScore: f.risk_score,
          conflictingRoles: f.conflicting_roles,
          conflictingPermissions: f.conflicting_permissions,
          businessContext: f.business_context,
          status: f.status,
          detectedAt: f.first_detected,
        })),
        metadata: {
          totalFindings: findings.length,
          byStatus: findings.reduce((acc: any, f: any) => {
            acc[f.status] = (acc[f.status] || 0) + 1;
            return acc;
          }, {}),
          bySeverity: findings.reduce((acc: any, f: any) => {
            acc[f.severity] = (acc[f.severity] || 0) + 1;
            return acc;
          }, {}),
        },
      });
    } catch (error: any) {
      logger.error('Failed to retrieve analysis results', { error: error.message });
      next(error);
    }
  }

  /**
   * GET /api/modules/sod/violations
   * List all SoD violations for a tenant
   *
   * @swagger
   * /modules/sod/violations:
   *   get:
   *     summary: List Violations
   *     description: Get paginated list of SoD violations
   *     tags: [SoD]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: tenantId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [OPEN, ACKNOWLEDGED, RESOLVED, EXCEPTION_GRANTED]
   *       - in: query
   *         name: severity
   *         schema:
   *           type: string
   *           enum: [CRITICAL, HIGH, MEDIUM, LOW]
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
   *     responses:
   *       200:
   *         description: List of violations
   */
  async listViolations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, status, severity, page = '1', pageSize = '20' } = req.query;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId query parameter is required');
        return;
      }

      logger.info('Listing SoD violations', { tenantId, status, severity, page, pageSize });

      const pageNum = parseInt(page as string, 10);
      const pageSizeNum = parseInt(pageSize as string, 10);
      const skip = (pageNum - 1) * pageSizeNum;

      // Build filter
      const where: any = {
        tenant_id: tenantId as string,
      };
      if (status) where.status = status;
      if (severity) where.severity = severity;

      // Get total count
      const total = await prisma.sod_findings.count({ where });

      // Get violations
      const violations = await prisma.sod_findings.findMany({
        where,
        orderBy: [
          { severity: 'asc' },
          { first_detected: 'desc' },
        ],
        skip,
        take: pageSizeNum,
      });

      ApiResponseUtil.paginated(
        res,
        violations.map((v: any) => ({
          id: v.id,
          userId: v.user_id,
          ruleId: v.rule_id,
          ruleName: v.rule_name,
          severity: v.severity,
          riskScore: v.risk_score,
          conflictingRoles: v.conflicting_roles,
          conflictingPermissions: v.conflicting_permissions,
          businessContext: v.business_context,
          status: v.status,
          detectedAt: v.first_detected,
          lastChecked: v.last_checked,
        })),
        pageNum,
        pageSizeNum,
        total
      );
    } catch (error: any) {
      logger.error('Failed to list violations', { error: error.message });
      next(error);
    }
  }

  /**
   * GET /api/modules/sod/recommendations/:findingId
   * Get remediation recommendations for a specific violation
   *
   * @swagger
   * /modules/sod/recommendations/{findingId}:
   *   get:
   *     summary: Get Recommendations
   *     description: Get AI-generated remediation recommendations for a violation
   *     tags: [SoD]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: findingId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: tenantId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of recommendations
   */
  async getRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { findingId } = req.params;
      const { tenantId } = req.query;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId query parameter is required');
        return;
      }

      logger.info('Generating recommendations', { findingId, tenantId });

      // Create analyzer engine
      const analyzer = new SODAnalyzerEngine({
        database: prisma,
      });

      // Generate recommendations
      const recommendations = await analyzer.generateRecommendations(
        tenantId as string,
        findingId
      );

      if (!recommendations || recommendations.length === 0) {
        ApiResponseUtil.notFound(res, 'Recommendations (finding may not exist)');
        return;
      }

      ApiResponseUtil.success(res, {
        findingId,
        recommendations: recommendations.map((r: any) => ({
          type: r.type,
          description: r.description,
          impact: r.impact,
          effort: r.effort,
          roleId: r.roleId,
          roleName: r.roleName,
        })),
        metadata: {
          totalRecommendations: recommendations.length,
          byType: recommendations.reduce((acc: any, r: any) => {
            acc[r.type] = (acc[r.type] || 0) + 1;
            return acc;
          }, {}),
        },
      });
    } catch (error: any) {
      logger.error('Failed to generate recommendations', { error: error.message });
      next(error);
    }
  }

  /**
   * POST /api/modules/sod/exceptions/approve
   * Approve an exception request for a violation
   *
   * @swagger
   * /modules/sod/exceptions/approve:
   *   post:
   *     summary: Approve Exception
   *     description: Approve an exception request for a SoD violation
   *     tags: [SoD]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - tenantId
   *               - findingId
   *               - approver
   *             properties:
   *               tenantId:
   *                 type: string
   *               findingId:
   *                 type: string
   *               approver:
   *                 type: string
   *               justification:
   *                 type: string
   *     responses:
   *       200:
   *         description: Exception approved
   */
  async approveException(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, findingId, approver, justification } = req.body;

      if (!tenantId || !findingId || !approver) {
        ApiResponseUtil.badRequest(res, 'tenantId, findingId, and approver are required');
        return;
      }

      logger.info('Approving exception', { tenantId, findingId, approver });

      // Create analyzer engine
      const analyzer = new SODAnalyzerEngine({
        database: prisma,
      });

      // Process exception
      await analyzer.processException(
        tenantId,
        findingId,
        'APPROVE',
        approver,
        justification
      );

      logger.info('Exception approved', { tenantId, findingId });

      ApiResponseUtil.success(res, {
        message: 'Exception approved successfully',
        findingId,
        approvedBy: approver,
        approvedAt: new Date(),
      });
    } catch (error: any) {
      logger.error('Failed to approve exception', { error: error.message });
      next(error);
    }
  }

  /**
   * POST /api/modules/sod/exceptions/reject
   * Reject an exception request for a violation
   *
   * @swagger
   * /modules/sod/exceptions/reject:
   *   post:
   *     summary: Reject Exception
   *     description: Reject an exception request for a SoD violation
   *     tags: [SoD]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - tenantId
   *               - findingId
   *               - approver
   *             properties:
   *               tenantId:
   *                 type: string
   *               findingId:
   *                 type: string
   *               approver:
   *                 type: string
   *               justification:
   *                 type: string
   *     responses:
   *       200:
   *         description: Exception rejected
   */
  async rejectException(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, findingId, approver, justification } = req.body;

      if (!tenantId || !findingId || !approver) {
        ApiResponseUtil.badRequest(res, 'tenantId, findingId, and approver are required');
        return;
      }

      logger.info('Rejecting exception', { tenantId, findingId, approver });

      // Create analyzer engine
      const analyzer = new SODAnalyzerEngine({
        database: prisma,
      });

      // Process exception
      await analyzer.processException(
        tenantId,
        findingId,
        'REJECT',
        approver,
        justification
      );

      logger.info('Exception rejected', { tenantId, findingId });

      ApiResponseUtil.success(res, {
        message: 'Exception rejected successfully',
        findingId,
        rejectedBy: approver,
        rejectedAt: new Date(),
      });
    } catch (error: any) {
      logger.error('Failed to reject exception', { error: error.message });
      next(error);
    }
  }

  /**
   * GET /api/modules/sod/compliance/report
   * Get comprehensive compliance report
   *
   * @swagger
   * /modules/sod/compliance/report:
   *   get:
   *     summary: Compliance Report
   *     description: Get comprehensive SoD compliance metrics and statistics
   *     tags: [SoD]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: tenantId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Compliance report
   */
  async getComplianceReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = req.query;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId query parameter is required');
        return;
      }

      logger.info('Generating compliance report', { tenantId });

      // Create analyzer engine
      const analyzer = new SODAnalyzerEngine({
        database: prisma,
      });

      // Generate compliance report
      const report = await analyzer.getComplianceReport(tenantId as string);

      ApiResponseUtil.success(res, {
        tenantId,
        report: {
          overview: {
            totalUsers: report.totalUsers,
            totalRoles: report.totalRoles,
            totalViolations: report.totalViolations,
            criticalViolations: report.criticalViolations,
          },
          metrics: {
            resolutionRate: `${report.resolutionRate.toFixed(2)}%`,
            avgTimeToResolve: `${report.avgTimeToResolve} days`,
            complianceScore: report.complianceScore,
          },
          lastAnalysis: {
            date: report.lastAnalysisDate,
            status: report.lastAnalysisDate ? 'completed' : 'never_run',
          },
        },
        generatedAt: new Date(),
      });
    } catch (error: any) {
      logger.error('Failed to generate compliance report', { error: error.message });
      next(error);
    }
  }

  /**
   * GET /api/modules/sod/health
   * Module health check
   *
   * @swagger
   * /modules/sod/health:
   *   get:
   *     summary: Module Health
   *     description: Check SoD module health and availability
   *     tags: [SoD]
   *     responses:
   *       200:
   *         description: Module is healthy
   */
  async getModuleHealth(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      logger.info('SoD module health check');

      // Check database connectivity
      await prisma.$queryRaw`SELECT 1`;

      // Check required tables
      const tableChecks = await Promise.all([
        prisma.sod_analysis_runs.count().then(() => ({ table: 'sod_analysis_runs', status: 'ok' })).catch((e: any) => ({ table: 'sod_analysis_runs', status: 'error', error: e.message })),
        prisma.sod_findings.count().then(() => ({ table: 'sod_findings', status: 'ok' })).catch((e: any) => ({ table: 'sod_findings', status: 'error', error: e.message })),
        prisma.sod_rules.count().then(() => ({ table: 'sod_rules', status: 'ok' })).catch((e: any) => ({ table: 'sod_rules', status: 'error', error: e.message })),
        prisma.access_graph_users.count().then(() => ({ table: 'access_graph_users', status: 'ok' })).catch((e: any) => ({ table: 'access_graph_users', status: 'error', error: e.message })),
      ]);

      const allHealthy = tableChecks.every((check: any) => check.status === 'ok');

      res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'healthy' : 'degraded',
        module: 'SoD Analyzer',
        version: '1.0.0',
        checks: {
          database: 'ok',
          tables: tableChecks,
        },
        capabilities: [
          'multi-system-analysis',
          'rule-based-detection',
          'risk-scoring',
          'recommendations',
          'exception-management',
          'compliance-reporting',
        ],
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('SoD module health check failed', { error: error.message });
      res.status(503).json({
        status: 'unhealthy',
        module: 'SoD Analyzer',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
