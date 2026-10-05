import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  FileText,
  CreditCard,
  Layers,
  Activity,
  Send,
  Building,
  RefreshCw,
  ExternalLink,
  Network
} from 'lucide-react';
import { alertService } from '../services/alertService.js';
import { sarService } from '../services/sarService.js';
import api from '../services/api.js';
import { AlertStatusBadge } from '../components/alerts/AlertStatusBadge.jsx';
import { AlertPriorityBadge } from '../components/alerts/AlertPriorityBadge.jsx';
import { CustomerProfileDossier } from '../components/investigation/CustomerProfileDossier.jsx';
import { NotesThread } from '../components/investigation/NotesThread.jsx';
import { ActionModal } from '../components/investigation/ActionModal.jsx';
import { formatINR, formatDateTime } from '../utils/formatters.js';

export const AlertDetailPage = ({ alertId, onBack, onOpenNetworkGraph, onOpenCustomerDetail = null }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalState, setModalState] = useState({ isOpen: false, type: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [analysts, setAnalysts] = useState([]);

  // Fallback analysts matching seeded database records
  const sampleAnalysts = [
    { _id: '6abf39f54a2ba1df40bf7f04', fullName: 'Vikram Mehta (Senior AML Analyst)', role: 'AML_ANALYST' },
    { _id: '6abf39f54a2ba1df40bf7f05', fullName: 'Ananya Sharma (Chief Compliance Officer)', role: 'COMPLIANCE_OFFICER' },
    { _id: '6abf39f54a2ba1df40bf7f03', fullName: 'System Administrator', role: 'ADMIN' }
  ];

  // Fetch real active analysts from backend
  useEffect(() => {
    const fetchAnalysts = async () => {
      try {
        const res = await api.get('/auth/users');
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setAnalysts(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load analysts from backend:', err);
      }
    };
    fetchAnalysts();
  }, []);

  const fetchDossier = async () => {
    try {
      setLoading(true);
      const res = await alertService.getAlertById(alertId);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDossier();
  }, [alertId]);

  const handleAddNote = async ({ noteText, actionTaken, tags }) => {
    try {
      await alertService.addNote(alertId, { noteText, actionTaken, tags });
      fetchDossier();
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  };

  const handleModalSubmit = async (formData) => {
    try {
      setActionLoading(true);
      setActionError(null);
      if (modalState.type === 'ASSIGN') {
        await alertService.assignAlert(alertId, formData.assignedToUserId);
      } else if (modalState.type === 'ESCALATE') {
        await alertService.escalateAlert(alertId, formData.reason);
      } else if (modalState.type === 'CLOSE') {
        await alertService.closeAlert(alertId, formData);
      } else if (modalState.type === 'SAR') {
        await sarService.createSAR({ alertId, ...formData });
      }
      setModalState({ isOpen: false, type: null });
      setActionError(null);
      fetchDossier();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Action failed';
      console.error('Action failed:', errMsg);
      setActionError(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 space-y-3">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-400" />
        <p className="text-xs">Loading investigation dossier for {alertId}...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-rose-400 text-sm">{error || 'Dossier not found'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-white hover:bg-slate-700"
        >
          Back to Alert Queue
        </button>
      </div>
    );
  }

  const { alert, customerProfile, transactionDetail, investigationNotes, relatedTransactions, relatedAccounts } = data;

  return (
    <div className="space-y-6">
      {/* Header & Workbench Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Back to alerts queue"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white font-mono">{alert.alertId}</h2>
              <AlertStatusBadge status={alert.status} />
              <AlertPriorityBadge priority={alert.priority} />
              {alert.sarCandidate && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold uppercase">
                  SAR Candidate
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Triggered on {formatDateTime(alert.createdAt)} &bull; Assigned to:{' '}
              <span className="text-slate-200 font-medium">{alert.assignedTo?.fullName || 'Unassigned'}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {alert.status !== 'CLOSED' && (
            <>
              <button
                onClick={() => {
                  setActionError(null);
                  setModalState({ isOpen: true, type: 'ASSIGN' });
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs text-slate-200 font-medium flex items-center gap-1.5 transition"
              >
                <UserCheck className="h-3.5 w-3.5 text-sky-400" />
                Assign
              </button>

              {alert.status !== 'ESCALATED' && (
                <button
                  onClick={() => {
                    setActionError(null);
                    setModalState({ isOpen: true, type: 'ESCALATE' });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-xs text-rose-300 font-medium flex items-center gap-1.5 transition"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                  Escalate
                </button>
              )}

              <button
                onClick={() => {
                  setActionError(null);
                  setModalState({ isOpen: true, type: 'SAR' });
                }}
                className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-xs text-purple-300 font-medium flex items-center gap-1.5 transition"
              >
                <FileText className="h-3.5 w-3.5 text-purple-400" />
                File SAR
              </button>

              <button
                onClick={() => {
                  setActionError(null);
                  setModalState({ isOpen: true, type: 'CLOSE' });
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Resolve / Close
              </button>
            </>
          )}

          {alert.status === 'CLOSED' && (
            <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
              Closed on {formatDateTime(alert.closedAt)} ({alert.closingCategory})
            </div>
          )}
        </div>
      </div>

      {/* Main Dossier Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Context Dossier (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Customer 360 Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white text-xs uppercase tracking-wider">Customer Profile & KYC</span>
              {onOpenCustomerDetail && customerProfile?.customerId && (
                <button
                  onClick={() => onOpenCustomerDetail(customerProfile.customerId)}
                  className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  View Full Risk Profile
                  <ExternalLink className="h-3 w-3" />
                </button>
              )}
            </div>
            <CustomerProfileDossier customer={customerProfile} />
          </div>

          {/* Triggering Transaction Details Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-indigo-400" />
                Triggering Transaction Details
              </h4>
              <span className="font-mono text-xs text-indigo-400 font-bold">{alert.transactionId}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400">Transaction Amount</span>
                <p className="text-lg font-mono font-bold text-white">
                  {formatINR(alert.normalizedAmountINR)}
                </p>
                <span className="text-[10px] text-slate-500 uppercase">
                  Raw: {alert.amount} {alert.currency}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400">Payment Rail & Channel</span>
                <p className="font-medium text-slate-200">
                  {transactionDetail?.transactionType} ({transactionDetail?.channel})
                </p>
                <span className="text-[10px] text-slate-500 uppercase">Direction: {transactionDetail?.direction}</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400">Source Account</span>
                <p className="font-mono text-slate-200">{transactionDetail?.sourceAccountId}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400">Destination Account & Bank</span>
                <p className="font-mono text-slate-200">{transactionDetail?.destinationAccountId}</p>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {transactionDetail?.destinationBank}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400">Origin / Location</span>
                <p className="text-slate-200">
                  {transactionDetail?.location?.city}, {transactionDetail?.location?.countryCode}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400">Execution Timestamp</span>
                <p className="text-slate-200 font-mono">{formatDateTime(transactionDetail?.timestamp)}</p>
              </div>
            </div>
          </div>

          {/* Triggered AML Rules Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                Triggered AML Rules & Condition Hits
              </h4>
              <span className="text-xs font-mono text-amber-400 font-semibold">
                {alert.triggeredRules?.length} Rule Hit(s)
              </span>
            </div>

            <div className="space-y-3">
              {alert.triggeredRules?.map((rule, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 flex items-center gap-2 font-mono">
                      {rule.ruleCode}
                      <span className="text-slate-400 font-sans font-normal">- {rule.ruleName}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      +{rule.scoreContribution} pts ({rule.severity})
                    </span>
                  </div>

                  {rule.details && (
                    <div className="rounded bg-slate-900 p-2.5 font-mono text-[11px] text-slate-300 space-y-1">
                      {Object.entries(rule.details).map(([key, val]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-slate-500">{key}:</span>
                          <span className="text-indigo-300">
                            {typeof val === 'number' && key.toLowerCase().includes('amount')
                              ? formatINR(val)
                              : typeof val === 'object'
                              ? JSON.stringify(val)
                              : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Workflow, Related Entities, Notes (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Risk Score Meter Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Composite Risk Score</span>
              <Activity className="h-4 w-4 text-rose-400" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white font-mono">{alert.riskScore}</span>
              <span className="text-xs text-slate-400">/ 100</span>
              <span className="ml-auto">
                <AlertPriorityBadge priority={alert.priority} />
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  alert.riskScore >= 81
                    ? 'bg-rose-500'
                    : alert.riskScore >= 61
                    ? 'bg-orange-500'
                    : 'bg-yellow-500'
                }`}
                style={{ width: `${alert.riskScore}%` }}
              />
            </div>
          </div>

          {/* Related Accounts Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                Related Account Entities
              </h4>
              {onOpenNetworkGraph && (
                <button
                  onClick={() =>
                    onOpenNetworkGraph(
                      transactionDetail?.sourceAccountId || customerProfile?.accountNumber || alert.customerId
                    )
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition"
                >
                  <Network className="h-3.5 w-3.5" />
                  Explore Graph ➔
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              {relatedAccounts.length === 0 ? (
                <span className="text-slate-500 text-xs">No related accounts discovered.</span>
              ) : (
                relatedAccounts.map((acc, i) => (
                  <button
                    key={i}
                    onClick={() => onOpenNetworkGraph && onOpenNetworkGraph(acc)}
                    className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-white transition"
                    title="Click to view network graph for this account"
                  >
                    {acc}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Related Customer Transactions Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Customer Transaction History</span>
              <span className="text-xs font-normal text-slate-400 font-mono">
                {relatedTransactions.length} records
              </span>
            </h4>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
              {relatedTransactions.length === 0 ? (
                <p className="text-slate-500">No other transactions recorded for this customer.</p>
              ) : (
                relatedTransactions.map((rtx) => (
                  <div
                    key={rtx._id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px]"
                  >
                    <div>
                      <span className="font-mono text-slate-200">{rtx.transactionType}</span>
                      <span className="text-slate-500 block text-[10px]">
                        {formatDateTime(rtx.timestamp)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-200">
                        {formatINR(rtx.normalizedAmountINR)}
                      </span>
                      <span
                        className={`block text-[10px] font-semibold ${
                          rtx.isSuspicious ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        Score: {rtx.riskScore}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notes & Audit Thread Component */}
          <NotesThread
            notes={investigationNotes}
            onAddNote={handleAddNote}
            loading={actionLoading}
          />
        </div>
      </div>

      {/* Action Dialog Modal */}
      <ActionModal
        isOpen={modalState.isOpen}
        onClose={() => {
          setModalState({ isOpen: false, type: null });
          setActionError(null);
        }}
        actionType={modalState.type}
        alert={alert}
        users={analysts.length > 0 ? analysts : sampleAnalysts}
        onSubmit={handleModalSubmit}
        loading={actionLoading}
        error={actionError}
      />
    </div>
  );
};

export default AlertDetailPage;
