import mongoose from 'mongoose';

const ruleHitSchema = new mongoose.Schema(
  {
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AMLRule',
      required: true
    },
    ruleCode: {
      type: String,
      required: true,
      index: true
    },
    ruleName: {
      type: String,
      required: true
    },
    transactionId: {
      type: String,
      required: true,
      index: true
    },
    customerId: {
      type: String,
      required: true,
      index: true
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true
    },
    scoreContribution: {
      type: Number,
      required: true,
      default: 0
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

ruleHitSchema.index({ customerId: 1, timestamp: -1 });
ruleHitSchema.index({ ruleCode: 1, timestamp: -1 });

export const RuleHit = mongoose.model('RuleHit', ruleHitSchema);
export default RuleHit;
