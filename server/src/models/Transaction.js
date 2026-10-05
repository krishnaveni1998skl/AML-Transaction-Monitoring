import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    sourceCustomerId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    sourceAccountId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    destinationCustomerId: {
      type: String,
      trim: true,
      default: null,
      index: true
    },
    destinationAccountId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    destinationBank: {
      type: String,
      default: 'State Bank of India'
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
      uppercase: true,
      trim: true
    },
    normalizedAmountINR: {
      type: Number,
      required: true,
      min: 0,
      index: true
    },
    transactionType: {
      type: String,
      enum: [
        'UPI',
        'BANK_TRANSFER',
        'CASH_DEPOSIT',
        'CASH_WITHDRAWAL',
        'CARD',
        'INTERNATIONAL_TRANSFER'
      ],
      required: true,
      index: true
    },
    direction: {
      type: String,
      enum: ['CREDIT', 'DEBIT'],
      required: true
    },
    channel: {
      type: String,
      enum: ['MOBILE_APP', 'NET_BANKING', 'ATM', 'BRANCH', 'POS'],
      default: 'NET_BANKING'
    },
    location: {
      city: { type: String, default: 'Mumbai' },
      countryCode: { type: String, default: 'IN', uppercase: true, index: true },
      ipAddress: { type: String, default: '127.0.0.1' }
    },
    merchantDetails: {
      merchantId: { type: String, default: null },
      merchantName: { type: String, default: null },
      mccCode: { type: String, default: null }
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true
    },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW',
      index: true
    },
    isSuspicious: {
      type: Boolean,
      default: false,
      index: true
    },
    ruleHits: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RuleHit'
      }
    ],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

transactionSchema.index({ sourceCustomerId: 1, timestamp: -1 });
transactionSchema.index({ sourceAccountId: 1, destinationAccountId: 1, timestamp: -1 });
transactionSchema.index({ isSuspicious: 1, timestamp: -1 });

export const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
