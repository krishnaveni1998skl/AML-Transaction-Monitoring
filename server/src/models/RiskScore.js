import mongoose from 'mongoose';

const riskScoreSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ['TRANSACTION', 'CUSTOMER'],
      required: true,
      index: true
    },
    entityId: {
      type: String,
      required: true,
      index: true
    },
    overallScore: {
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
    scoreBreakdown: {
      transactionRisk: { type: Number, default: 0 },
      customerRisk: { type: Number, default: 0 },
      countryRisk: { type: Number, default: 0 },
      velocityRisk: { type: Number, default: 0 },
      alertHistoryRisk: { type: Number, default: 0 }
    },
    explanations: [
      {
        type: String
      }
    ],
    evaluatedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

riskScoreSchema.index({ entityType: 1, entityId: 1, evaluatedAt: -1 });

export const RiskScore = mongoose.model('RiskScore', riskScoreSchema);
export default RiskScore;
