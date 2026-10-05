import { z } from 'zod';
import { Customer, Transaction } from '../models/index.js';
import { normalizeToINR } from '../utils/currency.js';
import { evaluateCountryRisk } from '../utils/geoRisk.js';
import { SANCTIONS_WATCHLIST } from '../config/sanctionsData.js';
import { logger } from '../utils/logger.js';

// Strict schema for incoming transaction ingestion
export const transactionIngestSchema = z.object({
  transactionId: z.string().min(3).max(64).optional(),
  sourceCustomerId: z.string().min(3),
  sourceAccountId: z.string().min(3),
  destinationCustomerId: z.string().nullable().optional(),
  destinationAccountId: z.string().min(3),
  destinationBank: z.string().optional().default('State Bank of India'),
  amount: z.number().positive('Transaction amount must be strictly greater than 0'),
  currency: z.string().min(3).max(3).default('INR'),
  transactionType: z.enum([
    'UPI',
    'BANK_TRANSFER',
    'CASH_DEPOSIT',
    'CASH_WITHDRAWAL',
    'CARD',
    'INTERNATIONAL_TRANSFER'
  ]),
  direction: z.enum(['CREDIT', 'DEBIT']),
  channel: z.enum(['MOBILE_APP', 'NET_BANKING', 'ATM', 'BRANCH', 'POS']).default('NET_BANKING'),
  location: z
    .object({
      city: z.string().optional().default('Mumbai'),
      countryCode: z.string().length(2).optional().default('IN'),
      ipAddress: z.string().optional().default('127.0.0.1')
    })
    .optional()
    .default({ city: 'Mumbai', countryCode: 'IN', ipAddress: '127.0.0.1' }),
  merchantDetails: z
    .object({
      merchantId: z.string().nullable().optional(),
      merchantName: z.string().nullable().optional(),
      mccCode: z.string().nullable().optional()
    })
    .optional(),
  timestamp: z.string().or(z.date()).optional()
});

/**
 * Preprocessing & Enrichment Pipeline
 */
export class PreprocessingPipeline {
  /**
   * Validates, dedupes, normalizes, and enriches a transaction payload
   * @param {object} rawPayload - Raw incoming transaction data
   * @returns {Promise<object>} Enriched transaction context
   */
  static async process(rawPayload) {
    // 1. Schema Validation
    const parseResult = transactionIngestSchema.safeParse(rawPayload);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new Error(`Transaction Validation Failed: ${issues}`);
    }

    const txData = parseResult.data;

    // Auto-generate transactionId if missing
    if (!txData.transactionId) {
      txData.transactionId = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // 2. Duplicate Detection
    const existing = await Transaction.findOne({ transactionId: txData.transactionId }).lean();
    if (existing) {
      throw new Error(`Duplicate Transaction Detected: '${txData.transactionId}' already exists in system.`);
    }

    // 3. Customer Profile Verification & Retrieval
    const customer = await Customer.findOne({ customerId: txData.sourceCustomerId });
    if (!customer) {
      throw new Error(`Unknown Customer: Source customer ID '${txData.sourceCustomerId}' does not exist.`);
    }

    // 4. Currency & Amount Normalization (Base: INR)
    const normalizedAmountINR = normalizeToINR(txData.amount, txData.currency);

    // 5. Jurisdictional / Geographic Risk Evaluation
    const countryCode = txData.location?.countryCode || 'IN';
    const geoRisk = evaluateCountryRisk(countryCode);

    // 6. Sanctions & Watchlist Screening
    const customerNameUpper = (customer.fullName || '').toUpperCase();
    const destinationBankUpper = (txData.destinationBank || '').toUpperCase();
    const merchantNameUpper = (txData.merchantDetails?.merchantName || '').toUpperCase();

    let sanctionsHit = false;
    let sanctionsMatchDetails = null;

    for (const entry of SANCTIONS_WATCHLIST) {
      if (
        customerNameUpper.includes(entry) ||
        destinationBankUpper.includes(entry) ||
        merchantNameUpper.includes(entry)
      ) {
        sanctionsHit = true;
        sanctionsMatchDetails = {
          matchedEntity: entry,
          watchlist: 'OFAC / UN Global Sanctions Watchlist'
        };
        break;
      }
    }

    // If customer record already marked as sanctioned, propagate
    if (customer.sanctioned) {
      sanctionsHit = true;
      sanctionsMatchDetails = {
        matchedEntity: customer.fullName,
        watchlist: 'Customer KYC Sanction Record'
      };
    }

    const parsedTimestamp = txData.timestamp ? new Date(txData.timestamp) : new Date();

    return {
      transaction: {
        ...txData,
        normalizedAmountINR,
        timestamp: parsedTimestamp
      },
      customer,
      geoRisk,
      sanctionsHit,
      sanctionsMatchDetails
    };
  }
}

export default PreprocessingPipeline;
