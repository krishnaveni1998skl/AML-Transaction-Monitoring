import express from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer
} from '../controllers/customerController.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorize(['ADMIN', 'AML_ANALYST', 'COMPLIANCE_OFFICER']),
  getCustomers
);

router.post(
  '/',
  authenticate,
  authorize(['ADMIN', 'AML_ANALYST', 'COMPLIANCE_OFFICER']),
  createCustomer
);

router.get(
  '/:id',
  authenticate,
  authorize(['ADMIN', 'AML_ANALYST', 'COMPLIANCE_OFFICER']),
  getCustomerById
);

export default router;
