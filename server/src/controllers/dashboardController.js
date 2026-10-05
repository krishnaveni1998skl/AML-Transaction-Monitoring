import { DashboardService } from '../services/dashboardService.js';

export const getExecutiveOverview = async (req, res, next) => {
  try {
    const data = await DashboardService.getExecutiveOverview(req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getTimeSeriesTrends = async (req, res, next) => {
  try {
    const data = await DashboardService.getTimeSeriesTrends(req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getDistributions = async (req, res, next) => {
  try {
    const data = await DashboardService.getDistributions(req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getRulePerformance = async (req, res, next) => {
  try {
    const data = await DashboardService.getRulePerformance(req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getWorkloadMetrics = async (req, res, next) => {
  try {
    const data = await DashboardService.getWorkloadMetrics(req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getTopRiskEntities = async (req, res, next) => {
  try {
    const data = await DashboardService.getTopRiskEntities(req.query);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};
