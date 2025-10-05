import { Router } from 'express';
import { DashboardController } from '../../controllers/DashboardController';

const router: Router = Router();
const controller = new DashboardController(process.env.DATABASE_URL!);

router.get('/kpis', (req, res) => controller.getKPIs(req, res));

export default router;
