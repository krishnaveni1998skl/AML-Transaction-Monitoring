import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { User, Alert, InvestigationNote, SARCase, AuditLog, Customer } from '../models/index.js';
import { AlertService } from '../services/alertService.js';
import { SARService } from '../services/sarService.js';
import app from '../app.js';
import http from 'http';

const runPhase3Tests = async () => {
  logger.info('🚀 Starting Phase 3 Comprehensive Test Suite...');
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
    // 1. Retrieve users
    const analystUser = await User.findOne({ username: 'analyst' });
    const complianceUser = await User.findOne({ username: 'compliance' });
    const adminUser = await User.findOne({ username: 'admin' });
    assert(!!analystUser && !!complianceUser && !!adminUser, 'Users (Analyst, Compliance, Admin) retrieved');

    // 2. Create a clean test alert in OPEN state
    logger.info('\n--- Test 1: Alert Creation in OPEN State ---');
    const testAlertId = `ALT-TEST-${Date.now()}`;
    const initialAlert = await Alert.create({
      alertId: testAlertId,
      customerId: 'CUST-IND-2001',
      transactionId: `TXN-P3-TEST-${Date.now()}`,
      amount: 480000,
      currency: 'INR',
      normalizedAmountINR: 480000,
      riskScore: 78,
      riskLevel: 'HIGH',
      priority: 'HIGH',
      status: 'OPEN',
      triggeredRules: [
        {
          ruleCode: 'RULE_STRUCTURING',
          ruleName: 'Structuring / Smurfing Detection',
          severity: 'CRITICAL',
          scoreContribution: 40,
          details: { actualAmountINR: 480000 }
        }
      ]
    });
    assert(initialAlert.status === 'OPEN', 'Alert initialized in OPEN status');

    // -------------------------------------------------------------
    // Test 2: Lifecycle Transition (OPEN -> UNDER_REVIEW via Assignment)
    // -------------------------------------------------------------
    logger.info('\n--- Test 2: Assignment & Transition to UNDER_REVIEW ---');
    const assignedAlert = await AlertService.assignAlert(
      initialAlert.alertId,
      analystUser._id,
      analystUser
    );
    assert(assignedAlert.status === 'UNDER_REVIEW', 'Alert automatically transitioned to UNDER_REVIEW upon assignment');
    assert(String(assignedAlert.assignedTo) === String(analystUser._id), 'Alert assigned to Analyst user');

    // -------------------------------------------------------------
    // Test 3: Investigation Note Addition
    // -------------------------------------------------------------
    logger.info('\n--- Test 3: Append Investigation Note & Audit Details ---');
    const note = await AlertService.addInvestigationNote(
      assignedAlert.alertId,
      'Examined account cash deposits. Multiple deposits just below 5 lakh INR threshold detected over 48h.',
      'NOTE_ADDED',
      ['Structuring', 'CashDeposit'],
      analystUser
    );
    assert(!!note._id, 'Investigation note successfully appended');
    assert(note.authorName === analystUser.fullName, 'Note author recorded correctly');

    // -------------------------------------------------------------
    // Test 4: Invalid Lifecycle Transition Check
    // -------------------------------------------------------------
    logger.info('\n--- Test 4: Enforce State Machine Validation ---');
    let invalidTransitionBlocked = false;
    try {
      // Trying to transition to an invalid status directly (e.g., from UNDER_REVIEW to an arbitrary state)
      await AlertService.updateAlertStatus(assignedAlert.alertId, 'OPEN', analystUser);
    } catch (err) {
      invalidTransitionBlocked = true;
    }
    assert(invalidTransitionBlocked, 'Invalid backwards transition blocked by FSM');

    // -------------------------------------------------------------
    // Test 5: Escalation to Compliance Officer
    // -------------------------------------------------------------
    logger.info('\n--- Test 5: Alert Escalation to Compliance Officer ---');
    const escalatedAlert = await AlertService.escalateAlert(
      assignedAlert.alertId,
      'High probability of structuring scheme. Customer monthly income (₹80,000) does not justify ₹14,00,000 cash turnover.',
      analystUser
    );
    assert(escalatedAlert.status === 'ESCALATED', 'Alert transitioned to ESCALATED');
    assert(escalatedAlert.priority === 'CRITICAL', 'Alert priority elevated to CRITICAL upon escalation');

    // -------------------------------------------------------------
    // Test 6: RBAC Protection on Escalated Alert Closure
    // -------------------------------------------------------------
    logger.info('\n--- Test 6: RBAC Guard on Escalated Closure ---');
    let analystCloseBlocked = false;
    try {
      // Analyst attempting to close an escalated alert without compliance officer role
      await AlertService.closeAlert(
        escalatedAlert.alertId,
        'VERIFIED_LEGITIMATE_COMMERCIAL_TRANSACTION',
        'Customer explained cash was for agricultural land sale.',
        analystUser // Analyst role
      );
    } catch (err) {
      analystCloseBlocked = true;
    }
    assert(analystCloseBlocked, 'Analyst successfully blocked from closing an escalated alert (RBAC Enforced)');

    // -------------------------------------------------------------
    // Test 7: Internal SAR Case Creation
    // -------------------------------------------------------------
    logger.info('\n--- Test 7: Create Internal SAR Case from Alert ---');
    const sarCase = await SARService.createSARFromAlert(
      escalatedAlert.alertId,
      'Subject Devendra Patel conducted structured cash deposits totaling ₹14,45,000 across 3 consecutive days to evade mandatory transaction reporting threshold. Source of cash unexplained.',
      'STRUCTURING_SMURFING',
      analystUser
    );
    assert(!!sarCase.caseId, `SAR Case created with ID: ${sarCase.caseId}`);
    assert(sarCase.caseStatus === 'UNDER_COMPLIANCE_REVIEW', 'SAR Case status is UNDER_COMPLIANCE_REVIEW');
    assert(sarCase.typology === 'STRUCTURING_SMURFING', 'SAR typology correctly recorded');

    // Check alert updated
    const refreshedAlert = await Alert.findById(escalatedAlert._id);
    assert(refreshedAlert.sarCandidate, 'Alert marked as sarCandidate=true');
    assert(String(refreshedAlert.sarCaseId) === String(sarCase._id), 'Alert linked to SARCase ID');

    // -------------------------------------------------------------
    // Test 8: Compliance Review & SAR Approval
    // -------------------------------------------------------------
    logger.info('\n--- Test 8: Compliance Review & SAR Case Approval ---');
    let analystSARApprovalBlocked = false;
    try {
      // Analyst trying to approve SAR
      await SARService.updateSARStatus(sarCase.caseId, 'APPROVED_SAR', 'Analyst approval', analystUser);
    } catch (err) {
      analystSARApprovalBlocked = true;
    }
    assert(analystSARApprovalBlocked, 'Analyst blocked from approving SAR case (RBAC Enforced)');

    // Now Compliance Officer approves SAR
    const approvedSAR = await SARService.updateSARStatus(
      sarCase.caseId,
      'APPROVED_SAR',
      'Compliance Officer verified documentary evidence. Smurfing typology confirmed. Approved for internal regulatory registry.',
      complianceUser
    );
    assert(approvedSAR.caseStatus === 'APPROVED_SAR', 'SAR Case successfully APPROVED by Compliance Officer');
    assert(!!approvedSAR.approvedAt, 'Approval timestamp recorded');

    // -------------------------------------------------------------
    // Test 9: Close Alert by Compliance Officer
    // -------------------------------------------------------------
    logger.info('\n--- Test 9: Alert Resolution & Closure ---');
    const closedAlert = await AlertService.closeAlert(
      escalatedAlert.alertId,
      'INVESTIGATION_CONCLUDED_SAR_FILED',
      'Investigation concluded. Internal SAR Case SAR-2026-0002 approved and registered.',
      complianceUser
    );
    assert(closedAlert.status === 'CLOSED', 'Alert successfully transitioned to CLOSED');
    assert(!!closedAlert.closedAt, 'closedAt timestamp recorded');
    assert(closedAlert.closingCategory === 'INVESTIGATION_CONCLUDED_SAR_FILED', 'Closing category recorded');

    // -------------------------------------------------------------
    // Test 10: Complete Dossier Retrieval API Check
    // -------------------------------------------------------------
    logger.info('\n--- Test 10: Dossier Retrieval with Related Transactions & Accounts ---');
    const dossier = await AlertService.getAlertById(closedAlert.alertId);
    assert(!!dossier.alert, 'Dossier returns primary alert');
    assert(!!dossier.customerProfile, 'Dossier returns customer 360 profile');
    assert(Array.isArray(dossier.investigationNotes) && dossier.investigationNotes.length >= 3, 'Notes thread contains chronological audit entries');
    assert(Array.isArray(dossier.relatedAccounts) && dossier.relatedAccounts.length >= 1, 'Related accounts identified and aggregated');

    // -------------------------------------------------------------
    // Test 11: Audit Trail Verification for All Phase 3 Actions
    // -------------------------------------------------------------
    logger.info('\n--- Test 11: Compliance Audit Trail Verification ---');
    const auditActions = await AuditLog.find({
      entityId: { $in: [testAlertId, sarCase.caseId] }
    }).lean();

    const loggedActions = auditActions.map((a) => a.action);
    assert(loggedActions.includes('ALERT_ASSIGNED'), 'Audit log recorded ALERT_ASSIGNED');
    assert(loggedActions.includes('INVESTIGATION_NOTE_ADDED'), 'Audit log recorded INVESTIGATION_NOTE_ADDED');
    assert(loggedActions.includes('ALERT_ESCALATED'), 'Audit log recorded ALERT_ESCALATED');
    assert(loggedActions.includes('SAR_CASE_CREATED'), 'Audit log recorded SAR_CASE_CREATED');
    assert(loggedActions.includes('SAR_CASE_STATUS_UPDATED'), 'Audit log recorded SAR_CASE_STATUS_UPDATED');
    assert(loggedActions.includes('ALERT_CLOSED'), 'Audit log recorded ALERT_CLOSED');

    logger.info(`\n==============================================`);
    logger.info(`Phase 3 Test Summary: ${passed} PASSED, ${failed} FAILED`);
    logger.info(`==============================================`);

    await disconnectDB();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    logger.error(`Phase 3 Test execution error: ${err.stack || err.message}`);
    await disconnectDB();
    process.exit(1);
  }
};

runPhase3Tests();
