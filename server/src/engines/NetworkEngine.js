import { Transaction, Customer, Alert } from '../models/index.js';
import { logger } from '../utils/logger.js';

/**
 * Enterprise Network Analysis & Graph Traversal Engine
 * Models relationships, reconstructs money flow paths, and detects laundering topologies.
 */
export class NetworkEngine {
  /**
   * Traverses transaction graph up to `maxDepth` hops starting from an account or customer
   * @param {object} params - { accountId, customerId, maxDepth = 2, minAmount, startDate, endDate }
   * @returns {Promise<object>} { nodes, edges, metrics, detectedPatterns }
   */
  static async buildNetworkGraph({
    accountId = null,
    customerId = null,
    maxDepth = 2,
    minAmount = null,
    startDate = null,
    endDate = null
  }) {
    const depth = Math.min(4, Math.max(1, Number(maxDepth) || 2));
    const visitedAccounts = new Set();
    const accountsToExplore = new Set();
    const collectedTransactions = new Map(); // transactionId -> tx
    const accountMetadata = new Map(); // accountId -> { customerId, bank, inflow, outflow, txCount }

    // 1. Resolve initial seed accounts
    if (accountId) {
      accountsToExplore.add(accountId);
    } else if (customerId) {
      const cust = await Customer.findOne({ customerId }).lean();
      if (cust?.accountNumber) {
        accountsToExplore.add(cust.accountNumber);
      }
      // Also find any accounts used by this customer in transactions
      const custTxs = await Transaction.find({
        $or: [{ sourceCustomerId: customerId }, { destinationCustomerId: customerId }]
      })
        .limit(20)
        .lean();
      custTxs.forEach((tx) => {
        if (tx.sourceAccountId) accountsToExplore.add(tx.sourceAccountId);
        if (tx.destinationAccountId) accountsToExplore.add(tx.destinationAccountId);
      });
    }

    if (accountsToExplore.size === 0) {
      return {
        nodes: [],
        edges: [],
        metrics: { nodeCount: 0, edgeCount: 0, depth, totalVolumeINR: 0, highRiskNodeCount: 0 },
        detectedPatterns: []
      };
    }

    // 2. Multi-Hop BFS Graph Traversal
    let currentDepth = 0;
    let frontier = Array.from(accountsToExplore);

    while (frontier.length > 0 && currentDepth < depth) {
      currentDepth++;
      const nextFrontier = new Set();

      for (const acc of frontier) {
        if (visitedAccounts.has(acc)) continue;
        visitedAccounts.add(acc);

        // Build query for transactions touching this account
        const query = {
          $or: [{ sourceAccountId: acc }, { destinationAccountId: acc }]
        };
        if (minAmount) query.normalizedAmountINR = { $gte: Number(minAmount) };
        if (startDate || endDate) {
          query.timestamp = {};
          if (startDate) query.timestamp.$gte = new Date(startDate);
          if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const relatedTxs = await Transaction.find(query)
          .sort({ timestamp: -1 })
          .limit(50)
          .lean();

        for (const tx of relatedTxs) {
          if (!collectedTransactions.has(tx.transactionId)) {
            collectedTransactions.set(tx.transactionId, tx);

            // Record neighbors for next hop
            if (!visitedAccounts.has(tx.sourceAccountId)) {
              nextFrontier.add(tx.sourceAccountId);
            }
            if (!visitedAccounts.has(tx.destinationAccountId)) {
              nextFrontier.add(tx.destinationAccountId);
            }
          }

          // Accumulate account metadata
          NetworkEngine._updateAccountStats(accountMetadata, tx);
        }
      }

      frontier = Array.from(nextFrontier);
    }

    // 3. Enrich Nodes with Customer Profiles & Active Alert Stats
    const accountIdSet = new Set(visitedAccounts);
    for (const tx of collectedTransactions.values()) {
      if (tx.sourceAccountId) accountIdSet.add(tx.sourceAccountId);
      if (tx.destinationAccountId) accountIdSet.add(tx.destinationAccountId);
    }
    const allAccountIds = Array.from(accountIdSet);
    const [customers, alerts] = await Promise.all([
      Customer.find({
        $or: [
          { accountNumber: { $in: allAccountIds } },
          { customerId: { $in: Array.from(accountMetadata.values()).map((v) => v.customerId).filter(Boolean) } }
        ]
      }).lean(),
      Alert.find({
        $or: [
          { customerId: { $in: Array.from(accountMetadata.values()).map((v) => v.customerId).filter(Boolean) } },
          { transactionId: { $in: Array.from(collectedTransactions.keys()) } }
        ]
      }).lean()
    ]);

    const customerByAccount = new Map();
    const customerById = new Map();
    customers.forEach((c) => {
      customerById.set(c.customerId, c);
      if (c.accountNumber) customerByAccount.set(c.accountNumber, c);
    });

    const alertsByCustomer = new Map();
    const alertsByTx = new Map();
    alerts.forEach((a) => {
      alertsByTx.set(a.transactionId, a);
      const list = alertsByCustomer.get(a.customerId) || [];
      list.push(a);
      alertsByCustomer.set(a.customerId, list);
    });

    // 4. Construct Formatted Graph Nodes
    const nodes = allAccountIds.map((accId) => {
      const meta = accountMetadata.get(accId) || { inflow: 0, outflow: 0, txCount: 0 };
      const cust = customerByAccount.get(accId) || customerById.get(meta.customerId) || null;
      const custAlerts = cust ? alertsByCustomer.get(cust.customerId) || [] : [];

      let riskCategory = cust?.riskCategory || 'LOW';
      let riskScore = cust?.customerRiskScore || 15;

      // Escalate node risk if critical alerts exist
      if (custAlerts.some((a) => a.priority === 'CRITICAL' || a.status === 'ESCALATED')) {
        riskCategory = 'CRITICAL';
        riskScore = Math.max(riskScore, 85);
      } else if (custAlerts.length > 0) {
        riskCategory = 'HIGH';
        riskScore = Math.max(riskScore, 65);
      }

      return {
        id: accId,
        label: cust ? cust.fullName : `Account ${accId}`,
        accountNumber: accId,
        customerId: cust?.customerId || meta.customerId || null,
        bankName: meta.bank || 'Bank Entity',
        occupation: cust?.occupation || 'External Counterparty',
        isPep: cust?.pepStatus || false,
        isSanctioned: cust?.sanctioned || false,
        riskCategory,
        riskScore,
        alertCount: custAlerts.length,
        totalInflowINR: meta.inflow,
        totalOutflowINR: meta.outflow,
        netBalanceFlowINR: meta.inflow - meta.outflow,
        transactionCount: meta.txCount,
        isSeed: accId === accountId || (cust && cust.customerId === customerId)
      };
    });

    // 5. Construct Formatted Graph Edges
    const edges = Array.from(collectedTransactions.values()).map((tx) => {
      const associatedAlert = alertsByTx.get(tx.transactionId);
      return {
        id: tx.transactionId,
        source: tx.sourceAccountId,
        target: tx.destinationAccountId,
        amount: tx.amount,
        normalizedAmountINR: tx.normalizedAmountINR,
        currency: tx.currency,
        transactionType: tx.transactionType,
        timestamp: tx.timestamp,
        isSuspicious: tx.isSuspicious,
        riskScore: tx.riskScore,
        riskLevel: tx.riskLevel,
        hasAlert: !!associatedAlert,
        alertId: associatedAlert?.alertId || null
      };
    });

    // 6. Detect Suspicious Network Topologies
    const detectedPatterns = NetworkEngine.detectSuspiciousTopologies(nodes, edges);

    // 7. Calculate Comprehensive Network Metrics
    const totalVolume = edges.reduce((sum, e) => sum + e.normalizedAmountINR, 0);
    const highRiskNodes = nodes.filter((n) => n.riskCategory === 'HIGH' || n.riskCategory === 'CRITICAL');
    const suspiciousEdges = edges.filter((e) => e.isSuspicious || e.hasAlert);

    return {
      nodes,
      edges,
      metrics: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        traversalDepth: currentDepth,
        totalVolumeINR: totalVolume,
        averageTransactionINR: edges.length ? Math.round(totalVolume / edges.length) : 0,
        highRiskNodeCount: highRiskNodes.length,
        suspiciousEdgeCount: suspiciousEdges.length,
        detectedPatternsCount: detectedPatterns.length
      },
      detectedPatterns
    };
  }

  /**
   * Helper to accumulate inflow, outflow, and counterparties for accounts
   */
  static _updateAccountStats(metaMap, tx) {
    // Source account (outflow)
    const src = metaMap.get(tx.sourceAccountId) || {
      inflow: 0,
      outflow: 0,
      txCount: 0,
      customerId: tx.sourceCustomerId,
      bank: 'Domestic Bank'
    };
    src.outflow += tx.normalizedAmountINR;
    src.txCount += 1;
    if (tx.sourceCustomerId) src.customerId = tx.sourceCustomerId;
    metaMap.set(tx.sourceAccountId, src);

    // Destination account (inflow)
    const dest = metaMap.get(tx.destinationAccountId) || {
      inflow: 0,
      outflow: 0,
      txCount: 0,
      customerId: tx.destinationCustomerId,
      bank: tx.destinationBank || 'Beneficiary Bank'
    };
    dest.inflow += tx.normalizedAmountINR;
    dest.txCount += 1;
    if (tx.destinationCustomerId) dest.customerId = tx.destinationCustomerId;
    metaMap.set(tx.destinationAccountId, dest);
  }

  /**
   * Detects laundering topologies: Circular flows, Layering chains, Fan-In/Fan-Out mules
   */
  static detectSuspiciousTopologies(nodes, edges) {
    const patterns = [];

    // Adjacency list: node -> array of { target, amount, timestamp, edgeId }
    const adj = new Map();
    const inDegree = new Map();
    const outDegree = new Map();

    nodes.forEach((n) => {
      adj.set(n.id, []);
      inDegree.set(n.id, []);
      outDegree.set(n.id, []);
    });

    edges.forEach((e) => {
      if (adj.has(e.source)) {
        adj.get(e.source).push(e);
      }
      if (outDegree.has(e.source)) {
        outDegree.get(e.source).push(e);
      }
      if (inDegree.has(e.target)) {
        inDegree.get(e.target).push(e);
      }
    });

    // -------------------------------------------------------------
    // Pattern 1: Circular Fund Flow / Cycle Detection (A -> B -> C -> A)
    // -------------------------------------------------------------
    const visited = new Set();
    const recursionStack = new Set();

    const findCycles = (currNode, path = []) => {
      visited.add(currNode);
      recursionStack.add(currNode);
      const nextPath = [...path, currNode];

      const outgoing = adj.get(currNode) || [];
      for (const edge of outgoing) {
        const neighbor = edge.target;
        if (!visited.has(neighbor)) {
          findCycles(neighbor, nextPath);
        } else if (recursionStack.has(neighbor)) {
          // Cycle found! Extract cycle path
          const cycleStartIndex = nextPath.indexOf(neighbor);
          if (cycleStartIndex !== -1) {
            const cycleNodes = nextPath.slice(cycleStartIndex);
            cycleNodes.push(neighbor); // Close cycle
            if (cycleNodes.length >= 3) { // meaningful cycle: at least A -> B -> A or A -> B -> C -> A
              patterns.push({
                type: 'CIRCULAR_TRANSACTION_FLOW',
                severity: 'CRITICAL',
                name: 'Circular Fund Movement / Round-Tripping',
                description: `Circular flow loop detected across ${cycleNodes.length - 1} accounts (${cycleNodes.join(' ➔ ')}). Indicates artificial turnover or round-tripping.`,
                participatingAccounts: Array.from(new Set(cycleNodes)),
                cycleLength: cycleNodes.length - 1
              });
            }
          }
        }
      }
      recursionStack.delete(currNode);
    };

    nodes.forEach((n) => {
      if (!visited.has(n.id)) findCycles(n.id);
    });

    // -------------------------------------------------------------
    // Pattern 2: Multi-Hop Layering Chain Detection (A -> B -> C -> D)
    // -------------------------------------------------------------
    // Sort edges chronologically to trace sequential fund pass-through
    const sortedEdges = [...edges].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    for (let i = 0; i < sortedEdges.length; i++) {
      const hop1 = sortedEdges[i];
      // Look for a subsequent hop originating from hop1's target
      const hop2Candidates = sortedEdges.filter(
        (e) =>
          e.source === hop1.target &&
          new Date(e.timestamp) >= new Date(hop1.timestamp) &&
          new Date(e.timestamp).getTime() - new Date(hop1.timestamp).getTime() <= 7200000 && // within 2 hours
          Math.abs(e.normalizedAmountINR - hop1.normalizedAmountINR) / hop1.normalizedAmountINR <= 0.25 // max 25% decay
      );

      for (const hop2 of hop2Candidates) {
        // Look for third hop
        const hop3Candidates = sortedEdges.filter(
          (e) =>
            e.source === hop2.target &&
            new Date(e.timestamp) >= new Date(hop2.timestamp) &&
            new Date(e.timestamp).getTime() - new Date(hop2.timestamp).getTime() <= 7200000 &&
            Math.abs(e.normalizedAmountINR - hop2.normalizedAmountINR) / hop2.normalizedAmountINR <= 0.25
        );

        for (const hop3 of hop3Candidates) {
          const chain = [hop1.source, hop1.target, hop2.target, hop3.target];
          patterns.push({
            type: 'LAYERING_CHAIN',
            severity: 'CRITICAL',
            name: 'Rapid Multi-Hop Layering Chain',
            description: `Sequential pass-through routing identified across 4 nodes (${chain.join(' ➔ ')}) with low fund retention. Typical of integration avoidance.`,
            participatingAccounts: chain,
            hopCount: 3,
            initialAmountINR: hop1.normalizedAmountINR,
            finalAmountINR: hop3.normalizedAmountINR
          });
        }
      }
    }

    // -------------------------------------------------------------
    // Pattern 3: Mule / Aggregator Hub (Fan-In Smurfing Aggregation)
    // -------------------------------------------------------------
    nodes.forEach((n) => {
      const incoming = inDegree.get(n.id) || [];
      const outgoing = outDegree.get(n.id) || [];
      const uniqueSources = new Set(incoming.map((e) => e.source));

      if (uniqueSources.size >= 3) {
        const totalCredited = incoming.reduce((s, e) => s + e.normalizedAmountINR, 0);
        const totalDebited = outgoing.reduce((s, e) => s + e.normalizedAmountINR, 0);

        patterns.push({
          type: 'FAN_IN_AGGREGATOR',
          severity: 'HIGH',
          name: 'Central Smurf Aggregator / Fan-In Hub',
          description: `Account ${n.id} acts as a fund consolidation point, receiving money from ${uniqueSources.size} distinct counterparties (Total inflow: ₹${totalCredited.toLocaleString('en-IN')}).`,
          participatingAccounts: [n.id, ...Array.from(uniqueSources)],
          counterpartyCount: uniqueSources.size,
          inflowINR: totalCredited,
          outflowINR: totalDebited
        });
      }

      // Fan-Out Dispersal Mule
      const uniqueTargets = new Set(outgoing.map((e) => e.target));
      if (uniqueTargets.size >= 3) {
        const totalDispersed = outgoing.reduce((s, e) => s + e.normalizedAmountINR, 0);
        patterns.push({
          type: 'FAN_OUT_DISPERSAL',
          severity: 'HIGH',
          name: 'Fund Dispersal Hub / Fan-Out',
          description: `Account ${n.id} rapidly disperses incoming funds out to ${uniqueTargets.size} distinct target accounts (Total outflow: ₹${totalDispersed.toLocaleString('en-IN')}).`,
          participatingAccounts: [n.id, ...Array.from(uniqueTargets)],
          counterpartyCount: uniqueTargets.size,
          outflowINR: totalDispersed
        });
      }
    });

    // Deduplicate patterns by type and participating accounts signature
    const uniquePatterns = [];
    const seenSignatures = new Set();

    patterns.forEach((p) => {
      const sig = `${p.type}:${p.participatingAccounts.sort().join('-')}`;
      if (!seenSignatures.has(sig)) {
        seenSignatures.add(sig);
        uniquePatterns.push(p);
      }
    });

    return uniquePatterns;
  }

  /**
   * Generates localized entity summary metrics for quick inspector drawer
   */
  static async getEntityNetworkSummary(entityId) {
    // Find all direct 1-hop transactions touching this account
    const directTxs = await Transaction.find({
      $or: [{ sourceAccountId: entityId }, { destinationAccountId: entityId }]
    })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    const counterparties = new Set();
    let totalInflow = 0;
    let totalOutflow = 0;
    let suspiciousCount = 0;

    directTxs.forEach((tx) => {
      if (tx.sourceAccountId === entityId) {
        totalOutflow += tx.normalizedAmountINR;
        counterparties.add(tx.destinationAccountId);
      } else {
        totalInflow += tx.normalizedAmountINR;
        counterparties.add(tx.sourceAccountId);
      }
      if (tx.isSuspicious) suspiciousCount++;
    });

    // Check customer info
    const customer = await Customer.findOne({
      $or: [{ accountNumber: entityId }, { customerId: entityId }]
    }).lean();

    return {
      entityId,
      customerProfile: customer,
      metrics: {
        totalTransactions: directTxs.length,
        uniqueCounterpartiesCount: counterparties.size,
        totalInflowINR: totalInflow,
        totalOutflowINR: totalOutflow,
        netFlowINR: totalInflow - totalOutflow,
        suspiciousTransactionsCount: suspiciousCount
      },
      counterparties: Array.from(counterparties),
      recentTransactions: directTxs.slice(0, 10)
    };
  }
}

export default NetworkEngine;
