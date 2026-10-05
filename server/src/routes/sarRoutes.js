import express from 'express';
import {
  getSARCandidates,
  getSARCases,
  getSARCaseById,
  createSARFromAlert,
  updateSARStatus
} from '../controllers/sarController.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';

const router = express.Router();

router.get('/candidates', authenticate, getSARCandidates);
router.get('/cases', authenticate, getSARCases);
router.get('/cases/:id', authenticate, getSARCaseById);

router.post(
  '/create',
  authenticate,
  authorize(['ADMIN', 'AML_ANALYST', 'COMPLIANCE_OFFICER']),
  createSARFromAlert
);

router.patch(
  '/cases/:id/status',
  authenticate,
  authorize(['ADMIN', 'COMPLIANCE_OFFICER']),
  updateSARStatus
);

export default router;
