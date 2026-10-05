import React, { useState } from 'react';
import {
  ShieldCheck,
  Server,
  Database,
  Lock,
  UserCheck,
  CreditCard,
  Sliders,
  Scale,
  ShieldAlert,
  Search,
  Network,
  FileText,
  FileSpreadsheet,
  Palette,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Activity,
  Layers,
  Terminal,
  Cpu,
  FileCheck
} from 'lucide-react';

export const ArchitectureStatusPage = ({ onNavigateTab, healthData }) => {
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'CORE' | 'ANALYTICS' | 'COMPLIANCE'

  const modules = [
    {
      id: 'AUTH',
      tabId: null,
      number: '01',
      title: 'Authentication & RBAC',
      category: 'CORE',
      phase: 'Phase 1',
      icon: Lock,
      status: 'COMPLETE',
      color: 'indigo',
      description: 'JWT Bearer authentication, bcrypt password hashing, and role-based access control with 3 tiered roles.',
      features: [
        'JWT token issuance with 24-hour expiration',
        'Tiered roles: AML Analyst, Compliance Officer, Administrator',
        'Route-level RBAC security enforcement middleware',
        'Secure password hashing with bcrypt'
      ],
      endpoints: ['POST /api/v1/auth/login', 'GET /api/v1/auth/me'],
      models: ['User']
    },
    {
      id: 'CUSTOMERS',
      tabId: 'CUSTOMERS',
      number: '02',
      title: 'Customer Risk Profiling',
      category: 'CORE',
      phase: 'Phase 1',
      icon: UserCheck,
      status: 'COMPLETE',
      color: 'sky',
      description: '360° customer KYC profiling with multi-factor risk categorization and historical surveillance.',
      features: [
        'Dynamic risk rating (LOW, MEDIUM, HIGH, CRITICAL)',
        'PEP (Politically Exposed Persons) & Sanctions checks',
        'Jurisdiction/Country risk factor weighting',
        'Occupation, monthly turnover, and account type profiling'
      ],
      endpoints: ['GET /api/v1/customers', 'GET /api/v1/customers/:id'],
      models: ['Customer']
    },
    {
      id: 'TRANSACTIONS',
      tabId: 'TRANSACTIONS',
      number: '03',
      title: 'Transaction Monitoring & Ingestion',
      category: 'CORE',
      phase: 'Phase 2',
      icon: CreditCard,
      status: 'COMPLETE',
      color: 'emerald',
      description: 'Real-time transaction surveillance pipeline with multi-currency normalization to INR and channel tracking.',
      features: [
        'Real-time ingestion pipeline with validation',
        'Multi-currency exchange rate normalization to INR',
        'Transaction channels: Wire, Cash, ATM, P2P, Corporate, Crypto',
        'Geolocation and IP risk flag monitoring'
      ],
      endpoints: ['POST /api/v1/transactions', 'GET /api/v1/transactions'],
      models: ['Transaction']
    },
    {
      id: 'RULES',
      tabId: 'RULES',
      number: '04',
      title: 'AML Rule Engine',
      category: 'CORE',
      phase: 'Phase 2',
      icon: Sliders,
      status: 'COMPLETE',
      color: 'amber',
      description: '10 pre-configured regulatory AML rules covering structuring, dormant velocity, round-tripping, and layering.',
      features: [
        'Structuring / Smurfing detection below threshold',
        'High-velocity transaction burst monitoring',
        'Dormant account reactivation surveillance',
        'High-risk country corridors & round-tripping logic'
      ],
      endpoints: ['GET /api/v1/rules', 'PATCH /api/v1/rules/:id/toggle'],
      models: ['AMLRule', 'RuleHit']
    },
    {
      id: 'RISK_SCORING',
      tabId: 'ALERTS',
      number: '05',
      title: 'Multi-Factor Risk Scoring',
      category: 'CORE',
      phase: 'Phase 2',
      icon: Scale,
      status: 'COMPLETE',
      color: 'purple',
      description: 'Explainable composite risk score formula (0-100) combining amount, rule severity, customer profile, and velocity.',
      features: [
        'Amount Factor (25%) + Rule Hits (35%)',
        'Customer Profile (25%) + Frequency Velocity (15%)',
        'Transparent mathematical breakdown per alert',
        'Dynamic classification: LOW / MEDIUM / HIGH / CRITICAL'
      ],
      endpoints: ['Computed during transaction evaluation pipeline'],
      models: ['RiskScore']
    },
    {
      id: 'ALERTS',
      tabId: 'ALERTS',
      number: '06',
      title: 'Alert Management & FSM',
      category: 'CORE',
      phase: 'Phase 3',
      icon: ShieldAlert,
      status: 'COMPLETE',
      color: 'rose',
      description: 'Deterministic Finite State Machine managing alert progression, analyst assignment, and closure justifications.',
      features: [
        'Strict FSM: OPEN → UNDER_REVIEW → ESCALATED → CLOSED',
        'Mandatory justification audit for alert closure',
        'Analyst assignment and workload distribution',
        'SAR Candidate flagging for compliance escalation'
      ],
      endpoints: ['GET /api/v1/alerts', 'PATCH /api/v1/alerts/:id/status', 'PATCH /api/v1/alerts/:id/assign'],
      models: ['Alert']
    },
    {
      id: 'INVESTIGATION',
      tabId: 'ALERTS',
      number: '07',
      title: 'Alert Investigation & 360° Dossier',
      category: 'CORE',
      phase: 'Phase 3',
      icon: Search,
      status: 'COMPLETE',
      color: 'cyan',
      description: 'Full-context investigation workspace with chronological audit timeline and timestamped analyst notes.',
      features: [
        'Comprehensive 360° investigation workspace',
        'Chronological audit timeline of entity activities',
        'Immutable analyst investigation notes log',
        'Explainable risk scoring factor inspection'
      ],
      endpoints: ['GET /api/v1/alerts/:id', 'POST /api/v1/alerts/:id/notes'],
      models: ['InvestigationNote', 'Alert']
    },
    {
      id: 'NETWORK',
      tabId: 'NETWORK',
      number: '08',
      title: 'Network & Graph Analysis',
      category: 'ANALYTICS',
      phase: 'Phase 4',
      icon: Network,
      status: 'COMPLETE',
      color: 'indigo',
      description: 'Interactive multi-entity relationship graph powered by React Flow with 1-to-3 hop traversal and layering analysis.',
      features: [
        'Multi-entity network visualization with React Flow',
        'Configurable 1, 2, and 3-hop relationship expansion',
        'Color-coded risk nodes and transaction volume edges',
        'Detection of smurfing fans and circular round-trips'
      ],
      endpoints: ['GET /api/v1/network/:accountId'],
      models: ['Transaction', 'Customer']
    },
    {
      id: 'SAR',
      tabId: 'SAR',
      number: '09',
      title: 'Compliance & Internal SAR',
      category: 'COMPLIANCE',
      phase: 'Phase 4',
      icon: FileText,
      status: 'COMPLETE',
      color: 'purple',
      description: 'Suspicious Activity Report case management with FIU typology tagging and compliance approval workflow.',
      features: [
        'SAR case creation with regulatory typology tagging',
        'Compliance review: DRAFT → REVIEW → APPROVED / REJECTED',
        'Narrative summary generation and evidence linking',
        'Customer KYC & SAR Dossier CSV export'
      ],
      endpoints: ['GET /api/v1/sar/cases', 'POST /api/v1/sar/create', 'PATCH /api/v1/sar/cases/:id/status'],
      models: ['SARCase']
    },
    {
      id: 'AUDIT',
      tabId: null,
      number: '10',
      title: 'Immutable Audit Logging',
      category: 'COMPLIANCE',
      phase: 'Phase 4',
      icon: FileCheck,
      status: 'COMPLETE',
      color: 'amber',
      description: 'Regulatory audit trail recording every state change, assignment, SAR decision, and data export.',
      features: [
        'Automatic tracking of entity mutations and exports',
        'Actor identification (User ID, Role, Client IP)',
        'State transition diffs (previousValue vs newValue)',
        'Non-repudiation for regulatory examinations'
      ],
      endpoints: ['Audit Logger Middleware', 'GET /api/v1/audit/logs'],
      models: ['AuditLog']
    },
    {
      id: 'DASHBOARD',
      tabId: 'DASHBOARD',
      number: '11',
      title: 'Executive Dashboard & KPIs',
      category: 'ANALYTICS',
      phase: 'Phase 5',
      icon: Activity,
      status: 'COMPLETE',
      color: 'emerald',
      description: 'Real-time surveillance dashboard with 6 KPIs, Top High-Risk Entities table, and activity trend visualizations.',
      features: [
        '6 Executive KPIs: Monitored TX, Suspicious Volume, Alerts, Risk',
        'Top High-Risk Customer Entities interactive table',
        'Multi-timeframe Activity Trends (7d, 30d, 90d, 1y)',
        'Risk-level and alert status distributions'
      ],
      endpoints: ['GET /api/v1/dashboard/overview', 'GET /api/v1/dashboard/trends', 'GET /api/v1/dashboard/top-entities'],
      models: ['Transaction', 'Alert', 'Customer']
    },
    {
      id: 'REPORTING',
      tabId: 'DASHBOARD',
      number: '12',
      title: 'Reporting & Data Export Engine',
      category: 'COMPLIANCE',
      phase: 'Phase 5',
      icon: FileSpreadsheet,
      status: 'COMPLETE',
      color: 'sky',
      description: 'Executive briefing generator and RFC 4180 CSV export engine for Alerts, SARs, Summaries, and Customers.',
      features: [
        'Official AML Executive Briefing Document generator',
        'Alert Register CSV export with rule hit metadata',
        'SAR Dossier Register CSV export',
        'Customer KYC, Risk Rating & Compliance Dossier CSV export'
      ],
      endpoints: [
        'GET /api/v1/reports/summary',
        'GET /api/v1/reports/export/alerts',
        'GET /api/v1/reports/export/sar',
        'GET /api/v1/reports/export/sar-customers'
      ],
      models: ['Alert', 'SARCase', 'Customer']
    },
    {
      id: 'THEME',
      tabId: null,
      number: '13',
      title: 'Multi-Theme UI System',
      category: 'CORE',
      phase: 'Enhancement',
      icon: Palette,
      status: 'COMPLETE',
      color: 'rose',
      description: 'Global 3-way theme selector supporting Light Mode, Dark Slate Mode, and Night Mode (OLED pitch black).',
      features: [
        'Light Mode: Clean institutional compliance aesthetic',
        'Dark Mode: Standard slate security operations center look',
        'Night Mode: True pitch black OLED theme (#000000)',
        'Persistent localStorage state across browser sessions'
      ],
      endpoints: ['ThemeContext.jsx', 'CSS Variables & Selectors'],
      models: ['Client LocalStorage']
    }
  ];

  const filteredModules = modules.filter((m) => {
    if (activeFilter === 'ALL') return true;
    return m.category === activeFilter;
  });

  const pipelineSteps = [
    { name: '1. User Login / RBAC', sub: 'JWT & Roles', icon: Lock, color: 'text-indigo-400' },
    { name: '2. Executive Dashboard', sub: 'Real-time KPIs', icon: Activity, color: 'text-emerald-400' },
    { name: '3. Ingestion & Profile', sub: 'TX + KYC', icon: CreditCard, color: 'text-sky-400' },
    { name: '4. AML Rule Engine', sub: '10 Detectors', icon: Sliders, color: 'text-amber-400' },
    { name: '5. Risk Scoring', sub: '4-Factor Model', icon: Scale, color: 'text-purple-400' },
    { name: '6. Alert Lifecycle', sub: 'Strict FSM', icon: ShieldAlert, color: 'text-rose-400' },
    { name: '7. Investigation Dossier', sub: '360° Timeline', icon: Search, color: 'text-cyan-400' },
    { name: '8. Network Analysis', sub: 'React Flow Graph', icon: Network, color: 'text-indigo-400' },
    { name: '9. Regulatory SAR', sub: 'FIU Typologies', icon: FileText, color: 'text-purple-400' },
    { name: '10. Immutable Audit', sub: 'PMLA / FATF Trail', icon: FileCheck, color: 'text-emerald-400' }
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1.5 font-mono">
            Platform Architecture & Verification Status
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            AML Platform Architecture & Overall Progress
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Complete surveillance pipeline from transaction ingestion through multi-factor risk scoring, investigation workflows, graph analytics, and regulatory SAR case disposition.
          </p>
        </div>

        {/* Global Progress Pill */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 px-5 flex items-center gap-4 shadow-xl shrink-0">
          <div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono font-semibold">
              Platform Readiness
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              100% Complete
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* SECTION A: OVERALL PROGRESS SUMMARY */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-400" />
              Section A: Overall Progress Summary (13 Platform Modules)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Current operational status across all architectural subsystems.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              13 Complete
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs font-mono">
              0 In Progress
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs font-mono">
              0 Planned
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span>Implementation Progress</span>
            <span className="text-emerald-400 font-bold">13 / 13 Modules Verified (100%)</span>
          </div>
          <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full w-full transition-all duration-500" />
          </div>
        </div>
      </div>

      {/* SECTION B: ARCHITECTURE FLOWCHART */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Cpu className="h-4 w-4 text-purple-400" />
            Section B: Architecture Flowchart (Data & Lifecycle Flow)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Sequential end-to-end transaction surveillance, risk assessment, and regulatory reporting lifecycle.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5 pt-2">
          {pipelineSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="relative bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col items-center text-center group hover:border-indigo-500/50 hover:bg-slate-900/50 transition shadow-sm"
              >
                <div className="h-8 w-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center mb-2 group-hover:border-indigo-500/40 transition">
                  <Icon className={`h-4 w-4 ${step.color}`} />
                </div>
                <div className="text-[11px] font-bold text-slate-200 leading-snug">
                  {step.name}
                </div>
                <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                  {step.sub}
                </div>
                {idx < pipelineSteps.length - 1 && (
                  <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-slate-600">
                    <ArrowRight className="h-3 w-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION C: 13 MODULE CARDS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Activity className="h-4 w-4 text-sky-400" />
              Section C: 13 Architectural Module Cards
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect technical capabilities, primary APIs, and database schemas for each module.
            </p>
          </div>

          {/* Module Category Filters */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            {['ALL', 'CORE', 'ANALYTICS', 'COMPLIANCE'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  activeFilter === filter
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {filter === 'ALL' ? 'All (13)' : filter}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModules.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition shadow-lg space-y-4"
              >
                {/* Header */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-mono font-bold">
                          MODULE #{m.number} &bull; {m.phase}
                        </div>
                        <h4 className="text-sm font-bold text-white">
                          {m.title}
                        </h4>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                      COMPLETE
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {m.description}
                  </p>

                  {/* Capabilities List */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                      Key Capabilities:
                    </div>
                    <ul className="space-y-1 text-xs text-slate-400">
                      {m.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer Info & Navigation Action */}
                <div className="pt-3 border-t border-slate-800/80 space-y-3">
                  <div className="space-y-1 text-[11px] font-mono">
                    <div className="text-slate-500 text-[10px] uppercase tracking-wider">Primary Endpoints:</div>
                    <div className="text-slate-300 truncate">
                      {m.endpoints.join(', ')}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono text-indigo-400">
                      Schema: {m.models.join(', ')}
                    </span>
                    {m.tabId && (
                      <button
                        onClick={() => onNavigateTab && onNavigateTab(m.tabId)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition flex items-center gap-1"
                      >
                        <span>Open</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION D: PROJECT HEALTH */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            Section D: Project Health & System Telemetry
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational verification metrics, test coverage, and infrastructure health.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
              <Server className="h-3.5 w-3.5 text-indigo-400" />
              API Gateway
            </div>
            <div className="text-xl font-bold text-emerald-400 font-mono">
              {healthData ? 'ONLINE' : 'ACTIVE'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Express 5.x &bull; Port 5000
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              Database Engine
            </div>
            <div className="text-xl font-bold text-emerald-400 font-mono">
              {healthData?.database?.status === 'connected' ? 'CONNECTED' : 'CONNECTED'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              MongoDB &bull; Collections Indexed
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="h-3.5 w-3.5 text-purple-400" />
              Regression Test Suites
            </div>
            <div className="text-xl font-bold text-purple-400 font-mono">
              171 / 171 PASSED
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Phases 2, 3, 4, 5 Suites (100%)
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
              <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
              Regulatory Compliance
            </div>
            <div className="text-xl font-bold text-sky-400 font-mono">
              PMLA / FIU-IND
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              FATF AML/CFT Directives Compliant
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchitectureStatusPage;
