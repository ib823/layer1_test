/**
 * Audit Trail Routes
 *
 * API routes for querying and managing audit logs
 *
 * @module routes/audit
 */

import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { AuditController } from '../controllers/AuditController';

const router: ExpressRouter = Router();

/**
 * GET /api/audit/logs
 * Query audit logs with filters
 *
 * Query parameters:
 * - tenantId (required)
 * - userId, eventType, eventCategory
 * - resourceType, resourceId
 * - fromDate, toDate
 * - success, complianceRelevant
 * - limit, offset
 */
router.get('/logs', AuditController.getLogs);

/**
 * GET /api/audit/logs/:id
 * Get single audit log by ID
 *
 * Query parameters:
 * - tenantId (required)
 */
router.get('/logs/:id', AuditController.getLog);

/**
 * POST /api/audit/export
 * Export audit logs for compliance
 *
 * Body:
 * - tenantId (required)
 * - fromDate, toDate (required)
 * - eventCategory
 * - complianceRelevant
 * - format (json|csv)
 */
router.post('/export', AuditController.exportLogs);

/**
 * GET /api/audit/stats
 * Get audit statistics
 *
 * Query parameters:
 * - tenantId (required)
 * - days (optional, default: 30)
 */
router.get('/stats', AuditController.getStats);

/**
 * POST /api/audit/cleanup
 * Run audit log cleanup (retention policy enforcement)
 *
 * Body:
 * - tenantId (required)
 */
router.post('/cleanup', AuditController.cleanup);

export default router;
