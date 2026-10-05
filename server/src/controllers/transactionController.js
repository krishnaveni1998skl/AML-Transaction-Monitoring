import { TransactionService } from '../services/transactionService.js';

export const ingestSingleTransaction = async (req, res, next) => {
  try {
    const result = await TransactionService.ingestSingle(req.body, req.user, req);

    res.status(201).json({
      success: true,
      message: result.isSuspicious
        ? `Transaction processed: Flagged as SUSPICIOUS (Risk Score: ${result.riskScore.overallScore}, Alert: ${result.alert?.alertId})`
        : `Transaction processed: Cleared normal monitoring (Risk Score: ${result.riskScore.overallScore})`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const ingestBatchTransactions = async (req, res, next) => {
  try {
    const batchList = Array.isArray(req.body) ? req.body : req.body.transactions;
    if (!batchList || !Array.isArray(batchList)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload: Expecting an array of transactions or { transactions: [...] }'
      });
    }

    const result = await TransactionService.ingestBatch(batchList, req.user, req);

    res.status(201).json({
      success: true,
      message: `Batch processed: ${result.processedCount} succeeded, ${result.failedCount} failed, ${result.alertsGenerated} alerts generated`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const getTransactions = async (req, res, next) => {
  try {
    const result = await TransactionService.getTransactions(req.query);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const getTransactionById = async (req, res, next) => {
  try {
    const result = await TransactionService.getTransactionById(req.params.id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: `Transaction '${req.params.id}' not found`
      });
    }
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};
