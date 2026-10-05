import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Search,
  Filter,
  Plus,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Power,
  X,
  Clock,
  Layers,
  Database
} from 'lucide-react';
import { ruleService } from '../services/ruleService.js';
import { EditRuleModal } from '../components/rules/EditRuleModal.jsx';
import { AddRuleModal } from '../components/rules/AddRuleModal.jsx';

export const RuleEnginePage = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [editingRule, setEditingRule] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const fetchRules = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await ruleService.getRules();
      setRules(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch AML rules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = async (rule) => {
    try {
      const nextState = !rule.isEnabled;
      await ruleService.toggleRule(rule._id, nextState);
      setRules((prev) =>
        prev.map((r) => (r._id === rule._id ? { ...r, isEnabled: nextState } : r))
      );
      setSuccessToast(`Rule '${rule.ruleCode}' is now ${nextState ? 'ENABLED' : 'DISABLED'}. Rule cache hot-reloaded.`);
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to toggle rule state.');
    }
  };

  const handleRuleUpdated = (updated) => {
    setRules((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
    setSuccessToast(`Rule '${updated.ruleCode}' updated successfully. Memory cache invalidated.`);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  const handleRuleCreated = (created) => {
    setRules((prev) => [...prev, created]);
    setSuccessToast(`New AML Rule '${created.ruleCode}' registered successfully.`);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  // Filtered Rules
  const filteredRules = rules.filter((r) => {
    const matchesSearch =
      !search ||
      r.ruleCode.toLowerCase().includes(search.toLowerCase()) ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = !categoryFilter || r.category === categoryFilter;
    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'ENABLED' && r.isEnabled) ||
      (statusFilter === 'DISABLED' && !r.isEnabled);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const activeCount = rules.filter((r) => r.isEnabled).length;
  const criticalCount = rules.filter((r) => r.severity === 'CRITICAL' || r.severity === 'HIGH').length;

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders className="h-6 w-6 text-indigo-400" />
            AML Detection & Rule Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configurable database-driven rules, threshold parameters, and multi-factor risk weights.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Add Rule</span>
          </button>

          <button
            onClick={fetchRules}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50"
            title="Refresh Rules"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast('')} className="text-emerald-400 hover:text-emerald-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 2. Top Summary Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400">Total Configured Rules</span>
            <div className="text-2xl font-extrabold text-white font-mono mt-0.5">{rules.length}</div>
            <span className="text-[11px] text-emerald-400 font-semibold">{activeCount} active in engine</span>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
            <Sliders className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400">High / Critical Severity</span>
            <div className="text-2xl font-extrabold text-rose-400 font-mono mt-0.5">{criticalCount}</div>
            <span className="text-[11px] text-slate-400">trigger immediate alerts</span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400">Engine Cache Status</span>
            <div className="text-sm font-extrabold text-white font-mono mt-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Dynamic Hot-Reload Active
            </div>
            <span className="text-[10px] text-slate-500">MongoDB database persistence</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Database className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 3. Filters Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Rule Code, Name, or description keywords..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Categories</option>
            <option value="THRESHOLD">High Value / Threshold</option>
            <option value="VELOCITY">Velocity & Frequency</option>
            <option value="STRUCTURING">Structuring / Smurfing</option>
            <option value="RAPID_FLOW">Rapid In/Out Flow</option>
            <option value="HIGH_RISK_GEO">High-Risk Jurisdictions</option>
            <option value="BEHAVIORAL">Behavioral Spikes</option>
            <option value="SANCTIONS">PEP & Sanctions</option>
            <option value="LAYERING">Multi-hop Layering</option>
            <option value="ROUND_AMOUNT">Round Amounts</option>
            <option value="UNUSUAL_HOURS">Off-hours Nocturnal</option>
            <option value="FAN_IN_FAN_OUT">Fan-In / Fan-Out Hubs</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="ENABLED">Active Only</option>
            <option value="DISABLED">Disabled Only</option>
          </select>

          {(search || categoryFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setCategoryFilter('');
                setStatusFilter('');
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Rules Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-400 font-mono">Loading active AML detection rules...</span>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-400 text-xs space-y-3">
          <p>{error}</p>
          <button
            onClick={fetchRules}
            className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-200 text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-xs">
          No AML rules match the specified criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRules.map((rule) => {
            const isCritical = rule.severity === 'CRITICAL';
            const isHigh = rule.severity === 'HIGH';

            return (
              <div
                key={rule._id}
                className={`rounded-xl border transition p-5 flex flex-col justify-between space-y-4 ${
                  rule.isEnabled
                    ? 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                    : 'border-slate-800/50 bg-slate-950/40 opacity-70'
                }`}
              >
                {/* Rule Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {rule.ruleCode}
                        </span>
                        <span className="text-[10px] uppercase font-semibold text-slate-500 font-mono">
                          {rule.category}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white tracking-tight">
                        {rule.name}
                      </h4>
                    </div>

                    {/* Enable / Disable Switch */}
                    <button
                      onClick={() => handleToggle(rule)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold font-mono transition flex items-center gap-1.5 ${
                        rule.isEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                      }`}
                      title={rule.isEnabled ? 'Click to disable rule' : 'Click to enable rule'}
                    >
                      <Power className="h-3 w-3" />
                      <span>{rule.isEnabled ? 'ACTIVE' : 'OFF'}</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {rule.description}
                  </p>
                </div>

                {/* Parameters Key-Value Badges */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-semibold uppercase">Configured Parameters</span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      Weight: <span className="text-indigo-300 font-bold">+{rule.weight} pts</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {rule.parameters && Object.keys(rule.parameters).length > 0 ? (
                      Object.entries(rule.parameters).map(([key, val]) => (
                        <span
                          key={key}
                          className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-300"
                        >
                          <span className="text-slate-500">{key}:</span>{' '}
                          <span className="text-indigo-300 font-bold">
                            {typeof val === 'number'
                              ? key.toLowerCase().includes('amount')
                                ? `₹${val.toLocaleString('en-IN')}`
                                : val
                              : Array.isArray(val)
                              ? val.join(', ')
                              : String(val)}
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">No parameters required</span>
                    )}
                  </div>
                </div>

                {/* Card Footer: Severity & Edit */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                      isCritical
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : isHigh
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                        : rule.severity === 'MEDIUM'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {rule.severity} SEVERITY
                  </span>

                  <button
                    onClick={() => setEditingRule(rule)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <Edit2 className="h-3 w-3 text-slate-400" />
                    <span>Edit Parameters</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Rule Modal */}
      <EditRuleModal
        isOpen={!!editingRule}
        onClose={() => setEditingRule(null)}
        rule={editingRule}
        onRuleUpdated={handleRuleUpdated}
      />

      {/* Add Rule Modal */}
      <AddRuleModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onRuleCreated={handleRuleCreated}
      />
    </div>
  );
};

export default RuleEnginePage;
