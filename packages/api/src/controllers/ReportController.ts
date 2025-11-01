/**
 * Report Controller
 *
 * API controller for report generation and management
 *
 * @module controllers/ReportController
 */

import { Request, Response } from 'express';
import {
  reportGenerator,
  ReportType,
  ExportFormat,
  ReportData,
  ReportConfig,
} from '@sap-framework/core';
import { ApiResponseUtil } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import logger from '../utils/logger';
import { sanitizeInput, sanitizeEmail } from '../utils/sanitization';

/**
 * ReportController class
 * Handles all report generation requests
 */
export class ReportController {
  /**
   * Generate a report
   * POST /api/reports/generate
   */
  static async generateReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        reportType,
        format = 'pdf',
        period,
        filters,
        includeCharts = true,
      } = req.body;

      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'Tenant ID is required');
        return;
      }

      if (!reportType) {
        ApiResponseUtil.badRequest(res, 'Report type is required');
        return;
      }

      // Validate report type
      if (!Object.values(ReportType).includes(reportType)) {
        ApiResponseUtil.badRequest(res, `Invalid report type: ${reportType}`);
        return;
      }

      // Validate format
      if (!Object.values(ExportFormat).includes(format)) {
        ApiResponseUtil.badRequest(res, `Invalid format: ${format}`);
        return;
      }

      logger.info('Generating report', {
        reportType,
        format,
        tenantId,
        userId: req.user?.id,
      });

      // Fetch report data based on type
      const reportData = await ReportController.fetchReportData(
        reportType,
        tenantId,
        period,
        filters
      );

      // Add report configuration
      const config: ReportConfig = {
        title: ReportController.getReportTitle(reportType),
        description: `${ReportController.getReportTitle(reportType)} for ${tenantId}`,
        tenantId,
        tenantName: tenantId,
        generatedBy: req.user?.email || 'System',
        generatedAt: new Date(),
        type: reportType,
        period: period
          ? {
              from: new Date(period.from),
              to: new Date(period.to),
            }
          : undefined,
      };

      reportData.config = config;

      // Generate report
      const reportBuffer = await reportGenerator.generateReport(reportData, format);

      // Set response headers based on format
      const filename = `${reportType}_${Date.now()}.${format}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      switch (format) {
        case ExportFormat.PDF:
          res.setHeader('Content-Type', 'application/pdf');
          break;
        case ExportFormat.DOCX:
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          break;
        case ExportFormat.EXCEL:
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          break;
        case ExportFormat.HTML:
          res.setHeader('Content-Type', 'text/html');
          break;
      }

      res.send(reportBuffer);

      logger.info('Report generated successfully', {
        reportType,
        format,
        size: reportBuffer.length,
      });
    } catch (error) {
      logger.error('Failed to generate report', { error });
      ApiResponseUtil.error(res, 'Failed to generate report', String(error));
    }
  }

  /**
   * Get available report types
   * GET /api/reports/types
   */
  static async getReportTypes(req: Request, res: Response): Promise<void> {
    try {
      const reportTypes = Object.values(ReportType).map((type) => ({
        value: type,
        label: ReportController.getReportTitle(type),
        description: ReportController.getReportDescription(type),
      }));

      ApiResponseUtil.success(res, { reportTypes });
    } catch (error) {
      logger.error('Failed to get report types', { error });
      ApiResponseUtil.error(res, 'Failed to get report types', String(error));
    }
  }

  /**
   * Schedule a recurring report
   * POST /api/reports/schedule
   */
  static async scheduleReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        reportType,
        format,
        schedule, // cron expression
        recipients,
        filters,
      } = req.body;

      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'Tenant ID is required');
        return;
      }

      if (!reportType || !format || !schedule || !recipients) {
        ApiResponseUtil.badRequest(res, 'Missing required fields');
        return;
      }

      // ✅ SECURITY FIX: Sanitize and validate email recipients
      // DEFECT-035: Stored XSS vulnerability fix
      let sanitizedRecipients: string[] = [];
      if (Array.isArray(recipients)) {
        try {
          sanitizedRecipients = recipients.map((email) => sanitizeEmail(email));
        } catch (error) {
          ApiResponseUtil.badRequest(res, 'Invalid email format in recipients');
          return;
        }
      } else {
        ApiResponseUtil.badRequest(res, 'Recipients must be an array of email addresses');
        return;
      }

      // TODO: Save scheduled report to database
      // For now, return success with placeholder

      logger.info('Report scheduled', {
        reportType,
        format,
        schedule,
        tenantId,
        recipientCount: sanitizedRecipients.length,
      });

      ApiResponseUtil.success(res, {
        message: 'Report scheduled successfully',
        scheduleId: `schedule-${Date.now()}`,
        reportType,
        schedule,
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      });
    } catch (error) {
      logger.error('Failed to schedule report', { error });
      ApiResponseUtil.error(res, 'Failed to schedule report', String(error));
    }
  }

  /**
   * Get scheduled reports for tenant
   * GET /api/reports/scheduled
   */
  static async getScheduledReports(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'Tenant ID is required');
        return;
      }

      // TODO: Fetch from database
      // For now, return empty array

      ApiResponseUtil.success(res, {
        scheduledReports: [],
      });
    } catch (error) {
      logger.error('Failed to get scheduled reports', { error });
      ApiResponseUtil.error(res, 'Failed to get scheduled reports', String(error));
    }
  }

  /**
   * Delete a scheduled report
   * DELETE /api/reports/scheduled/:id
   */
  static async deleteScheduledReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'Tenant ID is required');
        return;
      }

      // TODO: Delete from database

      logger.info('Scheduled report deleted', { scheduleId: id, tenantId });

      ApiResponseUtil.success(res, {
        message: 'Scheduled report deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete scheduled report', { error });
      ApiResponseUtil.error(res, 'Failed to delete scheduled report', String(error));
    }
  }

  /**
   * Fetch report data based on type
   * @private
   */
  private static async fetchReportData(
    reportType: ReportType,
    tenantId: string,
    period?: { from: string; to: string },
    filters?: any
  ): Promise<ReportData> {
    // This is a simplified implementation
    // In production, you would fetch real data from the database

    const config = {} as ReportConfig;
    const summary: Record<string, any> = {};
    const data: any[] = [];
    const metadata: Record<string, any> = {};

    switch (reportType) {
      case ReportType.SOD_VIOLATIONS:
        summary.totalViolations = 45;
        summary.criticalCount = 12;
        summary.highCount = 18;
        summary.usersAffected = 67;
        summary.riskScore = 7.5;
        summary.remediationRequired = 30;

        metadata.recommendations = [
          'Review and remediate all critical violations within 30 days',
          'Implement compensating controls for high-risk violations',
          'Conduct user access review for affected users',
          'Update role assignment policies to prevent future violations',
        ];

        // TODO: Fetch actual violation data from database
        break;

      case ReportType.GL_ANOMALY:
        summary.totalAnomalies = 89;
        summary.highConfidenceCount = 23;
        summary.totalAmount = 2456789.50;
        summary.accountsAffected = 34;
        summary.fraudAlerts = 5;
        summary.investigationRequired = 28;

        metadata.riskFactors = [
          'Unusually high transaction volumes detected in Q4',
          'Multiple transactions just below approval thresholds',
          'Weekend and off-hours activity increased by 45%',
          'Duplicate invoice numbers identified',
        ];

        // TODO: Fetch actual anomaly data
        break;

      case ReportType.INVOICE_MATCHING:
        summary.totalInvoices = 1234;
        summary.matchedCount = 1102;
        summary.unmatchedCount = 132;
        summary.matchRate = 0.893;
        summary.totalValue = 5678900.00;
        summary.discrepancyAmount = 234567.00;

        metadata.unmatchedReasons = [
          { reason: 'PO not found', count: 45, percentage: 0.34 },
          { reason: 'Amount mismatch', count: 38, percentage: 0.29 },
          { reason: 'Quantity variance', count: 27, percentage: 0.20 },
          { reason: 'Pricing difference', count: 22, percentage: 0.17 },
        ];

        metadata.recommendations = [
          'Implement automated PO matching rules',
          'Review vendor pricing agreements for discrepancies',
          'Improve communication between procurement and AP',
        ];

        // TODO: Fetch actual invoice matching data
        break;

      case ReportType.VENDOR_QUALITY:
        summary.totalVendors = 567;
        summary.qualityScore = 76;
        summary.criticalIssues = 23;
        summary.highPriority = 45;
        summary.duplicatesFound = 12;
        summary.actionRequired = 68;

        metadata.issueBreakdown = [
          { type: 'Missing Data', count: 89, percentage: 0.35, avgResolutionTime: 7 },
          { type: 'Invalid Format', count: 67, percentage: 0.26, avgResolutionTime: 3 },
          { type: 'Duplicates', count: 45, percentage: 0.18, avgResolutionTime: 14 },
          { type: 'Outdated', count: 54, percentage: 0.21, avgResolutionTime: 21 },
        ];

        // TODO: Fetch actual vendor quality data
        break;

      case ReportType.COMPLIANCE_SUMMARY:
        summary.complianceScore = 87;
        summary.controlsTested = 234;
        summary.controlsPassed = 204;
        summary.controlsFailed = 30;
        summary.openFindings = 18;
        summary.remediationRate = 0.82;

        metadata.findings = [
          {
            severity: 'HIGH',
            title: 'Insufficient Access Controls',
            description: 'Several users have excessive permissions beyond their role requirements',
            recommendation: 'Conduct immediate access review and implement least privilege principle',
          },
          {
            severity: 'MEDIUM',
            title: 'Incomplete Audit Logs',
            description: 'Some critical operations are not being logged adequately',
            recommendation: 'Enable comprehensive audit logging for all financial transactions',
          },
        ];

        metadata.nextActions = [
          { action: 'Remediate high-risk findings', priority: 'HIGH', dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
          { action: 'Complete Q1 compliance testing', priority: 'MEDIUM', dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
        ];

        // TODO: Fetch actual compliance data
        break;
    }

    return {
      config,
      summary,
      data,
      metadata,
    };
  }

  /**
   * Get report title
   * @private
   */
  private static getReportTitle(reportType: ReportType): string {
    const titles: Record<ReportType, string> = {
      [ReportType.SOD_VIOLATIONS]: 'Segregation of Duties Violations Report',
      [ReportType.GL_ANOMALY]: 'General Ledger Anomaly Detection Report',
      [ReportType.INVOICE_MATCHING]: 'Invoice Matching Analysis Report',
      [ReportType.VENDOR_QUALITY]: 'Vendor Data Quality Report',
      [ReportType.COMPLIANCE_SUMMARY]: 'Compliance Summary Report',
      [ReportType.AUDIT_TRAIL]: 'Audit Trail Report',
      [ReportType.USER_ACCESS_REVIEW]: 'User Access Review Report',
    };

    return titles[reportType] || 'Report';
  }

  /**
   * Get report description
   * @private
   */
  private static getReportDescription(reportType: ReportType): string {
    const descriptions: Record<ReportType, string> = {
      [ReportType.SOD_VIOLATIONS]: 'Comprehensive analysis of SoD conflicts and violations',
      [ReportType.GL_ANOMALY]: 'Detection and analysis of unusual GL transactions',
      [ReportType.INVOICE_MATCHING]: 'Invoice-to-PO matching results and discrepancies',
      [ReportType.VENDOR_QUALITY]: 'Vendor master data quality assessment',
      [ReportType.COMPLIANCE_SUMMARY]: 'Overall compliance status and findings',
      [ReportType.AUDIT_TRAIL]: 'Complete audit trail of system activities',
      [ReportType.USER_ACCESS_REVIEW]: 'User access rights and permissions review',
    };

    return descriptions[reportType] || 'Detailed report';
  }
}
