import { AlertService } from '../services/alertService.js';

export const getAlerts = async (req, res, next) => {
  try {
    const result = await AlertService.getAlerts(req.query);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const getAlertById = async (req, res, next) => {
  try {
    const result = await AlertService.getAlertById(req.params.id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: `Alert '${req.params.id}' not found`
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

export const assignAlert = async (req, res, next) => {
  try {
    const { assignedToUserId } = req.body;
    if (!assignedToUserId) {
      return res.status(400).json({
        success: false,
        message: 'Field assignedToUserId is required'
      });
    }
    const alert = await AlertService.assignAlert(req.params.id, assignedToUserId, req.user, req);
    res.status(200).json({
      success: true,
      message: `Alert '${alert.alertId}' assigned successfully. Status updated to ${alert.status}.`,
      data: alert
    });
  } catch (err) {
    next(err);
  }
};

export const updateAlertStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Field status is required'
      });
    }
    const alert = await AlertService.updateAlertStatus(req.params.id, status, req.user, req);
    res.status(200).json({
      success: true,
      message: `Alert status updated to '${status}'`,
      data: alert
    });
  } catch (err) {
    next(err);
  }
};

export const addInvestigationNote = async (req, res, next) => {
  try {
    const { noteText, actionTaken, tags } = req.body;
    const note = await AlertService.addInvestigationNote(
      req.params.id,
      noteText,
      actionTaken,
      tags,
      req.user,
      req
    );
    res.status(201).json({
      success: true,
      message: 'Investigation note added successfully',
      data: note
    });
  } catch (err) {
    next(err);
  }
};

export const escalateAlert = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const alert = await AlertService.escalateAlert(req.params.id, reason, req.user, req);
    res.status(200).json({
      success: true,
      message: `Alert '${alert.alertId}' successfully escalated to Compliance Officer`,
      data: alert
    });
  } catch (err) {
    next(err);
  }
};

export const closeAlert = async (req, res, next) => {
  try {
    const { closingCategory, closingRemarks } = req.body;
    const alert = await AlertService.closeAlert(
      req.params.id,
      closingCategory,
      closingRemarks,
      req.user,
      req
    );
    res.status(200).json({
      success: true,
      message: `Alert '${alert.alertId}' closed successfully with category '${closingCategory}'`,
      data: alert
    });
  } catch (err) {
    next(err);
  }
};
