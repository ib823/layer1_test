/**
 * GL Anomaly Detection Routes
 */

import { Router } from 'express';
import { GLAnomalyDetectionController } from '../../controllers/GLAnomalyDetectionController';

const router: Router = Router();

/**
 * POST /api/modules/gl-anomaly/detect
 * Run GL anomaly detection analysis
 */
router.post('/detect', GLAnomalyDetectionController.detectAnomalies);

/**
 * GET /api/modules/gl-anomaly/runs
 * Get all runs for a tenant
 */
router.get('/runs', GLAnomalyDetectionController.getRuns);

/**
 * GET /api/modules/gl-anomaly/runs/:runId
 * Get specific run results
 */
router.get('/runs/:runId', GLAnomalyDetectionController.getRun);

/**
 * POST /api/modules/gl-anomaly/analyze-account
 * Analyze a specific GL account
 */
router.post('/analyze-account', GLAnomalyDetectionController.analyzeGLAccount);

/**
 * GET /api/modules/gl-anomaly/summary
 * Get module summary
 */
router.get('/summary', GLAnomalyDetectionController.getSummary);

export default router;
