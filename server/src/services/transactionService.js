import {
  Transaction,
  Customer,
  RuleHit,
  RiskScore,
  Alert
} from '../models/index.js';
import { PreprocessingPipeline } from '../engines/PreprocessingPipeline.js';
import { RuleEngine } from '../engines/RuleEngine.js';
import { RiskScoringEngine } from '../engines/RiskScoringEngine.js';
import { recordAuditLog } from '../middlewares/auditLogger.js';
import { logger } from '../utils/logger.js';

export class TransactionService {
  /**
   * Ingests, screens, and scores a single transaction
   * @param {object} rawPayload - Raw incoming transaction payload
   * @param {object} user - Authenticated user context (if present)
   * @param {object} req - Express request object (for IP / UserAgent in audit)
   * @returns {Promise<object>} Processing outcome
   */
  static async ingestSingle(rawPayload, user = null, req = null) {
    // 1. Preprocessing, Validation & Enrichment
    const context = await PreprocessingPipeline.process(rawPayload);

    // 2. Configurable AML Rule Engine Evaluation
    const ruleHits = await RuleEngine.evaluate(context);

    // 3. Multi-Factor Risk Scoring
    const scoringResult = await RiskScoringEngine.calculate(context, ruleHits);

    // 4. Suspicious Activity Detection
    const hasCriticalRule = ruleHits.some((h) => h.severity === 'CRITICAL');
    const isSuspicious =
      scoringResult.riskLevel === 'CRITICAL' ||
      scoringResult.riskLevel === 'HIGH' ||
      hasCriticalRule ||
      ruleHits.length >= 2;

    // 5. Persist Rule Hits
    const savedRuleHitDocs = [];
    for (const hit of ruleHits) {
      const hitDoc = await RuleHit.create({
        ruleId: hit.ruleId,
        ruleCode: hit.ruleCode,
        ruleName: hit.ruleName,
        transactionId: context.transaction.transactionId,
        customerId: context.customer.customerId,
        severity: hit.severity,
        scoreContribution: hit.scoreContribution,
        details: hit.details,
        timestamp: context.transaction.timestamp
      });
      savedRuleHitDocs.push(hitDoc);
    }

    // 6. Persist Transaction
    const transactionDoc = await Transaction.create({
      transactionId: context.transaction.transactionId,
      sourceCustomerId: context.customer.customerId,
      sourceAccountId: context.transaction.sourceAccountId,
      destinationCustomerId: context.transaction.destinationCustomerId || null,
      destinationAccountId: context.transaction.destinationAccountId,
      destinationBank: context.transaction.destinationBank,
      amount: context.transaction.amount,
      currency: context.transaction.currency,
      normalizedAmountINR: context.transaction.normalizedAmountINR,
      transactionType: context.transaction.transactionType,
      direction: context.transaction.direction,
      channel: context.transaction.channel,
      location: context.transaction.location,
      merchantDetails: context.transaction.merchantDetails,
      timestamp: context.transaction.timestamp,
      riskScore: scoringResult.overallScore,
      riskLevel: scoringResult.riskLevel,
      isSuspicious,
      ruleHits: savedRuleHitDocs.map((d) => d._id),
      metadata: {
        geoRisk: context.geoRisk,
        sanctionsHit: context.sanctionsHit,
        sanctionsMatchDetails: context.sanctionsMatchDetails
      }
    });

    // 7. Persist Explainable Risk Score
    const riskScoreDoc = await RiskScore.create({
      entityType: 'TRANSACTION',
      entityId: transactionDoc.transactionId,
      overallScore: scoringResult.overallScore,
      riskLevel: scoringResult.riskLevel,
      scoreBreakdown: scoringResult.scoreBreakdown,
      explanations: scoringResult.explanations,
      evaluatedAt: transactionDoc.timestamp
    });

    // 8. Alert Generation (if suspicious)
    let alertDoc = null;
    if (isSuspicious) {
      const year = new Date().getFullYear();
      let alertId;
      let attempt = 0;
      while (!alertId && attempt < 50) {
        const count = await Alert.countDocuments();
        const candidateId = `ALT-${year}-${String(count + 1 + attempt).padStart(4, '0')}`;
        const exists = await Alert.findOne({ alertId: candidateId }).lean();
        if (!exists) {
          alertId = candidateId;
        } else {
          attempt++;
        }
      }
      if (!alertId) {
        alertId = `ALT-${year}-${Date.now().toString().slice(-6)}`;
      }

      let priority = 'MEDIUM';
      if (scoringResult.overallScore >= 81) {
        priority = 'CRITICAL';
      } else if (scoringResult.overallScore >= 61) {
        priority = 'HIGH';
      }

      alertDoc = await Alert.create({
        alertId,
        customerId: context.customer.customerId,
        transactionId: transactionDoc.transactionId,
        amount: transactionDoc.amount,
        currency: transactionDoc.currency,
        normalizedAmountINR: transactionDoc.normalizedAmountINR,
        riskScore: scoringResult.overallScore,
        riskLevel: scoringResult.riskLevel,
        priority,
        triggeredRules: savedRuleHitDocs.map((h) => ({
          ruleCode: h.ruleCode,
          ruleName: h.ruleName,
          severity: h.severity,
          scoreContribution: h.scoreContribution,
          details: h.details
        })),
        status: 'OPEN',
        sarCandidate: scoringResult.overallScore >= 90 || hasCriticalRule,
        createdAt: transactionDoc.timestamp
      });

      // Increment customer's historical alert counter
      await Customer.updateOne(
        { customerId: context.customer.customerId },
        { $inc: { previousAlertCount: 1 } }
      );
    }

    // 9. Comprehensive Audit Log
    await recordAuditLog({
      req,
      userId: user?._id || null,
      username: user?.username || 'SYSTEM_INGEST',
      userRole: user?.role || 'SYSTEM',
      action: 'TRANSACTION_INGESTED_SINGLE',
      entity: 'TRANSACTION',
      entityId: transactionDoc.transactionId,
      previousValue: null,
      newValue: {
        transactionId: transactionDoc.transactionId,
        amountINR: transactionDoc.normalizedAmountINR,
        riskScore: scoringResult.overallScore,
        riskLevel: scoringResult.riskLevel,
        ruleHitsCount: savedRuleHitDocs.length,
        isSuspicious,
        alertGenerated: !!alertDoc,
        alertId: alertDoc?.alertId || null
      }
    });

    return {
      transaction: transactionDoc,
      riskScore: riskScoreDoc,
      ruleHits: savedRuleHitDocs,
      isSuspicious,
      alertGenerated: !!alertDoc,
      alert: alertDoc
    };
  }

  /**
   * Ingests batch transactions sequentially with error isolation
   * @param {Array<object>} transactionsArray - Array of transaction objects
   * @param {object} user - Authenticated user
   * @param {object} req - Express request
   * @returns {Promise<object>} Batch processing summary
   */
  static async ingestBatch(transactionsArray, user = null, req = null) {
    if (!Array.isArray(transactionsArray) || transactionsArray.length === 0) {
      throw new Error('Batch payload must be a non-empty array of transactions');
    }

    const total = transactionsArray.length;
    const processed = [];
    const failed = [];
    let alertsCount = 0;

    for (let i = 0; i < total; i++) {
      const rawTx = transactionsArray[i];
      try {
        const result = await TransactionService.ingestSingle(rawTx, user, req);
        processed.push({
          index: i,
          transactionId: result.transaction.transactionId,
          riskScore: result.riskScore.overallScore,
          riskLevel: result.riskScore.riskLevel,
          isSuspicious: result.isSuspicious,
          alertId: result.alert?.alertId || null
        });
        if (result.alertGenerated) {
          alertsCount++;
        }
      } catch (err) {
        logger.error(`Batch item [${i}] failed: ${err.message}`);
        failed.push({
          index: i,
          payload: rawTx,
          error: err.message
        });
      }
    }

    // Record master audit log for batch operation
    await recordAuditLog({
      req,
      userId: user?._id || null,
      username: user?.username || 'SYSTEM_INGEST',
      userRole: user?.role || 'SYSTEM',
      action: 'TRANSACTION_INGESTED_BATCH',
      entity: 'BATCH_JOB',
      entityId: `BATCH-${Date.now()}`,
      previousValue: null,
      newValue: {
        totalSubmitted: total,
        processedSuccessfully: processed.length,
        failedCount: failed.length,
        alertsGenerated: alertsCount
      }
    });

    return {
      totalSubmitted: total,
      processedCount: processed.length,
      failedCount: failed.length,
      alertsGenerated: alertsCount,
      processed,
      failed
    };
  }

  /**
   * Fetches paginated transactions with flexible filtering
   */
  static async getTransactions(query = {}) {
    const {
      page = 1,
      limit = 20,
      search,
      customerId,
      transactionType,
      riskLevel,
      isSuspicious,
      startDate,
      endDate,
      minAmount,
      maxAmount
    } = query;

    const filter = {};

    if (customerId) filter.sourceCustomerId = customerId;
    if (transactionType) filter.transactionType = transactionType;
    if (riskLevel) filter.riskLevel = riskLevel;
    if (typeof isSuspicious === 'boolean') filter.isSuspicious = isSuspicious;
    else if (isSuspicious === 'true') filter.isSuspicious = true;
    else if (isSuspicious === 'false') filter.isSuspicious = false;

    if (minAmount || maxAmount) {
      filter.normalizedAmountINR = {};
      if (minAmount) filter.normalizedAmountINR.$gte = Number(minAmount);
      if (maxAmount) filter.normalizedAmountINR.$lte = Number(maxAmount);
    }

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      const matchingCusts = await Customer.find({ fullName: searchRegex }).select('customerId').lean();
      const matchedCustIds = matchingCusts.map((c) => c.customerId);

      filter.$or = [
        { transactionId: searchRegex },
        { sourceCustomerId: searchRegex },
        { sourceAccountId: searchRegex },
        { destinationAccountId: searchRegex },
        ...(matchedCustIds.length > 0 ? [{ sourceCustomerId: { $in: matchedCustIds } }] : [])
      ];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('ruleHits')
        .lean(),
      Transaction.countDocuments(filter)
    ]);

    // Enrich with customer fullName and associated alert
    const txIds = transactions.map((t) => t.transactionId);
    const customerIds = [...new Set(transactions.map((t) => t.sourceCustomerId))];

    const [customers, alerts] = await Promise.all([
      Customer.find({ customerId: { $in: customerIds } }).select('customerId fullName').lean(),
      Alert.find({ transactionId: { $in: txIds } }).select('alertId transactionId status priority').lean()
    ]);

    const customerMap = new Map(customers.map((c) => [c.customerId, c.fullName]));
    const alertMap = new Map(alerts.map((a) => [a.transactionId, a]));

    const enrichedTransactions = transactions.map((t) => {
      const alert = alertMap.get(t.transactionId);
      return {
        ...t,
        customerName: customerMap.get(t.sourceCustomerId) || t.sourceCustomerId,
        associatedAlertId: alert?.alertId || null,
        associatedAlertStatus: alert?.status || null
      };
    });

    return {
      transactions: enrichedTransactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    };
  }

  /**
   * Fetches a single transaction with populated rule hits, customer profile, and risk score
   */
  static async getTransactionById(transactionId) {
    const transaction = await Transaction.findOne({ transactionId })
      .populate('ruleHits')
      .lean();

    if (!transaction) return null;

    const [customer, riskScore, alert] = await Promise.all([
      Customer.findOne({ customerId: transaction.sourceCustomerId }).lean(),
      RiskScore.findOne({ entityType: 'TRANSACTION', entityId: transactionId }).lean(),
      Alert.findOne({ transactionId }).lean()
    ]);

    return {
      ...transaction,
      customerProfile: customer,
      riskScoreRecord: riskScore,
      associatedAlert: alert
    };
  }
}

export default TransactionService;
