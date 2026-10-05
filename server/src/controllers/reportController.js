import { ReportingService } from '../services/reportingService.js';

export const getSummaryReport = async (req, res, next) => {
  try {
    const report = await ReportingService.generateSummaryReport(req.query, req.user, req);
    res.status(200).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};

export const exportAlertsCSV = async (req, res, next) => {
  try {
    const csvContent = await ReportingService.exportAlertsCSV(req.query, req.user, req);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="aml_alerts_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};

export const exportSARCSV = async (req, res, next) => {
  try {
    const csvContent = await ReportingService.exportSARCSV(req.query, req.user, req);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="aml_sar_cases_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};

export const exportSummaryCSV = async (req, res, next) => {
  try {
    const csvContent = await ReportingService.exportSummaryCSV(req.query, req.user, req);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="aml_executive_summary_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};

export const exportSARCustomerDetailsCSV = async (req, res, next) => {
  try {
    const csvContent = await ReportingService.exportSARCustomerDetailsCSV(req.query, req.user, req);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="aml_sar_customer_details_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};

