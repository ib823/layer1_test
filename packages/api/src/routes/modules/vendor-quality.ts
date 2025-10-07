/**
 * Vendor Data Quality Routes
 */

import { Router } from 'express';
import { VendorDataQualityController } from '../../controllers/VendorDataQualityController';

const router: Router = Router();

/**
 * POST /api/modules/vendor-quality/analyze
 * Run vendor data quality analysis
 */
router.post('/analyze', VendorDataQualityController.analyzeVendorQuality);

/**
 * POST /api/modules/vendor-quality/analyze-vendor
 * Analyze a single vendor
 */
router.post('/analyze-vendor', VendorDataQualityController.analyzeSingleVendor);

/**
 * POST /api/modules/vendor-quality/deduplicate
 * Run deduplication analysis
 */
router.post('/deduplicate', VendorDataQualityController.runDeduplication);

/**
 * GET /api/modules/vendor-quality/summary
 * Get module summary
 */
router.get('/summary', VendorDataQualityController.getSummary);

export default router;
