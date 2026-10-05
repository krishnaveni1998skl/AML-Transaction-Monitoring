import React, { useState } from 'react';
import { X, UserPlus, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { customerService } from '../../services/customerService.js';

export const CreateCustomerModal = ({ isOpen, onClose, onCustomerCreated }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '1990-01-01',
    gender: 'MALE',
    countryCode: 'IN',
    city: 'Mumbai',
    state: 'Maharashtra',
    street: '',
    postalCode: '400001',
    occupation: '',
    monthlyIncome: '',
    accountType: 'SAVINGS',
    accountNumber: '',
    kycStatus: 'VERIFIED',
    riskCategory: 'LOW',
    pepStatus: false,
    sanctioned: false,
    previousAlertCount: 0
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.fullName.trim() || formData.fullName.trim().length < 3) {
      errs.fullName = 'Full Name must be at least 3 characters.';
    }
    if (!formData.countryCode.trim() || formData.countryCode.trim().length !== 2) {
      errs.countryCode = 'Country code must be a 2-letter ISO code (e.g. IN, US, GB).';
    }
    if (!formData.occupation.trim()) {
      errs.occupation = 'Occupation is required.';
    }
    if (!formData.monthlyIncome || Number(formData.monthlyIncome) <= 0) {
      errs.monthlyIncome = 'Monthly Income must be a positive number greater than 0.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    try {
      setSubmitting(true);
      const payload = {
        fullName: formData.fullName.trim(),
        dob: formData.dob || '1990-01-01',
        gender: formData.gender,
        address: {
          street: formData.street || '',
          city: formData.city || 'Mumbai',
          state: formData.state || 'Maharashtra',
          countryCode: formData.countryCode.toUpperCase(),
          postalCode: formData.postalCode || '400001'
        },
        nationality: 'Indian',
        occupation: formData.occupation.trim(),
        monthlyIncome: Number(formData.monthlyIncome),
        accountType: formData.accountType,
        accountNumber: formData.accountNumber.trim() || undefined,
        pepStatus: formData.pepStatus,
        sanctioned: formData.sanctioned,
        kycStatus: formData.kycStatus,
        riskCategory: formData.riskCategory,
        previousAlertCount: Number(formData.previousAlertCount || 0)
      };

      const res = await customerService.createCustomer(payload);
      if (res.success) {
        if (onCustomerCreated) {
          onCustomerCreated(res.data);
        }
        handleResetAndClose();
      } else {
        setApiError(res.message || 'Failed to create customer record.');
      }
    } catch (err) {
      console.error('Failed to create customer:', err);
      setApiError(err.response?.data?.message || err.message || 'Error creating customer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setApiError('');
    setErrors({});
    setFormData({
      fullName: '',
      dob: '1990-01-01',
      gender: 'MALE',
      countryCode: 'IN',
      city: 'Mumbai',
      state: 'Maharashtra',
      street: '',
      postalCode: '400001',
      occupation: '',
      monthlyIncome: '',
      accountType: 'SAVINGS',
      accountNumber: '',
      kycStatus: 'VERIFIED',
      riskCategory: 'LOW',
      pepStatus: false,
      sanctioned: false,
      previousAlertCount: 0
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Add Customer / Customer Entry</h3>
              <p className="text-[11px] text-slate-400">Register new customer profile into AML monitoring scope.</p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {apiError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Row 1: Basic Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Full Customer Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Vikramaditya Sharma"
                className={`w-full bg-slate-950 border ${
                  errors.fullName ? 'border-rose-500' : 'border-slate-800'
                } rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500`}
              />
              {errors.fullName && <p className="text-[10px] text-rose-400 mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Country Code (ISO-2) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                maxLength={2}
                value={formData.countryCode}
                onChange={(e) => setFormData({ ...formData, countryCode: e.target.value.toUpperCase() })}
                placeholder="IN"
                className={`w-full bg-slate-950 border ${
                  errors.countryCode ? 'border-rose-500' : 'border-slate-800'
                } rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 uppercase focus:outline-none focus:border-indigo-500`}
              />
              {errors.countryCode && <p className="text-[10px] text-rose-400 mt-1">{errors.countryCode}</p>}
            </div>
          </div>

          {/* Row 2: Occupation & Monthly Income */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Occupation / Business Activity <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                placeholder="e.g. Export Merchant / Software Architect"
                className={`w-full bg-slate-950 border ${
                  errors.occupation ? 'border-rose-500' : 'border-slate-800'
                } rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500`}
              />
              {errors.occupation && <p className="text-[10px] text-rose-400 mt-1">{errors.occupation}</p>}
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Declared Monthly Income (INR) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.monthlyIncome}
                onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
                placeholder="e.g. 250000"
                className={`w-full bg-slate-950 border ${
                  errors.monthlyIncome ? 'border-rose-500' : 'border-slate-800'
                } rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500`}
              />
              {errors.monthlyIncome && <p className="text-[10px] text-rose-400 mt-1">{errors.monthlyIncome}</p>}
            </div>
          </div>

          {/* Row 3: Account Type & Account Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Account Type</label>
              <select
                value={formData.accountType}
                onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="SAVINGS">Savings Account</option>
                <option value="CURRENT">Current / Business Account</option>
                <option value="CORPORATE">Corporate Account</option>
                <option value="NRI">Non-Resident Indian (NRI)</option>
                <option value="WALLET">Digital Wallet</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Account Number Identifier (Optional, auto-generated if blank)
              </label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder="e.g. ACC-4001-998877"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Row 4: KYC Status & Initial Risk Rating */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">KYC Status</label>
              <select
                value={formData.kycStatus}
                onChange={(e) => setFormData({ ...formData, kycStatus: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="VERIFIED">Verified (Full KYC)</option>
                <option value="PENDING">Pending Verification</option>
                <option value="EXPIRED">Re-KYC Expired</option>
                <option value="REJECTED">Rejected / Incomplete</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Risk Classification</label>
              <select
                value={formData.riskCategory}
                onChange={(e) => setFormData({ ...formData, riskCategory: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="LOW">Low Risk</option>
                <option value="MEDIUM">Medium Risk</option>
                <option value="HIGH">High Risk</option>
                <option value="CRITICAL">Critical Risk</option>
              </select>
            </div>
          </div>

          {/* Row 5: AML Risk Indicators */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
            <span className="font-semibold text-slate-300">AML Risk Screening Attributes:</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.pepStatus}
                  onChange={(e) => setFormData({ ...formData, pepStatus: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Politically Exposed Person (PEP)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.sanctioned}
                  onChange={(e) => setFormData({ ...formData, sanctioned: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-rose-600 focus:ring-0"
                />
                <span>Sanctions Watchlist Match</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Prior Alerts:</span>
                <input
                  type="number"
                  min="0"
                  value={formData.previousAlertCount}
                  onChange={(e) => setFormData({ ...formData, previousAlertCount: Number(e.target.value) })}
                  className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-center"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleResetAndClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Creating Customer...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Submit Customer Profile
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCustomerModal;
