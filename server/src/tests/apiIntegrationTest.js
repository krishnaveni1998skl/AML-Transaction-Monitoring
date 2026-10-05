import { connectDB, disconnectDB } from '../config/db.js';
import app from '../app.js';
import { logger } from '../utils/logger.js';
import http from 'http';

const runHttpTests = async () => {
  logger.info('🌐 Starting HTTP API Integration Tests...');
  await connectDB();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5099, resolve));
  const baseUrl = 'http://localhost:5099';

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
    // 1. Health check
    logger.info('\n--- API Test 1: GET /api/health ---');
    const healthRes = await fetch(`${baseUrl}/api/health`).then((r) => r.json());
    assert(healthRes.success && healthRes.database.status === 'Connected', 'API Health check returns Connected status');

    // 2. Auth Login (Analyst)
    logger.info('\n--- API Test 2: POST /api/v1/auth/login ---');
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'analyst', password: 'AnalystPassword@2026' })
    }).then((r) => r.json());

    assert(loginRes.success && !!loginRes.data.token, 'Analyst login successful and returns JWT token');
    const token = loginRes.data.token;

    // 3. Auth /me
    logger.info('\n--- API Test 3: GET /api/v1/auth/me ---');
    const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then((r) => r.json());

    assert(meRes.success && meRes.data.user.role === 'AML_ANALYST', 'Me endpoint returns analyst role');

    // 4. GET /api/v1/rules
    logger.info('\n--- API Test 4: GET /api/v1/rules ---');
    const rulesRes = await fetch(`${baseUrl}/api/v1/rules`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then((r) => r.json());

    assert(rulesRes.success && rulesRes.count >= 11, `Rules endpoint returned ${rulesRes.count} AML rules`);

    // 5. Ingest Single Transaction via HTTP POST
    logger.info('\n--- API Test 5: POST /api/v1/transactions/ingest ---');
    const ingestRes = await fetch(`${baseUrl}/api/v1/transactions/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        transactionId: `TXN-HTTP-TEST-${Date.now()}`,
        sourceCustomerId: 'CUST-IND-1002',
        sourceAccountId: 'ACC-1002-876543',
        destinationCustomerId: 'CUST-IND-4001',
        destinationAccountId: 'ACC-4001-543210',
        amount: 1400000,
        currency: 'INR',
        transactionType: 'BANK_TRANSFER',
        direction: 'DEBIT',
        channel: 'NET_BANKING'
      })
    }).then((r) => r.json());

    assert(ingestRes.success && ingestRes.data.isSuspicious, 'Transaction ingested via HTTP and flagged as suspicious');
    assert(ingestRes.data.riskScore.overallScore >= 61, `Risk score: ${ingestRes.data.riskScore.overallScore}/100`);

    const createdTxId = ingestRes.data.transaction.transactionId;

    // 6. GET /api/v1/transactions/:id
    logger.info('\n--- API Test 6: GET /api/v1/transactions/:id ---');
    const txDetailRes = await fetch(`${baseUrl}/api/v1/transactions/${createdTxId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then((r) => r.json());

    assert(txDetailRes.success && txDetailRes.data.transactionId === createdTxId, 'Transaction detail retrieved with customer and risk score');
    assert(!!txDetailRes.data.customerProfile, 'Customer profile attached to transaction response');
    assert(!!txDetailRes.data.riskScoreRecord, 'Explainable Risk score record attached');

    // 7. GET /api/v1/transactions (Filtered query)
    logger.info('\n--- API Test 7: GET /api/v1/transactions (Query & Pagination) ---');
    const listRes = await fetch(`${baseUrl}/api/v1/transactions?riskLevel=HIGH&limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then((r) => r.json());

    assert(listRes.success && Array.isArray(listRes.data.transactions), 'Transaction query returned paginated transactions list');

    logger.info(`\n==============================================`);
    logger.info(`HTTP Integration Test Summary: ${passed} PASSED, ${failed} FAILED`);
    logger.info(`==============================================`);

    server.close();
    await disconnectDB();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    logger.error(`HTTP Test failed: ${err.stack || err.message}`);
    server.close();
    await disconnectDB();
    process.exit(1);
  }
};

runHttpTests();
