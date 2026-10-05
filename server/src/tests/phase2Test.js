import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { User, Customer, AMLRule, Transaction, Alert, AuditLog } from '../models/index.js';
import { TransactionService } from '../services/transactionService.js';
import { RuleService } from '../services/ruleService.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const runTests = async () => {
  logger.info('🚀 Starting Phase 2 Comprehensive Test Suite...');
  await connectDB();

  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      logger.info(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      logger.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  };

  try {
    // Setup test users
    const adminUser = await User.findOne({ username: 'admin' });
    const analystUser = await User.findOne({ username: 'analyst' });
    assert(!!adminUser && !!analystUser, 'Admin and Analyst users retrieved from database');

    // Clean up previous test transactions to guarantee test idempotence
    await Transaction.deleteMany({ transactionId: { $regex: /^TXN-(TEST|BATCH)/ } });
    await Alert.deleteMany({ transactionId: { $regex: /^TXN-(TEST|BATCH)/ } });
    await Customer.updateOne({ customerId: 'CUST-IND-1001' }, { previousAlertCount: 0 });
    await AMLRule.updateOne({ ruleCode: 'RULE_HIGH_VAL' }, { 'parameters.thresholdAmount': 1000000 });
    const { RuleEngine } = await import('../engines/RuleEngine.js');
    RuleEngine.invalidateCache();

    // -------------------------------------------------------------
    // Test 1: Normal Transaction (Baseline Low Risk)
    // -------------------------------------------------------------
    logger.info('\n--- Test 1: Ingest Normal Routine Transaction ---');
    const normalPayload = {
      transactionId: `TXN-TEST-NORM-${Date.now()}`,
      sourceCustomerId: 'CUST-IND-1001',
      sourceAccountId: 'ACC-1001-987654',
      destinationCustomerId: 'CUST-IND-1002',
      destinationAccountId: 'ACC-1002-876543',
      amount: 12000,
      currency: 'INR',
      transactionType: 'UPI',
      direction: 'DEBIT',
      channel: 'MOBILE_APP',
      location: { city: 'Pune', countryCode: 'IN', ipAddress: '49.36.12.80' }
    };

    const normalRes = await TransactionService.ingestSingle(normalPayload, analystUser);
    assert(!normalRes.isSuspicious, 'Normal transaction flagged as isSuspicious=false');
    assert(normalRes.riskScore.riskLevel === 'LOW', `Risk level is LOW (${normalRes.riskScore.overallScore}/100)`);
    assert(normalRes.ruleHits.length === 0, 'Zero AML rule hits triggered');
    assert(!normalRes.alertGenerated, 'No compliance alert generated');

    // -------------------------------------------------------------
    // Test 2: High Value Transaction (₹18,00,000 >= ₹10,00,000)
    // -------------------------------------------------------------
    logger.info('\n--- Test 2: Ingest High Value Transaction ---');
    const highValPayload = {
      transactionId: `TXN-TEST-HIGHVAL-${Date.now()}`,
      sourceCustomerId: 'CUST-IND-1002',
      sourceAccountId: 'ACC-1002-876543',
      destinationCustomerId: 'CUST-IND-4001',
      destinationAccountId: 'ACC-4001-543210',
      amount: 1800000, // ₹18 Lakhs
      currency: 'INR',
      transactionType: 'BANK_TRANSFER',
      direction: 'DEBIT',
      channel: 'NET_BANKING',
      location: { city: 'Bengaluru', countryCode: 'IN', ipAddress: '106.51.78.22' }
    };

    const highValRes = await TransactionService.ingestSingle(highValPayload, analystUser);
    assert(highValRes.isSuspicious, 'High value transaction flagged as isSuspicious=true');
    const highValHit = highValRes.ruleHits.find((h) => h.ruleCode === 'RULE_HIGH_VAL');
    assert(!!highValHit, 'RULE_HIGH_VAL triggered');
    assert(highValRes.riskScore.overallScore >= 61, `High Risk Score calculated (${highValRes.riskScore.overallScore}/100)`);
    assert(highValRes.alertGenerated, `Alert created with ID: ${highValRes.alert?.alertId}`);
    assert(highValRes.alert?.priority === 'HIGH' || highValRes.alert?.priority === 'CRITICAL', 'Alert priority set to HIGH/CRITICAL');

    // -------------------------------------------------------------
    // Test 3: Structuring / Smurfing Cash Deposits
    // -------------------------------------------------------------
    logger.info('\n--- Test 3: Structuring / Smurfing Detection ---');
    // CUST-IND-2001 already has smurfing deposits from seed. Ingest another ₹4,85,000 cash deposit.
    const smurfPayload = {
      transactionId: `TXN-TEST-SMURF-${Date.now()}`,
      sourceCustomerId: 'CUST-IND-2001',
      sourceAccountId: 'ACC-2001-765432',
      destinationAccountId: 'ACC-2001-765432',
      amount: 485000, // Just below ₹5,00,000
      currency: 'INR',
      transactionType: 'CASH_DEPOSIT',
      direction: 'CREDIT',
      channel: 'BRANCH',
      location: { city: 'Ahmedabad', countryCode: 'IN', ipAddress: '127.0.0.1' }
    };

    const smurfRes = await TransactionService.ingestSingle(smurfPayload, analystUser);
    assert(smurfRes.isSuspicious, 'Smurfing deposit flagged as isSuspicious=true');
    const smurfHit = smurfRes.ruleHits.find((h) => h.ruleCode === 'RULE_STRUCTURING');
    assert(!!smurfHit, 'RULE_STRUCTURING triggered');
    assert(smurfRes.riskScore.riskLevel === 'CRITICAL', `Risk level elevated to CRITICAL (${smurfRes.riskScore.overallScore}/100)`);
    assert(smurfRes.alert?.priority === 'CRITICAL', 'Alert priority is CRITICAL');

    // -------------------------------------------------------------
    // Test 4: Rapid In/Out Flow
    // -------------------------------------------------------------
    logger.info('\n--- Test 4: Rapid In/Out Fund Movement ---');
    const rapidAccId = `ACC-3001-RAPID-${Date.now()}`;
    // First, credit an account with ₹30,00,000
    const inTxPayload = {
      transactionId: `TXN-TEST-RAPID-IN-${Date.now()}`,
      sourceCustomerId: 'CUST-IND-4001',
      sourceAccountId: 'ACC-4001-543210',
      destinationCustomerId: 'CUST-IND-3001',
      destinationAccountId: rapidAccId,
      amount: 3000000,
      currency: 'INR',
      transactionType: 'BANK_TRANSFER',
      direction: 'CREDIT',
      channel: 'NET_BANKING',
      timestamp: new Date(Date.now() - 5 * 60000) // 5 minutes ago
    };
    await TransactionService.ingestSingle(inTxPayload, analystUser);

    // Now immediately transfer out ₹28,50,000 (95% ratio)
    const outTxPayload = {
      transactionId: `TXN-TEST-RAPID-OUT-${Date.now()}`,
      sourceCustomerId: 'CUST-IND-3001',
      sourceAccountId: rapidAccId,
      destinationAccountId: 'ACC-OFFSHORE-CRYPTO-999',
      amount: 2850000,
      currency: 'INR',
      transactionType: 'INTERNATIONAL_TRANSFER',
      direction: 'DEBIT',
      channel: 'NET_BANKING',
      location: { city: 'Kolkata', countryCode: 'IN', ipAddress: '103.220.68.10' }
    };

    const rapidRes = await TransactionService.ingestSingle(outTxPayload, analystUser);
    assert(rapidRes.isSuspicious, 'Rapid outflow flagged as isSuspicious=true');
    const rapidHit = rapidRes.ruleHits.find((h) => h.ruleCode === 'RULE_RAPID_FLOW');
    assert(!!rapidHit, 'RULE_RAPID_FLOW triggered');
    assert(rapidHit?.details?.flowRatioPercent >= 85, `Detected outflow ratio: ${rapidHit?.details?.flowRatioPercent}%`);

    // -------------------------------------------------------------
    // Test 5: High-Risk Geographic / FATF Blacklist Corridor
    // -------------------------------------------------------------
    logger.info('\n--- Test 5: High-Risk Geographic / FATF Sanctions Corridor ---');
    const geoPayload = {
      transactionId: `TXN-TEST-GEO-${Date.now()}`,
      sourceCustomerId: 'CUST-IND-1001',
      sourceAccountId: 'ACC-1001-987654',
      destinationAccountId: 'ACC-PYONGYANG-KOR-01',
      amount: 400000,
      currency: 'INR',
      transactionType: 'INTERNATIONAL_TRANSFER',
      direction: 'DEBIT',
      channel: 'NET_BANKING',
      location: { city: 'Pyongyang', countryCode: 'KP', ipAddress: '175.45.176.1' } // KP = DPRK (FATF Blacklist)
    };

    const geoRes = await TransactionService.ingestSingle(geoPayload, analystUser);
    assert(geoRes.isSuspicious, 'FATF blacklisted destination flagged as isSuspicious=true');
    const geoHit = geoRes.ruleHits.find((h) => h.ruleCode === 'RULE_GEO_RISK');
    assert(!!geoHit, 'RULE_GEO_RISK triggered');
    assert(geoRes.riskScore.scoreBreakdown.countryRisk >= 15, `Country risk factor elevated (${geoRes.riskScore.scoreBreakdown.countryRisk})`);

    // -------------------------------------------------------------
    // Test 6: Off-Hours Nocturnal Activity (02:30 AM)
    // -------------------------------------------------------------
    logger.info('\n--- Test 6: Off-Hours Nocturnal Activity ---');
    const offHoursDate = new Date();
    offHoursDate.setHours(2, 30, 0, 0); // 02:30 AM

    const offHoursPayload = {
      transactionId: `TXN-TEST-HOURS-${Date.now()}`,
      sourceCustomerId: 'CUST-IND-1002',
      sourceAccountId: 'ACC-1002-876543',
      destinationAccountId: 'ACC-RETAIL-EXTERNAL',
      amount: 450000,
      currency: 'INR',
      transactionType: 'BANK_TRANSFER',
      direction: 'DEBIT',
      channel: 'NET_BANKING',
      timestamp: offHoursDate
    };

    const hoursRes = await TransactionService.ingestSingle(offHoursPayload, analystUser);
    const hoursHit = hoursRes.ruleHits.find((h) => h.ruleCode === 'RULE_UNUSUAL_HOURS');
    assert(!!hoursHit, 'RULE_UNUSUAL_HOURS triggered for transaction at 02:30 AM');

    // -------------------------------------------------------------
    // Test 7: Batch Ingestion Pipeline
    // -------------------------------------------------------------
    logger.info('\n--- Test 7: Batch Transaction Ingestion Pipeline ---');
    const batchList = [
      {
        transactionId: `TXN-BATCH-1-${Date.now()}`,
        sourceCustomerId: 'CUST-IND-1001',
        sourceAccountId: 'ACC-1001-987654',
        destinationAccountId: 'ACC-MERCHANT-01',
        amount: 2500,
        currency: 'INR',
        transactionType: 'UPI',
        direction: 'DEBIT'
      },
      {
        transactionId: `TXN-BATCH-2-${Date.now()}`,
        sourceCustomerId: 'CUST-IND-1002',
        sourceAccountId: 'ACC-1002-876543',
        destinationAccountId: 'ACC-MERCHANT-02',
        amount: 8000,
        currency: 'INR',
        transactionType: 'CARD',
        direction: 'DEBIT'
      },
      {
        transactionId: `TXN-BATCH-3-${Date.now()}`,
        sourceCustomerId: 'CUST-IND-5001', // PEP customer
        sourceAccountId: 'ACC-5001-109876',
        destinationAccountId: 'ACC-OFFSHORE-09',
        amount: 900000,
        currency: 'INR',
        transactionType: 'INTERNATIONAL_TRANSFER',
        direction: 'DEBIT'
      }
    ];

    const batchRes = await TransactionService.ingestBatch(batchList, analystUser);
    assert(batchRes.totalSubmitted === 3, 'Batch submitted 3 transactions');
    assert(batchRes.processedCount === 3, 'All 3 processed successfully');
    assert(batchRes.alertsGenerated >= 1, `Generated ${batchRes.alertsGenerated} alert(s) from batch items`);

    // -------------------------------------------------------------
    // Test 8: Dynamic Rule Configuration Hot-Reload
    // -------------------------------------------------------------
    logger.info('\n--- Test 8: Configurable Database Rule Hot-Reload ---');
    const highValRule = await AMLRule.findOne({ ruleCode: 'RULE_HIGH_VAL' });
    assert(!!highValRule, 'Found RULE_HIGH_VAL in database');

    const originalThreshold = highValRule.parameters.thresholdAmount; // ₹10,00,000

    // Raise threshold to ₹25,00,000 via RuleService
    await RuleService.updateRule(
      highValRule._id,
      { parameters: { thresholdAmount: 2500000 } },
      adminUser
    );
    logger.info('Updated RULE_HIGH_VAL threshold to ₹25,00,000');

    // Test a transaction of ₹15,00,000 (previously triggered, now should NOT trigger)
    const test15L = {
      transactionId: `TXN-TEST-HOTRELOAD-${Date.now()}`,
      sourceCustomerId: 'CUST-IND-1001',
      sourceAccountId: 'ACC-1001-987654',
      destinationAccountId: 'ACC-1002-876543',
      amount: 1500000,
      currency: 'INR',
      transactionType: 'BANK_TRANSFER',
      direction: 'DEBIT'
    };

    const hotReloadRes = await TransactionService.ingestSingle(test15L, analystUser);
    const hitUnderNewThreshold = hotReloadRes.ruleHits.find((h) => h.ruleCode === 'RULE_HIGH_VAL');
    assert(!hitUnderNewThreshold, 'RULE_HIGH_VAL did NOT trigger on ₹15,00,000 under new ₹25,00,000 threshold (Dynamic Hot-Reload Verified!)');

    // Restore threshold back to original ₹10,00,000
    await RuleService.updateRule(
      highValRule._id,
      { parameters: { thresholdAmount: originalThreshold } },
      adminUser
    );
    logger.info('Restored RULE_HIGH_VAL threshold to ₹10,00,000');

    // -------------------------------------------------------------
    // Test 9: Audit Trail Verification
    // -------------------------------------------------------------
    logger.info('\n--- Test 9: Immutable Audit Logging Verification ---');
    const recentAuditLogs = await AuditLog.find({}).sort({ timestamp: -1 }).limit(10).lean();
    assert(recentAuditLogs.length >= 5, `Audit trail contains ${recentAuditLogs.length} recent records`);
    const ruleAudit = recentAuditLogs.find((l) => l.action === 'AML_RULE_MODIFIED');
    assert(!!ruleAudit, "Audit record captured 'AML_RULE_MODIFIED' with previous and new values");

    logger.info(`\n==============================================`);
    logger.info(`Phase 2 Test Summary: ${passed} PASSED, ${failed} FAILED`);
    logger.info(`==============================================`);

    await disconnectDB();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    logger.error(`Test execution error: ${err.stack || err.message}`);
    await disconnectDB();
    process.exit(1);
  }
};

runTests();
