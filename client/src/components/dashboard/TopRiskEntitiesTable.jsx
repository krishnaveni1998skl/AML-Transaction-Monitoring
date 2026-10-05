import React from 'react';
import { formatINR } from '../../utils/formatters.js';
import { Network, ShieldAlert, ArrowRight, UserCheck, User } from 'lucide-react';

export const TopRiskEntitiesTable = ({
  entities = [],
  onExploreGraph = null,
  onViewAlerts = null,
  onViewCustomer = null
}) => {
  if (!entities || entities.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-center text-slate-500 text-xs">
        No suspicious high-risk customer entities identified for this period.
      </div>
    );
  }

  const getRiskBadge = (category) => {
    switch (category) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-white tracking-tight">Top High-Risk Customer Entities</h4>
          <p className="text-xs text-slate-400">Ranked by aggregate suspicious transaction volume and alert frequency.</p>
        </div>
        <span className="text-xs font-mono text-slate-400">Showing Top {entities.length} Subjects</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
              <th className="pb-2.5">Customer / Entity</th>
              <th className="pb-2.5">Account / Institution</th>
              <th className="pb-2.5">Risk Rating</th>
              <th className="pb-2.5 text-right">Suspicious Volume</th>
              <th className="pb-2.5 text-center">Alerts</th>
              <th className="pb-2.5 text-right">Investigation Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {entities.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30 transition group">
                <td className="py-3 pr-3">
                  <div className="font-semibold text-white group-hover:text-indigo-300 transition">
                    {item.fullName}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>{item.occupation}</span>
                    {item.pepStatus && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                        PEP
                      </span>
                    )}
                    {item.sanctioned && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                        SANCTIONED
                      </span>
                    )}
                  </div>
                </td>

                <td className="py-3 pr-3 font-mono text-slate-300">
                  <div>{item.accountNumber || 'N/A'}</div>
                  <div className="text-[10px] text-slate-500">{item.customerId}</div>
                </td>

                <td className="py-3 pr-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRiskBadge(item.riskCategory)}`}>
                      {item.riskCategory}
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {item.riskScore}/100
                    </span>
                  </div>
                </td>

                <td className="py-3 pr-3 text-right font-mono font-bold text-rose-400">
                  {formatINR(item.totalSuspiciousINR)}
                  <span className="block text-[10px] text-slate-500 font-normal">
                    {item.suspiciousTxCount} suspicious txn{item.suspiciousTxCount > 1 ? 's' : ''}
                  </span>
                </td>

                <td className="py-3 pr-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                    item.alertCount > 0 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {item.alertCount}
                  </span>
                </td>

                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {onViewCustomer && (
                      <button
                        onClick={() => onViewCustomer(item.customerId)}
                        className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:text-emerald-300 text-slate-300 text-[11px] font-semibold transition flex items-center gap-1"
                        title="View Customer Risk Profile"
                      >
                        <User className="h-3.5 w-3.5 text-emerald-400" />
                        Profile
                      </button>
                    )}
                    {onExploreGraph && (
                      <button
                        onClick={() => onExploreGraph(item.accountNumber || item.customerId)}
                        className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500 hover:text-cyan-300 text-slate-300 text-[11px] font-semibold transition flex items-center gap-1"
                        title="Explore Transaction Network Graph"
                      >
                        <Network className="h-3.5 w-3.5 text-cyan-400" />
                        Graph
                      </button>
                    )}
                    {onViewAlerts && (
                      <button
                        onClick={() => onViewAlerts(item.customerId)}
                        className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-indigo-500 hover:text-indigo-300 text-slate-300 text-[11px] font-semibold transition flex items-center gap-1"
                        title="View Alerts for this Customer"
                      >
                        <ShieldAlert className="h-3.5 w-3.5 text-indigo-400" />
                        Alerts
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopRiskEntitiesTable;
