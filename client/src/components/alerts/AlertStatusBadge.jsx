import React from 'react';

export const AlertStatusBadge = ({ status }) => {
  const configs = {
    OPEN: {
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      label: 'Open',
      dot: 'bg-amber-400'
    },
    UNDER_REVIEW: {
      bg: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      label: 'Under Review',
      dot: 'bg-sky-400'
    },
    ESCALATED: {
      bg: 'bg-rose-500/15 text-rose-400 border-rose-500/40',
      label: 'Escalated',
      dot: 'bg-rose-400'
    },
    CLOSED: {
      bg: 'bg-slate-500/10 text-slate-400 border-slate-700',
      label: 'Closed',
      dot: 'bg-slate-400'
    }
  };

  const config = configs[status] || configs.OPEN;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

export default AlertStatusBadge;
