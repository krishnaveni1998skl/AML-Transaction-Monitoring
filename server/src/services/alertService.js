import {
  Alert,
  Customer,
  Transaction,
  InvestigationNote,
  User,
  SARCase
} from '../models/index.js';
import { recordAuditLog } from '../middlewares/auditLogger.js';

export class AlertService {
  /**
   * Retrieves paginated alerts with multi-dimensional filtering
   */
  static async getAlerts(query = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      riskLevel,
      customerId,
      assignedTo,
      sarCandidate,
      search,
      startDate,
      endDate
    } = query;

    const filter = {};

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (riskLevel) filter.riskLevel = riskLevel;
    if (customerId) filter.customerId = customerId;
    if (assignedTo) filter.assignedTo = assignedTo;

    if (typeof sarCandidate === 'boolean') filter.sarCandidate = sarCandidate;
    else if (sarCandidate === 'true') filter.sarCandidate = true;
    else if (sarCandidate === 'false') filter.sarCandidate = false;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search && search.trim()) {
      const searchStr = search.trim();
      const escaped = searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');

      // Find matching customers by fullName, customerId, or accountNumber
      const matchingCustomers = await Customer.find({
        $or: [
          { fullName: searchRegex },
          { customerId: searchRegex },
          { accountNumber: searchRegex }
        ]
      })
        .select('customerId')
        .lean();

      const matchingCustomerIds = matchingCustomers.map((c) => c.customerId);

      filter.$or = [
        { alertId: searchRegex },
        { customerId: searchRegex },
        { transactionId: searchRegex },
        ...(matchingCustomerIds.length > 0 ? [{ customerId: { $in: matchingCustomerIds } }] : [])
      ];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [alerts, total, countsByStatus] = await Promise.all([
      Alert.find(filter)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('assignedTo', 'username fullName role email')
        .lean(),
      Alert.countDocuments(filter),
      Alert.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    // Enrich alerts with customer details
    const customerIds = [...new Set(alerts.map((a) => a.customerId))];
    const customerProfiles = await Customer.find({ customerId: { $in: customerIds } })
      .select('customerId fullName riskCategory occupation accountNumber')
      .lean();
    const customerMap = new Map(customerProfiles.map((c) => [c.customerId, c]));

    const enrichedAlerts = alerts.map((alt) => ({
      ...alt,
      customerName: customerMap.get(alt.customerId)?.fullName || null,
      customerProfile: customerMap.get(alt.customerId) || null
    }));

    const statusCounts = {
      OPEN: 0,
      UNDER_REVIEW: 0,
      ESCALATED: 0,
      CLOSED: 0
    };
    countsByStatus.forEach((c) => {
      if (statusCounts[c._id] !== undefined) statusCounts[c._id] = c.count;
    });

    return {
      alerts: enrichedAlerts,
      statusCounts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    };
  }

  /**
   * Retrieves single alert with 360-degree investigation dossier
   */
  static async getAlertById(alertIdParam) {
    const alert = await Alert.findOne({
      $or: [{ alertId: alertIdParam }, { _id: alertIdParam.match(/^[0-9a-fA-F]{24}$/) ? alertIdParam : null }]
    })
      .populate('assignedTo', 'username fullName role email')
      .populate('sarCaseId')
      .lean();

    if (!alert) return null;

    // Load dossier elements in parallel
    const [customer, transaction, notes, relatedTransactions] = await Promise.all([
      Customer.findOne({ customerId: alert.customerId }).lean(),
      Transaction.findOne({ transactionId: alert.transactionId }).populate('ruleHits').lean(),
      InvestigationNote.find({ alertId: alert._id }).sort({ timestamp: -1 }).lean(),
      Transaction.find({
        sourceCustomerId: alert.customerId,
        transactionId: { $ne: alert.transactionId }
      })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean()
    ]);

    // Aggregate related accounts
    const relatedAccounts = new Set();
    if (customer?.accountNumber) relatedAccounts.add(customer.accountNumber);
    if (transaction?.sourceAccountId) relatedAccounts.add(transaction.sourceAccountId);
    if (transaction?.destinationAccountId) relatedAccounts.add(transaction.destinationAccountId);
    relatedTransactions.forEach((tx) => {
      if (tx.sourceAccountId) relatedAccounts.add(tx.sourceAccountId);
      if (tx.destinationAccountId) relatedAccounts.add(tx.destinationAccountId);
    });

    return {
      alert,
      customerProfile: customer,
      transactionDetail: transaction,
      investigationNotes: notes,
      relatedTransactions,
      relatedAccounts: Array.from(relatedAccounts)
    };
  }

  /**
   * Assigns an alert to an analyst and transitions status from OPEN to UNDER_REVIEW
   */
  static async assignAlert(alertIdParam, assigneeUserId, user, req = null) {
    const alert = await Alert.findOne({
      $or: [{ alertId: alertIdParam }, { _id: alertIdParam.match(/^[0-9a-fA-F]{24}$/) ? alertIdParam : null }]
    });

    if (!alert) throw new Error(`Alert '${alertIdParam}' not found`);
    if (alert.status === 'CLOSED') throw new Error('Cannot assign an already closed alert');

    let assignee = null;
    if (assigneeUserId && String(assigneeUserId).match(/^[0-9a-fA-F]{24}$/)) {
      assignee = await User.findById(assigneeUserId);
    }
    if (!assignee && assigneeUserId) {
      assignee = await User.findOne({
        $or: [
          { username: assigneeUserId },
          { fullName: assigneeUserId },
          { fullName: new RegExp(`^${assigneeUserId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') }
        ],
        isActive: true
      });
    }
    // Backward compatibility for legacy mock IDs
    if (!assignee) {
      if (assigneeUserId === '67c1e3000000000000000002') {
        assignee = await User.findOne({ role: 'AML_ANALYST', isActive: true });
      } else if (assigneeUserId === '67c1e3000000000000000003') {
        assignee = await User.findOne({ role: 'COMPLIANCE_OFFICER', isActive: true });
      } else if (assigneeUserId === '67c1e3000000000000000001') {
        assignee = await User.findOne({ role: 'ADMIN', isActive: true });
      }
    }

    if (!assignee || !assignee.isActive) {
      throw new Error(`Assignee user not found or inactive`);
    }

    const previousValue = {
      assignedTo: alert.assignedTo,
      status: alert.status
    };

    alert.assignedTo = assignee._id;
    if (alert.status === 'OPEN') {
      alert.status = 'UNDER_REVIEW';
    }
    await alert.save();

    // Append automatic investigation note
    await InvestigationNote.create({
      alertId: alert._id,
      authorId: user._id,
      authorName: user.fullName || user.username,
      noteText: `Alert assigned to ${assignee.fullName} (${assignee.role}). Status updated to ${alert.status}.`,
      actionTaken: 'ASSIGNED',
      tags: ['Assignment', alert.priority]
    });

    await recordAuditLog({
      req,
      userId: user._id,
      username: user.username,
      userRole: user.role,
      action: 'ALERT_ASSIGNED',
      entity: 'ALERT',
      entityId: alert.alertId,
      previousValue,
      newValue: {
        assignedTo: assignee.username,
        status: alert.status
      }
    });

    return alert;
  }

  /**
   * Updates alert status with strict FSM lifecycle validation
   */
  static async updateAlertStatus(alertIdParam, newStatus, user, req = null) {
    const alert = await Alert.findOne({
      $or: [{ alertId: alertIdParam }, { _id: alertIdParam.match(/^[0-9a-fA-F]{24}$/) ? alertIdParam : null }]
    });

    if (!alert) throw new Error(`Alert '${alertIdParam}' not found`);

    const validTransitions = {
      OPEN: ['UNDER_REVIEW'],
      UNDER_REVIEW: ['ESCALATED', 'CLOSED'],
      ESCALATED: ['UNDER_REVIEW', 'CLOSED'],
      CLOSED: ['UNDER_REVIEW'] // Can only reopen to UNDER_REVIEW
    };

    const allowed = validTransitions[alert.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from '${alert.status}' to '${newStatus}'. Allowed: [${allowed.join(', ')}]`
      );
    }

    // Role checks
    if (alert.status === 'ESCALATED' && newStatus === 'CLOSED' && user.role !== 'COMPLIANCE_OFFICER' && user.role !== 'ADMIN') {
      throw new Error('Only Compliance Officers or Admins can resolve and close escalated alerts');
    }

    const previousStatus = alert.status;
    alert.status = newStatus;
    if (newStatus === 'CLOSED') {
      alert.closedAt = new Date();
    }
    await alert.save();

    await InvestigationNote.create({
      alertId: alert._id,
      authorId: user._id,
      authorName: user.fullName || user.username,
      noteText: `Alert lifecycle status transitioned from ${previousStatus} to ${newStatus}.`,
      actionTaken: 'STATUS_CHANGE',
      tags: ['StatusUpdate', newStatus]
    });

    await recordAuditLog({
      req,
      userId: user._id,
      username: user.username,
      userRole: user.role,
      action: 'ALERT_STATUS_CHANGED',
      entity: 'ALERT',
      entityId: alert.alertId,
      previousValue: { status: previousStatus },
      newValue: { status: newStatus }
    });

    return alert;
  }

  /**
   * Adds an investigator case note
   */
  static async addInvestigationNote(alertIdParam, noteText, actionTaken = 'NOTE_ADDED', tags = [], user, req = null) {
    if (!noteText || noteText.trim().length === 0) {
      throw new Error('Note text cannot be empty');
    }

    const alert = await Alert.findOne({
      $or: [{ alertId: alertIdParam }, { _id: alertIdParam.match(/^[0-9a-fA-F]{24}$/) ? alertIdParam : null }]
    });

    if (!alert) throw new Error(`Alert '${alertIdParam}' not found`);

    const note = await InvestigationNote.create({
      alertId: alert._id,
      authorId: user._id,
      authorName: user.fullName || user.username,
      noteText: noteText.trim(),
      actionTaken,
      tags: Array.isArray(tags) ? tags : [tags],
      timestamp: new Date()
    });

    await recordAuditLog({
      req,
      userId: user._id,
      username: user.username,
      userRole: user.role,
      action: 'INVESTIGATION_NOTE_ADDED',
      entity: 'ALERT',
      entityId: alert.alertId,
      previousValue: null,
      newValue: {
        noteId: note._id,
        actionTaken,
        tags
      }
    });

    return note;
  }

  /**
   * Escalates alert to Compliance Officer
   */
  static async escalateAlert(alertIdParam, escalationReason, user, req = null) {
    if (!escalationReason || escalationReason.trim().length < 10) {
      throw new Error('A detailed escalation rationale (minimum 10 characters) is required');
    }

    const alert = await Alert.findOne({
      $or: [{ alertId: alertIdParam }, { _id: alertIdParam.match(/^[0-9a-fA-F]{24}$/) ? alertIdParam : null }]
    });

    if (!alert) throw new Error(`Alert '${alertIdParam}' not found`);
    if (alert.status === 'CLOSED') throw new Error('Cannot escalate an already closed alert');

    const previousStatus = alert.status;
    alert.status = 'ESCALATED';
    alert.priority = 'CRITICAL';
    await alert.save();

    await InvestigationNote.create({
      alertId: alert._id,
      authorId: user._id,
      authorName: user.fullName || user.username,
      noteText: `ESCALATED TO COMPLIANCE: ${escalationReason.trim()}`,
      actionTaken: 'ESCALATED_TO_COMPLIANCE',
      tags: ['Escalation', 'UrgentComplianceReview']
    });

    await recordAuditLog({
      req,
      userId: user._id,
      username: user.username,
      userRole: user.role,
      action: 'ALERT_ESCALATED',
      entity: 'ALERT',
      entityId: alert.alertId,
      previousValue: { status: previousStatus },
      newValue: {
        status: 'ESCALATED',
        priority: 'CRITICAL',
        escalationReason: escalationReason.trim()
      }
    });

    return alert;
  }

  /**
   * Closes alert with mandatory closing category and remarks
   */
  static async closeAlert(alertIdParam, closingCategory, closingRemarks, user, req = null) {
    const validCategories = [
      'FALSE_POSITIVE_SYSTEM_TUNING_NEEDED',
      'VERIFIED_LEGITIMATE_COMMERCIAL_TRANSACTION',
      'KNOWN_EXEMPTION_DOCUMENTED',
      'INVESTIGATION_CONCLUDED_SAR_FILED',
      'OTHER'
    ];

    if (!closingCategory || !validCategories.includes(closingCategory)) {
      throw new Error(`Invalid closing category. Must be one of: [${validCategories.join(', ')}]`);
    }

    if (!closingRemarks || closingRemarks.trim().length < 10) {
      throw new Error('Mandatory closing remarks (minimum 10 characters) must be provided for audit justification');
    }

    const alert = await Alert.findOne({
      $or: [{ alertId: alertIdParam }, { _id: alertIdParam.match(/^[0-9a-fA-F]{24}$/) ? alertIdParam : null }]
    });

    if (!alert) throw new Error(`Alert '${alertIdParam}' not found`);

    // Only Compliance Officer or Admin can close an escalated alert
    if (alert.status === 'ESCALATED' && user.role !== 'COMPLIANCE_OFFICER' && user.role !== 'ADMIN') {
      throw new Error('Permission denied: Only Compliance Officers or Admins can close escalated alerts');
    }

    const previousStatus = alert.status;
    alert.status = 'CLOSED';
    alert.closingCategory = closingCategory;
    alert.closingRemarks = closingRemarks.trim();
    alert.closedAt = new Date();
    await alert.save();

    const actionTag = closingCategory.includes('FALSE_POSITIVE')
      ? 'CLOSED_FALSE_POSITIVE'
      : 'CLOSED_LEGITIMATE';

    await InvestigationNote.create({
      alertId: alert._id,
      authorId: user._id,
      authorName: user.fullName || user.username,
      noteText: `ALERT CLOSED [${closingCategory}]: ${closingRemarks.trim()}`,
      actionTaken: actionTag,
      tags: ['Resolution', closingCategory]
    });

    await recordAuditLog({
      req,
      userId: user._id,
      username: user.username,
      userRole: user.role,
      action: 'ALERT_CLOSED',
      entity: 'ALERT',
      entityId: alert.alertId,
      previousValue: { status: previousStatus },
      newValue: {
        status: 'CLOSED',
        closingCategory,
        closingRemarks: closingRemarks.trim(),
        closedAt: alert.closedAt
      }
    });

    return alert;
  }
}

export default AlertService;
