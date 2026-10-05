import express from 'express';
import {
  ingestSingleTransaction,
  ingestBatchTransactions,
  getTransactions,
  getTransactionById
} from '../controllers/transactionController.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';

const router = express.Router();

router.post(
  '/ingest',
  authenticate,
  authorize(['ADMIN', 'AML_ANALYST', 'COMPLIANCE_OFFICER']),
  ingestSingleTransaction
);

router.post(
  '/batch-ingest',
  authenticate,
  authorize(['ADMIN', 'AML_ANALYST', 'COMPLIANCE_OFFICER']),
  ingestBatchTransactions
);

router.get('/', authenticate, getTransactions);
router.get('/:id', authenticate, getTransactionById);

export default router;
