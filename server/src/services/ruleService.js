import { AMLRule } from '../models/index.js';
import { RuleEngine } from '../engines/RuleEngine.js';
import { recordAuditLog } from '../middlewares/auditLogger.js';

export class RuleService {
  /**
   * Retrieves all rules with optional filtering
   */
  static async getAllRules(filter = {}) {
    return AMLRule.find(filter).sort({ category: 1, ruleCode: 1 }).lean();
  }

  /**
   * Retrieves a single rule by ID
   */
  static async getRuleById(id) {
    return AMLRule.findById(id).lean();
  }

  /**
   * Creates a new AML rule
   */
  static async createRule(ruleData, user = null, req = null) {
    const {
      ruleCode,
      name,
      description,
      category,
      severity = 'MEDIUM',
      weight = 20,
      parameters = {},
      isEnabled = true
    } = ruleData;

    if (!ruleCode || !name || !description || !category) {
      throw new Error('Fields ruleCode, name, description, and category are required');
    }

    const cleanCode = ruleCode.toUpperCase().trim();
    const existing = await AMLRule.findOne({ ruleCode: cleanCode });
    if (existing) {
      throw new Error(`Rule with code '${cleanCode}' already exists`);
    }

    const newRule = await AMLRule.create({
      ruleCode: cleanCode,
      name: name.trim(),
      description: description.trim(),
      category,
      severity,
      weight: Number(weight) || 20,
      parameters: parameters || {},
      isEnabled: isEnabled !== false,
      createdBy: user?._id || null,
      updatedBy: user?._id || null
    });

    RuleEngine.invalidateCache();

    await recordAuditLog({
      req,
      userId: user?._id || null,
      username: user?.username || 'ADMIN',
      userRole: user?.role || 'ADMIN',
      action: 'AML_RULE_CREATED',
      entity: 'AML_RULE',
      entityId: newRule.ruleCode,
      previousValue: null,
      newValue: newRule.toObject()
    });

    return newRule;
  }

  /**
   * Updates rule parameters, weight, severity, or active status
   */
  static async updateRule(id, updateData, user = null, req = null) {
    const existingRule = await AMLRule.findById(id);
    if (!existingRule) {
      throw new Error(`AML Rule with ID '${id}' not found`);
    }

    const previousValue = existingRule.toObject();

    if (updateData.name !== undefined) existingRule.name = updateData.name;
    if (updateData.description !== undefined) existingRule.description = updateData.description;
    if (updateData.severity !== undefined) existingRule.severity = updateData.severity;
    if (updateData.weight !== undefined) existingRule.weight = updateData.weight;
    if (updateData.isEnabled !== undefined) existingRule.isEnabled = updateData.isEnabled;
    if (updateData.parameters !== undefined) {
      existingRule.parameters = {
        ...existingRule.parameters,
        ...updateData.parameters
      };
      existingRule.markModified('parameters');
    }

    if (user) {
      existingRule.updatedBy = user._id;
    }

    const savedRule = await existingRule.save();

    // Invalidate RuleEngine memory cache so changes apply immediately
    RuleEngine.invalidateCache();

    // Compliance Audit Trail
    await recordAuditLog({
      req,
      userId: user?._id || null,
      username: user?.username || 'ADMIN',
      userRole: user?.role || 'ADMIN',
      action: 'AML_RULE_MODIFIED',
      entity: 'AML_RULE',
      entityId: existingRule.ruleCode,
      previousValue: {
        parameters: previousValue.parameters,
        weight: previousValue.weight,
        severity: previousValue.severity,
        isEnabled: previousValue.isEnabled
      },
      newValue: {
        parameters: savedRule.parameters,
        weight: savedRule.weight,
        severity: savedRule.severity,
        isEnabled: savedRule.isEnabled
      }
    });

    return savedRule;
  }

  /**
   * Toggles rule enabled/disabled status
   */
  static async toggleRule(id, isEnabled, user = null, req = null) {
    return RuleService.updateRule(id, { isEnabled }, user, req);
  }
}

export default RuleService;
