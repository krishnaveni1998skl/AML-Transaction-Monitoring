import React, { useState, useEffect } from 'react';
import {
  Activity,
  CreditCard,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  Download,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { dashboardService } from '../services/dashboardService.js';
import { KPICard } from '../components/dashboard/KPICard.jsx';
import { AlertTrendsChart } from '../components/dashboard/AlertTrendsChart.jsx';
import { RiskDistributionPieChart } from '../components/dashboard/RiskDistributionPieChart.jsx';
import { TopRulesBarChart } from '../components/dashboard/TopRulesBarChart.jsx';
import { TopRiskEntitiesTable } from '../components/dashboard/TopRiskEntitiesTable.jsx';
import { DateRangeSelector } from '../components/dashboard/DateRangeSelector.jsx';
import { ExportReportModal } from '../components/dashboard/ExportReportModal.jsx';
import { formatINR, formatCompactINR } from '../utils/formatters.js';

export const ExecutiveDashboardPage = ({
  onNavigateToAlerts = null,
  onNavigateToSAR = null,
  onNavigateToNetwork = null,
  onNavigateToCustomer = null
}) => {
  const [dateRange, setDateRange] = useState({ range: '30d', startDate: null, endDate: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data states
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [distributions, setDistributions] = useState(null);
  const [ruleStats, setRuleStats] = useState({ topRules: [], totalHits: 0 });
  const [workload, setWorkload] = useState({ investigatorWorkload: [], unassignedAlertsCount: 0 });
  const [topEntities, setTopEntities] = useState([]);

  // Modal state
  const [isExportOpen, setIsExportOpen] = useState(false);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('aml_auth_token');
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const params = {
        range: dateRange.range,
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined
      };

      const [
        overviewRes,
        trendsRes,
        distRes,
        rulesRes,
        workloadRes,
        entitiesRes
      ] = await Promise.all([
        dashboardService.getOverview(params),
        dashboardService.getTrends(params),
        dashboardService.getDistributions(params),
        dashboardService.getRules(params),
        dashboardService.getWorkload(params),
        dashboardService.getTopEntities(params)
      ]);

      if (overviewRes.success) setOverview(overviewRes.data);
      if (trendsRes.success) setTrends(trendsRes.data.timeline || []);
      if (distRes.success) setDistributions(distRes.data);
      if (rulesRes.success) setRuleStats(rulesRes.data);
      if (workloadRes.success) setWorkload(workloadRes.data);
      if (entitiesRes.success) setTopEntities(entitiesRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Error loading dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const k = overview?.kpis;

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. DASHBOARD HEADER: Period Selector, Export Report, Refresh Controls   */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-400" />
            Executive AML Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time compliance monitoring, transaction velocity, risk distributions, and analyst workload.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <DateRangeSelector
            activeRange={dateRange.range}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChangeRange={(newRange) => setDateRange(newRange)}
          />

          <button
            onClick={() => setIsExportOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500 hover:text-white text-slate-300 font-semibold text-xs transition flex items-center gap-1.5 shadow-sm"
          >
            <Download className="h-3.5 w-3.5 text-indigo-400" />
            Export Report
          </button>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50"
            title="Refresh Metrics"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>Failed to refresh dashboard: {error}</span>
          <button
            onClick={fetchDashboardData}
            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 font-semibold text-rose-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EXISTING 6 KPI CARDS (Open Alerts & Internal SAR Cases removed)        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPICard
          title="Monitored Transactions"
          value={loading ? '...' : (k?.totalTransactions ?? 0).toLocaleString()}
          subvalue={loading ? '' : `Vol: ${formatCompactINR(k?.totalVolumeINR || 0)}`}
          subtitle={`Avg Amount: ${formatINR(k?.avgAmountINR || 0)}`}
          icon={CreditCard}
          badgeText="Active Monitoring"
          badgeColor="bg-sky-500/20 text-sky-300"
          accentColor="text-sky-400"
        />

        <KPICard
          title="Suspicious Turnover"
          value={loading ? '...' : formatCompactINR(k?.suspiciousVolumeINR || 0)}
          subvalue={loading ? '' : `${k?.suspiciousTransactionCount || 0} Txns`}
          subtitle={`${k?.suspiciousVolumePercentage || 0}% of gross turnover`}
          icon={AlertTriangle}
          badgeText={k?.suspiciousVolumePercentage > 10 ? 'Elevated' : 'Normal'}
          badgeColor={k?.suspiciousVolumePercentage > 10 ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}
          accentColor="text-rose-400"
        />

        <KPICard
          title="Escalated Alerts"
          value={loading ? '...' : (k?.escalatedAlerts ?? 0).toString()}
          subvalue={loading ? '' : `${k?.highCriticalAlerts || 0} High/Critical`}
          subtitle="Pending compliance review & disposition"
          icon={Activity}
          badgeText="Escalated"
          badgeColor="bg-rose-500/20 text-rose-300"
          accentColor="text-rose-400"
          onClick={() => onNavigateToAlerts && onNavigateToAlerts({ status: 'ESCALATED' })}
          clickableText="Review escalated alerts"
        />

        <KPICard
          title="Active Investigations"
          value={loading ? '...' : (k?.activeInvestigations ?? 0).toString()}
          subvalue={loading ? '' : `${k?.underReviewAlerts || 0} in review`}
          subtitle="Caseload across active AML investigators"
          icon={Clock}
          accentColor="text-indigo-400"
          onClick={() => onNavigateToAlerts && onNavigateToAlerts({ status: 'UNDER_REVIEW' })}
          clickableText="View ongoing investigations"
        />

        <KPICard
          title="Closed Alerts"
          value={loading ? '...' : (k?.closedAlerts ?? 0).toString()}
          subvalue={loading ? '' : `${k?.totalAlerts > 0 ? Math.round(((k?.closedAlerts || 0) / k?.totalAlerts) * 100) : 0}% resolved`}
          subtitle="Concluded with verified audit remarks"
          icon={CheckCircle2}
          accentColor="text-emerald-400"
          onClick={() => onNavigateToAlerts && onNavigateToAlerts({ status: 'CLOSED' })}
          clickableText="View closure audit register"
        />

        <KPICard
          title="Avg Transaction Risk"
          value={loading ? '...' : `${k?.avgRiskScore || 0}`}
          subvalue="/ 100"
          subtitle={`${k?.totalCustomers || 0} KYC customer profiles monitored`}
          icon={Users}
          accentColor="text-cyan-400"
          onClick={() => onNavigateToCustomer && onNavigateToCustomer()}
          clickableText="View customer profiles"
        />
      </div>

      {/* ========================================================================= */}
      {/* 3. TOP HIGH-RISK CUSTOMER ENTITIES (Existing Table Layout preserved)      */}
      {/* ========================================================================= */}
      <TopRiskEntitiesTable
        entities={topEntities}
        onExploreGraph={(acc) => onNavigateToNetwork && onNavigateToNetwork(acc)}
        onViewAlerts={(custId) => onNavigateToAlerts && onNavigateToAlerts({ customerId: custId })}
        onViewCustomer={(custId) => onNavigateToCustomer && onNavigateToCustomer(custId)}
      />

      {/* ========================================================================= */}
      {/* 4. ACTIVITY TRENDS OVER TIME (Placed directly below Top Entities Table)   */}
      {/* ========================================================================= */}
      <AlertTrendsChart data={trends} />

      {/* ========================================================================= */}
      {/* 5. CHARTS / ANALYTICS (Top Rules & Risk Distribution below Trends)        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopRulesBarChart
          rules={ruleStats?.topRules || []}
          totalHits={ruleStats?.totalHits || 0}
        />

        <RiskDistributionPieChart
          data={distributions?.riskLevelDistribution || []}
          title="Transaction Risk Distribution"
        />
      </div>

      {/* Export Report Modal */}
      <ExportReportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        activeRange={dateRange.range}
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
      />
    </div>
  );
};

export default ExecutiveDashboardPage;
