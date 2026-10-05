import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Building,
  User,
  ExternalLink,
  RefreshCw,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { sarService } from '../services/sarService.js';
import { formatINR, formatDateTime } from '../utils/formatters.js';

export const SARManagementPage = ({ onSelectAlert }) => {
  const [activeTab, setActiveTab] = useState('CASES'); // 'CASES' | 'CANDIDATES'
  const [cases, setCases] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState({ isOpen: false, caseItem: null, action: null });
  const [complianceRemarks, setComplianceRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [exportingCustomerDetails, setExportingCustomerDetails] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'CASES') {
        const res = await sarService.getCases();
        if (res.success) setCases(res.data.cases);
      } else {
        const res = await sarService.getCandidates();
        if (res.success) setCandidates(res.data.candidates);
      }
    } catch (err) {
      console.error('Failed to load SAR data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewModal.caseItem) return;
    try {
      setSubmitting(true);
      const newStatus = reviewModal.action === 'APPROVE' ? 'APPROVED_SAR' : 'REJECTED';
      await sarService.updateSARStatus(reviewModal.caseItem.caseId, {
        status: newStatus,
        narrativeSummary: reviewModal.caseItem.narrativeSummary + `\n\n[Compliance Review Remarks]: ${complianceRemarks}`
      });
      setReviewModal({ isOpen: false, caseItem: null, action: null });
      setComplianceRemarks('');
      fetchData();
    } catch (err) {
      alert(`Review submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Export SAR Register in Excel format (.xlsx)
  const handleExportSARRegisterExcel = async () => {
    try {
      setExportingExcel(true);
      await sarService.exportSARRegisterExcel({ cases, candidates });
    } catch (err) {
      console.error('Failed to export SAR register in Excel format:', err);
      alert(`Excel export failed: ${err.message || 'Unable to generate Excel file'}`);
    } finally {
      setExportingExcel(false);
    }
  };

  // Export SAR Register in CSV format
  const handleExportSARRegisterCSV = async () => {
    try {
      setExportingCSV(true);
      await sarService.exportSARRegisterCSV();
    } catch (err) {
      console.error('Failed to export SAR register in CSV format:', err);
      alert(`CSV export failed: ${err.message || 'Unable to download CSV file'}`);
    } finally {
      setExportingCSV(false);
    }
  };

  // Export Customer KYC & Risk Details in CSV format
  const handleExportCustomerDetails = async () => {
    try {
      setExportingCustomerDetails(true);
      await sarService.exportCustomerDetailsCSV();
    } catch (err) {
      console.error('Failed to export customer details:', err);
      alert(`Export failed: ${err.message || 'Unable to download customer details'}`);
    } finally {
      setExportingCustomerDetails(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-purple-400" />
            Compliance & Suspicious Activity Reports (SAR)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Internal case management for identifying, reviewing, and approving Suspicious Activity Reports.
          </p>
        </div>

        {/* Actions & Tab Switch */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* SAR Register Excel Export (.xlsx) */}
          <button
            onClick={handleExportSARRegisterExcel}
            disabled={exportingExcel}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white transition shadow-sm disabled:opacity-50"
            title="Export complete SAR Register with cases and candidates in Excel (.xlsx) spreadsheet format"
          >
            {exportingExcel ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            )}
            <span>Export SAR Register (.xlsx)</span>
          </button>

          {/* SAR Register CSV Export (.csv) */}
          <button
            onClick={handleExportSARRegisterCSV}
            disabled={exportingCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition shadow-sm disabled:opacity-50"
            title="Export SAR cases ledger in CSV format"
          >
            {exportingCSV ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />
            ) : (
              <Download className="h-3.5 w-3.5 text-slate-400" />
            )}
            <span>Export SAR (CSV)</span>
          </button>

          {/* Customer KYC & Compliance Dossier CSV Export */}
          <button
            onClick={handleExportCustomerDetails}
            disabled={exportingCustomerDetails}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-purple-500/50 hover:bg-purple-950/20 transition shadow-sm disabled:opacity-50"
            title="Export comprehensive customer KYC, risk rating and SAR dossier in CSV format"
          >
            {exportingCustomerDetails ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-purple-400" />
            ) : (
              <Download className="h-3.5 w-3.5 text-purple-400" />
            )}
            <span>Export Customer Details</span>
          </button>

          {/* Tab switch */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('CASES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'CASES'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Internal SAR Cases ({cases.length})
            </button>
            <button
              onClick={() => setActiveTab('CANDIDATES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'CANDIDATES'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Flagged Candidates ({candidates.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-purple-400 mb-2" />
            <p className="text-xs">Loading compliance cases...</p>
          </div>
        ) : activeTab === 'CASES' ? (
          /* Cases Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Case Reference</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Typology</th>
                  <th className="py-3.5 px-4">Suspicious Turnover</th>
                  <th className="py-3.5 px-4">Compliance Status</th>
                  <th className="py-3.5 px-4">Narrative Summary</th>
                  <th className="py-3.5 px-4 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No internal SAR cases recorded.
                    </td>
                  </tr>
                ) : (
                  cases.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-purple-400">{c.caseId}</span>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {formatDateTime(c.createdAt)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-200">{c.customerId}</div>
                        {c.customerName && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[150px]">{c.customerName}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30">
                          {c.typology}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {formatINR(c.totalSuspiciousAmountINR)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            c.caseStatus === 'APPROVED_SAR'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : c.caseStatus === 'REJECTED'
                              ? 'bg-slate-500/10 text-slate-400 border-slate-700'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {c.caseStatus === 'APPROVED_SAR' && <CheckCircle2 className="h-3 w-3" />}
                          {c.caseStatus === 'REJECTED' && <XCircle className="h-3 w-3" />}
                          {c.caseStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs text-slate-300 truncate" title={c.narrativeSummary}>
                        {c.narrativeSummary}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {c.caseStatus === 'UNDER_COMPLIANCE_REVIEW' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setReviewModal({ isOpen: true, caseItem: c, action: 'APPROVE' })}
                              className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-300 hover:text-white font-medium text-[11px] transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setReviewModal({ isOpen: true, caseItem: c, action: 'REJECT' })}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-medium text-[11px] transition"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                        {c.caseStatus === 'APPROVED_SAR' && (
                          <span className="text-[11px] text-emerald-400 font-mono">Approved by Officer</span>
                        )}
                        {c.caseStatus === 'REJECTED' && (
                          <span className="text-[11px] text-slate-500 font-mono">Dismissed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Candidates Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Alert ID</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Risk Score</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No active alerts flagged as SAR candidates.
                    </td>
                  </tr>
                ) : (
                  candidates.map((alt) => (
                    <tr key={alt._id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">{alt.alertId}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-200">{alt.customerId}</div>
                        {alt.customerName && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[150px]">{alt.customerName}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {formatINR(alt.normalizedAmountINR)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-rose-400">{alt.riskScore}/100</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          {alt.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onSelectAlert(alt.alertId)}
                          className="px-3 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600 border border-purple-500/30 text-purple-300 hover:text-white font-medium text-xs transition"
                        >
                          Review Dossier
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review & Disposition Modal */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-400" />
              {reviewModal.action === 'APPROVE' ? 'Approve Internal SAR Record' : 'Dismiss SAR Case'}
            </h3>

            <p className="text-xs text-slate-400">
              Case Ref: <strong className="text-white">{reviewModal.caseItem?.caseId}</strong> &bull; Typology:{' '}
              <strong className="text-purple-300">{reviewModal.caseItem?.typology}</strong>
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Compliance Officer Remarks</label>
                <textarea
                  rows={3}
                  required
                  value={complianceRemarks}
                  onChange={(e) => setComplianceRemarks(e.target.value)}
                  placeholder="Record supervisor assessment, rationale for approval/dismissal, and regulatory notes..."
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-200 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReviewModal({ isOpen: false, caseItem: null, action: null })}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-1.5 rounded-lg font-semibold text-white shadow-sm transition ${
                    reviewModal.action === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {submitting ? 'Submitting...' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SARManagementPage;
