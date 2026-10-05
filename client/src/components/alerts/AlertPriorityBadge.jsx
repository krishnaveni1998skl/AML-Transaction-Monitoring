import React from 'react';

export const AlertPriorityBadge = ({ priority }) => {
  const configs = {
    LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    MEDIUM: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    HIGH: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    CRITICAL: 'bg-rose-500/20 text-rose-400 border-rose-500/50 font-bold'
  };

  const style = configs[priority] || configs.MEDIUM;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border uppercase tracking-wider ${style}`}>
      {priority}
    </span>
  );
};

export default AlertPriorityBadge;
