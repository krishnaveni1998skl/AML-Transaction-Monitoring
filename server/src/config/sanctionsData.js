/**
 * AML Reference Data: FATF Corridors, High Risk Occupations, and Standard FX Rates (Base: INR)
 * Used by PreprocessingPipeline, RuleEngine, and RiskScoringEngine.
 */

export const FATF_BLACKLIST = [
  { code: 'KP', name: 'Democratic People\'s Republic of Korea', riskScore: 95 },
  { code: 'IR', name: 'Iran', riskScore: 95 },
  { code: 'MM', name: 'Myanmar', riskScore: 90 }
];

export const FATF_GREYLIST = [
  { code: 'SY', name: 'Syria', riskScore: 75 },
  { code: 'YE', name: 'Yemen', riskScore: 75 },
  { code: 'SS', name: 'South Sudan', riskScore: 70 },
  { code: 'ML', name: 'Mali', riskScore: 65 },
  { code: 'HT', name: 'Haiti', riskScore: 65 },
  { code: 'PA', name: 'Panama', riskScore: 60 },
  { code: 'KY', name: 'Cayman Islands', riskScore: 60 },
  { code: 'VG', name: 'British Virgin Islands', riskScore: 60 },
  { code: 'NG', name: 'Nigeria', riskScore: 55 },
  { code: 'ZA', name: 'South Africa', riskScore: 50 },
  { code: 'AE', name: 'United Arab Emirates', riskScore: 40 }
];

export const HIGH_RISK_OCCUPATIONS = [
  { name: 'Gems & Jewelry Dealer', riskScore: 70, cashIntensive: true },
  { name: 'Casino / Gaming Operator', riskScore: 85, cashIntensive: true },
  { name: 'Foreign Currency Exchange Dealer', riskScore: 80, cashIntensive: true },
  { name: 'Cryptocurrency / Virtual Asset Broker', riskScore: 75, cashIntensive: false },
  { name: 'Real Estate Developer / Agent', riskScore: 65, cashIntensive: true },
  { name: 'Import / Export Trader', riskScore: 60, cashIntensive: false },
  { name: 'Politically Exposed Person (PEP)', riskScore: 90, cashIntensive: false },
  { name: 'Non-Profit / NGO Trustee', riskScore: 55, cashIntensive: true },
  { name: 'Arms / Defense Consultant', riskScore: 90, cashIntensive: false }
];

// Baseline reference exchange rates to INR (₹)
export const FX_RATES_TO_INR = {
  INR: 1.0,
  USD: 87.0,
  EUR: 92.5,
  GBP: 110.0,
  AED: 23.7,
  SGD: 65.0,
  HKD: 11.1
};

// Synthetic Sanctioned Names / Watchlist (for demonstration and deterministic screening)
export const SANCTIONS_WATCHLIST = [
  'ALEXEI VOLKOV',
  'TARIQ AL-MANSOOR',
  'KIM JONG CHOL',
  'VIKTOR BOUT ENTERPRISES',
  'GOLDEN TRIANGLE TRADING CO',
  'NORTHERN STAR MARITIME',
  'CYBER SHADOW NETWORK'
];
