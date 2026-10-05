import React, { useState } from 'react';
import { X, Download, FileText, CheckCircle2, ShieldAlert, FileSpreadsheet } from 'lucide-react';
import { dashboardService } from '../../services/dashboardService.js';

export const ExportReportModal = ({
  isOpen,
  onClose,
  activeRange = '30d',
  startDate = null,
  endDate = null
}) => {
  const [reportType, setReportType] = useState('SUMMARY'); // 'SUMMARY' | 'ALERTS' | 'SAR'
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setDownloading(true);
      setError(null);
      const params = { range: activeRange, startDate, endDate };

      if (reportType === 'SUMMARY') {
        await dashboardService.downloadCSV(
          '/reports/export/summary',
          `aml_executive_summary_${activeRange}_${Date.now()}.csv`,
          params
        );
      } else if (reportType === 'ALERTS') {
        await dashboardService.downloadCSV(
          '/reports/export/alerts',
          `aml_alerts_register_${activeRange}_${Date.now()}.csv`,
          params
        );
      } else if (reportType === 'SAR') {
        await dashboardService.downloadCSV(
          '/reports/export/sar',
          `aml_sar_ledger_${activeRange}_${Date.now()}.csv`,
          params
        );
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to download report.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Generate AML Compliance Report</h3>
              <p className="text-xs text-slate-400">Export audited data registers and regulatory briefings.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Select Report Type</label>

            <div className="grid grid-cols-1 gap-2.5">
              <label
                onClick={() => setReportType('SUMMARY')}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  reportType === 'SUMMARY'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="reportType"
                  checked={reportType === 'SUMMARY'}
                  onChange={() => setReportType('SUMMARY')}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-bold text-slate-200">Executive KPI & Platform Summary (CSV)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Aggregated platform metrics, turnover volumes, alert distributions, and top AML rules.
                  </div>
                </div>
              </label>

              <label
                onClick={() => setReportType('ALERTS')}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  reportType === 'ALERTS'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="reportType"
                  checked={reportType === 'ALERTS'}
                  onChange={() => setReportType('ALERTS')}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-bold text-slate-200">Complete Alert & Investigation Register (CSV)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Line-item alert dossier including risk scores, priority, assigned analyst, and triggered rules.
                  </div>
                </div>
              </label>

              <label
                onClick={() => setReportType('SAR')}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  reportType === 'SAR'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="reportType"
                  checked={reportType === 'SAR'}
                  onChange={() => setReportType('SAR')}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-bold text-slate-200">Suspicious Activity Report (SAR) Case Ledger (CSV)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Regulatory SAR filings, typologies, reviewing compliance officers, and narrative summaries.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-400">
              <span>Selected Scope:</span>
              <span className="font-mono font-semibold text-indigo-400 uppercase">{activeRange}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Classification:</span>
              <span className="font-mono text-amber-400">CONFIDENTIAL / COMPLIANCE ONLY</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Audit Logging:</span>
              <span className="text-emerald-400">Action will be recorded in immutable audit log</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-6 py-3.5 bg-slate-950/60 flex items-center justify-end gap-3 text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={downloading}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold transition flex items-center gap-1.5 shadow-sm"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Exporting...' : 'Download CSV Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportReportModal;
