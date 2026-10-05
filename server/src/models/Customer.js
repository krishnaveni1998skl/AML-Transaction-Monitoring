import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    dob: {
      type: Date,
      required: true
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER'],
      default: 'OTHER'
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: 'Mumbai' },
      state: { type: String, default: 'Maharashtra' },
      countryCode: { type: String, default: 'IN', uppercase: true, index: true },
      postalCode: { type: String, default: '400001' }
    },
    nationality: {
      type: String,
      default: 'Indian'
    },
    occupation: {
      type: String,
      required: true,
      trim: true
    },
    monthlyIncome: {
      type: Number,
      required: true,
      min: 0
    },
    accountType: {
      type: String,
      enum: ['SAVINGS', 'CURRENT', 'NRI', 'CORPORATE', 'WALLET'],
      default: 'SAVINGS',
      required: true
    },
    accountNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    pepStatus: {
      type: Boolean,
      default: false,
      index: true
    },
    sanctioned: {
      type: Boolean,
      default: false,
      index: true
    },
    kycStatus: {
      type: String,
      enum: ['VERIFIED', 'PENDING', 'EXPIRED', 'REJECTED'],
      default: 'VERIFIED',
      index: true
    },
    riskCategory: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW',
      index: true
    },
    customerRiskScore: {
      type: Number,
      default: 15,
      min: 0,
      max: 100
    },
    previousAlertCount: {
      type: Number,
      default: 0
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

customerSchema.index({ riskCategory: 1, customerRiskScore: -1 });

export const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
