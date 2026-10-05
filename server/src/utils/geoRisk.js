import { FATF_BLACKLIST, FATF_GREYLIST } from '../config/sanctionsData.js';

const blacklistMap = new Map(FATF_BLACKLIST.map((c) => [c.code.toUpperCase(), c]));
const greylistMap = new Map(FATF_GREYLIST.map((c) => [c.code.toUpperCase(), c]));

/**
 * Evaluates the jurisdictional AML risk of a country code
 * @param {string} countryCode - ISO 2-letter country code
 * @returns {object} { riskScore: number, classification: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL', isBlacklisted: boolean, isGreylisted: boolean, countryName: string }
 */
export const evaluateCountryRisk = (countryCode) => {
  if (!countryCode) {
    return { riskScore: 10, classification: 'LOW', isBlacklisted: false, isGreylisted: false, countryName: 'Unknown' };
  }

  const code = countryCode.toUpperCase().trim();

  // 1. FATF Blacklist Check (Critical Risk)
  if (blacklistMap.has(code)) {
    const item = blacklistMap.get(code);
    return {
      riskScore: item.riskScore,
      classification: 'CRITICAL',
      isBlacklisted: true,
      isGreylisted: false,
      countryName: item.name
    };
  }

  // 2. FATF Greylist Check (High/Medium Risk)
  if (greylistMap.has(code)) {
    const item = greylistMap.get(code);
    return {
      riskScore: item.riskScore,
      classification: item.riskScore >= 70 ? 'HIGH' : 'MEDIUM',
      isBlacklisted: false,
      isGreylisted: true,
      countryName: item.name
    };
  }

  // 3. Domestic / Standard Jurisdictions (India: IN)
  if (code === 'IN') {
    return { riskScore: 5, classification: 'LOW', isBlacklisted: false, isGreylisted: false, countryName: 'India' };
  }

  // 4. Standard international corridors (US, UK, EU, etc.)
  return { riskScore: 15, classification: 'LOW', isBlacklisted: false, isGreylisted: false, countryName: code };
};

export default evaluateCountryRisk;
