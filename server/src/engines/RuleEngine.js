import { AMLRule, Transaction } from '../models/index.js';
import { logger } from '../utils/logger.js';

/**
 * Configurable AML Rule Engine
 * Dynamically loads and evaluates AML rules stored in MongoDB.
 */
export class RuleEngine {
  static rulesCache = null;
  static cacheTimestamp = 0;
  static CACHE_TTL_MS = 60000; // 1 minute in-memory cache

  /**
   * Invalidates in-memory rules cache
   */
  static invalidateCache() {
    RuleEngine.rulesCache = null;
    RuleEngine.cacheTimestamp = 0;
    logger.info('🔄 AML Rule cache invalidated.');
  }

  /**
   * Loads active rules from database or memory cache
   * @returns {Promise<Array>} List of active AMLRule documents
   */
  static async getActiveRules() {
    const now = Date.now();
    if (RuleEngine.rulesCache && now - RuleEngine.cacheTimestamp < RuleEngine.CACHE_TTL_MS) {
      return RuleEngine.rulesCache;
    }

    const rules = await AMLRule.find({ isEnabled: true }).lean();
    RuleEngine.rulesCache = rules;
    RuleEngine.cacheTimestamp = now;
    return rules;
  }

  /**
   * Main evaluation pipeline
   * @param {object} context - { transaction, customer, geoRisk, sanctionsHit, sanctionsMatchDetails }
   * @returns {Promise<Array<object>>} Triggered rule hits
   */
  static async evaluate(context) {
    const rules = await RuleEngine.getActiveRules();
    const hits = [];

    // Parallel evaluation of all active rules
    const evaluationPromises = rules.map(async (rule) => {
      try {
        const evaluator = RuleEngine.evaluators[rule.ruleCode];
        if (!evaluator) {
          logger.warn(`No evaluator implementation for rule code '${rule.ruleCode}'`);
          return null;
        }

        const evaluationResult = await evaluator(context, rule.parameters || {});
        if (evaluationResult.triggered) {
          return {
            ruleId: rule._id,
            ruleCode: rule.ruleCode,
            ruleName: rule.name,
            severity: rule.severity,
            scoreContribution: rule.weight,
            details: evaluationResult.details
          };
        }
        return null;
      } catch (err) {
        logger.error(`Error evaluating rule ${rule.ruleCode}: ${err.message}`);
        return null;
      }
    });

    const results = await Promise.allSettled(evaluationPromises);

    for (const res of results) {
      if (res.status === 'fulfilled' && res.value) {
        hits.push(res.value);
      }
    }

    return hits;
  }

  /**
   * Strategy registry mapping ruleCode to evaluator functions
   */
  static evaluators = {
    // 1. High Value Transaction Rule
    RULE_HIGH_VAL: async (context, params) => {
      const threshold = params.thresholdAmount || 1000000; // default ₹10,00,000
      const actual = context.transaction.normalizedAmountINR;
      if (actual >= threshold) {
        return {
          triggered: true,
          details: {
            actualAmountINR: actual,
            thresholdAmountINR: threshold,
            varianceExceeded: actual - threshold,
            currency: context.transaction.currency
          }
        };
      }
      return { triggered: false };
    },

    // 2. Velocity / Rapid Transaction Rule
    RULE_VELOCITY: async (context, params) => {
      const timeWindowMinutes = params.timeWindowMinutes || 30;
      const countThreshold = params.transactionCount || 10;
      const txTime = new Date(context.transaction.timestamp);
      const windowStart = new Date(txTime.getTime() - timeWindowMinutes * 60000);

      const recentCount = await Transaction.countDocuments({
        sourceCustomerId: context.customer.customerId,
        timestamp: { $gte: windowStart, $lte: txTime }
      });

      // Including current transaction (+1)
      const totalCount = recentCount + 1;

      if (totalCount >= countThreshold) {
        return {
          triggered: true,
          details: {
            transactionCountInWindow: totalCount,
            thresholdCount: countThreshold,
            timeWindowMinutes
          }
        };
      }
      return { triggered: false };
    },

    // 3. Structuring / Smurfing Rule
    RULE_STRUCTURING: async (context, params) => {
      const minAmount = params.minAmount || 350000;
      const maxAmount = params.maxAmount || 499999;
      const minCount = params.minCount || 3;
      const windowHours = params.windowHours || 48;

      const currentAmount = context.transaction.normalizedAmountINR;
      const isCurrentInRange = currentAmount >= minAmount && currentAmount <= maxAmount;

      const txTime = new Date(context.transaction.timestamp);
      const windowStart = new Date(txTime.getTime() - windowHours * 3600000);

      // Query historical transactions in range
      const matchingTxs = await Transaction.find({
        sourceCustomerId: context.customer.customerId,
        normalizedAmountINR: { $gte: minAmount, $lte: maxAmount },
        timestamp: { $gte: windowStart, $lte: txTime }
      }).lean();

      let totalMatches = matchingTxs.length;
      if (isCurrentInRange) {
        totalMatches += 1;
      }

      if (totalMatches >= minCount && isCurrentInRange) {
        const amounts = [...matchingTxs.map((t) => t.normalizedAmountINR), currentAmount];
        const cumulativeSum = amounts.reduce((a, b) => a + b, 0);

        return {
          triggered: true,
          details: {
            matchesCount: totalMatches,
            thresholdCount: minCount,
            minAmount,
            maxAmount,
            cumulativeSumINR: cumulativeSum,
            recentAmountsINR: amounts
          }
        };
      }
      return { triggered: false };
    },

    // 4. Rapid In/Out Fund Movement
    RULE_RAPID_FLOW: async (context, params) => {
      const windowMinutes = params.windowMinutes || 15;
      const percentThreshold = params.transferPercentThreshold || 85;
      const currentAmount = context.transaction.normalizedAmountINR;

      // Only inspect if current transaction is a debit (outflow)
      if (context.transaction.direction !== 'DEBIT') {
        return { triggered: false };
      }

      const txTime = new Date(context.transaction.timestamp);
      const windowStart = new Date(txTime.getTime() - windowMinutes * 60000);

      // Find recent credits into this account
      const recentCredits = await Transaction.find({
        destinationAccountId: context.transaction.sourceAccountId,
        direction: 'CREDIT',
        timestamp: { $gte: windowStart, $lte: txTime }
      })
        .sort({ timestamp: -1 })
        .lean();

      if (!recentCredits.length) return { triggered: false };

      const totalCredited = recentCredits.reduce((sum, t) => sum + t.normalizedAmountINR, 0);
      const latestCredit = recentCredits[0]?.normalizedAmountINR || 0;

      const cumulativeRatioPercent = totalCredited > 0 ? (currentAmount / totalCredited) * 100 : 0;
      const latestRatioPercent = latestCredit > 0 ? (currentAmount / latestCredit) * 100 : 0;

      const effectiveRatio = Math.max(cumulativeRatioPercent, latestRatioPercent);

      if (effectiveRatio >= percentThreshold) {
        return {
          triggered: true,
          details: {
            debitedAmountINR: currentAmount,
            recentlyCreditedINR: totalCredited,
            latestCreditAmountINR: latestCredit,
            flowRatioPercent: Math.round(effectiveRatio),
            thresholdPercent: percentThreshold,
            windowMinutes
          }
        };
      }
      return { triggered: false };
    },

    // 5. High-Risk Country / Sanctions Corridor Rule
    RULE_GEO_RISK: async (context, params) => {
      const highRiskList = params.highRiskCountries || ['KP', 'IR', 'MM', 'SY', 'YE', 'SS', 'ML', 'HT', 'PA', 'KY', 'VG'];
      const targetCountry = (context.transaction.location?.countryCode || 'IN').toUpperCase();

      const isListed = highRiskList.includes(targetCountry);
      const isBlacklisted = context.geoRisk?.isBlacklisted || false;
      const isGreylisted = context.geoRisk?.isGreylisted || false;

      if (isListed || isBlacklisted || isGreylisted) {
        return {
          triggered: true,
          details: {
            countryCode: targetCountry,
            countryName: context.geoRisk?.countryName || targetCountry,
            jurisdictionClassification: context.geoRisk?.classification || 'HIGH',
            countryRiskScore: context.geoRisk?.riskScore || 75
          }
        };
      }
      return { triggered: false };
    },

    // 6. Sudden Customer Behavior Change Rule
    RULE_BEHAVIOR_SPIKE: async (context, params) => {
      const incomeMultiplier = params.incomeMultiplier || 3.0;
      const monthlyIncome = context.customer.monthlyIncome || 0;
      const actual = context.transaction.normalizedAmountINR;

      // Check against monthly income
      if (monthlyIncome > 0 && actual >= monthlyIncome * incomeMultiplier) {
        return {
          triggered: true,
          details: {
            transactionAmountINR: actual,
            declaredMonthlyIncomeINR: monthlyIncome,
            incomeMultiple: Math.round((actual / monthlyIncome) * 10) / 10,
            configuredMultiplier: incomeMultiplier
          }
        };
      }

      // Check against historical 90-day average
      const historicalTxs = await Transaction.find({
        sourceCustomerId: context.customer.customerId,
        timestamp: { $gte: new Date(Date.now() - 90 * 86400000) }
      })
        .limit(50)
        .lean();

      if (historicalTxs.length >= 5) {
        const avg = historicalTxs.reduce((sum, t) => sum + t.normalizedAmountINR, 0) / historicalTxs.length;
        const historicalMultiplier = params.historicalMultiplier || 5.0;
        if (actual >= avg * historicalMultiplier) {
          return {
            triggered: true,
            details: {
              transactionAmountINR: actual,
              historicalAverageINR: Math.round(avg),
              multipleOfAverage: Math.round((actual / avg) * 10) / 10,
              configuredMultiplier: historicalMultiplier
            }
          };
        }
      }

      return { triggered: false };
    },

    // 7. Round Amount Transactions Rule
    RULE_ROUND_AMOUNT: async (context, params) => {
      const minAmount = params.minAmount || 500000; // minimum ₹5,00,000
      const modulo = params.roundModulo || 50000;
      const actual = context.transaction.normalizedAmountINR;

      if (actual >= minAmount && actual % modulo === 0) {
        return {
          triggered: true,
          details: {
            roundAmountINR: actual,
            minThresholdINR: minAmount,
            roundModulo: modulo
          }
        };
      }
      return { triggered: false };
    },

    // 8. Unusual Hours / Off-Hours Rule
    RULE_UNUSUAL_HOURS: async (context, params) => {
      const startHour = params.startHour ?? 1; // 01:00 AM
      const endHour = params.endHour ?? 4; // 04:00 AM
      const minAmount = params.minAmount || 300000;
      const txTime = new Date(context.transaction.timestamp);
      const hour = txTime.getHours();
      const actual = context.transaction.normalizedAmountINR;

      if (hour >= startHour && hour <= endHour && actual >= minAmount) {
        return {
          triggered: true,
          details: {
            transactionHour: hour,
            window: `${startHour}:00 - ${endHour}:00`,
            actualAmountINR: actual,
            minAmountINR: minAmount
          }
        };
      }
      return { triggered: false };
    },

    // 9. PEP / Sanctions Match Rule
    RULE_PEP_SANCTION: async (context, params) => {
      const isCustomerPep = !!context.customer.pepStatus;
      const isCustomerSanctioned = !!context.customer.sanctioned;
      const sanctionsHit = !!context.sanctionsHit;

      if (isCustomerPep || isCustomerSanctioned || sanctionsHit) {
        return {
          triggered: true,
          details: {
            customerIsPEP: isCustomerPep,
            customerIsSanctioned: isCustomerSanctioned,
            watchListMatch: sanctionsHit,
            matchedDetails: context.sanctionsMatchDetails || null
          }
        };
      }
      return { triggered: false };
    },

    // 10. Layering Detection Rule (Multi-hop fund routing)
    RULE_LAYERING: async (context, params) => {
      const minHops = params.minHops || 3;
      const maxWindowMinutes = params.maxWindowMinutes || 60;
      const maxVariance = (params.maxVariancePercent || 15) / 100;
      const currentAmount = context.transaction.normalizedAmountINR;

      const txTime = new Date(context.transaction.timestamp);
      const windowStart = new Date(txTime.getTime() - maxWindowMinutes * 60000);

      // Trace backward chain: who transferred funds into current source account?
      const priorHops = await Transaction.find({
        destinationAccountId: context.transaction.sourceAccountId,
        direction: 'DEBIT',
        timestamp: { $gte: windowStart, $lte: txTime }
      })
        .sort({ timestamp: -1 })
        .limit(5)
        .lean();

      if (!priorHops.length) return { triggered: false };

      // Check if amount is preserved within variance threshold across hops
      let matchedChainHops = 1;
      let inspectAmount = currentAmount;

      for (const hop of priorHops) {
        const diff = Math.abs(hop.normalizedAmountINR - inspectAmount);
        if (diff / inspectAmount <= maxVariance) {
          matchedChainHops++;
          inspectAmount = hop.normalizedAmountINR;
        }
      }

      if (matchedChainHops >= minHops) {
        return {
          triggered: true,
          details: {
            detectedHopsCount: matchedChainHops,
            minRequiredHops: minHops,
            timeWindowMinutes: maxWindowMinutes,
            lastHopAmountINR: currentAmount
          }
        };
      }
      return { triggered: false };
    },

    // 11. Multi-Source Fan-In / Fan-Out Rule
    RULE_FAN_IN_FAN_OUT: async (context, params) => {
      const thresholdAccounts = params.uniqueAccountsThreshold || 5;
      const windowHours = params.windowHours || 24;
      const txTime = new Date(context.transaction.timestamp);
      const windowStart = new Date(txTime.getTime() - windowHours * 3600000);

      // Check incoming unique source accounts into this destination account
      const distinctSources = await Transaction.distinct('sourceAccountId', {
        destinationAccountId: context.transaction.destinationAccountId,
        timestamp: { $gte: windowStart, $lte: txTime }
      });

      if (distinctSources.length >= thresholdAccounts) {
        return {
          triggered: true,
          details: {
            uniqueCounterpartiesCount: distinctSources.length,
            threshold: thresholdAccounts,
            windowHours,
            aggregationTargetAccount: context.transaction.destinationAccountId
          }
        };
      }
      return { triggered: false };
    }
  };
}

export default RuleEngine;
