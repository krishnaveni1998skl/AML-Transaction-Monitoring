import {
  Transaction,
  Alert,
  SARCase,
  Customer,
  RuleHit,
  AMLRule,
  User,
  AuditLog
} from '../models/index.js';
import mongoose from 'mongoose';

/**
 * Parses user-selected date ranges into MongoDB Date filter boundaries
 */
export const parseDateRange = ({ range = '30d', startDate = null, endDate = null }) => {
  const now = new Date();
  let start = null;
  let end = new Date(now);

  if (range === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  } else if (range === '7d') {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === '30d') {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (range === '90d') {
    start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else if (range === 'ytd') {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  } else if (range === 'custom') {
    if (startDate) start = new Date(startDate);
    if (endDate) {
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    }
  }

  const query = {};
  if (start && end) {
    query.$gte = start;
    query.$lte = end;
  } else if (start) {
    query.$gte = start;
  } else if (end) {
    query.$lte = end;
  }

  return {
    start,
    end,
    filter: Object.keys(query).length > 0 ? query : null
  };
};

export class DashboardService {
  /**
   * 1. Executive Platform Overview & KPI Cards
   */
  static async getExecutiveOverview(queryParams = {}) {
    const { start, end, filter } = parseDateRange(queryParams);

    const txMatch = filter ? { timestamp: filter } : {};
    const alertMatch = filter ? { createdAt: filter } : {};
    const sarMatch = filter ? { createdAt: filter } : {};

    // Parallel aggregate queries for high performance
    const [
      txStats,
      suspiciousTxStats,
      alertStats,
      alertStatusCounts,
      sarStats,
      customerCount
    ] = await Promise.all([
      // Total transactions & overall volume
      Transaction.aggregate([
        { $match: txMatch },
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            totalVolumeINR: { $sum: '$normalizedAmountINR' },
            avgAmountINR: { $avg: '$normalizedAmountINR' },
            avgRiskScore: { $avg: '$riskScore' }
          }
        }
      ]),

      // Suspicious transactions & volume
      Transaction.aggregate([
        { $match: { ...txMatch, isSuspicious: true } },
        {
          $group: {
            _id: null,
            suspiciousCount: { $sum: 1 },
            suspiciousVolumeINR: { $sum: '$normalizedAmountINR' }
          }
        }
      ]),

      // Alert priority & high/critical counts
      Alert.aggregate([
        { $match: alertMatch },
        {
          $group: {
            _id: null,
            totalAlerts: { $sum: 1 },
            highCriticalAlerts: {
              $sum: {
                $cond: [{ $in: ['$priority', ['HIGH', 'CRITICAL']] }, 1, 0]
              }
            },
            criticalAlerts: {
              $sum: { $cond: [{ $eq: ['$priority', 'CRITICAL'] }, 1, 0] }
            },
            avgAlertRiskScore: { $avg: '$riskScore' }
          }
        }
      ]),

      // Alert counts grouped by status (OPEN, UNDER_REVIEW, ESCALATED, CLOSED)
      Alert.aggregate([
        { $match: alertMatch },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      // SAR Case counts
      SARCase.aggregate([
        { $match: sarMatch },
        {
          $group: {
            _id: '$caseStatus',
            count: { $sum: 1 },
            totalAmountINR: { $sum: '$totalSuspiciousAmountINR' }
          }
        }
      ]),

      // Total monitored customers
      Customer.countDocuments()
    ]);

    // Extract transaction figures
    const totalTransactions = txStats[0]?.totalCount || 0;
    const totalVolumeINR = txStats[0]?.totalVolumeINR || 0;
    const avgAmountINR = Math.round(txStats[0]?.avgAmountINR || 0);
    const avgRiskScore = Math.round((txStats[0]?.avgRiskScore || 0) * 10) / 10;

    const suspiciousCount = suspiciousTxStats[0]?.suspiciousCount || 0;
    const suspiciousVolumeINR = suspiciousTxStats[0]?.suspiciousVolumeINR || 0;
    const suspiciousVolumePercentage =
      totalVolumeINR > 0 ? Math.round((suspiciousVolumeINR / totalVolumeINR) * 1000) / 10 : 0;

    // Extract alert figures
    const totalAlerts = alertStats[0]?.totalAlerts || 0;
    const highCriticalAlerts = alertStats[0]?.highCriticalAlerts || 0;
    const criticalAlerts = alertStats[0]?.criticalAlerts || 0;
    const avgAlertRiskScore = Math.round(alertStats[0]?.avgAlertRiskScore || 0);

    const statusMap = { OPEN: 0, UNDER_REVIEW: 0, ESCALATED: 0, CLOSED: 0 };
    alertStatusCounts.forEach((s) => {
      if (statusMap[s._id] !== undefined) statusMap[s._id] = s.count;
    });

    const openAlerts = statusMap.OPEN;
    const underReviewAlerts = statusMap.UNDER_REVIEW;
    const escalatedAlerts = statusMap.ESCALATED;
    const closedAlerts = statusMap.CLOSED;
    const activeInvestigations = openAlerts + underReviewAlerts + escalatedAlerts;

    // Extract SAR figures
    let sarsFiled = 0;
    let sarsPending = 0;
    let sarsRejected = 0;
    let sarsTotalAmountINR = 0;

    sarStats.forEach((s) => {
      sarsTotalAmountINR += s.totalAmountINR;
      if (s._id === 'APPROVED_SAR') sarsFiled += s.count;
      else if (s._id === 'UNDER_COMPLIANCE_REVIEW' || s._id === 'DRAFT') sarsPending += s.count;
      else if (s._id === 'REJECTED') sarsRejected += s.count;
    });

    return {
      dateRange: {
        range: queryParams.range || '30d',
        startDate: start,
        endDate: end
      },
      kpis: {
        totalTransactions,
        totalVolumeINR,
        avgAmountINR,
        avgRiskScore,
        suspiciousTransactionCount: suspiciousCount,
        suspiciousVolumeINR,
        suspiciousVolumePercentage,
        totalAlerts,
        openAlerts,
        underReviewAlerts,
        escalatedAlerts,
        closedAlerts,
        highCriticalAlerts,
        criticalAlerts,
        activeInvestigations,
        avgAlertRiskScore,
        sarsFiled,
        sarsPending,
        sarsRejected,
        sarsTotalAmountINR,
        totalCustomers: customerCount
      }
    };
  }

  /**
   * 2. Time-Series Trends (Transaction Volume, Alerts, Suspicious Activity)
   */
  static async getTimeSeriesTrends(queryParams = {}) {
    const { start, end, filter } = parseDateRange(queryParams);

    const txMatch = filter ? { timestamp: filter } : {};
    const alertMatch = filter ? { createdAt: filter } : {};

    // Group transactions by YYYY-MM-DD
    const txTrends = await Transaction.aggregate([
      { $match: txMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          totalTransactions: { $sum: 1 },
          totalVolumeINR: { $sum: '$normalizedAmountINR' },
          suspiciousCount: {
            $sum: { $cond: [{ $eq: ['$isSuspicious', true] }, 1, 0] }
          },
          suspiciousVolumeINR: {
            $sum: {
              $cond: [{ $eq: ['$isSuspicious', true] }, '$normalizedAmountINR', 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Group alerts by YYYY-MM-DD
    const alertTrends = await Alert.aggregate([
      { $match: alertMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          alertsGenerated: { $sum: 1 },
          highPriorityAlerts: {
            $sum: { $cond: [{ $in: ['$priority', ['HIGH', 'CRITICAL']] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const alertMap = new Map();
    alertTrends.forEach((a) => alertMap.set(a._id, a));

    const txMap = new Map();
    txTrends.forEach((t) => txMap.set(t._id, t));

    // Combine all unique dates sorted chronologically
    const allDates = Array.from(new Set([...txMap.keys(), ...alertMap.keys()])).sort();

    const timeline = allDates.map((dateStr) => {
      const tx = txMap.get(dateStr) || {
        totalTransactions: 0,
        totalVolumeINR: 0,
        suspiciousCount: 0,
        suspiciousVolumeINR: 0
      };
      const alt = alertMap.get(dateStr) || {
        alertsGenerated: 0,
        highPriorityAlerts: 0
      };

      return {
        date: dateStr,
        totalTransactions: tx.totalTransactions,
        totalVolumeINR: tx.totalVolumeINR,
        suspiciousCount: tx.suspiciousCount,
        suspiciousVolumeINR: tx.suspiciousVolumeINR,
        alertsGenerated: alt.alertsGenerated,
        highPriorityAlerts: alt.highPriorityAlerts
      };
    });

    return {
      dateRange: { range: queryParams.range || '30d', startDate: start, endDate: end },
      timeline
    };
  }

  /**
   * 3. Distributions (Risk Levels, Alert Status, Channels, Customers)
   */
  static async getDistributions(queryParams = {}) {
    const { start, end, filter } = parseDateRange(queryParams);

    const txMatch = filter ? { timestamp: filter } : {};
    const alertMatch = filter ? { createdAt: filter } : {};

    const [
      txRiskDist,
      alertStatusDist,
      alertPriorityDist,
      channelDist,
      custRiskDist
    ] = await Promise.all([
      // Transaction risk level distribution
      Transaction.aggregate([
        { $match: txMatch },
        { $group: { _id: '$riskLevel', count: { $sum: 1 }, volume: { $sum: '$normalizedAmountINR' } } }
      ]),

      // Alert status distribution
      Alert.aggregate([
        { $match: alertMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Alert priority distribution
      Alert.aggregate([
        { $match: alertMatch },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),

      // Transaction channel distribution
      Transaction.aggregate([
        { $match: txMatch },
        { $group: { _id: '$channel', count: { $sum: 1 }, volume: { $sum: '$normalizedAmountINR' } } },
        { $sort: { count: -1 } }
      ]),

      // Customer risk category distribution
      Customer.aggregate([
        { $group: { _id: '$riskCategory', count: { $sum: 1 } } }
      ])
    ]);

    // Format risk level distribution
    const riskColors = {
      LOW: '#10b981',
      MEDIUM: '#f59e0b',
      HIGH: '#f97316',
      CRITICAL: '#f43f5e'
    };

    const statusColors = {
      OPEN: '#38bdf8',
      UNDER_REVIEW: '#818cf8',
      ESCALATED: '#f43f5e',
      CLOSED: '#10b981'
    };

    const formatDist = (rawList, colorMap) => {
      const allKeys = Object.keys(colorMap);
      const existing = new Map(rawList.map((item) => [item._id, item.count]));
      return allKeys.map((key) => ({
        name: key,
        count: existing.get(key) || 0,
        color: colorMap[key]
      }));
    };

    return {
      riskLevelDistribution: formatDist(txRiskDist, riskColors),
      alertStatusDistribution: formatDist(alertStatusDist, statusColors),
      alertPriorityDistribution: formatDist(alertPriorityDist, riskColors),
      channelDistribution: channelDist.map((c) => ({
        channel: c._id || 'OTHER',
        count: c.count,
        volumeINR: c.volume
      })),
      customerRiskDistribution: formatDist(custRiskDist, riskColors)
    };
  }

  /**
   * 4. Top Triggered AML Rules & Frequency
   */
  static async getRulePerformance(queryParams = {}) {
    const { filter } = parseDateRange(queryParams);
    const hitMatch = filter ? { timestamp: filter } : {};

    const [ruleHits, allRules] = await Promise.all([
      RuleHit.aggregate([
        { $match: hitMatch },
        {
          $group: {
            _id: '$ruleCode',
            ruleName: { $first: '$ruleName' },
            severity: { $first: '$severity' },
            hitCount: { $sum: 1 },
            totalScoreContribution: { $sum: '$scoreContribution' }
          }
        },
        { $sort: { hitCount: -1 } },
        { $limit: Number(queryParams.limit) || 10 }
      ]),
      AMLRule.find().select('ruleCode name severity category weight').lean()
    ]);

    const ruleMeta = new Map();
    allRules.forEach((r) => ruleMeta.set(r.ruleCode, r));

    const totalHits = ruleHits.reduce((s, r) => s + r.hitCount, 0);

    const formattedRules = ruleHits.map((rh) => {
      const meta = ruleMeta.get(rh._id);
      return {
        ruleCode: rh._id,
        ruleName: rh.ruleName || meta?.name || rh._id,
        severity: rh.severity || meta?.severity || 'HIGH',
        category: meta?.category || 'TRANSACTION',
        hitCount: rh.hitCount,
        percentageOfHits: totalHits > 0 ? Math.round((rh.hitCount / totalHits) * 100) : 0,
        totalScoreContribution: rh.totalScoreContribution
      };
    });

    return {
      totalHits,
      topRules: formattedRules
    };
  }

  /**
   * 5. Investigator Workload & SAR Disposition
   */
  static async getWorkloadMetrics(queryParams = {}) {
    const { filter } = parseDateRange(queryParams);
    const alertMatch = filter ? { createdAt: filter } : {};

    const [analystWorkload, unassignedCount, sarFunnel] = await Promise.all([
      Alert.aggregate([
        { $match: { ...alertMatch, assignedTo: { $ne: null } } },
        {
          $group: {
            _id: '$assignedTo',
            totalAssigned: { $sum: 1 },
            openCount: { $sum: { $cond: [{ $eq: ['$status', 'OPEN'] }, 1, 0] } },
            underReviewCount: { $sum: { $cond: [{ $eq: ['$status', 'UNDER_REVIEW'] }, 1, 0] } },
            escalatedCount: { $sum: { $cond: [{ $eq: ['$status', 'ESCALATED'] }, 1, 0] } },
            closedCount: { $sum: { $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0] } }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'analyst'
          }
        },
        { $unwind: { path: '$analyst', preserveNullAndEmptyArrays: true } }
      ]),

      Alert.countDocuments({ ...alertMatch, assignedTo: null }),

      SARCase.aggregate([
        {
          $group: {
            _id: '$caseStatus',
            count: { $sum: 1 },
            amountINR: { $sum: '$totalSuspiciousAmountINR' }
          }
        }
      ])
    ]);

    const formattedWorkload = analystWorkload.map((w) => ({
      userId: w._id,
      analystName: w.analyst?.fullName || 'Analyst',
      role: w.analyst?.role || 'AML_ANALYST',
      totalAssigned: w.totalAssigned,
      underReviewCount: w.underReviewCount,
      escalatedCount: w.escalatedCount,
      closedCount: w.closedCount
    }));

    return {
      unassignedAlertsCount: unassignedCount,
      investigatorWorkload: formattedWorkload,
      sarFunnel: sarFunnel.map((s) => ({
        status: s._id,
        count: s.count,
        amountINR: s.amountINR
      }))
    };
  }

  /**
   * 6. Top High-Risk Entities
   */
  static async getTopRiskEntities(queryParams = {}) {
    const { filter } = parseDateRange(queryParams);
    const txMatch = filter ? { timestamp: filter } : {};

    // Group suspicious transactions by sourceCustomerId
    const topEntities = await Transaction.aggregate([
      { $match: { ...txMatch, isSuspicious: true } },
      {
        $group: {
          _id: '$sourceCustomerId',
          sourceAccount: { $first: '$sourceAccountId' },
          suspiciousTxCount: { $sum: 1 },
          totalSuspiciousINR: { $sum: '$normalizedAmountINR' },
          maxRiskScore: { $max: '$riskScore' },
          lastSuspiciousDate: { $max: '$timestamp' }
        }
      },
      { $sort: { totalSuspiciousINR: -1 } },
      { $limit: Number(queryParams.limit) || 5 }
    ]);

    const customerIds = topEntities.map((e) => e._id).filter(Boolean);
    const customers = await Customer.find({ customerId: { $in: customerIds } }).lean();
    const customerMap = new Map();
    customers.forEach((c) => customerMap.set(c.customerId, c));

    // Also count alerts per customer
    const alertCounts = await Alert.aggregate([
      { $match: { customerId: { $in: customerIds } } },
      { $group: { _id: '$customerId', alertCount: { $sum: 1 } } }
    ]);
    const alertCountMap = new Map();
    alertCounts.forEach((a) => alertCountMap.set(a._id, a.alertCount));

    const results = topEntities.map((e) => {
      const cust = customerMap.get(e._id);
      return {
        customerId: e._id,
        fullName: cust?.fullName || `Customer ${e._id}`,
        accountNumber: e.sourceAccount || cust?.accountNumber,
        occupation: cust?.occupation || 'N/A',
        riskCategory: cust?.riskCategory || 'HIGH',
        riskScore: Math.max(e.maxRiskScore, cust?.customerRiskScore || 0),
        pepStatus: cust?.pepStatus || false,
        sanctioned: cust?.sanctioned || false,
        suspiciousTxCount: e.suspiciousTxCount,
        totalSuspiciousINR: e.totalSuspiciousINR,
        alertCount: alertCountMap.get(e._id) || 0,
        lastActivity: e.lastSuspiciousDate
      };
    });

    return results;
  }
}

export default DashboardService;
