import express from 'express';
import {
  getNetworkGraph,
  detectSuspiciousPatterns,
  getEntityNetworkSummary
} from '../controllers/networkController.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';

const router = express.Router();

router.get(
  '/graph',
  authenticate,
  authorize(['ADMIN', 'AML_ANALYST', 'COMPLIANCE_OFFICER']),
  getNetworkGraph
);

router.get(
  '/patterns',
  authenticate,
  authorize(['ADMIN', 'AML_ANALYST', 'COMPLIANCE_OFFICER']),
  detectSuspiciousPatterns
);

router.get(
  '/entity/:id',
  authenticate,
  authorize(['ADMIN', 'AML_ANALYST', 'COMPLIANCE_OFFICER']),
  getEntityNetworkSummary
);

export default router;
