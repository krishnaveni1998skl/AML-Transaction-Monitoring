import React from 'react';
import { ArrowUpRight, TrendingUp } from 'lucide-react';

export const KPICard = ({
  title,
  value,
  subvalue,
  subtitle,
  icon: Icon,
  badgeText,
  badgeColor = 'bg-slate-800 text-slate-300',
  accentColor = 'text-indigo-400',
  onClick = null,
  clickableText = null
}) => {
  return (
    <div
      onClick={onClick || undefined}
      className={`rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:border-slate-700 hover:bg-slate-900/90 group shadow-sm' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800 ${accentColor}`}>
              <Icon className="h-4 w-4" />
            </div>
          )}
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        </div>

        {badgeText && (
          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono border border-slate-700/50 ${badgeColor}`}>
            {badgeText}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-white font-mono tracking-tight">{value}</span>
          {subvalue && (
            <span className="text-xs text-slate-400 font-mono">{subvalue}</span>
          )}
        </div>

        {subtitle && (
          <p className="text-[11px] text-slate-400 leading-relaxed m-0">{subtitle}</p>
        )}
      </div>

      {onClick && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-semibold text-indigo-400 group-hover:text-indigo-300 transition">
          <span>{clickableText || 'View detailed records'}</span>
          <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      )}
    </div>
  );
};

export default KPICard;
