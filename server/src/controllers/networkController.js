import { NetworkService } from '../services/networkService.js';

export const getNetworkGraph = async (req, res, next) => {
  try {
    const result = await NetworkService.getNetworkGraph(req.query, req.user, req);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const detectSuspiciousPatterns = async (req, res, next) => {
  try {
    const result = await NetworkService.detectPatterns(req.query);
    res.status(200).json({
      success: true,
      count: result.patterns.length,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const getEntityNetworkSummary = async (req, res, next) => {
  try {
    const result = await NetworkService.getEntitySummary(req.params.id);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};
