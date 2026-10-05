import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    customerId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    transactionId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    normalizedAmountINR: {
      type: Number,
      required: true
    },
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true
    },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
      index: true
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
      index: true
    },
    triggeredRules: [
      {
        ruleCode: { type: String, required: true },
        ruleName: { type: String, required: true },
        severity: { type: String, required: true },
        scoreContribution: { type: Number, default: 0 },
        details: { type: mongoose.Schema.Types.Mixed, default: {} }
      }
    ],
    status: {
      type: String,
      enum: ['OPEN', 'UNDER_REVIEW', 'ESCALATED', 'CLOSED'],
      default: 'OPEN',
      index: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    sarCandidate: {
      type: Boolean,
      default: false,
      index: true
    },
    sarCaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SARCase',
      default: null
    },
    closingCategory: {
      type: String,
      enum: [
        'FALSE_POSITIVE_SYSTEM_TUNING_NEEDED',
        'VERIFIED_LEGITIMATE_COMMERCIAL_TRANSACTION',
        'KNOWN_EXEMPTION_DOCUMENTED',
        'INVESTIGATION_CONCLUDED_SAR_FILED',
        'OTHER'
      ],
      default: null
    },
    closingRemarks: {
      type: String,
      default: null
    },
    closedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

alertSchema.index({ status: 1, priority: 1, createdAt: -1 });
alertSchema.index({ customerId: 1, createdAt: -1 });

export const Alert = mongoose.model('Alert', alertSchema);
export default Alert;
