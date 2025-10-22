/**
 * Report Routes
 *
 * API routes for report generation and management
 *
 * @module routes/reports
 */

import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { ReportController } from '../controllers/ReportController';

const router: ExpressRouter = Router();

/**
 * POST /api/reports/generate
 * Generate a report in specified format
 *
 * Body:
 * - reportType (required): Type of report (sod_violations, gl_anomaly, etc.)
 * - format (optional): pdf, docx, excel, html (default: pdf)
 * - period (optional): { from: string, to: string }
 * - filters (optional): Report-specific filters
 * - includeCharts (optional): boolean
 */
router.post('/generate', ReportController.generateReport);

/**
 * GET /api/reports/types
 * Get list of available report types
 */
router.get('/types', ReportController.getReportTypes);

/**
 * POST /api/reports/schedule
 * Schedule a recurring report
 *
 * Body:
 * - reportType (required)
 * - format (required)
 * - schedule (required): cron expression
 * - recipients (required): email addresses array
 * - filters (optional)
 */
router.post('/schedule', ReportController.scheduleReport);

/**
 * GET /api/reports/scheduled
 * Get all scheduled reports for tenant
 */
router.get('/scheduled', ReportController.getScheduledReports);

/**
 * DELETE /api/reports/scheduled/:id
 * Delete a scheduled report
 */
router.delete('/scheduled/:id', ReportController.deleteScheduledReport);

export default router;
