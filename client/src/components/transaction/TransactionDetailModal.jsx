import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Clock,
  MapPin,
  Building2,
  User,
  Activity,
  Layers
} from 'lucide-react';
import { transactionService } from '../../services/transactionService.js';
import { formatINR, formatDate } from '../../utils/formatters.js';

export const TransactionDetailModal = ({
  isOpen,
  onClose,
  transactionId,
  onViewAlert = null,
  onViewCustomer = null
}) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !transactionId) {
      setDetail(null);
      setError('');
      return;
    }

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await transactionService.getTransactionById(transactionId);
        setDetail(res.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load transaction details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [isOpen, transactionId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Transaction Dossier</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                  {transactionId}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Detailed transaction parameters, screening breakdown, and AML rule execution results
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-xs text-slate-400 font-mono">Loading transaction parameters...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        ) : detail ? (
          <div className="space-y-6">
            {/* Top Overview Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Amount (INR)</span>
                <div className="text-lg font-bold font-mono text-white">
                  {formatINR(detail.normalizedAmountINR || detail.amount)}
                </div>
                <span className="text-[11px] text-slate-400 font-mono">{detail.currency} {detail.amount?.toLocaleString()}</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Monitoring Status</span>
                <div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-bold font-mono ${
                      detail.isSuspicious
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    {detail.isSuspicious ? 'SUSPICIOUS' : 'NORMAL'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">{detail.direction} via {detail.channel}</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Risk Assessment</span>
                <div className="text-lg font-bold font-mono text-white">
                  {detail.riskScore} <span className="text-xs text-slate-500">/ 100</span>
                </div>
                <span
                  className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    detail.riskLevel === 'CRITICAL'
                      ? 'bg-rose-500/20 text-rose-300'
                      : detail.riskLevel === 'HIGH'
                      ? 'bg-orange-500/20 text-orange-300'
                      : detail.riskLevel === 'MEDIUM'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {detail.riskLevel} RISK
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Compliance Alert</span>
                <div className="text-sm font-mono font-bold text-white truncate">
                  {detail.associatedAlert?.alertId || 'None'}
                </div>
                <span className="text-[10px] text-slate-400">
                  {detail.associatedAlert ? `Status: ${detail.associatedAlert.status}` : 'No alert generated'}
                </span>
              </div>
            </div>

            {/* Core Transaction Information */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-indigo-400" /> Transaction Parameters
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Transaction Type</span>
                  <span className="font-semibold text-slate-200">{detail.transactionType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Direction</span>
                  <span className={`font-semibold ${detail.direction === 'DEBIT' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {detail.direction}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Date / Time</span>
                  <span className="font-mono text-slate-300">{formatDate(detail.timestamp)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Location</span>
                  <span className="text-slate-300">{detail.location?.city || 'Mumbai'}, {detail.location?.countryCode || 'IN'}</span>
                </div>
              </div>
            </div>

            {/* Parties & Accounts Information */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-indigo-400" /> Originator & Beneficiary Accounts
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Originator (Source)</span>
                    {onViewCustomer && (
                      <button
                        onClick={() => {
                          onClose();
                          onViewCustomer(detail.sourceCustomerId);
                        }}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        Profile <ExternalLink className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                  <div className="font-semibold text-white">
                    {detail.customerProfile?.fullName || detail.sourceCustomerId}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400">
                    Account: {detail.sourceAccountId}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    ID: {detail.sourceCustomerId} • Risk: {detail.customerProfile?.riskCategory || 'LOW'}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Beneficiary (Destination)</span>
                  <div className="font-semibold text-white">
                    {detail.destinationBank || 'State Bank of India'}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400">
                    Account: {detail.destinationAccountId}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Counterparty Target Account
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Scoring Breakdown */}
            {detail.riskScoreRecord && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-indigo-400" /> Multi-Factor Risk Score Breakdown
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Tx Risk (25%)</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {detail.riskScoreRecord.scoreBreakdown?.transactionRisk ?? 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Cust Risk (25%)</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {detail.riskScoreRecord.scoreBreakdown?.customerRisk ?? 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Country (20%)</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {detail.riskScoreRecord.scoreBreakdown?.countryRisk ?? 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Velocity (15%)</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {detail.riskScoreRecord.scoreBreakdown?.velocityRisk ?? 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Alert Hist (15%)</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {detail.riskScoreRecord.scoreBreakdown?.alertHistoryRisk ?? 0}
                    </span>
                  </div>
                </div>

                {detail.riskScoreRecord.explanations && detail.riskScoreRecord.explanations.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-semibold uppercase text-slate-500">Engine Factor Explanations:</span>
                    <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                      {detail.riskScoreRecord.explanations.map((exp, idx) => (
                        <li key={idx} className="leading-relaxed text-[11px] text-slate-400">
                          {exp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Triggered AML Rules */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-400" /> Triggered AML Detection Rules ({detail.ruleHits?.length || 0})
              </h4>
              {(!detail.ruleHits || detail.ruleHits.length === 0) ? (
                <p className="text-xs text-slate-500 italic">No AML detection rules were triggered by this transaction.</p>
              ) : (
                <div className="space-y-2">
                  {detail.ruleHits.map((hit, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-white flex items-center gap-2">
                          <span>{hit.ruleName || hit.ruleCode}</span>
                          <span className="font-mono text-[10px] text-slate-400">[{hit.ruleCode}]</span>
                        </div>
                        {hit.details && (
                          <div className="text-[11px] text-slate-400">
                            {hit.details.actualAmountINR
                              ? `Exceeded ₹${hit.details.thresholdAmountINR.toLocaleString('en-IN')} threshold by ₹${hit.details.varianceExceeded.toLocaleString('en-IN')}`
                              : hit.details.incomeMultiple
                              ? `Transaction amount was ${hit.details.incomeMultiple}x declared monthly income`
                              : hit.details.roundAmountINR
                              ? `Round amount ₹${hit.details.roundAmountINR.toLocaleString('en-IN')}`
                              : JSON.stringify(hit.details)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/20 text-rose-300">
                          {hit.severity}
                        </span>
                        <span className="font-mono text-indigo-400 font-bold text-xs">
                          +{hit.scoreContribution} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Associated Alert Footer Bar */}
            {detail.associatedAlert && (
              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">
                      Compliance Alert Generated: {detail.associatedAlert.alertId}
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Priority: <span className="font-bold text-rose-400">{detail.associatedAlert.priority}</span> • Status: <span className="font-bold text-indigo-300">{detail.associatedAlert.status}</span>
                    </p>
                  </div>
                </div>

                {onViewAlert && (
                  <button
                    onClick={() => {
                      onClose();
                      onViewAlert(detail.associatedAlert.alertId);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 shrink-0"
                  >
                    <span>Investigate Alert</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        ) : null}

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailModal;
