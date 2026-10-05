import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { User, Customer, Transaction, Alert, AuditLog } from '../models/index.js';
import { NetworkEngine } from '../engines/NetworkEngine.js';
import { NetworkService } from '../services/networkService.js';
import app from '../app.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import http from 'http';

const runPhase4Tests = async () => {
  logger.info('🚀 Starting Phase 4 Comprehensive Test Suite (Network Analysis & Graph Traversal)...');
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

  let serverInstance = null;

  try {
    // 1. Retrieve Test Users & Create Auth Tokens
    const analystUser = await User.findOne({ username: 'analyst' });
    const complianceUser = await User.findOne({ username: 'compliance' });
    const adminUser = await User.findOne({ username: 'admin' });
    assert(!!analystUser && !!complianceUser && !!adminUser, 'Retrieved active users (Analyst, Compliance, Admin)');

    const analystToken = jwt.sign(
      { id: analystUser._id, username: analystUser.username, role: analystUser.role },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const complianceToken = jwt.sign(
      { id: complianceUser._id, username: complianceUser.username, role: complianceUser.role },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const adminToken = jwt.sign(
      { id: adminUser._id, username: adminUser.username, role: adminUser.role },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // -------------------------------------------------------------
    // Test 1: Multi-Hop BFS Graph Traversal with Configurable Depth
    // -------------------------------------------------------------
    logger.info('\n--- Test 1: Multi-Hop BFS Graph Traversal with Depth Limits ---');
    const depth1Result = await NetworkEngine.buildNetworkGraph({
      accountId: 'ACC-4001-543210',
      maxDepth: 1
    });
    assert(depth1Result.nodes.length >= 2, `Depth 1 returns direct counterparties (Found ${depth1Result.nodes.length} nodes)`);
    assert(depth1Result.edges.length >= 1, `Depth 1 returns direct edges (Found ${depth1Result.edges.length} edges)`);
    assert(depth1Result.metrics.traversalDepth <= 1, 'Traversal depth bounded at 1 hop');

    const depth3Result = await NetworkEngine.buildNetworkGraph({
      accountId: 'ACC-4001-543210',
      maxDepth: 3
    });
    assert(depth3Result.nodes.length >= depth1Result.nodes.length, `Depth 3 expands graph (Found ${depth3Result.nodes.length} nodes >= ${depth1Result.nodes.length})`);
    assert(depth3Result.metrics.nodeCount === depth3Result.nodes.length, 'Node count metric matches node array length');
    assert(depth3Result.metrics.edgeCount === depth3Result.edges.length, 'Edge count metric matches edge array length');
    assert(typeof depth3Result.metrics.totalVolumeINR === 'number' && depth3Result.metrics.totalVolumeINR > 0, 'Total volume in INR correctly aggregated');

    // -------------------------------------------------------------
    // Test 2: Node & Edge Attribute Enrichment
    // -------------------------------------------------------------
    logger.info('\n--- Test 2: Node & Edge Enrichment (KYC, Risk, Alerts) ---');
    const seedNode = depth3Result.nodes.find((n) => n.id === 'ACC-4001-543210');
    assert(!!seedNode, 'Seed node (ACC-4001-543210) present in nodes array');
    assert(seedNode.isSeed === true, 'Seed flag correctly set on originator node');
    assert(!!seedNode.label && !!seedNode.bankName, 'Node enriched with KYC label and institution name');
    assert(typeof seedNode.riskScore === 'number' && seedNode.riskScore >= 0, 'Node has valid calculated risk score');
    assert(typeof seedNode.totalInflowINR === 'number' && typeof seedNode.totalOutflowINR === 'number', 'Node has inflow and outflow statistics');

    const sampleEdge = depth3Result.edges[0];
    assert(!!sampleEdge.source && !!sampleEdge.target, 'Edge contains source and target identifiers');
    assert(typeof sampleEdge.normalizedAmountINR === 'number', 'Edge has normalized INR amount');
    assert(typeof sampleEdge.isSuspicious === 'boolean', 'Edge indicates suspicious status');

    // -------------------------------------------------------------
    // Test 3: Multi-Hop Rapid Layering Chain Detection
    // -------------------------------------------------------------
    logger.info('\n--- Test 3: Multi-Hop Layering Chain Detection (A -> B -> C -> D) ---');
    const layeringGraph = await NetworkEngine.buildNetworkGraph({
      accountId: 'ACC-4001-543210',
      maxDepth: 4
    });

    const layeringPattern = layeringGraph.detectedPatterns.find(
      (p) => p.type === 'LAYERING_CHAIN'
    );
    assert(!!layeringPattern, 'Layering chain pattern detected in multi-hop transaction chain');
    assert(layeringPattern.severity === 'CRITICAL', 'Layering pattern severity classified as CRITICAL');
    assert(layeringPattern.hopCount >= 3, `Layering chain hop count verified (${layeringPattern.hopCount} hops)`);
    assert(
      layeringPattern.participatingAccounts.includes('ACC-4001-543210') &&
      layeringPattern.participatingAccounts.includes('ACC-4002-432109'),
      'Participating entities accurately identified in layering sequence'
    );

    // -------------------------------------------------------------
    // Test 4: Circular Fund Movement / Cycle Detection (A -> B -> C -> A)
    // -------------------------------------------------------------
    logger.info('\n--- Test 4: Circular Fund Movement / Cycle Detection ---');
    const mockNodes = [
      { id: 'ACC-CYCLE-A', label: 'Party A', riskCategory: 'MEDIUM' },
      { id: 'ACC-CYCLE-B', label: 'Party B', riskCategory: 'LOW' },
      { id: 'ACC-CYCLE-C', label: 'Party C', riskCategory: 'HIGH' }
    ];
    const mockCycleEdges = [
      { id: 'TX-C1', source: 'ACC-CYCLE-A', target: 'ACC-CYCLE-B', normalizedAmountINR: 800000, timestamp: new Date() },
      { id: 'TX-C2', source: 'ACC-CYCLE-B', target: 'ACC-CYCLE-C', normalizedAmountINR: 790000, timestamp: new Date() },
      { id: 'TX-C3', source: 'ACC-CYCLE-C', target: 'ACC-CYCLE-A', normalizedAmountINR: 780000, timestamp: new Date() }
    ];

    const detectedCyclePatterns = NetworkEngine.detectSuspiciousTopologies(mockNodes, mockCycleEdges);
    const cyclePattern = detectedCyclePatterns.find((p) => p.type === 'CIRCULAR_TRANSACTION_FLOW');
    assert(!!cyclePattern, 'Circular flow / round-tripping topology identified');
    assert(cyclePattern.severity === 'CRITICAL', 'Circular flow classified as CRITICAL severity');
    assert(cyclePattern.cycleLength === 3, 'Cycle length correctly computed as 3 hops');
    assert(
      cyclePattern.participatingAccounts.includes('ACC-CYCLE-A') &&
      cyclePattern.participatingAccounts.includes('ACC-CYCLE-B') &&
      cyclePattern.participatingAccounts.includes('ACC-CYCLE-C'),
      'All 3 accounts correctly identified as participating in cycle'
    );

    // -------------------------------------------------------------
    // Test 5: Fan-In Aggregator & Fan-Out Dispersal Mule Detection
    // -------------------------------------------------------------
    logger.info('\n--- Test 5: Smurf Aggregator & Dispersal Hub Detection ---');
    const mockHubNodes = [
      { id: 'HUB-MULE-01', label: 'Mule Hub', riskCategory: 'HIGH' },
      { id: 'SRC-01', label: 'Source 1', riskCategory: 'LOW' },
      { id: 'SRC-02', label: 'Source 2', riskCategory: 'LOW' },
      { id: 'SRC-03', label: 'Source 3', riskCategory: 'LOW' },
      { id: 'DST-01', label: 'Target 1', riskCategory: 'LOW' },
      { id: 'DST-02', label: 'Target 2', riskCategory: 'LOW' },
      { id: 'DST-03', label: 'Target 3', riskCategory: 'LOW' }
    ];
    const mockHubEdges = [
      { id: 'E-IN-1', source: 'SRC-01', target: 'HUB-MULE-01', normalizedAmountINR: 300000, timestamp: new Date() },
      { id: 'E-IN-2', source: 'SRC-02', target: 'HUB-MULE-01', normalizedAmountINR: 300000, timestamp: new Date() },
      { id: 'E-IN-3', source: 'SRC-03', target: 'HUB-MULE-01', normalizedAmountINR: 300000, timestamp: new Date() },
      { id: 'E-OUT-1', source: 'HUB-MULE-01', target: 'DST-01', normalizedAmountINR: 290000, timestamp: new Date() },
      { id: 'E-OUT-2', source: 'HUB-MULE-01', target: 'DST-02', normalizedAmountINR: 290000, timestamp: new Date() },
      { id: 'E-OUT-3', source: 'HUB-MULE-01', target: 'DST-03', normalizedAmountINR: 290000, timestamp: new Date() }
    ];

    const hubPatterns = NetworkEngine.detectSuspiciousTopologies(mockHubNodes, mockHubEdges);
    const fanIn = hubPatterns.find((p) => p.type === 'FAN_IN_AGGREGATOR');
    const fanOut = hubPatterns.find((p) => p.type === 'FAN_OUT_DISPERSAL');
    assert(!!fanIn, 'Fan-In aggregator hub identified for account receiving from 3+ sources');
    assert(fanIn?.counterpartyCount >= 3, 'Fan-In counterparty count correctly identified');
    assert(!!fanOut, 'Fan-Out dispersal hub identified for account sending to 3+ destinations');
    assert(fanOut?.counterpartyCount >= 3, 'Fan-Out counterparty count correctly identified');

    // -------------------------------------------------------------
    // Test 6: Entity Network Summary Metrics
    // -------------------------------------------------------------
    logger.info('\n--- Test 6: Entity Network Summary Metrics ---');
    const summary = await NetworkEngine.getEntityNetworkSummary('ACC-4001-543210');
    assert(summary.entityId === 'ACC-4001-543210', 'Summary returned for requested entity');
    assert(summary.metrics.totalTransactions >= 1, `Total transactions aggregated (${summary.metrics.totalTransactions})`);
    assert(summary.metrics.uniqueCounterpartiesCount >= 1, `Unique counterparties counted (${summary.metrics.uniqueCounterpartiesCount})`);
    assert(Array.isArray(summary.counterparties), 'Counterparties array returned');
    assert(Array.isArray(summary.recentTransactions), 'Recent transactions history array returned');

    // -------------------------------------------------------------
    // Test 7: Service Layer & Audit Logging
    // -------------------------------------------------------------
    logger.info('\n--- Test 7: Audit Logging on Network Exploration ---');
    const testEntityId = 'ACC-4001-543210';
    await NetworkService.getNetworkGraph(
      { accountId: testEntityId, maxDepth: 2 },
      analystUser,
      { ip: '127.0.0.1', get: () => 'TestAgent' }
    );

    const auditEntry = await AuditLog.findOne({
      action: 'NETWORK_GRAPH_EXPLORED',
      entityId: testEntityId
    }).sort({ timestamp: -1 });

    assert(!!auditEntry, 'Audit log created for NETWORK_GRAPH_EXPLORED action');
    assert(auditEntry?.username === analystUser.username, 'Audit log correctly recorded acting analyst');
    assert(auditEntry?.newValue?.depth === 2, 'Audit log recorded traversal depth metadata');

    // -------------------------------------------------------------
    // Test 8: HTTP API & RBAC Security Verification
    // -------------------------------------------------------------
    logger.info('\n--- Test 8: HTTP API Endpoints & RBAC Protection ---');
    const serverPort = await new Promise((resolve) => {
      serverInstance = http.createServer(app);
      serverInstance.listen(0, () => {
        resolve(serverInstance.address().port);
      });
    });

    const baseUrl = `http://localhost:${serverPort}/api/v1/network`;

    // 8a. Unauthenticated access denied (401)
    const unauthRes = await fetch(`${baseUrl}/graph?accountId=ACC-4001-543210`);
    assert(unauthRes.status === 401, 'Unauthenticated request to /network/graph rejected with 401 Unauthorized');

    // 8b. Authenticated Analyst access to /network/graph (200)
    const graphRes = await fetch(`${baseUrl}/graph?accountId=ACC-4001-543210&maxDepth=2`, {
      headers: { Authorization: `Bearer ${analystToken}` }
    });
    const graphJson = await graphRes.json();
    assert(graphRes.status === 200 && graphJson.success === true, 'Analyst access to /network/graph returns 200 OK');
    assert(Array.isArray(graphJson.data.nodes), 'Response payload contains nodes array');
    assert(Array.isArray(graphJson.data.edges), 'Response payload contains edges array');

    // 8c. Authenticated Compliance Officer access to /network/patterns (200)
    const patternsRes = await fetch(`${baseUrl}/patterns?accountId=ACC-4001-543210&maxDepth=4`, {
      headers: { Authorization: `Bearer ${complianceToken}` }
    });
    const patternsJson = await patternsRes.json();
    assert(patternsRes.status === 200 && patternsJson.success === true, 'Compliance access to /network/patterns returns 200 OK');
    assert(Array.isArray(patternsJson.data.patterns), 'Patterns endpoint returns detected typologies array');

    // 8d. Authenticated Admin access to /network/entity/:id (200)
    const entityRes = await fetch(`${baseUrl}/entity/ACC-4001-543210`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const entityJson = await entityRes.json();
    assert(entityRes.status === 200 && entityJson.success === true, 'Admin access to /network/entity/:id returns 200 OK');
    assert(entityJson.data.entityId === 'ACC-4001-543210', 'Entity summary endpoint returns matching entity profile');

    logger.info(`\n==============================================`);
    logger.info(`Phase 4 Test Summary: ${passed} PASSED, ${failed} FAILED`);
    logger.info(`==============================================`);

    if (serverInstance) serverInstance.close();
    await disconnectDB();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    logger.error(`Phase 4 Test execution error: ${err.stack || err.message}`);
    if (serverInstance) serverInstance.close();
    await disconnectDB();
    process.exit(1);
  }
};

runPhase4Tests();
