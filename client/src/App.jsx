import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Database,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  FileCheck,
  Activity,
  Users,
  CreditCard,
  FileText,
  UserCheck,
  Network,
  BarChart3,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  ChevronRight,
  Sliders,
  LogOut,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';
import api from './services/api.js';
import { useTheme } from './context/ThemeContext.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { ArchitectureStatusPage } from './pages/ArchitectureStatusPage.jsx';
import { ExecutiveDashboardPage } from './pages/ExecutiveDashboardPage.jsx';
import { AlertManagementPage } from './pages/AlertManagementPage.jsx';
import { AlertDetailPage } from './pages/AlertDetailPage.jsx';
import { CustomerDetailPage } from './pages/CustomerDetailPage.jsx';
import { SARManagementPage } from './pages/SARManagementPage.jsx';
import { NetworkAnalysisPage } from './pages/NetworkAnalysisPage.jsx';
import { TransactionMonitoringPage } from './pages/TransactionMonitoringPage.jsx';
import { RuleEnginePage } from './pages/RuleEnginePage.jsx';

export function App() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('DASHBOARD'); // 'DASHBOARD' | 'TRANSACTIONS' | 'ALERTS' | 'CUSTOMERS' | 'SAR' | 'NETWORK' | 'RULES' | 'OVERVIEW'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [focusedNetworkEntity, setFocusedNetworkEntity] = useState(null);
  const [alertFilterStatus, setAlertFilterStatus] = useState('');
  const [alertFilterSearch, setAlertFilterSearch] = useState('');
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('aml_user_info');
      const token = localStorage.getItem('aml_auth_token');
      if (stored && token) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return null;
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [healthData, setHealthData] = useState(null);

  // Authenticate role switch
  const loginUser = async (username, password) => {
    try {
      setIsAuthenticating(true);
      const res = await api.post('/auth/login', { username, password });
      if (res.data.success) {
        localStorage.setItem('aml_auth_token', res.data.data.token);
        localStorage.setItem('aml_user_info', JSON.stringify(res.data.data.user));
        setCurrentUser(res.data.data.user);
      }
    } catch (err) {
      console.error('Role switch failed:', err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    // Health check on startup
    api.get('/health')
      .then((res) => setHealthData(res.data))
      .catch((err) => console.error('Health check failed:', err));
  }, []);

  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    setActiveTab('DASHBOARD');
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore network errors on logout
    } finally {
      localStorage.removeItem('aml_auth_token');
      localStorage.removeItem('aml_user_info');
      setCurrentUser(null);
      setActiveTab('DASHBOARD');
      setSelectedAlertId(null);
      setSelectedCustomerId(null);
    }
  };

  const handleRoleSwitch = async (username, password) => {
    await loginUser(username, password);
  };

  // If unauthenticated, present dedicated Login page
  if (!currentUser || !localStorage.getItem('aml_auth_token')) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const navItems = [
    {
      id: 'DASHBOARD',
      label: 'Executive Dashboard',
      icon: BarChart3
    },
    {
      id: 'TRANSACTIONS',
      label: 'Transaction Monitoring',
      icon: CreditCard
    },
    {
      id: 'ALERTS',
      label: 'Alert Management',
      icon: ShieldAlert
    },
    {
      id: 'CUSTOMERS',
      label: 'Customer Risk Profile',
      icon: User
    },
    {
      id: 'SAR',
      label: 'Compliance & SAR',
      icon: FileText
    },
    {
      id: 'NETWORK',
      label: 'Network Analysis',
      icon: Network
    },
    {
      id: 'RULES',
      label: 'AML Rule Engine',
      icon: Sliders
    },
    {
      id: 'OVERVIEW',
      label: 'Architecture Status',
      icon: Server
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Global Header preserving User Controls, Theme Selector, and Brand */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-5 py-3 flex items-center justify-between sticky top-0 z-50 gap-4">
        {/* Brand & Sidebar Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition"
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4 text-indigo-400" />
            ) : (
              <PanelLeftClose className="h-4 w-4 text-slate-400" />
            )}
          </button>

          <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <ShieldAlert className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-sm font-bold tracking-tight text-white m-0 flex items-center gap-2">
              AML Transaction Monitoring
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                Platform
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 m-0 hidden sm:block">
              Suspicious Activity Detection & Regulatory Compliance
            </p>
          </div>
        </div>

        {/* User Session, Quick Switcher, Global Theme Toggle & Logout */}
        <div className="flex items-center gap-2.5 text-xs">
          {/* Global Theme Selector (Light, Dark, Night) */}
          <div className="flex items-center gap-0.5 bg-slate-950 border border-slate-800 p-0.5 rounded-xl">
            <button
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded-lg text-xs transition flex items-center gap-1 ${
                theme === 'light'
                  ? 'bg-amber-500/20 text-amber-500 font-bold border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Switch to Light Theme"
            >
              <Sun className="h-3.5 w-3.5" />
              <span className="hidden md:inline text-[10px] font-mono">Light</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded-lg text-xs transition flex items-center gap-1 ${
                theme === 'dark'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Switch to Dark Slate Theme"
            >
              <Moon className="h-3.5 w-3.5" />
              <span className="hidden md:inline text-[10px] font-mono">Dark</span>
            </button>
            <button
              onClick={() => setTheme('night')}
              className={`p-1.5 rounded-lg text-xs transition flex items-center gap-1 ${
                theme === 'night'
                  ? 'bg-purple-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Switch to Night Mode (OLED Black)"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden md:inline text-[10px] font-mono">Night</span>
            </button>
          </div>

          {/* Current User Pill */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
            <UserCheck className="h-3.5 w-3.5 text-indigo-400" />
            <div>
              <div className="font-semibold text-slate-200 leading-tight">
                {currentUser?.fullName || 'Authenticating...'}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Role: <span className="text-indigo-400 font-bold">{currentUser?.role || '...'}</span>
              </div>
            </div>
          </div>

          {/* Quick Role Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-0.5 rounded-xl">
            <button
              onClick={() => handleRoleSwitch('analyst', 'AnalystPassword@2026')}
              className={`px-2 py-1 rounded-lg text-[11px] font-mono transition ${
                currentUser?.role === 'AML_ANALYST'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Switch session to Vikram Mehta (AML Analyst)"
            >
              Analyst
            </button>
            <button
              onClick={() => handleRoleSwitch('compliance', 'CompliancePassword@2026')}
              className={`px-2 py-1 rounded-lg text-[11px] font-mono transition ${
                currentUser?.role === 'COMPLIANCE_OFFICER'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Switch session to Priya Sharma (Compliance Officer)"
            >
              Compliance
            </button>
            <button
              onClick={() => handleRoleSwitch('admin', 'AdminPassword@2026')}
              className={`px-2 py-1 rounded-lg text-[11px] font-mono transition ${
                currentUser?.role === 'ADMIN'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Switch session to Rajesh Kumar (System Admin)"
            >
              Admin
            </button>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-950/20 transition font-mono text-[11px]"
            title="Log out and return to Login Screen"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Layout Body: Left Sidebar + Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Responsive Collapsible Left Sidebar */}
        <aside
          className={`border-r border-slate-800 bg-slate-900/60 backdrop-blur flex flex-col justify-between transition-all duration-200 z-40 shrink-0 ${
            isSidebarCollapsed ? 'w-16' : 'w-60'
          }`}
        >
          {/* Navigation Items */}
          <div className="p-3 space-y-1.5">
            <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400/80 font-mono">
              {!isSidebarCollapsed ? 'Navigation' : 'Nav'}
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSelectedAlertId(null);
                  }}
                  className={`w-full flex items-center rounded-xl text-sm transition group ${
                    isSidebarCollapsed ? 'justify-center p-3' : 'px-3 py-2.5 gap-3'
                  } ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium'
                  }`}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <span className="w-5 h-5 flex items-center justify-center shrink-0">
                    <Icon className={`h-[18px] w-[18px] transition ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  </span>
                  {!isSidebarCollapsed && (
                    <span className="truncate whitespace-nowrap text-left">{item.label}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer / Compact System Status */}
          <div className="p-3 border-t border-slate-800/80">
            {!isSidebarCollapsed ? (
              <div className="rounded-xl bg-slate-950 border border-slate-800/80 p-2.5 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Server className="h-3.5 w-3.5 text-indigo-400" /> Gateway
                  </span>
                  <span className="font-mono text-emerald-400 text-[10px] font-bold">
                    {healthData ? 'Online' : 'Checking'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Database className="h-3.5 w-3.5 text-emerald-400" /> DB
                  </span>
                  <span className="font-mono text-emerald-400 text-[10px] font-bold">
                    {healthData?.database?.status || 'Connected'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center" title="System Operational">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            )}
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <main className="flex-1 w-full px-4 py-5 md:px-6 md:py-6">
            {isAuthenticating ? (
              <div className="flex flex-col items-center justify-center min-h-[420px] space-y-3">
                <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                <span className="text-xs text-slate-400 font-mono">Authenticating compliance session...</span>
              </div>
            ) : (
              <>
                {activeTab === 'DASHBOARD' && (
                  <ExecutiveDashboardPage
                    key={currentUser?.username || 'dashboard'}
                    onNavigateToAlerts={({ status = '', customerId = '' }) => {
                      setAlertFilterStatus(status);
                      setAlertFilterSearch(customerId);
                      setSelectedAlertId(null);
                      setActiveTab('ALERTS');
                    }}
                    onNavigateToSAR={() => {
                      setSelectedAlertId(null);
                      setActiveTab('SAR');
                    }}
                    onNavigateToNetwork={(accountId) => {
                      setFocusedNetworkEntity(accountId);
                      setSelectedAlertId(null);
                      setActiveTab('NETWORK');
                    }}
                    onNavigateToCustomer={(customerId) => {
                      setSelectedCustomerId(customerId);
                      setActiveTab('CUSTOMERS');
                    }}
                  />
                )}

                {activeTab === 'TRANSACTIONS' && (
                  <TransactionMonitoringPage
                    onNavigateToAlerts={({ alertId = '', search = '', status = '' } = {}) => {
                      if (alertId) {
                        setSelectedAlertId(alertId);
                      } else {
                        setAlertFilterSearch(search);
                        setAlertFilterStatus(status);
                        setSelectedAlertId(null);
                      }
                      setActiveTab('ALERTS');
                    }}
                    onNavigateToCustomer={(customerId) => {
                      setSelectedCustomerId(customerId);
                      setActiveTab('CUSTOMERS');
                    }}
                  />
                )}

                {activeTab === 'ALERTS' && (
                  selectedAlertId ? (
                    <AlertDetailPage
                      alertId={selectedAlertId}
                      onBack={() => setSelectedAlertId(null)}
                      onOpenNetworkGraph={(entityId) => {
                        setFocusedNetworkEntity(entityId);
                        setActiveTab('NETWORK');
                      }}
                      onOpenCustomerDetail={(customerId) => {
                        setSelectedCustomerId(customerId);
                        setActiveTab('CUSTOMERS');
                      }}
                    />
                  ) : (
                    <AlertManagementPage
                      onSelectAlert={(id) => setSelectedAlertId(id)}
                      onViewCustomer={(customerId) => {
                        setSelectedCustomerId(customerId);
                        setActiveTab('CUSTOMERS');
                      }}
                      initialStatus={alertFilterStatus}
                      initialSearch={alertFilterSearch}
                    />
                  )
                )}

                {activeTab === 'CUSTOMERS' && (
                  <CustomerDetailPage
                    initialCustomerId={selectedCustomerId}
                    onSelectAlert={(id) => {
                      setSelectedAlertId(id);
                      setActiveTab('ALERTS');
                    }}
                    onOpenNetworkGraph={(acc) => {
                      setFocusedNetworkEntity(acc);
                      setActiveTab('NETWORK');
                    }}
                  />
                )}

                {activeTab === 'SAR' && (
                  <SARManagementPage
                    onSelectAlert={(id) => {
                      setActiveTab('ALERTS');
                      setSelectedAlertId(id);
                    }}
                  />
                )}

                {activeTab === 'NETWORK' && (
                  <NetworkAnalysisPage
                    initialAccountId={focusedNetworkEntity}
                    onSelectAlert={(id) => {
                      setSelectedAlertId(id);
                      setActiveTab('ALERTS');
                    }}
                  />
                )}

                {activeTab === 'RULES' && (
                  <RuleEnginePage />
                )}

                {activeTab === 'OVERVIEW' && (
                  <ArchitectureStatusPage
                    onNavigateTab={(tab) => {
                      setActiveTab(tab);
                      setSelectedAlertId(null);
                    }}
                    healthData={healthData}
                  />
                )}
              </>
            )}
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-800/80 bg-slate-900/40 px-6 py-4 text-center text-xs text-slate-500">
            AML Transaction Monitoring & Suspicious Activity Detection Platform &bull; Compliance & Regulatory Intelligence
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;
