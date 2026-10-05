import mongoose from 'mongoose';

const investigationNoteSchema = new mongoose.Schema(
  {
    alertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Alert',
      required: true,
      index: true
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    authorName: {
      type: String,
      required: true
    },
    noteText: {
      type: String,
      required: true,
      trim: true
    },
    actionTaken: {
      type: String,
      enum: [
        'NOTE_ADDED',
        'ASSIGNED',
        'STATUS_CHANGE',
        'ESCALATED_TO_COMPLIANCE',
        'FLAGGED_AS_SAR',
        'CLOSED_FALSE_POSITIVE',
        'CLOSED_LEGITIMATE'
      ],
      default: 'NOTE_ADDED'
    },
    tags: [
      {
        type: String,
        trim: true
      }
    ],
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

export const InvestigationNote = mongoose.model('InvestigationNote', investigationNoteSchema);
export default InvestigationNote;
