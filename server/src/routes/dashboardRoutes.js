import express from 'express';
import {
  getExecutiveOverview,
  getTimeSeriesTrends,
  getDistributions,
  getRulePerformance,
  getWorkloadMetrics,
  getTopRiskEntities
} from '../controllers/dashboardController.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';

const router = express.Router();

// All dashboard endpoints require authentication & authorized AML roles
router.use(authenticate, authorize(['ADMIN', 'AML_ANALYST', 'COMPLIANCE_OFFICER']));

router.get('/overview', getExecutiveOverview);
router.get('/trends', getTimeSeriesTrends);
router.get('/distributions', getDistributions);
router.get('/rules', getRulePerformance);
router.get('/workload', getWorkloadMetrics);
router.get('/top-entities', getTopRiskEntities);

export default router;
