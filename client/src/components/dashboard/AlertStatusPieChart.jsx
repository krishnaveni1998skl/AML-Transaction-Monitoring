import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export const AlertStatusPieChart = ({ data = [], onSelectStatus = null }) => {
  const totalCount = data.reduce((s, i) => s + i.count, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const pct = totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0;
      return (
        <div className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg shadow-xl text-xs space-y-0.5">
          <div className="font-semibold text-white flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            {item.name} Status
          </div>
          <div className="font-mono text-slate-300">
            {item.count} alerts ({pct}%)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 flex flex-col justify-between">
      <div>
        <h4 className="text-sm font-bold text-white tracking-tight">Alert Lifecycle Triage Status</h4>
        <p className="text-xs text-slate-400">Progression across Open, Under Review, Escalated, and Closed.</p>
      </div>

      <div className="h-44 w-full relative flex items-center justify-center">
        {totalCount === 0 ? (
          <div className="text-slate-500 text-xs">No active alerts recorded</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={data}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={68}
                paddingAngle={4}
              >
                {data.map((entry, index) => (
                  <Cell key={`status-cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Status Breakdown Legend & Click-Through */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
        {data.map((item, i) => {
          const pct = totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0;
          return (
            <button
              key={i}
              onClick={() => onSelectStatus && onSelectStatus(item.name)}
              className="flex items-center justify-between p-1.5 rounded bg-slate-950/60 border border-slate-800/60 hover:border-indigo-500/50 hover:bg-slate-900 transition text-left"
              title={`Click to view ${item.name} alerts in Alert Management`}
            >
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}
              </span>
              <span className="font-mono font-bold text-white">
                {item.count} <span className="text-[10px] text-slate-500 font-normal">({pct}%)</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AlertStatusPieChart;
