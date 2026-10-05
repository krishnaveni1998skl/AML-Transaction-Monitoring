import { Alert, SARCase, Transaction, Customer, AMLRule } from '../models/index.js';
import { DashboardService, parseDateRange } from './dashboardService.js';
import { recordAuditLog } from '../middlewares/auditLogger.js';

/**
 * Escapes values for standard RFC 4180 CSV
 */
const escapeCSV = (val) => {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  } else {
    str = `"${str}"`;
  }
  return str;
};

export class ReportingService {
  /**
   * 1. Official AML Executive Briefing Document (JSON)
   */
  static async generateSummaryReport(queryParams = {}, user = null, req = null) {
    const [overview, distributions, ruleStats, topEntities] = await Promise.all([
      DashboardService.getExecutiveOverview(queryParams),
      DashboardService.getDistributions(queryParams),
      DashboardService.getRulePerformance(queryParams),
      DashboardService.getTopRiskEntities(queryParams)
    ]);

    const report = {
      metadata: {
        reportId: `REP-AML-${Date.now()}`,
        title: 'AML Transaction Monitoring & Suspicious Activity Executive Briefing',
        generatedAt: new Date().toISOString(),
        generatedBy: user ? `${user.fullName} (${user.role})` : 'SYSTEM COMPLIANCE ENGINE',
        classification: 'STRICTLY CONFIDENTIAL - INTERNAL REGULATORY & COMPLIANCE USE ONLY',
        dateRange: overview.dateRange,
        regulatoryFramework: 'PMLA / FIU-IND / FATF AML/CFT Compliance Directives'
      },
      executiveSummary: {
        narrative: `During the evaluated period (${overview.dateRange.range}), the AML transaction monitoring platform observed ${overview.kpis.totalTransactions} transactions totaling ₹${overview.kpis.totalVolumeINR.toLocaleString('en-IN')}. A total of ${overview.kpis.totalAlerts} suspicious activity alerts were generated, with ${overview.kpis.highCriticalAlerts} classified as High or Critical severity. A total of ${overview.kpis.sarsFiled} internal SAR filings have been approved.`,
        keyMetrics: overview.kpis
      },
      riskAndStatusBreakdown: {
        riskLevelDistribution: distributions.riskLevelDistribution,
        alertStatusDistribution: distributions.alertStatusDistribution,
        customerRiskDistribution: distributions.customerRiskDistribution
      },
      topTriggeredRules: ruleStats.topRules,
      topRiskEntities: topEntities
    };

    if (user) {
      await recordAuditLog({
        req,
        userId: user._id,
        username: user.username,
        userRole: user.role,
        action: 'EXECUTIVE_REPORT_GENERATED',
        entity: 'COMPLIANCE_REPORT',
        entityId: report.metadata.reportId,
        previousValue: null,
        newValue: { range: queryParams.range || '30d', totalAlerts: overview.kpis.totalAlerts }
      });
    }

    return report;
  }

  /**
   * 2. Export Alert Register to CSV
   */
  static async exportAlertsCSV(queryParams = {}, user = null, req = null) {
    const { filter } = parseDateRange(queryParams);
    const query = {};
    if (filter) query.createdAt = filter;
    if (queryParams.status) query.status = queryParams.status;
    if (queryParams.priority) query.priority = queryParams.priority;

    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .populate('assignedTo', 'fullName username role')
      .lean();

    const headers = [
      'Alert ID',
      'Created At',
      'Customer ID',
      'Transaction ID',
      'Amount INR',
      'Risk Score',
      'Risk Level',
      'Priority',
      'Status',
      'SAR Candidate',
      'Assigned Analyst',
      'Triggered Rules Count',
      'Triggered Rule Names'
    ];

    const rows = alerts.map((a) => [
      escapeCSV(a.alertId),
      escapeCSV(new Date(a.createdAt).toISOString()),
      escapeCSV(a.customerId),
      escapeCSV(a.transactionId),
      escapeCSV(a.normalizedAmountINR),
      escapeCSV(a.riskScore),
      escapeCSV(a.riskLevel),
      escapeCSV(a.priority),
      escapeCSV(a.status),
      escapeCSV(a.sarCandidate ? 'YES' : 'NO'),
      escapeCSV(a.assignedTo ? a.assignedTo.fullName : 'Unassigned'),
      escapeCSV(a.triggeredRules?.length || 0),
      escapeCSV(a.triggeredRules?.map((r) => r.ruleName).join('; ') || 'None')
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    if (user) {
      await recordAuditLog({
        req,
        userId: user._id,
        username: user.username,
        userRole: user.role,
        action: 'DATA_EXPORTED',
        entity: 'ALERT_CSV_EXPORT',
        entityId: `COUNT-${alerts.length}`,
        previousValue: null,
        newValue: { exportedRecords: alerts.length, query: queryParams }
      });
    }

    return csvContent;
  }

  /**
   * 3. Export SAR Dossier Register to CSV
   */
  static async exportSARCSV(queryParams = {}, user = null, req = null) {
    const { filter } = parseDateRange(queryParams);
    const query = {};
    if (filter) query.createdAt = filter;
    if (queryParams.caseStatus) query.caseStatus = queryParams.caseStatus;

    const cases = await SARCase.find(query)
      .sort({ createdAt: -1 })
      .populate('complianceOfficerId', 'fullName username role')
      .lean();

    const headers = [
      'SAR Case ID',
      'Created Date',
      'Customer ID',
      'Suspicious Amount INR',
      'Typology',
      'Case Status',
      'Reviewing Officer',
      'Approved Date',
      'Narrative Summary'
    ];

    const rows = cases.map((c) => [
      escapeCSV(c.caseId),
      escapeCSV(new Date(c.createdAt).toISOString()),
      escapeCSV(c.customerId),
      escapeCSV(c.totalSuspiciousAmountINR),
      escapeCSV(c.typology),
      escapeCSV(c.caseStatus),
      escapeCSV(c.complianceOfficerId ? c.complianceOfficerId.fullName : 'Pending Assignment'),
      escapeCSV(c.approvedAt ? new Date(c.approvedAt).toISOString() : 'N/A'),
      escapeCSV(c.narrativeSummary)
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    if (user) {
      await recordAuditLog({
        req,
        userId: user._id,
        username: user.username,
        userRole: user.role,
        action: 'DATA_EXPORTED',
        entity: 'SAR_CSV_EXPORT',
        entityId: `COUNT-${cases.length}`,
        previousValue: null,
        newValue: { exportedRecords: cases.length }
      });
    }

    return csvContent;
  }

  /**
   * 4. Export Executive KPI Summary to CSV
   */
  static async exportSummaryCSV(queryParams = {}, user = null, req = null) {
    const overview = await DashboardService.getExecutiveOverview(queryParams);
    const k = overview.kpis;

    const rows = [
      ['Metric', 'Value'],
      ['Report Generated At', new Date().toISOString()],
      ['Evaluation Date Range', overview.dateRange.range],
      ['Total Transactions Monitored', k.totalTransactions],
      ['Total Transaction Volume (INR)', k.totalVolumeINR],
      ['Average Transaction Amount (INR)', k.avgAmountINR],
      ['Average Transaction Risk Score', k.avgRiskScore],
      ['Total Alerts Generated', k.totalAlerts],
      ['Open Alerts', k.openAlerts],
      ['Under Review Alerts', k.underReviewAlerts],
      ['Escalated Alerts', k.escalatedAlerts],
      ['Closed Alerts', k.closedAlerts],
      ['High/Critical Alerts', k.highCriticalAlerts],
      ['Active Investigations', k.activeInvestigations],
      ['SAR Cases Approved/Filed', k.sarsFiled],
      ['SAR Cases Pending Review', k.sarsPending],
      ['Total Monitored Customers', k.totalCustomers]
    ];

    const csvContent = rows.map((r) => `${escapeCSV(r[0])},${escapeCSV(r[1])}`).join('\r\n');

    if (user) {
      await recordAuditLog({
        req,
        userId: user._id,
        username: user.username,
        userRole: user.role,
        action: 'DATA_EXPORTED',
        entity: 'EXECUTIVE_SUMMARY_CSV_EXPORT',
        entityId: `SUMMARY-${Date.now()}`,
        previousValue: null,
        newValue: { range: overview.dateRange.range }
      });
    }

    return csvContent;
  }

  /**
   * 5. Export Customer Compliance & SAR Dossier to CSV
   */
  static async exportSARCustomerDetailsCSV(queryParams = {}, user = null, req = null) {
    const { filter } = parseDateRange(queryParams);
    const query = {};
    if (filter) query.createdAt = filter;
    if (queryParams.caseStatus) query.caseStatus = queryParams.caseStatus;
    if (queryParams.customerId) query.customerId = queryParams.customerId;

    // Fetch SAR cases with populated relationships
    const cases = await SARCase.find(query)
      .sort({ createdAt: -1 })
      .populate('complianceOfficerId', 'fullName username role')
      .populate('alertIds')
      .lean();

    // Fetch referenced customer profiles
    const customerIds = [...new Set(cases.map((c) => c.customerId))];
    let customers = [];
    if (queryParams.allCustomers === 'true') {
      customers = await Customer.find({}).sort({ customerRiskScore: -1 }).lean();
    } else if (customerIds.length > 0) {
      customers = await Customer.find({ customerId: { $in: customerIds } }).lean();
    } else {
      customers = await Customer.find({}).sort({ customerRiskScore: -1 }).limit(100).lean();
    }

    const customerMap = new Map();
    customers.forEach((c) => customerMap.set(c.customerId, c));

    const headers = [
      'Customer ID',
      'Customer Name',
      'Account Number',
      'Country',
      'Occupation',
      'Monthly Income INR',
      'Account Type',
      'KYC Status',
      'Customer Risk Level',
      'Customer Risk Score',
      'PEP Status',
      'Sanctions Status',
      'Previous Alerts Count',
      'Suspicious Volume INR',
      'Associated Transactions',
      'Associated Alerts',
      'Investigation Status',
      'SAR Case ID',
      'SAR Status',
      'SAR Typology',
      'SAR Approved Date',
      'Reviewing Compliance Officer',
      'Narrative Summary'
    ];

    let rows = [];

    if (cases.length > 0) {
      rows = cases.map((c) => {
        const cust = customerMap.get(c.customerId) || {};
        const alertNames = (c.alertIds || []).map((a) => (typeof a === 'object' && a.alertId ? `${a.alertId} [${a.status}, Risk:${a.riskScore}]` : String(a))).join('; ');
        const investigationStatuses = (c.alertIds || []).map((a) => (typeof a === 'object' && a.status ? a.status : 'UNDER_INVESTIGATION')).join('; ') || c.caseStatus;

        return [
          escapeCSV(c.customerId),
          escapeCSV(cust.fullName || 'N/A'),
          escapeCSV(cust.accountNumber || 'N/A'),
          escapeCSV(cust.address?.countryCode || cust.nationality || 'IN'),
          escapeCSV(cust.occupation || 'N/A'),
          escapeCSV(cust.monthlyIncome ?? 'N/A'),
          escapeCSV(cust.accountType || 'N/A'),
          escapeCSV(cust.kycStatus || 'VERIFIED'),
          escapeCSV(cust.riskCategory || 'HIGH'),
          escapeCSV(cust.customerRiskScore ?? 'N/A'),
          escapeCSV(cust.pepStatus ? 'YES' : 'NO'),
          escapeCSV(cust.sanctioned ? 'YES' : 'NO'),
          escapeCSV(cust.previousAlertCount ?? (c.alertIds?.length || 0)),
          escapeCSV(c.totalSuspiciousAmountINR),
          escapeCSV((c.transactionIds || []).join('; ')),
          escapeCSV(alertNames || 'None'),
          escapeCSV(investigationStatuses),
          escapeCSV(c.caseId),
          escapeCSV(c.caseStatus),
          escapeCSV(c.typology),
          escapeCSV(c.approvedAt ? new Date(c.approvedAt).toISOString() : 'N/A'),
          escapeCSV(c.complianceOfficerId ? c.complianceOfficerId.fullName : 'Pending Assignment'),
          escapeCSV(c.narrativeSummary)
        ];
      });
    } else {
      // If no SAR cases exist yet, output customer compliance profiles
      rows = customers.map((cust) => [
        escapeCSV(cust.customerId),
        escapeCSV(cust.fullName),
        escapeCSV(cust.accountNumber),
        escapeCSV(cust.address?.countryCode || cust.nationality || 'IN'),
        escapeCSV(cust.occupation),
        escapeCSV(cust.monthlyIncome),
        escapeCSV(cust.accountType),
        escapeCSV(cust.kycStatus),
        escapeCSV(cust.riskCategory),
        escapeCSV(cust.customerRiskScore),
        escapeCSV(cust.pepStatus ? 'YES' : 'NO'),
        escapeCSV(cust.sanctioned ? 'YES' : 'NO'),
        escapeCSV(cust.previousAlertCount),
        escapeCSV(0),
        escapeCSV('N/A'),
        escapeCSV('N/A'),
        escapeCSV('MONITORED'),
        escapeCSV('NO_SAR_FILED'),
        escapeCSV('NONE'),
        escapeCSV('N/A'),
        escapeCSV('N/A'),
        escapeCSV('N/A'),
        escapeCSV('Customer under standard AML transaction surveillance.')
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    if (user) {
      await recordAuditLog({
        req,
        userId: user._id,
        username: user.username,
        userRole: user.role,
        action: 'DATA_EXPORTED',
        entity: 'SAR_CUSTOMER_DETAILS_CSV',
        entityId: `COUNT-${rows.length}`,
        previousValue: null,
        newValue: { exportedRecords: rows.length, query: queryParams }
      });
    }

    return csvContent;
  }
}

export default ReportingService;
