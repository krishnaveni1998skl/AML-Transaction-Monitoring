import express from 'express';
import {
  getAllRules,
  getRuleById,
  createRule,
  updateRule,
  toggleRule
} from '../controllers/ruleController.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';

const router = express.Router();

router.get('/', authenticate, getAllRules);
router.get('/:id', authenticate, getRuleById);
router.post('/', authenticate, authorize(['ADMIN', 'COMPLIANCE_OFFICER']), createRule);
router.put('/:id', authenticate, authorize(['ADMIN', 'COMPLIANCE_OFFICER']), updateRule);
router.patch('/:id/toggle', authenticate, authorize(['ADMIN', 'COMPLIANCE_OFFICER']), toggleRule);

export default router;
