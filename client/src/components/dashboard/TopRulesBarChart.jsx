import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

export const TopRulesBarChart = ({ rules = [], totalHits = 0 }) => {
  if (!rules || rules.length === 0) {
    return (
      <div className="h-64 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-center text-slate-500 text-xs">
        No AML rule triggers detected for selected period.
      </div>
    );
  }

  const getSeverityColor = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return '#f43f5e';
      case 'HIGH':
        return '#f97316';
      case 'MEDIUM':
        return '#eab308';
      default:
        return '#10b981';
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1">
          <div className="font-bold text-white">{data.ruleName}</div>
          <div className="font-mono text-indigo-400 font-semibold">{data.ruleCode}</div>
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
            <span className="text-slate-400">Trigger Hits:</span>
            <span className="font-mono font-bold text-white">{data.hitCount} ({data.percentageOfHits}%)</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Score Contribution:</span>
            <span className="font-mono font-bold text-rose-400">+{data.totalScoreContribution} pts</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-white tracking-tight">Top Triggered AML Rules</h4>
          <p className="text-xs text-slate-400">Detection frequency across all monitored transactions.</p>
        </div>
        <span className="text-xs font-mono text-indigo-400 font-semibold bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">
          {totalHits} Total Hits
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rules}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} horizontal={false} />
            <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis
              type="category"
              dataKey="ruleCode"
              stroke="#94a3b8"
              fontSize={10.5}
              tickLine={false}
              width={120}
              tickFormatter={(v) => (v.length > 16 ? `${v.slice(0, 16)}...` : v)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="hitCount" radius={[0, 4, 4, 0]} barSize={16}>
              {rules.map((entry, index) => (
                <Cell key={`bar-${index}`} fill={getSeverityColor(entry.severity)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TopRulesBarChart;
