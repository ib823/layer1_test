/**
 * SoD Analyzer Routes
 *
 * Routes for Segregation of Duties analysis and violation management
 */

import { Router } from 'express';
import { SODAnalyzerController } from '../../controllers/SODAnalyzerController';

const router: Router = Router();
const controller = new SODAnalyzerController();

/**
 * POST /api/modules/sod/analyze
 * Run comprehensive SoD analysis
 */
router.post('/analyze', (req, res, next) => controller.runAnalysis(req, res, next));

/**
 * GET /api/modules/sod/results/:runId
 * Get specific analysis run results
 */
router.get('/results/:runId', (req, res, next) => controller.getAnalysisResults(req, res, next));

/**
 * GET /api/modules/sod/violations
 * List all violations with filtering and pagination
 */
router.get('/violations', (req, res, next) => controller.listViolations(req, res, next));

/**
 * GET /api/modules/sod/recommendations/:findingId
 * Get remediation recommendations for a violation
 */
router.get('/recommendations/:findingId', (req, res, next) => controller.getRecommendations(req, res, next));

/**
 * POST /api/modules/sod/exceptions/approve
 * Approve an exception request
 */
router.post('/exceptions/approve', (req, res, next) => controller.approveException(req, res, next));

/**
 * POST /api/modules/sod/exceptions/reject
 * Reject an exception request
 */
router.post('/exceptions/reject', (req, res, next) => controller.rejectException(req, res, next));

/**
 * GET /api/modules/sod/compliance/report
 * Get comprehensive compliance report
 */
router.get('/compliance/report', (req, res, next) => controller.getComplianceReport(req, res, next));

/**
 * GET /api/modules/sod/health
 * Module health check
 */
router.get('/health', (req, res, next) => controller.getModuleHealth(req, res, next));

export default router;
