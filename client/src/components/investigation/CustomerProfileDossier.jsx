import React from 'react';
import { User, ShieldAlert, AlertCircle, CheckCircle2, MapPin, Briefcase, DollarSign } from 'lucide-react';
import { formatINR } from '../../utils/formatters.js';

export const CustomerProfileDossier = ({ customer }) => {
  if (!customer) {
    return (
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-400 text-xs">
        No Customer KYC profile available.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              {customer.fullName}
              {customer.pepStatus && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold">
                  PEP
                </span>
              )}
            </h4>
            <span className="text-xs font-mono text-slate-400">{customer.customerId}</span>
          </div>
        </div>

        <div className="text-right">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
              customer.riskCategory === 'CRITICAL'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : customer.riskCategory === 'HIGH'
                ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                : customer.riskCategory === 'MEDIUM'
                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {customer.riskCategory} RISK
          </span>
          <div className="text-[11px] text-slate-400 mt-1">Score: {customer.customerRiskScore}/100</div>
        </div>
      </div>

      {/* Attributes Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-slate-400" /> Occupation
          </span>
          <p className="font-medium text-slate-200">{customer.occupation}</p>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-slate-400" /> Declared Monthly Income
          </span>
          <p className="font-mono font-medium text-emerald-400">{formatINR(customer.monthlyIncome)}</p>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400">Account Number</span>
          <p className="font-mono text-slate-200">{customer.accountNumber || 'N/A'}</p>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400">Account Type</span>
          <p className="font-medium text-slate-200">{customer.accountType}</p>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-slate-400" /> Address & Country
          </span>
          <p className="text-slate-200 truncate">
            {customer.address?.city}, {customer.address?.countryCode || 'IN'}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400">KYC Status</span>
          <p className="flex items-center gap-1.5 font-medium text-slate-200">
            {customer.kycStatus === 'VERIFIED' ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Verified
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> {customer.kycStatus}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Historical Alert Counter */}
      <div className="rounded-lg bg-slate-800/40 p-2.5 flex items-center justify-between text-xs border border-slate-800">
        <span className="text-slate-400">Prior Compliance Alerts</span>
        <span className={`font-mono font-bold ${customer.previousAlertCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
          {customer.previousAlertCount} previous alert(s)
        </span>
      </div>
    </div>
  );
};

export default CustomerProfileDossier;
