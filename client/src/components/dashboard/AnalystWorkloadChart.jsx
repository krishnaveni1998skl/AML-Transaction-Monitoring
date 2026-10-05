import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { UserCheck, ShieldAlert } from 'lucide-react';

export const AnalystWorkloadChart = ({ workload = [], unassignedCount = 0 }) => {
  if (!workload || workload.length === 0) {
    return (
      <div className="h-64 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-center text-slate-500 text-xs">
        No active analyst case assignments recorded.
      </div>
    );
  }

  const chartData = workload.map((w) => ({
    name: w.analystName.split(' ')[0], // First name for label
    fullName: w.analystName,
    role: w.role,
    underReview: w.underReviewCount,
    escalated: w.escalatedCount,
    closed: w.closedCount
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1">
          <div className="font-bold text-white">{data.fullName}</div>
          <div className="text-[10px] text-slate-400 font-mono">{data.role}</div>
          <div className="pt-1 border-t border-slate-800 space-y-0.5">
            <div className="flex justify-between gap-4 text-indigo-300">
              <span>Under Review:</span>
              <span className="font-bold font-mono">{data.underReview}</span>
            </div>
            <div className="flex justify-between gap-4 text-rose-300">
              <span>Escalated:</span>
              <span className="font-bold font-mono">{data.escalated}</span>
            </div>
            <div className="flex justify-between gap-4 text-emerald-300">
              <span>Closed / Concluded:</span>
              <span className="font-bold font-mono">{data.closed}</span>
            </div>
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
          <h4 className="text-sm font-bold text-white tracking-tight">Compliance Investigation Workload</h4>
          <p className="text-xs text-slate-400">Caseload status distribution across active AML officers.</p>
        </div>

        {unassignedCount > 0 && (
          <span className="text-[11px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-md flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5" />
            {unassignedCount} Unassigned Alert{unassignedCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} iconType="circle" />
            <Bar dataKey="underReview" name="Under Review" stackId="a" fill="#818cf8" radius={[0, 0, 0, 0]} />
            <Bar dataKey="escalated" name="Escalated" stackId="a" fill="#f43f5e" radius={[0, 0, 0, 0]} />
            <Bar dataKey="closed" name="Closed" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalystWorkloadChart;
