import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Eye,
  ShieldAlert,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Building2,
  DollarSign
} from 'lucide-react';
import { transactionService } from '../services/transactionService.js';
import { AddTransactionModal } from '../components/transaction/AddTransactionModal.jsx';
import { TransactionDetailModal } from '../components/transaction/TransactionDetailModal.jsx';
import { formatINR, formatDate } from '../utils/formatters.js';

export const TransactionMonitoringPage = ({
  onNavigateToAlerts = null,
  onNavigateToCustomer = null
}) => {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters State
  const [search, setSearch] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [isSuspicious, setIsSuspicious] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);

  const fetchTransactions = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        limit: 20,
        search: search.trim() || undefined,
        transactionType: transactionType || undefined,
        riskLevel: riskLevel || undefined,
        isSuspicious: isSuspicious !== '' ? isSuspicious : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };

      const res = await transactionService.getTransactions(params);
      setTransactions(res.data?.transactions || []);
      if (res.data?.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1);
  }, [transactionType, riskLevel, isSuspicious, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTransactions(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setTransactionType('');
    setRiskLevel('');
    setIsSuspicious('');
    setStartDate('');
    setEndDate('');
    fetchTransactions(1);
  };

  // Metrics summary computed from current result / counts
  const totalCount = pagination.total || 0;
  const suspiciousCount = transactions.filter((t) => t.isSuspicious).length;
  const criticalCount = transactions.filter((t) => t.riskLevel === 'CRITICAL' || t.riskLevel === 'HIGH').length;

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-indigo-400" />
            Transaction Monitoring
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Monitor customer transactions and identify potentially suspicious activity.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Add Transaction</span>
          </button>

          <button
            onClick={() => fetchTransactions(pagination.page)}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50"
            title="Refresh Transactions"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Top Summary Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400">Total Monitored</span>
            <div className="text-2xl font-extrabold text-white font-mono mt-0.5">
              {totalCount.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500">records registered</span>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400">Suspicious Activity</span>
            <div className="text-2xl font-extrabold text-rose-400 font-mono mt-0.5">
              {suspiciousCount} <span className="text-xs text-slate-500 font-normal">in view</span>
            </div>
            <span className="text-[11px] text-rose-400/80">flagged by AML engine</span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400">High / Critical Risk</span>
            <div className="text-2xl font-extrabold text-orange-400 font-mono mt-0.5">
              {criticalCount} <span className="text-xs text-slate-500 font-normal">in view</span>
            </div>
            <span className="text-[11px] text-orange-400/80">elevated priority</span>
          </div>
          <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Transaction ID, Customer Name, Customer ID, or Account..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Transaction Type Filter */}
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Rails / Types</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="CASH_DEPOSIT">Cash Deposit</option>
              <option value="CASH_WITHDRAWAL">Cash Withdrawal</option>
              <option value="INTERNATIONAL_TRANSFER">International Transfer</option>
              <option value="CARD">Card</option>
            </select>

            {/* Risk Level Filter */}
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Risk Levels</option>
              <option value="CRITICAL">Critical Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>

            {/* Suspicious Status Filter */}
            <select
              value={isSuspicious}
              onChange={(e) => setIsSuspicious(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="true">Suspicious Only</option>
              <option value="false">Normal Only</option>
            </select>

            {/* Date Pickers */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <span className="text-[10px] text-slate-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-[11px] text-slate-300 focus:outline-none"
              />
              <span className="text-slate-600">—</span>
              <span className="text-[10px] text-slate-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-[11px] text-slate-300 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-semibold transition"
            >
              Search
            </button>

            {(search || transactionType || riskLevel || isSuspicious || startDate || endDate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition flex items-center gap-1"
                title="Reset Filters"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 4. Transactions Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-xs text-slate-400 font-mono">Loading monitored transactions...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-xs space-y-3">
            <p>{error}</p>
            <button
              onClick={() => fetchTransactions(1)}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-200 text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs space-y-2">
            <p>No transactions found matching the selected filters.</p>
            <button
              onClick={handleResetFilters}
              className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider bg-slate-950/40">
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Accounts (Source ➔ Beneficiary)</th>
                  <th className="py-3 px-4">Type / Channel</th>
                  <th className="py-3 px-4 text-center">Direction</th>
                  <th className="py-3 px-4 text-right">Amount (INR)</th>
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4 text-center">Risk Score</th>
                  <th className="py-3 px-4 text-center">Risk Level</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.map((tx) => (
                  <tr
                    key={tx.transactionId}
                    className="hover:bg-slate-800/40 transition group cursor-pointer"
                    onClick={() => setSelectedTransactionId(tx.transactionId)}
                  >
                    {/* Transaction ID */}
                    <td className="py-3 px-4 font-mono font-semibold text-white group-hover:text-indigo-300 transition whitespace-nowrap">
                      {tx.transactionId}
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200 whitespace-nowrap">
                        {tx.customerName || tx.sourceCustomerId}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {tx.sourceCustomerId}
                      </div>
                    </td>

                    {/* Accounts */}
                    <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                      <div className="text-slate-300">{tx.sourceAccountId}</div>
                      <div className="text-slate-500 flex items-center gap-1">
                        <span>➔</span>
                        <span>{tx.destinationAccountId}</span>
                        {tx.destinationBank && (
                          <span className="text-[10px] text-slate-600 font-sans">({tx.destinationBank})</span>
                        )}
                      </div>
                    </td>

                    {/* Type / Channel */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-slate-200 font-medium">{tx.transactionType}</div>
                      <div className="text-[10px] text-slate-500">{tx.channel}</div>
                    </td>

                    {/* Direction */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                          tx.direction === 'DEBIT'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {tx.direction}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                      <span className="text-white">
                        {formatINR(tx.normalizedAmountINR || tx.amount)}
                      </span>
                      {tx.currency && tx.currency !== 'INR' && (
                        <div className="text-[10px] text-slate-500">
                          {tx.currency} {tx.amount?.toLocaleString()}
                        </div>
                      )}
                    </td>

                    {/* Country */}
                    <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {tx.location?.countryCode || 'IN'}
                    </td>

                    {/* Date / Time */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {formatDate(tx.timestamp)}
                    </td>

                    {/* Risk Score */}
                    <td className="py-3 px-4 text-center font-mono font-bold text-white whitespace-nowrap">
                      {tx.riskScore ?? 0}
                    </td>

                    {/* Risk Level Badge */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          tx.riskLevel === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : tx.riskLevel === 'HIGH'
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                            : tx.riskLevel === 'MEDIUM'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {tx.riskLevel || 'LOW'}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          tx.isSuspicious
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {tx.isSuspicious ? 'SUSPICIOUS' : 'NORMAL'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedTransactionId(tx.transactionId)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition flex items-center gap-1"
                          title="View Transaction Details"
                        >
                          <Eye className="h-3 w-3 text-slate-400" />
                          <span>Details</span>
                        </button>

                        {tx.associatedAlertId && onNavigateToAlerts && (
                          <button
                            onClick={() => onNavigateToAlerts({ alertId: tx.associatedAlertId })}
                            className="px-2.5 py-1 rounded bg-indigo-600/30 border border-indigo-500/40 hover:bg-indigo-600 hover:text-white text-indigo-300 text-[11px] font-semibold transition flex items-center gap-1 shadow-sm"
                            title={`Investigate Alert ${tx.associatedAlertId}`}
                          >
                            <ShieldAlert className="h-3 w-3 text-rose-400" />
                            <span>Alert</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing Page <span className="font-bold text-white">{pagination.page}</span> of{' '}
              <span className="font-bold text-white">{pagination.totalPages}</span> ({pagination.total} transactions)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchTransactions(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <button
                onClick={() => fetchTransactions(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onTransactionCreated={(newTx) => {
          fetchTransactions(1);
        }}
        onViewAlert={(alertId) => {
          setIsAddOpen(false);
          if (onNavigateToAlerts) {
            onNavigateToAlerts({ alertId });
          }
        }}
      />

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        isOpen={!!selectedTransactionId}
        onClose={() => setSelectedTransactionId(null)}
        transactionId={selectedTransactionId}
        onViewAlert={(alertId) => {
          setSelectedTransactionId(null);
          if (onNavigateToAlerts) {
            onNavigateToAlerts({ alertId });
          }
        }}
        onViewCustomer={(customerId) => {
          setSelectedTransactionId(null);
          if (onNavigateToCustomer) {
            onNavigateToCustomer(customerId);
          }
        }}
      />
    </div>
  );
};

export default TransactionMonitoringPage;
