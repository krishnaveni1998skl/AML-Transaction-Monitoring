import { Transaction } from '../models/index.js';
import { HIGH_RISK_OCCUPATIONS } from '../config/sanctionsData.js';

const occupationRiskMap = new Map(HIGH_RISK_OCCUPATIONS.map((o) => [o.name.toLowerCase(), o]));

/**
 * Explainable Multi-Factor Risk Scoring Engine
 * Outputs score between 0 and 100 with full factor breakdown and human-readable explanations.
 */
export class RiskScoringEngine {
  /**
   * Calculates comprehensive risk score for a transaction context and rule hits
   * @param {object} context - { transaction, customer, geoRisk, sanctionsHit, sanctionsMatchDetails }
   * @param {Array<object>} ruleHits - Rule hits returned by RuleEngine
   * @returns {Promise<object>} { overallScore, riskLevel, scoreBreakdown, explanations }
   */
  static async calculate(context, ruleHits = []) {
    const { transaction, customer, geoRisk, sanctionsHit } = context;
    const explanations = [];

    // ----------------------------------------------------
    // Factor 1: Transaction Risk (Weight: 25%)
    // ----------------------------------------------------
    let txRiskRaw = 10; // Baseline
    const amount = transaction.normalizedAmountINR;

    if (amount >= 2500000) {
      txRiskRaw += 75;
      explanations.push(`High Transaction Value: ₹${amount.toLocaleString('en-IN')} is very large (+75 tx pts)`);
    } else if (amount >= 1000000) {
      txRiskRaw += 55;
      explanations.push(`Significant Transaction Value: ₹${amount.toLocaleString('en-IN')} exceeds ₹10L (+55 tx pts)`);
    } else if (amount >= 500000) {
      txRiskRaw += 35;
      explanations.push(`Moderate-High Transaction Value: ₹${amount.toLocaleString('en-IN')} (+35 tx pts)`);
    } else if (amount >= 100000) {
      txRiskRaw += 15;
    }

    // Channel & Cash Risk
    if (transaction.transactionType === 'CASH_DEPOSIT' || transaction.transactionType === 'CASH_WITHDRAWAL') {
      txRiskRaw += 20;
      explanations.push(`Cash Intensive Channel: ${transaction.transactionType} (+20 tx pts)`);
    } else if (transaction.transactionType === 'INTERNATIONAL_TRANSFER') {
      txRiskRaw += 25;
      explanations.push('Cross-Border Payment Rail (+25 tx pts)');
    }

    const transactionRisk = Math.min(100, txRiskRaw) * 0.25;

    // ----------------------------------------------------
    // Factor 2: Customer Risk (Weight: 25%)
    // ----------------------------------------------------
    let custRiskRaw = customer.customerRiskScore || 15;

    // Occupation Risk Check
    const occLower = (customer.occupation || '').toLowerCase();
    const matchedOcc = occupationRiskMap.get(occLower);
    if (matchedOcc) {
      custRiskRaw = Math.max(custRiskRaw, matchedOcc.riskScore);
      explanations.push(`High-Risk Occupation: '${customer.occupation}' evaluated at base risk ${matchedOcc.riskScore}`);
    }

    // KYC Status Penalty
    if (customer.kycStatus === 'PENDING') {
      custRiskRaw += 20;
      explanations.push('Incomplete / Pending Customer KYC Verification (+20 customer pts)');
    } else if (customer.kycStatus === 'EXPIRED' || customer.kycStatus === 'REJECTED') {
      custRiskRaw += 35;
      explanations.push(`Adverse KYC Status: ${customer.kycStatus} (+35 customer pts)`);
    }

    if (customer.pepStatus) {
      custRiskRaw = Math.max(custRiskRaw, 85);
      explanations.push('Subject is designated as a Politically Exposed Person (PEP)');
    }

    const customerRisk = Math.min(100, custRiskRaw) * 0.25;

    // ----------------------------------------------------
    // Factor 3: Country / Jurisdictional Risk (Weight: 20%)
    // ----------------------------------------------------
    const countryScore = geoRisk?.riskScore || 5;
    if (geoRisk?.isBlacklisted) {
      explanations.push(`FATF Blacklisted Jurisdiction: ${geoRisk.countryName} (+${countryScore} country pts)`);
    } else if (geoRisk?.isGreylisted) {
      explanations.push(`FATF Monitored / Greylist Jurisdiction: ${geoRisk.countryName} (+${countryScore} country pts)`);
    }
    const countryRisk = Math.min(100, countryScore) * 0.20;

    // ----------------------------------------------------
    // Factor 4: Velocity Risk (Weight: 15%)
    // ----------------------------------------------------
    let velocityRaw = 10;
    const oneHourAgo = new Date(new Date(transaction.timestamp).getTime() - 3600000);
    const txCountLastHour = await Transaction.countDocuments({
      sourceCustomerId: customer.customerId,
      timestamp: { $gte: oneHourAgo, $lte: new Date(transaction.timestamp) }
    });

    if (txCountLastHour >= 8) {
      velocityRaw = 90;
      explanations.push(`High Transaction Frequency: ${txCountLastHour + 1} transactions in past 60 minutes (+90 velocity pts)`);
    } else if (txCountLastHour >= 4) {
      velocityRaw = 55;
      explanations.push(`Elevated Transaction Frequency: ${txCountLastHour + 1} transactions in past 60 minutes (+55 velocity pts)`);
    }
    const velocityRisk = Math.min(100, velocityRaw) * 0.15;

    // ----------------------------------------------------
    // Factor 5: Previous Alert History Risk (Weight: 15%)
    // ----------------------------------------------------
    const prevAlertCount = customer.previousAlertCount || 0;
    let alertHistRaw = 5;
    if (prevAlertCount > 0) {
      alertHistRaw = Math.min(100, prevAlertCount * 25);
      explanations.push(`Historical Alert Record: Customer subject of ${prevAlertCount} prior compliance alert(s) (+${alertHistRaw} alert pts)`);
    }
    const alertHistoryRisk = alertHistRaw * 0.15;

    // Base composite calculation
    let rawScore = transactionRisk + customerRisk + countryRisk + velocityRisk + alertHistoryRisk;

    // ----------------------------------------------------
    // Rule Hits Score Boost
    // ----------------------------------------------------
    let ruleBonus = 0;
    for (const hit of ruleHits) {
      ruleBonus += hit.scoreContribution;
      explanations.push(`Rule Hit: ${hit.ruleName} [${hit.ruleCode}] (${hit.severity}) added +${hit.scoreContribution} pts`);
    }

    rawScore += ruleBonus;

    // ----------------------------------------------------
    // Hard Overrides (Regulatory Safeguards)
    // ----------------------------------------------------
    let hasCriticalRule = ruleHits.some((h) => h.severity === 'CRITICAL');

    if (sanctionsHit) {
      rawScore = 100;
      explanations.unshift('CRITICAL OVERRIDE: Direct match with OFAC / UN Sanctions Watchlist forced score to 100');
    } else if (customer.pepStatus && amount >= 500000) {
      rawScore = Math.max(rawScore, 90);
      explanations.unshift('CRITICAL OVERRIDE: High-value transaction by Politically Exposed Person forced score >= 90');
    } else if (hasCriticalRule) {
      rawScore = Math.max(rawScore, 82);
    }

    // Clamp between 0 and 100
    const overallScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    // Risk Classification according to client requirements
    let riskLevel = 'LOW';
    if (overallScore >= 81) {
      riskLevel = 'CRITICAL';
    } else if (overallScore >= 61) {
      riskLevel = 'HIGH';
    } else if (overallScore >= 31) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    return {
      overallScore,
      riskLevel,
      scoreBreakdown: {
        transactionRisk: Math.round(transactionRisk * 10) / 10,
        customerRisk: Math.round(customerRisk * 10) / 10,
        countryRisk: Math.round(countryRisk * 10) / 10,
        velocityRisk: Math.round(velocityRisk * 10) / 10,
        alertHistoryRisk: Math.round(alertHistoryRisk * 10) / 10,
        ruleHitsContribution: Math.round(ruleBonus * 10) / 10
      },
      explanations
    };
  }
}

export default RiskScoringEngine;
