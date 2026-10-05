export const ROLES = {
  ADMIN: 'ADMIN',
  AML_ANALYST: 'AML_ANALYST',
  COMPLIANCE_OFFICER: 'COMPLIANCE_OFFICER'
};

export const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

export const RISK_COLORS = {
  LOW: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    badge: 'bg-emerald-950 text-emerald-300 border-emerald-800'
  },
  MEDIUM: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    badge: 'bg-yellow-950 text-yellow-300 border-yellow-800'
  },
  HIGH: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    badge: 'bg-orange-950 text-orange-300 border-orange-800'
  },
  CRITICAL: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    badge: 'bg-rose-950 text-rose-300 border-rose-800'
  }
};

export const ALERT_STATUSES = {
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  ESCALATED: 'ESCALATED',
  CLOSED: 'CLOSED'
};

export const TRANSACTION_TYPES = [
  'UPI',
  'BANK_TRANSFER',
  'CASH_DEPOSIT',
  'CASH_WITHDRAWAL',
  'CARD',
  'INTERNATIONAL_TRANSFER'
];
