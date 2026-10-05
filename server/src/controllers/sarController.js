import { SARService } from '../services/sarService.js';

export const getSARCandidates = async (req, res, next) => {
  try {
    const result = await SARService.getSARCandidates(req.query);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const getSARCases = async (req, res, next) => {
  try {
    const result = await SARService.getSARCases(req.query);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const getSARCaseById = async (req, res, next) => {
  try {
    const result = await SARService.getSARCaseById(req.params.id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: `SAR Case '${req.params.id}' not found`
      });
    }
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const createSARFromAlert = async (req, res, next) => {
  try {
    const { alertId, narrativeSummary, typology } = req.body;
    if (!alertId) {
      return res.status(400).json({
        success: false,
        message: 'alertId is required in request body'
      });
    }

    const newCase = await SARService.createSARFromAlert(
      alertId,
      narrativeSummary,
      typology,
      req.user,
      req
    );

    res.status(201).json({
      success: true,
      message: `SAR Case '${newCase.caseId}' successfully drafted and routed for compliance review`,
      data: newCase
    });
  } catch (err) {
    next(err);
  }
};

export const updateSARStatus = async (req, res, next) => {
  try {
    const { status, narrativeSummary } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'status is required'
      });
    }

    const updated = await SARService.updateSARStatus(
      req.params.id,
      status,
      narrativeSummary,
      req.user,
      req
    );

    res.status(200).json({
      success: true,
      message: `SAR Case '${updated.caseId}' status updated to '${status}'`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
};
