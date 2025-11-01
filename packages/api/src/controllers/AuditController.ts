/**
 * Audit Trail Controller
 *
 * Provides API endpoints for querying and exporting audit logs
 *
 * @module controllers/AuditController
 */

import { Request, Response } from 'express';
import {
  auditLogger,
  AuditEventType,
  AuditEventCategory,
} from '@sap-framework/core';
import { ApiResponseUtil } from '../utils/response';
import logger from '../utils/logger';

export class AuditController {
  /**
   * GET /api/audit/logs
   * Query audit logs with filters
   */
  static async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const {
        tenantId,
        userId,
        eventType,
        eventCategory,
        resourceType,
        resourceId,
        fromDate,
        toDate,
        success,
        complianceRelevant,
        limit,
        offset,
      } = req.query;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId is required');
        return;
      }

      logger.info('Querying audit logs', {
        tenantId,
        userId,
        eventType,
        fromDate,
        toDate,
      });

      const filters: any = {
        tenantId: tenantId as string,
        userId: userId as string | undefined,
        eventType: eventType as AuditEventType | undefined,
        eventCategory: eventCategory as AuditEventCategory | undefined,
        resourceType: resourceType as string | undefined,
        resourceId: resourceId as string | undefined,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
        success: success ? success === 'true' : undefined,
        complianceRelevant: complianceRelevant
          ? complianceRelevant === 'true'
          : undefined,
        limit: limit ? parseInt(limit as string, 10) : 100,
        offset: offset ? parseInt(offset as string, 10) : 0,
      };

      const result = await auditLogger.query(filters);

      ApiResponseUtil.success(res, {
        logs: result.logs,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
          pages: Math.ceil(result.total / filters.limit),
        },
      });
    } catch (error: any) {
      logger.error('Failed to query audit logs', error);
      ApiResponseUtil.error(
        res,
        'AUDIT_QUERY_ERROR',
        'Failed to query audit logs',
        500,
        { error: error.message }
      );
    }
  }

  /**
   * GET /api/audit/logs/:id
   * Get single audit log by ID
   */
  static async getLog(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { tenantId } = req.query;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId is required');
        return;
      }

      const log = await auditLogger.getById(id, tenantId as string);

      if (!log) {
        ApiResponseUtil.notFound(res, 'Audit log not found');
        return;
      }

      ApiResponseUtil.success(res, log);
    } catch (error: any) {
      logger.error('Failed to get audit log', error);
      ApiResponseUtil.error(
        res,
        'AUDIT_GET_ERROR',
        'Failed to get audit log',
        500,
        { error: error.message }
      );
    }
  }

  /**
   * POST /api/audit/export
   * Export audit logs for compliance
   */
  static async exportLogs(req: Request, res: Response): Promise<void> {
    try {
      const {
        tenantId,
        fromDate,
        toDate,
        eventCategory,
        complianceRelevant,
        format,
      } = req.body;

      if (!tenantId || !fromDate || !toDate) {
        ApiResponseUtil.badRequest(
          res,
          'tenantId, fromDate, and toDate are required'
        );
        return;
      }

      logger.info('Exporting audit logs', {
        tenantId,
        fromDate,
        toDate,
        format: format || 'json',
      });

      const logs = await auditLogger.export({
        tenantId,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        eventCategory: eventCategory as AuditEventCategory | undefined,
        complianceRelevant:
          complianceRelevant !== undefined
            ? complianceRelevant === true
            : undefined,
      });

      // Format output based on requested format
      if (format === 'csv') {
        // Convert to CSV
        const csv = this.convertToCSV(logs);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="audit-logs-${tenantId}-${fromDate}-${toDate}.csv"`
        );
        res.send(csv);
      } else {
        // Return JSON
        ApiResponseUtil.success(res, {
          count: logs.length,
          logs,
          exportedAt: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('Failed to export audit logs', error);
      ApiResponseUtil.error(
        res,
        'AUDIT_EXPORT_ERROR',
        'Failed to export audit logs',
        500,
        { error: error.message }
      );
    }
  }

  /**
   * GET /api/audit/stats
   * Get audit statistics
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, days } = req.query;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId is required');
        return;
      }

      const stats = await auditLogger.getStats(
        tenantId as string,
        days ? parseInt(days as string, 10) : 30
      );

      ApiResponseUtil.success(res, stats);
    } catch (error: any) {
      logger.error('Failed to get audit stats', error);
      ApiResponseUtil.error(
        res,
        'AUDIT_STATS_ERROR',
        'Failed to get audit stats',
        500,
        { error: error.message }
      );
    }
  }

  /**
   * POST /api/audit/cleanup
   * Run audit log cleanup (retention policy enforcement)
   */
  static async cleanup(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.body;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'tenantId is required');
        return;
      }

      logger.info('Running audit log cleanup', { tenantId });

      const deletedCount = await auditLogger.cleanup(tenantId);

      ApiResponseUtil.success(res, {
        message: 'Audit log cleanup completed',
        deletedCount,
      });
    } catch (error: any) {
      logger.error('Failed to cleanup audit logs', error);
      ApiResponseUtil.error(
        res,
        'AUDIT_CLEANUP_ERROR',
        'Failed to cleanup audit logs',
        500,
        { error: error.message }
      );
    }
  }

  /**
   * Convert audit logs to CSV format
   */
  private static convertToCSV(logs: any[]): string {
    if (logs.length === 0) return '';

    // CSV headers
    const headers = [
      'ID',
      'Timestamp',
      'Event Type',
      'Event Category',
      'User ID',
      'User Name',
      'User Email',
      'User IP',
      'Resource Type',
      'Resource ID',
      'Resource Name',
      'Action',
      'Description',
      'Success',
      'Error Message',
      'API Endpoint',
      'API Method',
      'Compliance Relevant',
    ];

    const rows = logs.map((log) => [
      log.id,
      log.timestamp,
      log.eventType,
      log.eventCategory,
      log.userId || '',
      log.userName || '',
      log.userEmail || '',
      log.userIp || '',
      log.resourceType || '',
      log.resourceId || '',
      log.resourceName || '',
      log.action,
      `"${log.description.replace(/"/g, '""')}"`, // Escape quotes
      log.success ? 'Yes' : 'No',
      log.errorMessage ? `"${log.errorMessage.replace(/"/g, '""')}"` : '',
      log.apiEndpoint || '',
      log.apiMethod || '',
      log.complianceRelevant ? 'Yes' : 'No',
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }
}
