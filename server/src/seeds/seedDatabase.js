import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../utils/logger.js';
import {
  User,
  Customer,
  Transaction,
  AMLRule,
  RuleHit,
  RiskScore,
  Alert,
  InvestigationNote,
  SARCase,
  AuditLog
} from '../models/index.js';
import {
  SYNTHETIC_USERS,
  SYNTHETIC_CUSTOMERS,
  SYNTHETIC_TRANSACTIONS
} from './syntheticScenarios.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const seedDatabase = async () => {
  try {
    await connectDB();
    logger.info('🔄 Purging existing collections for clean seed...');

    await Promise.all([
      User.deleteMany({}),
      Customer.deleteMany({}),
      Transaction.deleteMany({}),
      AMLRule.deleteMany({}),
      RuleHit.deleteMany({}),
      RiskScore.deleteMany({}),
      Alert.deleteMany({}),
      InvestigationNote.deleteMany({}),
      SARCase.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    // 1. Seed AML Rules from defaultRules.json
    logger.info('📜 Seeding 11 Configurable AML Rules...');
    const rulesRaw = fs.readFileSync(path.join(__dirname, 'defaultRules.json'), 'utf-8');
    const rulesData = JSON.parse(rulesRaw);
    const createdRules = await AMLRule.insertMany(rulesData);
    logger.info(`✅ Seeded ${createdRules.length} AML Rules`);

    const ruleMap = new Map();
    createdRules.forEach((r) => ruleMap.set(r.ruleCode, r));

    // 2. Seed Users with bcrypt hashed passwords
    logger.info('👤 Seeding System Users (Admin, Analyst, Compliance Officer)...');
    const userDocs = [];
    for (const u of SYNTHETIC_USERS) {
      const passwordHash = await User.hashPassword(u.password);
      userDocs.push({
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        passwordHash,
        isActive: true
      });
    }
    const createdUsers = await User.insertMany(userDocs);
    const analystUser = createdUsers.find((u) => u.role === 'AML_ANALYST');
    const complianceUser = createdUsers.find((u) => u.role === 'COMPLIANCE_OFFICER');
    logger.info(`✅ Seeded ${createdUsers.length} Users`);

    // 3. Seed Customers
    logger.info('👥 Seeding Synthetic Customer Profiles...');
    const createdCustomers = await Customer.insertMany(SYNTHETIC_CUSTOMERS);
    logger.info(`✅ Seeded ${createdCustomers.length} Customers`);

    // 4. Seed Transactions
    logger.info('💳 Seeding Synthetic Financial Transactions...');
    const createdTransactions = await Transaction.insertMany(SYNTHETIC_TRANSACTIONS);
    logger.info(`✅ Seeded ${createdTransactions.length} Transactions`);

    // 5. Generate Rule Hits, Risk Scores, Alerts, and Case Notes for Suspicious Transactions
    logger.info('🚨 Synthesizing Rule Hits, Explainable Risk Scores, and Alerts...');
    let alertSeq = 1;

    for (const tx of createdTransactions) {
      if (!tx.isSuspicious) {
        // Record low risk score
        await RiskScore.create({
          entityType: 'TRANSACTION',
          entityId: tx.transactionId,
          overallScore: tx.riskScore,
          riskLevel: tx.riskLevel,
          scoreBreakdown: {
            transactionRisk: 5,
            customerRisk: 3,
            countryRisk: 0,
            velocityRisk: 0,
            alertHistoryRisk: 0
          },
          explanations: ['Normal routine commercial activity; parameters within baseline limits.'],
          evaluatedAt: tx.timestamp
        });
        continue;
      }

      // Identify triggered rule based on scenario
      let triggeredRuleCodes = [];
      let explanations = [];

      if (tx.transactionId === 'TXN-HIGH-VAL-001') {
        triggeredRuleCodes = ['RULE_HIGH_VAL'];
        explanations = [
          'Rule Hit: RULE_HIGH_VAL - Transaction amount ₹15,00,000 exceeds ₹10,00,000 threshold (+25 pts)',
          'Large transfer between private savings and corporate account (+15 pts)'
        ];
      } else if (tx.transactionId.startsWith('TXN-SMURF')) {
        triggeredRuleCodes = ['RULE_STRUCTURING', 'RULE_ROUND_AMOUNT'];
        explanations = [
          `Rule Hit: RULE_STRUCTURING - Cash deposit of ₹${(tx.amount).toLocaleString('en-IN')} is just below statutory reporting threshold (+40 pts)`,
          'Pattern: Multiple repeated deposits within 48h indicating smurfing (+20 pts)',
          'Behavioral: Turnover drastically exceeds declared monthly income of ₹80,000 (+15 pts)'
        ];
      } else if (tx.transactionId.startsWith('TXN-RAPID')) {
        triggeredRuleCodes = ['RULE_RAPID_FLOW', 'RULE_HIGH_VAL'];
        explanations = [
          'Rule Hit: RULE_RAPID_FLOW - Funds credited and 94% transferred out within 8 minutes (+35 pts)',
          'High Risk Occupation: Cryptocurrency broker (+20 pts)',
          'Destination: Offshore virtual asset counterparty (+25 pts)'
        ];
      } else if (tx.transactionId.startsWith('TXN-LAYER')) {
        triggeredRuleCodes = ['RULE_LAYERING'];
        explanations = [
          'Rule Hit: RULE_LAYERING - Multi-hop pass-through chain detected with <5% retention (+45 pts)',
          'Velocity: 4 connected transactions across 4 accounts in under 5 hours (+25 pts)'
        ];
      } else if (tx.transactionId === 'TXN-GEO-SANCTION-001') {
        triggeredRuleCodes = ['RULE_GEO_RISK', 'RULE_PEP_SANCTION'];
        explanations = [
          'Rule Hit: RULE_GEO_RISK - Destination country Iran (IR) is FATF Blacklisted (+40 pts)',
          'Rule Hit: RULE_PEP_SANCTION - Originator is a Politically Exposed Person (PEP) (+45 pts)'
        ];
      }

      const ruleHitIds = [];
      const triggeredRuleSummaries = [];

      for (const code of triggeredRuleCodes) {
        const ruleDoc = ruleMap.get(code);
        if (ruleDoc) {
          const hit = await RuleHit.create({
            ruleId: ruleDoc._id,
            ruleCode: ruleDoc.ruleCode,
            ruleName: ruleDoc.name,
            transactionId: tx.transactionId,
            customerId: tx.sourceCustomerId,
            severity: ruleDoc.severity,
            scoreContribution: ruleDoc.weight,
            details: {
              actualAmount: tx.normalizedAmountINR,
              currency: tx.currency,
              channel: tx.channel,
              countryCode: tx.location.countryCode
            },
            timestamp: tx.timestamp
          });
          ruleHitIds.push(hit._id);
          triggeredRuleSummaries.push({
            ruleCode: ruleDoc.ruleCode,
            ruleName: ruleDoc.name,
            severity: ruleDoc.severity,
            scoreContribution: ruleDoc.weight,
            details: hit.details
          });
        }
      }

      // Update transaction with rule hits
      tx.ruleHits = ruleHitIds;
      await tx.save();

      // Record explainable risk score
      await RiskScore.create({
        entityType: 'TRANSACTION',
        entityId: tx.transactionId,
        overallScore: tx.riskScore,
        riskLevel: tx.riskLevel,
        scoreBreakdown: {
          transactionRisk: 25,
          customerRisk: 22,
          countryRisk: tx.location.countryCode !== 'IN' ? 25 : 0,
          velocityRisk: 15,
          alertHistoryRisk: 10
        },
        explanations,
        evaluatedAt: tx.timestamp
      });

      // Generate Alert
      const alertId = `ALT-2026-${String(alertSeq++).padStart(4, '0')}`;
      const status = tx.riskScore >= 90 ? 'ESCALATED' : tx.riskScore >= 75 ? 'UNDER_REVIEW' : 'OPEN';

      const alert = await Alert.create({
        alertId,
        customerId: tx.sourceCustomerId,
        transactionId: tx.transactionId,
        amount: tx.amount,
        currency: tx.currency,
        normalizedAmountINR: tx.normalizedAmountINR,
        riskScore: tx.riskScore,
        riskLevel: tx.riskLevel,
        priority: tx.riskScore >= 85 ? 'CRITICAL' : tx.riskScore >= 65 ? 'HIGH' : 'MEDIUM',
        triggeredRules: triggeredRuleSummaries,
        status,
        assignedTo: status !== 'OPEN' ? analystUser._id : null,
        sarCandidate: tx.riskScore >= 90,
        createdAt: tx.timestamp
      });

      // Add initial investigation note for under-review / escalated alerts
      if (status !== 'OPEN') {
        await InvestigationNote.create({
          alertId: alert._id,
          authorId: analystUser._id,
          authorName: analystUser.fullName,
          noteText: `Initiated initial triage. High risk score (${tx.riskScore}) driven by ${triggeredRuleCodes.join(', ')}. Cross-referenced customer KYC and prior transaction behavior.`,
          actionTaken: status === 'ESCALATED' ? 'ESCALATED_TO_COMPLIANCE' : 'STATUS_CHANGE',
          tags: ['Triage', 'RiskScoring', triggeredRuleCodes[0] || 'AML'],
          timestamp: new Date(tx.timestamp.getTime() + 1800000)
        });
      }
    }

    // 6. Seed a Representative SAR Case (for Scenario 2: Rapid Crypto Layering)
    logger.info('📑 Seeding Demonstration SAR Case for Compliance Review...');
    const criticalAlert = await Alert.findOne({ riskScore: { $gte: 90 } });
    if (criticalAlert) {
      await SARCase.create({
        caseId: 'SAR-2026-0001',
        customerId: criticalAlert.customerId,
        alertIds: [criticalAlert._id],
        transactionIds: [criticalAlert.transactionId],
        totalSuspiciousAmountINR: criticalAlert.normalizedAmountINR,
        caseStatus: 'UNDER_COMPLIANCE_REVIEW',
        narrativeSummary: 'Subject account Kunal Singhania received ₹25,00,000 via corporate RTGS and rapidly transferred ₹23,50,000 (94%) out to an offshore virtual asset gateway within 8 minutes. Transaction pattern matches rapid layering typologies with unverified source of funds and declared monthly income of only ₹1,20,000.',
        typology: 'RAPID_LAYERING',
        complianceOfficerId: complianceUser._id
      });
    }

    // 7. Seed Initial System Audit Log
    logger.info('📝 Initializing Master Audit Log Trail...');
    await AuditLog.create({
      userId: createdUsers[0]._id,
      username: 'SYSTEM',
      userRole: 'ADMIN',
      action: 'SYSTEM_INITIALIZED_AND_SEEDED',
      entity: 'DATABASE',
      entityId: 'ALL',
      ipAddress: '127.0.0.1',
      userAgent: 'SeedRunner/2026',
      previousValue: null,
      newValue: {
        rulesCount: createdRules.length,
        usersCount: createdUsers.length,
        customersCount: createdCustomers.length,
        transactionsCount: createdTransactions.length
      },
      timestamp: new Date()
    });

    logger.info('✨ Seed execution successfully completed!');
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    logger.error(`❌ Seeding failed: ${error.stack || error.message}`);
    process.exit(1);
  }
};

// Execute if run directly via node
if (process.argv[1] && process.argv[1].endsWith('seedDatabase.js')) {
  seedDatabase();
}

export default seedDatabase;
