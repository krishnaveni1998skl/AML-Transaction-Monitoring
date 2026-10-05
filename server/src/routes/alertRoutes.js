import express from 'express';
import {
  getAlerts,
  getAlertById,
  assignAlert,
  updateAlertStatus,
  addInvestigationNote,
  escalateAlert,
  closeAlert
} from '../controllers/alertController.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';

const router = express.Router();

router.get('/', authenticate, getAlerts);
router.get('/:id', authenticate, getAlertById);

// Investigation actions
router.patch(
  '/:id/assign',
  authenticate,
  authorize(['ADMIN', 'AML_ANALYST', 'COMPLIANCE_OFFICER']),
  assignAlert
);

router.patch(
  '/:id/status',
  authenticate,
  authorize(['ADMIN', 'AML_ANALYST', 'COMPLIANCE_OFFICER']),
  updateAlertStatus
);

router.post(
  '/:id/notes',
  authenticate,
  authorize(['ADMIN', 'AML_ANALYST', 'COMPLIANCE_OFFICER']),
  addInvestigationNote
);

router.post(
  '/:id/escalate',
  authenticate,
  authorize(['ADMIN', 'AML_ANALYST']),
  escalateAlert
);

router.post(
  '/:id/close',
  authenticate,
  authorize(['ADMIN', 'AML_ANALYST', 'COMPLIANCE_OFFICER']),
  closeAlert
);

export default router;
