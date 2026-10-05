import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ShieldCheck, UserCheck, FileText } from 'lucide-react';

export const ActionModal = ({
  isOpen,
  onClose,
  actionType, // 'ASSIGN' | 'ESCALATE' | 'CLOSE' | 'SAR'
  alert,
  users = [],
  onSubmit,
  loading = false,
  error = null
}) => {
  // Form states at component top-level (React Rules of Hooks)
  const [assigneeId, setAssigneeId] = useState('');
  const [escalationReason, setEscalationReason] = useState('');
  const [closingCategory, setClosingCategory] = useState('VERIFIED_LEGITIMATE_COMMERCIAL_TRANSACTION');
  const [closingRemarks, setClosingRemarks] = useState('');
  const [sarTypology, setSarTypology] = useState('STRUCTURING_SMURFING');
  const [sarNarrative, setSarNarrative] = useState('');

  // Synchronize initial assignee whenever modal opens or users list arrives
  useEffect(() => {
    if (isOpen && users && users.length > 0) {
      if (!assigneeId || !users.some((u) => u._id === assigneeId)) {
        setAssigneeId(users[0]._id);
      }
    }
  }, [isOpen, users, assigneeId]);

  if (!isOpen || !alert) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (actionType === 'ASSIGN') {
      onSubmit({ assignedToUserId: assigneeId });
    } else if (actionType === 'ESCALATE') {
      onSubmit({ reason: escalationReason });
    } else if (actionType === 'CLOSE') {
      onSubmit({ closingCategory, closingRemarks });
    } else if (actionType === 'SAR') {
      onSubmit({ typology: sarTypology, narrativeSummary: sarNarrative });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            {actionType === 'ASSIGN' && <UserCheck className="h-5 w-5 text-sky-400" />}
            {actionType === 'ESCALATE' && <AlertTriangle className="h-5 w-5 text-rose-400" />}
            {actionType === 'CLOSE' && <ShieldCheck className="h-5 w-5 text-emerald-400" />}
            {actionType === 'SAR' && <FileText className="h-5 w-5 text-purple-400" />}

            <h3 className="text-base font-bold text-white">
              {actionType === 'ASSIGN' && 'Assign Alert to Analyst'}
              {actionType === 'ESCALATE' && 'Escalate to Compliance Officer'}
              {actionType === 'CLOSE' && 'Close Alert Investigation'}
              {actionType === 'SAR' && 'File Internal SAR Candidate'}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content based on actionType */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {actionType === 'ASSIGN' && (
            <div className="space-y-2">
              <label className="text-slate-300 font-semibold block">Select AML Analyst / Officer</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.fullName} ({u.role})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Assigning this alert will automatically transition its lifecycle state from OPEN to UNDER_REVIEW.
              </p>
            </div>
          )}

          {actionType === 'ESCALATE' && (
            <div className="space-y-2">
              <label className="text-slate-300 font-semibold block">Escalation Rationale (Required)</label>
              <textarea
                rows={4}
                required
                minLength={10}
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                placeholder="State specific indicators of money laundering, structuring patterns, or adverse sanctions findings that warrant senior compliance review..."
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none"
              />
              <p className="text-[11px] text-slate-500">
                Priority will be elevated to CRITICAL and placed in the compliance review queue.
              </p>
            </div>
          )}

          {actionType === 'CLOSE' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Disposition Category</label>
                <select
                  value={closingCategory}
                  onChange={(e) => setClosingCategory(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="VERIFIED_LEGITIMATE_COMMERCIAL_TRANSACTION">
                    Verified Legitimate Commercial Activity
                  </option>
                  <option value="FALSE_POSITIVE_SYSTEM_TUNING_NEEDED">
                    False Positive (Rule Parameter Tuning Advised)
                  </option>
                  <option value="KNOWN_EXEMPTION_DOCUMENTED">
                    Documented Institutional Exemption
                  </option>
                  <option value="INVESTIGATION_CONCLUDED_SAR_FILED">
                    Investigation Concluded (SAR Filed)
                  </option>
                  <option value="OTHER">Other Disposition</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Mandatory Closing Remarks</label>
                <textarea
                  rows={3}
                  required
                  minLength={10}
                  value={closingRemarks}
                  onChange={(e) => setClosingRemarks(e.target.value)}
                  placeholder="Summarize evidence examined (invoices, customer explanations, KYC verification) justifying case resolution..."
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>
          )}

          {actionType === 'SAR' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Primary Typology</label>
                <select
                  value={sarTypology}
                  onChange={(e) => setSarTypology(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="STRUCTURING_SMURFING">Structuring / Smurfing</option>
                  <option value="RAPID_LAYERING">Rapid Layering of Funds</option>
                  <option value="SANCTION_EVASION">Sanctions Evasion</option>
                  <option value="ROUND_TRIPPING">Round-Tripping / Circular Routing</option>
                  <option value="TERROR_FINANCING_RISK">Terrorist Financing Risk</option>
                  <option value="UNEXPLAINED_WEALTH">Unexplained Wealth / Turnover Discrepancy</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Compliance Narrative Summary (Required)</label>
                <textarea
                  rows={4}
                  required
                  minLength={20}
                  value={sarNarrative}
                  onChange={(e) => setSarNarrative(e.target.value)}
                  placeholder="Detail the suspicious modus operandi, parties involved, financial flow, and regulatory indicators for internal SAR record..."
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-white font-semibold shadow-sm transition disabled:opacity-50 ${
                actionType === 'ESCALATE'
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : actionType === 'CLOSE'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : actionType === 'SAR'
                  ? 'bg-purple-600 hover:bg-purple-500'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {loading ? 'Processing...' : 'Confirm Action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActionModal;
