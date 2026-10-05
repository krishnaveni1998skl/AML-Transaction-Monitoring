import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldAlert,
  AlertTriangle,
  CreditCard,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  DollarSign,
  Briefcase,
  MapPin,
  Calendar,
  Layers,
  Activity,
  UserPlus,
  RefreshCw,
  Network
} from 'lucide-react';
import { customerService } from '../services/customerService.js';
import { CreateCustomerModal } from '../components/customer/CreateCustomerModal.jsx';
import { AddTransactionModal } from '../components/transaction/AddTransactionModal.jsx';
import { formatINR, formatDateTime } from '../utils/formatters.js';

export const CustomerDetailPage = ({
  initialCustomerId = null,
  onSelectAlert = null,
  onOpenNetworkGraph = null,
  onBack = null
}) => {
  const [customersList, setCustomersList] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId || '');
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);

  // Transaction filter state
  const [txTypeFilter, setTxTypeFilter] = useState('ALL');
  const [txSearch, setTxSearch] = useState('');

  // 1. Fetch available customers list on mount
  useEffect(() => {
    const loadCustomersList = async () => {
      try {
        const res = await customerService.getCustomers({ limit: 100 });
        if (res.success && res.data.customers.length > 0) {
          setCustomersList(res.data.customers);
          if (!selectedCustomerId) {
            setSelectedCustomerId(res.data.customers[0].customerId);
          }
        }
      } catch (err) {
        console.error('Failed to load customers list:', err);
      }
    };
    loadCustomersList();
  }, []);

  // Update selectedCustomerId if initialCustomerId changes
  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
    }
  }, [initialCustomerId]);

  // 2. Fetch selected customer details
  const fetchCustomerDetails = async (custId) => {
    if (!custId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await customerService.getCustomerById(custId);
      if (res.success) {
        setCustomerData(res.data);
      } else {
        setError(res.message || 'Failed to retrieve customer record.');
      }
    } catch (err) {
      console.error('Error fetching customer details:', err);
      setError(err.message || 'Error fetching customer profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerDetails(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const cust = customerData?.customer;
  const txs = customerData?.transactions || [];
  const alerts = customerData?.alerts || [];
  const metrics = customerData?.metrics;

  // Filter transactions
  const filteredTransactions = txs.filter((tx) => {
    const matchesType = txTypeFilter === 'ALL' || tx.transactionType === txTypeFilter;
    const matchesSearch =
      !txSearch ||
      tx.transactionId?.toLowerCase().includes(txSearch.toLowerCase()) ||
      tx.destinationAccountId?.toLowerCase().includes(txSearch.toLowerCase()) ||
      tx.sourceAccountId?.toLowerCase().includes(txSearch.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Determine High-Risk Country indicator
  const isHighRiskCountry = (countryCode) => {
    const highRiskCountries = ['KP', 'IR', 'MM', 'SY', 'YE', 'AF', 'RU'];
    return highRiskCountries.includes((countryCode || '').toUpperCase());
  };

  const getRiskBadgeColor = (category) => {
    switch (category) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Top Header & Customer Selector Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition"
              title="Return"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Customer Risk Profile & KYC Dossier
            </h2>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Comprehensive 360° compliance view of customer identity, risk scoring, and financial transactions.
            </p>
          </div>
        </div>

        {/* Customer Selector & Add Customer Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer max-w-[220px] truncate"
            >
              {customersList.map((c) => (
                <option key={c.customerId} value={c.customerId} className="bg-slate-900 text-slate-200">
                  {c.fullName} ({c.customerId})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Customer
          </button>

          <button
            onClick={() => setIsAddTxModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500 hover:text-white text-slate-300 font-semibold transition flex items-center gap-1.5 shadow-sm"
            title="Create a new transaction for this customer"
          >
            <CreditCard className="h-3.5 w-3.5 text-indigo-400" />
            Add Transaction
          </button>

          <button
            onClick={() => fetchCustomerDetails(selectedCustomerId)}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50"
            title="Refresh Dossier"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400 space-y-3">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-400" />
          <p className="text-xs">Loading customer risk profile...</p>
        </div>
      ) : error || !cust ? (
        <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 space-y-2">
          <div className="font-bold">Failed to load customer profile</div>
          <div>{error || 'Customer not found.'}</div>
        </div>
      ) : (
        <>
          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total Volume (INR)</span>
              <div className="text-lg font-bold font-mono text-white">{formatINR(metrics?.totalVolumeINR || 0)}</div>
              <span className="text-[10px] text-slate-500">Gross monitored flow</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total Transactions</span>
              <div className="text-lg font-bold font-mono text-slate-200">{metrics?.totalTransactions || 0}</div>
              <span className="text-[10px] text-slate-500">Inbound & outbound</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Suspicious Transactions</span>
              <div className="text-lg font-bold font-mono text-rose-400">{metrics?.suspiciousTxCount || 0}</div>
              <span className="text-[10px] text-slate-500">Flagged by AML rules</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Compliance Alerts</span>
              <div className="text-lg font-bold font-mono text-amber-400">{metrics?.alertCount || 0}</div>
              <span className="text-[10px] text-slate-500">Generated for investigation</span>
            </div>
          </div>

          {/* Section 1 & Section 2 Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ========================================================= */}
            {/* 1. CUSTOMER / KYC INFORMATION */}
            {/* ========================================================= */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">1. Customer & KYC Information</h3>
                    <p className="text-[11px] text-slate-400">Verified core banking and identity records</p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  {cust.customerId}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block text-[11px]">Customer Full Name</span>
                  <p className="font-semibold text-white text-sm mt-0.5">{cust.fullName}</p>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">KYC Verification Status</span>
                  <div className="mt-0.5">
                    {cust.kycStatus === 'VERIFIED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <CheckCircle2 className="h-3 w-3" /> VERIFIED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        <AlertCircle className="h-3 w-3" /> {cust.kycStatus}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Account Number</span>
                  <p className="font-mono font-medium text-slate-200 mt-0.5">{cust.accountNumber || 'N/A'}</p>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Account Type</span>
                  <p className="font-medium text-slate-200 mt-0.5">{cust.accountType}</p>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Occupation / Business</span>
                  <p className="font-medium text-slate-200 mt-0.5 flex items-center gap-1">
                    <Briefcase className="h-3 w-3 text-slate-500" />
                    {cust.occupation}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Declared Monthly Income</span>
                  <p className="font-mono font-medium text-emerald-400 mt-0.5">
                    {formatINR(cust.monthlyIncome)}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Country & Nationality</span>
                  <p className="font-medium text-slate-200 mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-500" />
                    {cust.nationality} ({cust.address?.countryCode || 'IN'})
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Residential Jurisdiction</span>
                  <p className="font-medium text-slate-200 mt-0.5 truncate">
                    {cust.address?.city}, {cust.address?.state}
                  </p>
                </div>
              </div>

              {onOpenNetworkGraph && (
                <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                  <button
                    onClick={() => onOpenNetworkGraph(cust.accountNumber || cust.customerId)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 transition text-xs font-semibold"
                  >
                    <Network className="h-3.5 w-3.5" />
                    Explore Network Graph
                  </button>
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* 2. AML / RISK INFORMATION */}
            {/* ========================================================= */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">2. AML & Risk Assessment</h3>
                    <p className="text-[11px] text-slate-400">Continuous risk rating and regulatory indicators</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded text-[11px] font-bold border ${getRiskBadgeColor(cust.riskCategory)}`}>
                    {cust.riskCategory} RISK
                  </span>
                </div>
              </div>

              {/* Risk Score & Indicator Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Customer Risk Score</span>
                  <div className="text-2xl font-black font-mono text-white mt-1">
                    {cust.customerRiskScore}
                    <span className="text-xs text-slate-500 font-normal">/100</span>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">PEP Status</span>
                  <div className="mt-1.5">
                    {cust.pepStatus ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        PEP CONFIRMED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                        Non-PEP
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Sanctions Watchlist</span>
                  <div className="mt-1.5">
                    {cust.sanctioned ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                        SANCTIONS MATCH
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        CLEAN (NO HIT)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Secondary Indicators */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px] block">High-Risk Country Corridor</span>
                  <div className="flex items-center gap-1.5">
                    {isHighRiskCountry(cust.address?.countryCode) ? (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> High Risk Jurisdiction
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Standard FATF Jurisdiction ({cust.address?.countryCode || 'IN'})
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px] block">Prior Suspicious Activity</span>
                  <div className="font-mono font-bold text-amber-400 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {cust.previousAlertCount || 0} historical alert incident(s)
                  </div>
                </div>
              </div>

              {/* Associated Alerts List */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <span className="font-semibold text-slate-300 text-[11px] block">
                  Associated Alerts ({alerts.length}):
                </span>
                {alerts.length === 0 ? (
                  <p className="text-slate-500 italic">No alerts currently flagged for this customer.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {alerts.map((alt) => (
                      <div
                        key={alt._id}
                        onClick={() => onSelectAlert && onSelectAlert(alt.alertId)}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-400 group-hover:text-indigo-300">
                            {alt.alertId}
                          </span>
                          <span className="text-[10px] text-slate-400">{formatINR(alt.normalizedAmountINR)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${getRiskBadgeColor(alt.riskLevel)}`}>
                            {alt.priority}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 3. TRANSACTION HISTORY */}
          {/* ========================================================= */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-600/20 text-sky-400 border border-sky-500/30">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">3. Financial Transaction History</h3>
                  <p className="text-[11px] text-slate-400">Complete transaction ledger matching supported AML banking channels</p>
                </div>
              </div>

              {/* Transaction Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder="Search Tx ID, Account..."
                    className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>

                <select
                  value={txTypeFilter}
                  onChange={(e) => setTxTypeFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                >
                  <option value="ALL">All Transaction Types</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH_DEPOSIT">Cash Deposit</option>
                  <option value="CASH_WITHDRAWAL">Cash Withdrawal</option>
                  <option value="INTERNATIONAL_TRANSFER">International Transfer</option>
                  <option value="CARD">Card</option>
                </select>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="pb-3 px-3">Transaction ID</th>
                    <th className="pb-3 px-3">Date / Time</th>
                    <th className="pb-3 px-3">Type & Channel</th>
                    <th className="pb-3 px-3">Direction</th>
                    <th className="pb-3 px-3">Amount (INR)</th>
                    <th className="pb-3 px-3">Counterparty Account</th>
                    <th className="pb-3 px-3">Risk & Status</th>
                    <th className="pb-3 px-3">Rule Hits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No transactions recorded matching the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx._id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-3 font-mono font-bold text-slate-300">
                          {tx.transactionId}
                        </td>

                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                          {formatDateTime(tx.timestamp)}
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-200 block">
                            {tx.transactionType?.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-slate-500">{tx.channel}</span>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              tx.direction === 'CREDIT'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            {tx.direction}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono font-bold text-white">
                          {formatINR(tx.normalizedAmountINR)}
                          {tx.currency && tx.currency !== 'INR' && (
                            <span className="block text-[10px] text-slate-500 font-normal">
                              ({tx.amount} {tx.currency})
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                          {tx.destinationAccountId || tx.sourceAccountId || 'N/A'}
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ${
                                tx.isSuspicious
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              }`}
                            >
                              {tx.isSuspicious ? 'SUSPICIOUS' : 'NORMAL'}
                            </span>
                            <span className="font-mono text-slate-400 text-[11px]">
                              {tx.riskScore}/100
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {tx.ruleHits && tx.ruleHits.length > 0 ? (
                              tx.ruleHits.map((h, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-300 border border-slate-700 truncate max-w-[120px]"
                                  title={h.ruleName}
                                >
                                  {h.ruleCode || h.ruleName}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-600 text-[11px]">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Customer Creation Modal */}
      <CreateCustomerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCustomerCreated={(newCustomer) => {
          setCustomersList((prev) => [newCustomer, ...prev]);
          setSelectedCustomerId(newCustomer.customerId);
        }}
      />

      {/* Add Transaction Modal Preselected with Customer */}
      <AddTransactionModal
        isOpen={isAddTxModalOpen}
        onClose={() => setIsAddTxModalOpen(false)}
        initialCustomerId={cust?.customerId || selectedCustomerId}
        initialAccountId={cust?.accountNumber || ''}
        onTransactionCreated={() => {
          if (selectedCustomerId) {
            fetchCustomerDetails(selectedCustomerId);
          }
        }}
        onViewAlert={(alertId) => {
          setIsAddTxModalOpen(false);
          if (onSelectAlert) {
            onSelectAlert(alertId);
          }
        }}
      />
    </div>
  );
};

export default CustomerDetailPage;
