import { FX_RATES_TO_INR } from '../config/sanctionsData.js';
import { logger } from './logger.js';

/**
 * Normalizes an amount in any supported currency to Base INR (₹)
 * @param {number} amount - Raw transaction amount
 * @param {string} currency - 3-letter currency code (e.g. INR, USD, EUR)
 * @returns {number} Normalized amount in INR rounded to 2 decimal places
 */
export const normalizeToINR = (amount, currency = 'INR') => {
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    throw new Error(`Invalid transaction amount: ${amount}`);
  }

  const curr = (currency || 'INR').toUpperCase().trim();
  const rate = FX_RATES_TO_INR[curr];

  if (!rate) {
    logger.warn(`Unknown currency '${curr}'. Defaulting 1:1 conversion to INR.`);
    return Math.round(amount * 100) / 100;
  }

  return Math.round(amount * rate * 100) / 100;
};

export default normalizeToINR;
