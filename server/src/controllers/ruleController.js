import { RuleService } from '../services/ruleService.js';

export const getAllRules = async (req, res, next) => {
  try {
    const rules = await RuleService.getAllRules(req.query);
    res.status(200).json({
      success: true,
      count: rules.length,
      data: rules
    });
  } catch (err) {
    next(err);
  }
};

export const getRuleById = async (req, res, next) => {
  try {
    const rule = await RuleService.getRuleById(req.params.id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: `AML Rule '${req.params.id}' not found`
      });
    }
    res.status(200).json({
      success: true,
      data: rule
    });
  } catch (err) {
    next(err);
  }
};

export const updateRule = async (req, res, next) => {
  try {
    const updated = await RuleService.updateRule(req.params.id, req.body, req.user, req);
    res.status(200).json({
      success: true,
      message: `Rule '${updated.ruleCode}' successfully updated. Rule engine cache invalidated.`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

export const toggleRule = async (req, res, next) => {
  try {
    const { isEnabled } = req.body;
    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "Field 'isEnabled' (boolean) is required in request body"
      });
    }
    const updated = await RuleService.toggleRule(req.params.id, isEnabled, req.user, req);
    res.status(200).json({
      success: true,
      message: `Rule '${updated.ruleCode}' is now ${isEnabled ? 'ENABLED' : 'DISABLED'}`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

export const createRule = async (req, res, next) => {
  try {
    const created = await RuleService.createRule(req.body, req.user, req);
    res.status(201).json({
      success: true,
      message: `Rule '${created.ruleCode}' successfully created. Rule engine cache invalidated.`,
      data: created
    });
  } catch (err) {
    next(err);
  }
};
