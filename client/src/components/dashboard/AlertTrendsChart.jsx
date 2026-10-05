import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { formatCompactINR } from '../../utils/formatters.js';

export const AlertTrendsChart = ({ data = [] }) => {
  const [metricView, setMetricView] = useState('COUNTS'); // 'COUNTS' | 'VOLUMES'

  if (!data || data.length === 0) {
    return (
      <div className="h-64 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-center text-slate-500 text-xs">
        No transaction or alert activity recorded for selected period.
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1">
          <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1 font-mono">
            {label}
          </div>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-white">
                {metricView === 'VOLUMES' && entry.dataKey.includes('Volume')
                  ? `₹${entry.value.toLocaleString('en-IN')}`
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Activity Trends Over Time</h3>
          <p className="text-xs text-slate-400">
            Monitoring daily inflow of transactions, flagged suspicious events, and AML alerts.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg text-xs">
          <button
            onClick={() => setMetricView('COUNTS')}
            className={`px-3 py-1 rounded font-semibold transition ${
              metricView === 'COUNTS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Counts
          </button>
          <button
            onClick={() => setMetricView('VOLUMES')}
            className={`px-3 py-1 rounded font-semibold transition ${
              metricView === 'VOLUMES'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Volume (INR)
          </button>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {metricView === 'COUNTS' ? (
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotalTx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="totalTransactions"
                name="Total Transactions"
                stroke="#6366f1"
                fillOpacity={1}
                fill="url(#colorTotalTx)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="alertsGenerated"
                name="AML Alerts"
                stroke="#f43f5e"
                fillOpacity={1}
                fill="url(#colorAlerts)"
                strokeWidth={2.5}
              />
              <Line
                type="monotone"
                dataKey="suspiciousCount"
                name="Suspicious Tx"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </AreaChart>
          ) : (
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotalVol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorSuspVol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                tickFormatter={(v) => formatCompactINR(v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="totalVolumeINR"
                name="Monitored Volume"
                stroke="#0ea5e9"
                fillOpacity={1}
                fill="url(#colorTotalVol)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="suspiciousVolumeINR"
                name="Suspicious Volume"
                stroke="#f43f5e"
                fillOpacity={1}
                fill="url(#colorSuspVol)"
                strokeWidth={2.5}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AlertTrendsChart;
