import mongoose from 'mongoose';

const sarCaseSchema = new mongoose.Schema(
  {
    caseId: {
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
    alertIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alert'
      }
    ],
    transactionIds: [
      {
        type: String,
        required: true
      }
    ],
    totalSuspiciousAmountINR: {
      type: Number,
      required: true,
      min: 0
    },
    caseStatus: {
      type: String,
      enum: ['DRAFT', 'UNDER_COMPLIANCE_REVIEW', 'APPROVED_SAR', 'REJECTED', 'ARCHIVED'],
      default: 'DRAFT',
      index: true
    },
    narrativeSummary: {
      type: String,
      required: true,
      trim: true
    },
    typology: {
      type: String,
      enum: [
        'STRUCTURING_SMURFING',
        'RAPID_LAYERING',
        'SANCTION_EVASION',
        'ROUND_TRIPPING',
        'TERROR_FINANCING_RISK',
        'UNEXPLAINED_WEALTH'
      ],
      required: true
    },
    complianceOfficerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const SARCase = mongoose.model('SARCase', sarCaseSchema);
export default SARCase;
