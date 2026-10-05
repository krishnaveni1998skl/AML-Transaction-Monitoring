import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { User, Customer, Transaction, Alert, SARCase, RuleHit, AuditLog } from '../models/index.js';
import { DashboardService, parseDateRange } from '../services/dashboardService.js';
import { ReportingService } from '../services/reportingService.js';
import app from '../app.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import http from 'http';

const runPhase5Tests = async () => {
  logger.info('🚀 Starting Phase 5 Comprehensive Test Suite (Executive Dashboard, Analytics & Reporting Engine)...');
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
    // Test 1: Date Range Boundary Logic
    // -------------------------------------------------------------
    logger.info('\n--- Test 1: Configurable Date Range Filters ---');
    const rangeToday = parseDateRange({ range: 'today' });
    assert(rangeToday.start instanceof Date && rangeToday.end instanceof Date, 'Range "today" produces valid Date boundaries');

    const range7d = parseDateRange({ range: '7d' });
    const diff7d = range7d.end.getTime() - range7d.start.getTime();
    assert(Math.abs(diff7d - 7 * 24 * 60 * 60 * 1000) < 5000, 'Range "7d" spans exactly 7 days');

    const rangeCustom = parseDateRange({ range: 'custom', startDate: '2026-01-01', endDate: '2026-01-31' });
    assert(rangeCustom.start.toISOString().startsWith('2026-01-01'), 'Custom start date properly parsed');
    assert(rangeCustom.end.toISOString().startsWith('2026-01-31'), 'Custom end date properly parsed');

    // -------------------------------------------------------------
    // Test 2: Executive Overview & KPI Calculation
    // -------------------------------------------------------------
    logger.info('\n--- Test 2: Executive Platform Overview & KPI Cards ---');
    const overview = await DashboardService.getExecutiveOverview({ range: '30d' });
    const k = overview.kpis;

    assert(typeof k.totalTransactions === 'number' && k.totalTransactions > 0, `Total transactions calculated: ${k.totalTransactions}`);
    assert(typeof k.totalVolumeINR === 'number' && k.totalVolumeINR > 0, `Total volume calculated: ₹${k.totalVolumeINR.toLocaleString('en-IN')}`);
    assert(typeof k.avgAmountINR === 'number' && k.avgAmountINR > 0, `Average transaction amount: ₹${k.avgAmountINR.toLocaleString('en-IN')}`);
    assert(typeof k.suspiciousTransactionCount === 'number', `Suspicious transaction count: ${k.suspiciousTransactionCount}`);
    assert(typeof k.suspiciousVolumeINR === 'number', `Suspicious transaction volume: ₹${k.suspiciousVolumeINR.toLocaleString('en-IN')}`);
    assert(typeof k.totalAlerts === 'number' && k.totalAlerts > 0, `Total alerts counted: ${k.totalAlerts}`);
    assert(typeof k.openAlerts === 'number', `Open alerts: ${k.openAlerts}`);
    assert(typeof k.escalatedAlerts === 'number', `Escalated alerts: ${k.escalatedAlerts}`);
    assert(typeof k.closedAlerts === 'number', `Closed alerts: ${k.closedAlerts}`);
    assert(k.activeInvestigations === k.openAlerts + k.underReviewAlerts + k.escalatedAlerts, 'Active investigations equals sum of open, under review, and escalated');
    assert(typeof k.highCriticalAlerts === 'number' && k.highCriticalAlerts > 0, `High/Critical alerts: ${k.highCriticalAlerts}`);
    assert(typeof k.sarsFiled === 'number', `SARs filed count: ${k.sarsFiled}`);
    assert(typeof k.sarsPending === 'number', `SARs pending count: ${k.sarsPending}`);
    assert(typeof k.totalCustomers === 'number' && k.totalCustomers > 0, `Total customers monitored: ${k.totalCustomers}`);

    // -------------------------------------------------------------
    // Test 3: Time-Series Trends
    // -------------------------------------------------------------
    logger.info('\n--- Test 3: Time-Series Activity Trends ---');
    const trendsResult = await DashboardService.getTimeSeriesTrends({ range: '30d' });
    assert(Array.isArray(trendsResult.timeline), 'Timeline is returned as an array');
    assert(trendsResult.timeline.length > 0, `Timeline contains ${trendsResult.timeline.length} chronological data points`);

    const samplePoint = trendsResult.timeline[0];
    assert(typeof samplePoint.date === 'string', 'Timeline point contains date string');
    assert(typeof samplePoint.totalTransactions === 'number', 'Timeline point has totalTransactions');
    assert(typeof samplePoint.alertsGenerated === 'number', 'Timeline point has alertsGenerated');
    assert(typeof samplePoint.totalVolumeINR === 'number', 'Timeline point has totalVolumeINR');

    // -------------------------------------------------------------
    // Test 4: Risk and Status Distributions
    // -------------------------------------------------------------
    logger.info('\n--- Test 4: Risk & Status Distributions ---');
    const dist = await DashboardService.getDistributions({ range: '30d' });
    assert(Array.isArray(dist.riskLevelDistribution), 'riskLevelDistribution is an array');
    const riskTiers = dist.riskLevelDistribution.map((r) => r.name);
    assert(riskTiers.includes('LOW') && riskTiers.includes('CRITICAL'), 'Risk tiers include LOW and CRITICAL');

    assert(Array.isArray(dist.alertStatusDistribution), 'alertStatusDistribution is an array');
    const statusTiers = dist.alertStatusDistribution.map((s) => s.name);
    assert(statusTiers.includes('OPEN') && statusTiers.includes('CLOSED'), 'Alert statuses include OPEN and CLOSED');

    assert(Array.isArray(dist.channelDistribution), 'channelDistribution is an array');
    assert(Array.isArray(dist.customerRiskDistribution), 'customerRiskDistribution is an array');

    // -------------------------------------------------------------
    // Test 5: Top Triggered AML Rules
    // -------------------------------------------------------------
    logger.info('\n--- Test 5: AML Detection Rule Performance ---');
    const rulePerf = await DashboardService.getRulePerformance({ range: '30d' });
    assert(typeof rulePerf.totalHits === 'number', `Total rule hits: ${rulePerf.totalHits}`);
    assert(Array.isArray(rulePerf.topRules), 'topRules is an array');
    if (rulePerf.topRules.length > 0) {
      const topRule = rulePerf.topRules[0];
      assert(!!topRule.ruleCode && !!topRule.ruleName, `Top rule identified: ${topRule.ruleCode} (${topRule.ruleName})`);
      assert(topRule.hitCount > 0, `Hit count positive: ${topRule.hitCount}`);
      assert(typeof topRule.percentageOfHits === 'number', 'Percentage of hits computed');
    }

    // -------------------------------------------------------------
    // Test 6: Investigator Workload & SAR Funnel
    // -------------------------------------------------------------
    logger.info('\n--- Test 6: Investigator Workload & SAR Funnel ---');
    const workloadResult = await DashboardService.getWorkloadMetrics({ range: '30d' });
    assert(typeof workloadResult.unassignedAlertsCount === 'number', `Unassigned alerts: ${workloadResult.unassignedAlertsCount}`);
    assert(Array.isArray(workloadResult.investigatorWorkload), 'investigatorWorkload is an array');
    assert(Array.isArray(workloadResult.sarFunnel), 'sarFunnel is an array');

    // -------------------------------------------------------------
    // Test 7: Top High-Risk Customer Entities
    // -------------------------------------------------------------
    logger.info('\n--- Test 7: Top High-Risk Customer Entities ---');
    const topEntities = await DashboardService.getTopRiskEntities({ range: '30d', limit: 5 });
    assert(Array.isArray(topEntities), 'Top entities returned as array');
    if (topEntities.length > 0) {
      const entity = topEntities[0];
      assert(!!entity.customerId && !!entity.fullName, `Identified top entity: ${entity.fullName} (${entity.customerId})`);
      assert(entity.totalSuspiciousINR > 0, `Suspicious volume positive: ₹${entity.totalSuspiciousINR.toLocaleString('en-IN')}`);
      assert(typeof entity.riskScore === 'number', `Risk score: ${entity.riskScore}`);
    }

    // -------------------------------------------------------------
    // Test 8: Official AML Executive Briefing Document
    // -------------------------------------------------------------
    logger.info('\n--- Test 8: Official Executive Briefing Document ---');
    const briefing = await ReportingService.generateSummaryReport(
      { range: '30d' },
      complianceUser,
      { ip: '127.0.0.1', headers: { 'user-agent': 'TestRunner' } }
    );
    assert(!!briefing.metadata.reportId, `Generated Report ID: ${briefing.metadata.reportId}`);
    assert(briefing.metadata.classification.includes('CONFIDENTIAL'), 'Classification set to STRICTLY CONFIDENTIAL');
    assert(briefing.metadata.regulatoryFramework.includes('FIU-IND'), 'Regulatory framework cited');
    assert(typeof briefing.executiveSummary.narrative === 'string', 'Executive summary narrative generated');

    const briefingAudit = await AuditLog.findOne({
      action: 'EXECUTIVE_REPORT_GENERATED',
      entityId: briefing.metadata.reportId
    });
    assert(!!briefingAudit, 'Audit log recorded EXECUTIVE_REPORT_GENERATED action');

    // -------------------------------------------------------------
    // Test 9: Data Exports to RFC 4180 CSV
    // -------------------------------------------------------------
    logger.info('\n--- Test 9: Data Registers Export to CSV ---');
    // Alerts CSV
    const alertsCSV = await ReportingService.exportAlertsCSV(
      { range: '30d' },
      analystUser,
      { ip: '127.0.0.1', headers: { 'user-agent': 'TestRunner' } }
    );
    assert(typeof alertsCSV === 'string' && alertsCSV.includes('Alert ID,Created At'), 'Alerts CSV contains required RFC headers');
    assert(alertsCSV.split('\r\n').length >= 2, 'Alerts CSV contains data rows');

    // SAR CSV
    const sarCSV = await ReportingService.exportSARCSV(
      { range: '30d' },
      complianceUser,
      { ip: '127.0.0.1', headers: { 'user-agent': 'TestRunner' } }
    );
    assert(typeof sarCSV === 'string' && sarCSV.includes('SAR Case ID,Created Date'), 'SAR CSV contains required headers');

    // Summary CSV
    const summaryCSV = await ReportingService.exportSummaryCSV(
      { range: '30d' },
      adminUser,
      { ip: '127.0.0.1', headers: { 'user-agent': 'TestRunner' } }
    );
    assert(typeof summaryCSV === 'string' && summaryCSV.includes('Total Transactions Monitored'), 'Summary CSV contains KPI rows');

    // -------------------------------------------------------------
    // Test 10: HTTP API Endpoints & RBAC Protection
    // -------------------------------------------------------------
    logger.info('\n--- Test 10: HTTP Dashboard & Reporting API Security ---');
    const serverPort = await new Promise((resolve) => {
      serverInstance = http.createServer(app);
      serverInstance.listen(0, () => {
        resolve(serverInstance.address().port);
      });
    });

    const baseUrl = `http://localhost:${serverPort}/api/v1`;

    // 10a. Unauthenticated access denied (401)
    const unauthRes = await fetch(`${baseUrl}/dashboard/overview`);
    assert(unauthRes.status === 401, 'Unauthenticated request to /dashboard/overview rejected with 401');

    const unauthReportRes = await fetch(`${baseUrl}/reports/summary`);
    assert(unauthReportRes.status === 401, 'Unauthenticated request to /reports/summary rejected with 401');

    // 10b. Authenticated Analyst access to Dashboard APIs (200)
    const overviewRes = await fetch(`${baseUrl}/dashboard/overview?range=30d`, {
      headers: { Authorization: `Bearer ${analystToken}` }
    });
    const overviewJson = await overviewRes.json();
    assert(overviewRes.status === 200 && overviewJson.success === true, 'Analyst access to /dashboard/overview returns 200 OK');
    assert(typeof overviewJson.data.kpis.totalTransactions === 'number', 'Overview payload includes totalTransactions');

    const trendsRes = await fetch(`${baseUrl}/dashboard/trends?range=30d`, {
      headers: { Authorization: `Bearer ${analystToken}` }
    });
    const trendsJson = await trendsRes.json();
    assert(trendsRes.status === 200 && trendsJson.success === true, 'Analyst access to /dashboard/trends returns 200 OK');

    const distRes = await fetch(`${baseUrl}/dashboard/distributions?range=30d`, {
      headers: { Authorization: `Bearer ${analystToken}` }
    });
    const distJson = await distRes.json();
    assert(distRes.status === 200 && distJson.success === true, 'Analyst access to /dashboard/distributions returns 200 OK');

    // 10c. Authenticated Compliance access to Rules & Workload (200)
    const rulesRes = await fetch(`${baseUrl}/dashboard/rules?range=30d`, {
      headers: { Authorization: `Bearer ${complianceToken}` }
    });
    const rulesJson = await rulesRes.json();
    assert(rulesRes.status === 200 && rulesJson.success === true, 'Compliance access to /dashboard/rules returns 200 OK');

    const workloadRes = await fetch(`${baseUrl}/dashboard/workload?range=30d`, {
      headers: { Authorization: `Bearer ${complianceToken}` }
    });
    const workloadJson = await workloadRes.json();
    assert(workloadRes.status === 200 && workloadJson.success === true, 'Compliance access to /dashboard/workload returns 200 OK');

    const entitiesRes = await fetch(`${baseUrl}/dashboard/top-entities?range=30d`, {
      headers: { Authorization: `Bearer ${complianceToken}` }
    });
    const entitiesJson = await entitiesRes.json();
    assert(entitiesRes.status === 200 && entitiesJson.success === true, 'Compliance access to /dashboard/top-entities returns 200 OK');

    // 10d. Authenticated Reports & CSV Exports
    const summaryRepRes = await fetch(`${baseUrl}/reports/summary?range=30d`, {
      headers: { Authorization: `Bearer ${complianceToken}` }
    });
    const summaryRepJson = await summaryRepRes.json();
    assert(summaryRepRes.status === 200 && summaryRepJson.success === true, 'Compliance access to /reports/summary returns 200 OK');

    const alertsCsvRes = await fetch(`${baseUrl}/reports/export/alerts?range=30d`, {
      headers: { Authorization: `Bearer ${analystToken}` }
    });
    assert(alertsCsvRes.status === 200, 'Analyst access to /reports/export/alerts returns 200 OK');
    assert(alertsCsvRes.headers.get('content-type')?.includes('text/csv'), 'Alerts export returns text/csv content type');

    const sarCsvRes = await fetch(`${baseUrl}/reports/export/sar?range=30d`, {
      headers: { Authorization: `Bearer ${complianceToken}` }
    });
    assert(sarCsvRes.status === 200, 'Compliance access to /reports/export/sar returns 200 OK');
    assert(sarCsvRes.headers.get('content-type')?.includes('text/csv'), 'SAR export returns text/csv content type');

    const summaryCsvRes = await fetch(`${baseUrl}/reports/export/summary?range=30d`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(summaryCsvRes.status === 200, 'Admin access to /reports/export/summary returns 200 OK');
    assert(summaryCsvRes.headers.get('content-type')?.includes('text/csv'), 'Summary export returns text/csv content type');

    logger.info(`\n==============================================`);
    logger.info(`Phase 5 Test Summary: ${passed} PASSED, ${failed} FAILED`);
    logger.info(`==============================================`);

    if (serverInstance) serverInstance.close();
    await disconnectDB();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    logger.error(`Phase 5 Test execution error: ${err.stack || err.message}`);
    if (serverInstance) serverInstance.close();
    await disconnectDB();
    process.exit(1);
  }
};

runPhase5Tests();
