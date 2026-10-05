import mongoose from 'mongoose';

const amlRuleSchema = new mongoose.Schema(
  {
    ruleCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: [
        'THRESHOLD',
        'VELOCITY',
        'STRUCTURING',
        'RAPID_FLOW',
        'HIGH_RISK_GEO',
        'BEHAVIORAL',
        'SANCTIONS',
        'LAYERING',
        'ROUND_AMOUNT',
        'UNUSUAL_HOURS',
        'FAN_IN_FAN_OUT'
      ],
      required: true,
      index: true
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
      required: true,
      index: true
    },
    weight: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
      default: 20
    },
    parameters: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {}
    },
    isEnabled: {
      type: Boolean,
      default: true,
      index: true
    },
    isSystemRule: {
      type: Boolean,
      default: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

export const AMLRule = mongoose.model('AMLRule', amlRuleSchema);
export default AMLRule;
