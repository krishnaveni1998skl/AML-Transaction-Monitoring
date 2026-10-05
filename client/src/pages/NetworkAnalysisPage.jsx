import React, { useState, useEffect } from 'react';
import {
  Network,
  Search,
  Filter,
  Layers,
  Activity,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  User,
  Building,
  RefreshCw,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { networkService } from '../services/networkService.js';
import { NetworkGraphCanvas } from '../components/network/NetworkGraphCanvas.jsx';
import { formatINR, formatCompactINR } from '../utils/formatters.js';

export const NetworkAnalysisPage = ({ initialAccountId = null, onSelectAlert = null }) => {
  const [searchTerm, setSearchTerm] = useState(initialAccountId || 'ACC-4001-543210');
  const [maxDepth, setMaxDepth] = useState(3);
  const [minAmount, setMinAmount] = useState('');
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [entitySummary, setEntitySummary] = useState(null);

  const fetchGraph = async (queryTerm = searchTerm, depth = maxDepth) => {
    try {
      setLoading(true);
      const isCust = queryTerm.startsWith('CUST-');
      const params = {
        maxDepth: depth,
        minAmount: minAmount || undefined,
        ...(isCust ? { customerId: queryTerm } : { accountId: queryTerm })
      };

      const res = await networkService.getNetworkGraph(params);
      if (res.success) {
        setGraphData(res.data);
        if (res.data.nodes.length > 0) {
          setSelectedNode(res.data.nodes[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load network graph:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph(searchTerm, maxDepth);
  }, []);

  useEffect(() => {
    if (initialAccountId && initialAccountId !== searchTerm) {
      setSearchTerm(initialAccountId);
      fetchGraph(initialAccountId, maxDepth);
    }
  }, [initialAccountId]);

  useEffect(() => {
    if (selectedNode) {
      networkService.getEntitySummary(selectedNode.id).then((res) => {
        if (res.success) setEntitySummary(res.data);
      });
    }
  }, [selectedNode]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchGraph();
  };

  const handlePresetSelect = (id, depth = 3) => {
    setSearchTerm(id);
    setMaxDepth(depth);
    fetchGraph(id, depth);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Network className="h-6 w-6 text-indigo-400" />
            Transaction Network Analysis & Graph Traversal
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Identify circular fund flows, multi-hop layering paths, and smurf aggregator hubs.
          </p>
        </div>

        {/* Preset Typology Demos */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 font-semibold uppercase text-[10px]">Presets:</span>
          <button
            onClick={() => handlePresetSelect('ACC-4001-543210', 4)}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-indigo-500 text-indigo-300 font-mono text-[11px] transition"
          >
            Layering (A→B→C→D)
          </button>
          <button
            onClick={() => handlePresetSelect('ACC-3001-654321', 2)}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-purple-500 text-purple-300 font-mono text-[11px] transition"
          >
            Crypto Rapid In/Out
          </button>
          <button
            onClick={() => handlePresetSelect('ACC-2001-765432', 2)}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-amber-500 text-amber-300 font-mono text-[11px] transition"
          >
            Smurfing Hub
          </button>
        </div>
      </div>

      {/* Query Bar */}
      <form
        onSubmit={handleSearchSubmit}
        className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-wrap items-center justify-between gap-4 text-xs"
      >
        <div className="flex flex-1 items-center gap-3 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter Account Number or Customer ID..."
              className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-9 pr-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Network className="h-3.5 w-3.5" />}
            Traverse Graph
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Depth Slider */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Depth:</span>
            <input
              type="range"
              min="1"
              max="4"
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
              className="w-20 accent-indigo-500"
            />
            <span className="font-mono font-bold text-indigo-400">{maxDepth} hops</span>
          </div>

          {/* Min Amount Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Min:</span>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="₹ Amount"
              className="w-24 rounded-lg bg-slate-950 border border-slate-800 px-2 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </form>

      {/* Network Metrics Cards */}
      {graphData?.metrics && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
            <span className="text-[11px] text-slate-400 block uppercase tracking-wider font-semibold">Total Nodes</span>
            <span className="text-2xl font-bold font-mono text-white">{graphData.metrics.nodeCount}</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
            <span className="text-[11px] text-slate-400 block uppercase tracking-wider font-semibold">Transactions</span>
            <span className="text-2xl font-bold font-mono text-indigo-400">{graphData.metrics.edgeCount}</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
            <span className="text-[11px] text-slate-400 block uppercase tracking-wider font-semibold">Max Depth</span>
            <span className="text-2xl font-bold font-mono text-sky-400">{graphData.metrics.traversalDepth} hops</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
            <span className="text-[11px] text-slate-400 block uppercase tracking-wider font-semibold">Total Volume</span>
            <span className="text-lg font-bold font-mono text-emerald-400 truncate block">
              {formatCompactINR(graphData.metrics.totalVolumeINR)}
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
            <span className="text-[11px] text-slate-400 block uppercase tracking-wider font-semibold">High Risk Nodes</span>
            <span className="text-2xl font-bold font-mono text-rose-400">{graphData.metrics.highRiskNodeCount}</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
            <span className="text-[11px] text-slate-400 block uppercase tracking-wider font-semibold">Detected Topologies</span>
            <span className="text-2xl font-bold font-mono text-purple-400">
              {graphData.metrics.detectedPatternsCount}
            </span>
          </div>
        </div>
      )}

      {/* Main Graph & Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Graph Canvas & Topology Alerts (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <NetworkGraphCanvas
            nodes={graphData?.nodes || []}
            edges={graphData?.edges || []}
            selectedNodeId={selectedNode?.id}
            onSelectNode={(node) => setSelectedNode(node)}
          />

          {/* Detected Patterns List */}
          {graphData?.detectedPatterns && graphData.detectedPatterns.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Detected Suspicious Network Topologies ({graphData.detectedPatterns.length})
              </h4>

              <div className="space-y-2">
                {graphData.detectedPatterns.map((pat, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-300 flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" />
                        {pat.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-200 border border-rose-500/40">
                        {pat.severity}
                      </span>
                    </div>

                    <p className="text-slate-300 text-[11px] leading-relaxed">{pat.description}</p>

                    <div className="pt-1 flex flex-wrap items-center gap-1 text-[10px] font-mono text-slate-400">
                      <span>Involved:</span>
                      {pat.participatingAccounts?.map((acc, aIdx) => (
                        <span key={aIdx} className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800 text-slate-300">
                          {acc}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Entity Inspector Drawer (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {selectedNode ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-5">
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white">{selectedNode.label}</h4>
                  <span className="font-mono text-xs text-indigo-400">{selectedNode.accountNumber}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    selectedNode.riskCategory === 'CRITICAL'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : selectedNode.riskCategory === 'HIGH'
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {selectedNode.riskCategory} ({selectedNode.riskScore})
                </span>
              </div>

              {/* Bank & Profile */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Bank Entity:</span>
                  <span className="text-slate-200 font-medium">{selectedNode.bankName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Occupation / Sector:</span>
                  <span className="text-slate-200 font-medium">{selectedNode.occupation}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Customer ID:</span>
                  <span className="font-mono text-slate-300">{selectedNode.customerId || 'External Entity'}</span>
                </div>
                {selectedNode.isPep && (
                  <div className="py-1">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                      Politically Exposed Person (PEP)
                    </span>
                  </div>
                )}
              </div>

              {/* Balance Flow Metrics */}
              <div className="rounded-lg bg-slate-950/80 p-3.5 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <TrendingDown className="h-3.5 w-3.5 text-emerald-400" /> Total Inflow
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatINR(selectedNode.totalInflowINR)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-rose-400" /> Total Outflow
                  </span>
                  <span className="font-mono font-bold text-rose-400">
                    {formatINR(selectedNode.totalOutflowINR)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                  <span className="text-slate-500">Direct Transactions</span>
                  <span className="font-mono text-slate-300">{selectedNode.transactionCount} records</span>
                </div>
              </div>

              {/* Counterparties Summary */}
              {entitySummary?.counterparties && (
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold text-slate-300">
                    Direct Counterparties ({entitySummary.counterparties.length})
                  </h5>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {entitySummary.counterparties.map((cp, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePresetSelect(cp, 2)}
                        className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 hover:text-indigo-300 hover:border-indigo-500/50 transition truncate max-w-[140px]"
                        title={cp}
                      >
                        {cp}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-500">
              Click on any node in the network to inspect its flow and counterparties.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkAnalysisPage;
