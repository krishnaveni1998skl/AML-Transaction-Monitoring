import express from 'express';
import {
  getSummaryReport,
  exportAlertsCSV,
  exportSARCSV,
  exportSummaryCSV,
  exportSARCustomerDetailsCSV
} from '../controllers/reportController.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';

const router = express.Router();

router.use(authenticate, authorize(['ADMIN', 'AML_ANALYST', 'COMPLIANCE_OFFICER']));

router.get('/summary', getSummaryReport);
router.get('/export/alerts', exportAlertsCSV);
router.get('/export/sar', exportSARCSV);
router.get('/export/sar-customers', exportSARCustomerDetailsCSV);
router.get('/export/summary', exportSummaryCSV);

export default router;
