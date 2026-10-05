import {
  SARCase,
  Alert,
  Transaction,
  Customer,
  InvestigationNote
} from '../models/index.js';
import { recordAuditLog } from '../middlewares/auditLogger.js';

export class SARService {
  /**
   * Retrieves active SAR candidates (high risk alerts flagged for SAR review)
   */
  static async getSARCandidates(query = {}) {
    const { page = 1, limit = 20 } = query;
    const filter = {
      $or: [{ sarCandidate: true }, { riskScore: { $gte: 90 } }]
    };

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [candidates, total] = await Promise.all([
      Alert.find(filter)
        .sort({ riskScore: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('assignedTo', 'username fullName role email')
        .populate('sarCaseId')
        .lean(),
      Alert.countDocuments(filter)
    ]);

    const candidateCustomerIds = [...new Set(candidates.map((c) => c.customerId))];
    const candidateCustomers = await Customer.find({ customerId: { $in: candidateCustomerIds } }).select('customerId fullName').lean();
    const candidateCustomerMap = new Map(candidateCustomers.map((c) => [c.customerId, c.fullName]));
    const enrichedCandidates = candidates.map((c) => ({
      ...c,
      customerName: candidateCustomerMap.get(c.customerId) || c.customerId
    }));

    return {
      candidates: enrichedCandidates,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    };
  }

  /**
   * Retrieves all internal SAR cases
   */
  static async getSARCases(query = {}) {
    const { page = 1, limit = 20, status, typology, customerId } = query;
    const filter = {};

    if (status) filter.caseStatus = status;
    if (typology) filter.typology = typology;
    if (customerId) filter.customerId = customerId;

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [cases, total] = await Promise.all([
      SARCase.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('complianceOfficerId', 'username fullName role')
        .lean(),
      SARCase.countDocuments(filter)
    ]);

    const caseCustomerIds = [...new Set(cases.map((c) => c.customerId))];
    const caseCustomers = await Customer.find({ customerId: { $in: caseCustomerIds } }).select('customerId fullName').lean();
    const caseCustomerMap = new Map(caseCustomers.map((c) => [c.customerId, c.fullName]));
    const enrichedCases = cases.map((c) => ({
      ...c,
      customerName: caseCustomerMap.get(c.customerId) || c.customerId
    }));

    return {
      cases: enrichedCases,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    };
  }

  /**
   * Retrieves single SAR case dossier with attached alerts and transactions
   */
  static async getSARCaseById(caseIdParam) {
    const sarCase = await SARCase.findOne({
      $or: [{ caseId: caseIdParam }, { _id: caseIdParam.match(/^[0-9a-fA-F]{24}$/) ? caseIdParam : null }]
    })
      .populate('complianceOfficerId', 'username fullName role')
      .populate('alertIds')
      .lean();

    if (!sarCase) return null;

    const [customer, transactions] = await Promise.all([
      Customer.findOne({ customerId: sarCase.customerId }).lean(),
      Transaction.find({ transactionId: { $in: sarCase.transactionIds } }).lean()
    ]);

    return {
      sarCase,
      customerProfile: customer,
      transactions
    };
  }

  /**
   * Creates an internal SAR Case from one or more alerts
   */
  static async createSARFromAlert(alertIdParam, narrativeSummary, typology, user, req = null) {
    const alert = await Alert.findOne({
      $or: [{ alertId: alertIdParam }, { _id: alertIdParam.match(/^[0-9a-fA-F]{24}$/) ? alertIdParam : null }]
    });

    if (!alert) throw new Error(`Alert '${alertIdParam}' not found`);

    if (!narrativeSummary || narrativeSummary.trim().length < 20) {
      throw new Error('A detailed compliance narrative (minimum 20 characters) is required to document the SAR case');
    }

    const validTypologies = [
      'STRUCTURING_SMURFING',
      'RAPID_LAYERING',
      'SANCTION_EVASION',
      'ROUND_TRIPPING',
      'TERROR_FINANCING_RISK',
      'UNEXPLAINED_WEALTH'
    ];

    if (!typology || !validTypologies.includes(typology)) {
      throw new Error(`Invalid typology. Must be one of: [${validTypologies.join(', ')}]`);
    }

    // Generate unique SAR caseId
    const year = new Date().getFullYear();
    let caseId;
    let attempt = 0;
    while (!caseId && attempt < 50) {
      const count = await SARCase.countDocuments();
      const candidateId = `SAR-${year}-${String(count + 1 + attempt).padStart(4, '0')}`;
      const exists = await SARCase.findOne({ caseId: candidateId }).lean();
      if (!exists) {
        caseId = candidateId;
      } else {
        attempt++;
      }
    }
    if (!caseId) {
      caseId = `SAR-${year}-${Date.now().toString().slice(-6)}`;
    }

    const newSARCase = await SARCase.create({
      caseId,
      customerId: alert.customerId,
      alertIds: [alert._id],
      transactionIds: [alert.transactionId],
      totalSuspiciousAmountINR: alert.normalizedAmountINR,
      caseStatus: 'UNDER_COMPLIANCE_REVIEW',
      narrativeSummary: narrativeSummary.trim(),
      typology,
      complianceOfficerId: user.role === 'COMPLIANCE_OFFICER' ? user._id : null
    });

    // Link case to alert
    alert.sarCandidate = true;
    alert.sarCaseId = newSARCase._id;
    if (alert.status !== 'ESCALATED') {
      alert.status = 'ESCALATED';
    }
    await alert.save();

    // Add note
    await InvestigationNote.create({
      alertId: alert._id,
      authorId: user._id,
      authorName: user.fullName || user.username,
      noteText: `INTERNAL SAR CASE FILED [${caseId} - ${typology}]: ${narrativeSummary.trim()}`,
      actionTaken: 'FLAGGED_AS_SAR',
      tags: ['SAR_Candidate', typology, caseId]
    });

    await recordAuditLog({
      req,
      userId: user._id,
      username: user.username,
      userRole: user.role,
      action: 'SAR_CASE_CREATED',
      entity: 'SAR_CASE',
      entityId: caseId,
      previousValue: null,
      newValue: {
        caseId,
        alertId: alert.alertId,
        customerId: alert.customerId,
        totalAmountINR: alert.normalizedAmountINR,
        typology
      }
    });

    return newSARCase;
  }

  /**
   * Updates SAR Case status and narrative (Compliance Officer / Admin review)
   */
  static async updateSARStatus(caseIdParam, caseStatus, narrativeUpdate, user, req = null) {
    if (user.role !== 'COMPLIANCE_OFFICER' && user.role !== 'ADMIN') {
      throw new Error('Permission denied: Only Compliance Officers or Admins can review and disposition SAR cases');
    }

    const sarCase = await SARCase.findOne({
      $or: [{ caseId: caseIdParam }, { _id: caseIdParam.match(/^[0-9a-fA-F]{24}$/) ? caseIdParam : null }]
    });

    if (!sarCase) throw new Error(`SAR Case '${caseIdParam}' not found`);

    const validStatuses = ['DRAFT', 'UNDER_COMPLIANCE_REVIEW', 'APPROVED_SAR', 'REJECTED', 'ARCHIVED'];
    if (!validStatuses.includes(caseStatus)) {
      throw new Error(`Invalid status. Must be one of: [${validStatuses.join(', ')}]`);
    }

    const previousStatus = sarCase.caseStatus;
    sarCase.caseStatus = caseStatus;

    if (narrativeUpdate && narrativeUpdate.trim().length >= 10) {
      sarCase.narrativeSummary = narrativeUpdate.trim();
    }

    if (caseStatus === 'APPROVED_SAR') {
      sarCase.approvedAt = new Date();
      sarCase.complianceOfficerId = user._id;
    }

    await sarCase.save();

    await recordAuditLog({
      req,
      userId: user._id,
      username: user.username,
      userRole: user.role,
      action: 'SAR_CASE_STATUS_UPDATED',
      entity: 'SAR_CASE',
      entityId: sarCase.caseId,
      previousValue: { caseStatus: previousStatus },
      newValue: {
        caseStatus,
        approvedAt: sarCase.approvedAt,
        complianceOfficer: user.username
      }
    });

    return sarCase;
  }
}

export default SARService;
