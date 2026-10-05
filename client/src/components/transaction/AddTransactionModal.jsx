import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Building2,
  DollarSign,
  UserCheck
} from 'lucide-react';
import { customerService } from '../../services/customerService.js';
import { transactionService } from '../../services/transactionService.js';
import { formatINR } from '../../utils/formatters.js';

export const AddTransactionModal = ({
  isOpen,
  onClose,
  initialCustomerId = '',
  initialAccountId = '',
  onTransactionCreated,
  onViewAlert = null
}) => {
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    sourceCustomerId: initialCustomerId || '',
    sourceAccountId: initialAccountId || '',
    destinationAccountId: 'ACC-BENEF-987654',
    destinationBank: 'State Bank of India',
    amount: '',
    currency: 'INR',
    transactionType: 'BANK_TRANSFER',
    direction: 'DEBIT',
    channel: 'NET_BANKING',
    city: 'Mumbai',
    countryCode: 'IN',
    customTransactionId: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [submissionResult, setSubmissionResult] = useState(null);

  // Load available customers for selector
  useEffect(() => {
    if (!isOpen) {
      setSubmissionResult(null);
      setApiError('');
      setFormErrors({});
      return;
    }

    const loadCusts = async () => {
      try {
        setLoadingCustomers(true);
        const res = await customerService.getCustomers({ limit: 100 });
        const list = res.data?.customers || [];
        setCustomers(list);

        if (initialCustomerId) {
          const match = list.find((c) => c.customerId === initialCustomerId);
          if (match) {
            setFormData((prev) => ({
              ...prev,
              sourceCustomerId: match.customerId,
              sourceAccountId: initialAccountId || match.accountNumber || prev.sourceAccountId
            }));
          }
        } else if (list.length > 0 && !formData.sourceCustomerId) {
          setFormData((prev) => ({
            ...prev,
            sourceCustomerId: list[0].customerId,
            sourceAccountId: list[0].accountNumber || prev.sourceAccountId
          }));
        }
      } catch (err) {
        console.error('Failed to load customers for selector:', err);
      } finally {
        setLoadingCustomers(false);
      }
    };

    loadCusts();
  }, [isOpen, initialCustomerId, initialAccountId]);

  if (!isOpen) return null;

  const handleCustomerChange = (e) => {
    const custId = e.target.value;
    const match = customers.find((c) => c.customerId === custId);
    setFormData((prev) => ({
      ...prev,
      sourceCustomerId: custId,
      sourceAccountId: match?.accountNumber || prev.sourceAccountId
    }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.sourceCustomerId) errs.sourceCustomerId = 'Source customer is required.';
    if (!formData.sourceAccountId) errs.sourceAccountId = 'Source account number is required.';
    if (!formData.destinationAccountId.trim()) errs.destinationAccountId = 'Destination account number is required.';
    if (!formData.amount || Number(formData.amount) <= 0) {
      errs.amount = 'Amount must be a positive number greater than 0.';
    }
    if (!formData.countryCode || formData.countryCode.trim().length !== 2) {
      errs.countryCode = 'Country code must be a 2-letter ISO code (e.g. IN, US, KP).';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    try {
      setSubmitting(true);
      const payload = {
        sourceCustomerId: formData.sourceCustomerId,
        sourceAccountId: formData.sourceAccountId.trim(),
        destinationAccountId: formData.destinationAccountId.trim(),
        destinationBank: formData.destinationBank.trim() || 'State Bank of India',
        amount: Number(formData.amount),
        currency: formData.currency.toUpperCase().trim() || 'INR',
        transactionType: formData.transactionType,
        direction: formData.direction,
        channel: formData.channel,
        location: {
          city: formData.city.trim() || 'Mumbai',
          countryCode: formData.countryCode.toUpperCase().trim(),
          ipAddress: '192.168.1.100'
        }
      };

      if (formData.customTransactionId.trim()) {
        payload.transactionId = formData.customTransactionId.trim();
      }

      const res = await transactionService.ingestSingle(payload);
      setSubmissionResult(res.data);
      if (onTransactionCreated) {
        onTransactionCreated(res.data?.transaction);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Transaction submission failed.';
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-6 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Ingest Transaction</h3>
              <p className="text-xs text-slate-400">
                Execute real transaction through the core AML rule & risk scoring engine
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

        {/* Real Backend Submission Outcome Banner */}
        {submissionResult ? (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Status Card */}
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                submissionResult.isSuspicious
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              }`}
            >
              {submissionResult.isSuspicious ? (
                <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <h4 className="text-sm font-bold">
                  {submissionResult.isSuspicious
                    ? 'Transaction Flagged as SUSPICIOUS'
                    : 'Transaction Cleared Normal Monitoring'}
                </h4>
                <p className="text-xs opacity-90">
                  Transaction <span className="font-mono font-bold">{submissionResult.transaction?.transactionId}</span> evaluated across all active AML detection rules.
                </p>
              </div>
            </div>

            {/* Score & Alert Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Calculated Risk Score</span>
                <div className="text-xl font-extrabold text-white font-mono mt-1">
                  {submissionResult.riskScore?.overallScore ?? submissionResult.transaction?.riskScore} / 100
                </div>
                <span
                  className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold mt-1 ${
                    submissionResult.riskScore?.riskLevel === 'CRITICAL'
                      ? 'bg-rose-500/20 text-rose-300'
                      : submissionResult.riskScore?.riskLevel === 'HIGH'
                      ? 'bg-orange-500/20 text-orange-300'
                      : submissionResult.riskScore?.riskLevel === 'MEDIUM'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {submissionResult.riskScore?.riskLevel || submissionResult.transaction?.riskLevel} RISK
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Rule Hits Triggered</span>
                <div className="text-xl font-extrabold text-white font-mono mt-1">
                  {submissionResult.ruleHits?.length || 0}
                </div>
                <span className="text-[11px] text-slate-400">rules fired</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Compliance Alert</span>
                <div className="text-sm font-mono font-bold text-white mt-1 truncate">
                  {submissionResult.alert?.alertId || 'None'}
                </div>
                <span className="text-[10px] text-slate-400">
                  {submissionResult.alert ? `Priority: ${submissionResult.alert.priority}` : 'Normal flow'}
                </span>
              </div>
            </div>

            {/* Triggered AML Rules List */}
            {submissionResult.ruleHits && submissionResult.ruleHits.length > 0 && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-rose-400" /> Triggered AML Detection Rules:
                </span>
                <div className="space-y-2">
                  {submissionResult.ruleHits.map((hit, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white flex items-center gap-2">
                          <span>{hit.ruleName || hit.ruleCode}</span>
                          <span className="font-mono text-[10px] text-slate-400">[{hit.ruleCode}]</span>
                        </div>
                        {hit.details && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {hit.details.actualAmountINR
                              ? `Actual ₹${hit.details.actualAmountINR.toLocaleString('en-IN')} exceeded threshold ₹${hit.details.thresholdAmountINR.toLocaleString('en-IN')}`
                              : hit.details.incomeMultiple
                              ? `Exceeded declared monthly income by ${hit.details.incomeMultiple}x`
                              : hit.details.roundAmountINR
                              ? `Round amount ₹${hit.details.roundAmountINR.toLocaleString('en-IN')} matched modulo`
                              : JSON.stringify(hit.details)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/20 text-rose-300">
                          {hit.severity}
                        </span>
                        <span className="font-mono text-indigo-400 font-bold text-[11px]">
                          +{hit.scoreContribution} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions Footer */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSubmissionResult(null);
                  setFormData((prev) => ({
                    ...prev,
                    amount: '',
                    customTransactionId: ''
                  }));
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                + Ingest Another Transaction
              </button>

              <div className="flex items-center gap-2">
                {submissionResult.alert?.alertId && onViewAlert && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewAlert(submissionResult.alert.alertId);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                  >
                    <span>Investigate Alert</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
                >
                  Close & View in Register
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Transaction Input Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {apiError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{apiError}</span>
              </div>
            )}

            {/* Customer & Account Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Source Customer <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formData.sourceCustomerId}
                  onChange={handleCustomerChange}
                  disabled={loadingCustomers}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {loadingCustomers ? (
                    <option>Loading customers...</option>
                  ) : (
                    customers.map((c) => (
                      <option key={c.customerId} value={c.customerId}>
                        {c.fullName} ({c.customerId}) - {c.riskCategory} Risk
                      </option>
                    ))
                  )}
                </select>
                {formErrors.sourceCustomerId && (
                  <p className="text-[11px] text-rose-400 mt-1">{formErrors.sourceCustomerId}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Source Account <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.sourceAccountId}
                  onChange={(e) => setFormData({ ...formData, sourceAccountId: e.target.value })}
                  placeholder="e.g. ACC-1001-987654"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
                {formErrors.sourceAccountId && (
                  <p className="text-[11px] text-rose-400 mt-1">{formErrors.sourceAccountId}</p>
                )}
              </div>
            </div>

            {/* Counterparty / Beneficiary Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Destination / Beneficiary Account <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.destinationAccountId}
                  onChange={(e) => setFormData({ ...formData, destinationAccountId: e.target.value })}
                  placeholder="e.g. ACC-BENEF-987654"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
                {formErrors.destinationAccountId && (
                  <p className="text-[11px] text-rose-400 mt-1">{formErrors.destinationAccountId}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Destination Bank</label>
                <input
                  type="text"
                  value={formData.destinationBank}
                  onChange={(e) => setFormData({ ...formData, destinationBank: e.target.value })}
                  placeholder="e.g. State Bank of India, HDFC"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Transaction Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Amount (INR) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="e.g. 1500000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                />
                {formErrors.amount && (
                  <p className="text-[11px] text-rose-400 mt-1">{formErrors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Transaction Type</label>
                <select
                  value={formData.transactionType}
                  onChange={(e) => setFormData({ ...formData, transactionType: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="UPI">UPI Payment</option>
                  <option value="CASH_DEPOSIT">Cash Deposit</option>
                  <option value="CASH_WITHDRAWAL">Cash Withdrawal</option>
                  <option value="INTERNATIONAL_TRANSFER">International Transfer</option>
                  <option value="CARD">Card Transaction</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Direction</label>
                <select
                  value={formData.direction}
                  onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="DEBIT">DEBIT (Outflow)</option>
                  <option value="CREDIT">CREDIT (Inflow)</option>
                </select>
              </div>
            </div>

            {/* Rail, Location, and Custom ID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Channel</label>
                <select
                  value={formData.channel}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="NET_BANKING">Net Banking</option>
                  <option value="MOBILE_APP">Mobile App</option>
                  <option value="ATM">ATM Terminal</option>
                  <option value="BRANCH">Bank Branch</option>
                  <option value="POS">Point of Sale (POS)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Country Code (ISO-2) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={formData.countryCode}
                  onChange={(e) => setFormData({ ...formData, countryCode: e.target.value.toUpperCase() })}
                  placeholder="IN"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                />
                {formErrors.countryCode && (
                  <p className="text-[11px] text-rose-400 mt-1">{formErrors.countryCode}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Transaction ID <span className="text-slate-500 text-[10px]">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.customTransactionId}
                  onChange={(e) => setFormData({ ...formData, customTransactionId: e.target.value })}
                  placeholder="Auto-generated if empty"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Quick Presets for Compliance Testing */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                Quick Test Scenarios:
              </span>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({
                    ...prev,
                    amount: '1500000',
                    transactionType: 'BANK_TRANSFER',
                    direction: 'DEBIT',
                    countryCode: 'IN'
                  }))}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500 text-slate-300 text-[11px] font-mono transition"
                >
                  ₹15,00,000 High Value (Triggers High Val)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({
                    ...prev,
                    amount: '480000',
                    transactionType: 'CASH_DEPOSIT',
                    direction: 'CREDIT',
                    countryCode: 'IN'
                  }))}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500 text-slate-300 text-[11px] font-mono transition"
                >
                  ₹4,80,000 Cash Structuring
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({
                    ...prev,
                    amount: '750000',
                    transactionType: 'INTERNATIONAL_TRANSFER',
                    direction: 'DEBIT',
                    countryCode: 'KP'
                  }))}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500 text-slate-300 text-[11px] font-mono transition"
                >
                  FATF High Risk Corridor (KP)
                </button>
              </div>
            </div>

            {/* Submit Controls */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Evaluating AML Engine...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Execute Transaction</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddTransactionModal;
