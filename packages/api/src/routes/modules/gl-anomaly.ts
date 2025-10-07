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
