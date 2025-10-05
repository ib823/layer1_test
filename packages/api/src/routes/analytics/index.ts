import { Router } from 'express';
import { AnalyticsController } from '../../controllers/AnalyticsController';

const router: Router = Router();
const controller = new AnalyticsController(process.env.DATABASE_URL!);

router.get('/trends', (req, res) => controller.getTrends(req, res));
router.get('/risk-distribution', (req, res) => controller.getRiskDistribution(req, res));
router.get('/department-breakdown', (req, res) => controller.getDepartmentBreakdown(req, res));
router.get('/top-violation-types', (req, res) => controller.getTopViolationTypes(req, res));
router.get('/compliance-score', (req, res) => controller.getComplianceScore(req, res));

export default router;
