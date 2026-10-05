import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';
import api from '../services/api.js';
import { useTheme } from '../context/ThemeContext.jsx';

export const LoginPage = ({ onLoginSuccess }) => {
  const { theme, setTheme } = useTheme();
  const [username, setUsername] = useState('analyst');
  const [password, setPassword] = useState('AnalystPassword@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const performLogin = async (u, p) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const res = await api.post('/auth/login', { username: u, password: p });
      if (res.data.success) {
        const { token, user } = res.data.data;
        localStorage.setItem('aml_auth_token', token);
        localStorage.setItem('aml_user_info', JSON.stringify(user));
        if (onLoginSuccess) {
          onLoginSuccess(user, token);
        }
      } else {
        setErrorMessage(res.data.message || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.response?.data?.message || err.message || 'Authentication error. Please check backend connection.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }
    performLogin(username, password);
  };

  const handleQuickLogin = (u, p) => {
    setUsername(u);
    setPassword(p);
    performLogin(u, p);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 relative">
      {/* Top Bar with Theme Toggle */}
      <div className="absolute top-4 right-6 flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl shadow-lg">
        <button
          onClick={() => setTheme('light')}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
            theme === 'light'
              ? 'bg-amber-500/20 text-amber-500 font-bold border border-amber-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Light Mode"
        >
          <Sun className="h-3.5 w-3.5" />
          <span>Light</span>
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
            theme === 'dark'
              ? 'bg-indigo-600 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Dark Slate Mode"
        >
          <Moon className="h-3.5 w-3.5" />
          <span>Dark</span>
        </button>
        <button
          onClick={() => setTheme('night')}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
            theme === 'night'
              ? 'bg-purple-600 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Night OLED Black Mode"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Night</span>
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 items-center justify-center text-indigo-400 mb-3 shadow-lg shadow-indigo-500/10">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white m-0">
            AML Transaction Monitoring
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Suspicious Activity Detection & Regulatory Compliance Platform
          </p>
          <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            FIU-IND &bull; PMLA 2002 &bull; FATF Surveillance Core
          </div>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 shadow-2xl backdrop-blur">
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                Operator Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="analyst / compliance / admin"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                Secure Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In & Open Executive Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Role Logins */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 mb-2.5 font-mono uppercase tracking-wider">
              Quick Role Authentication:
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickLogin('analyst', 'AnalystPassword@2026')}
                className="w-full text-left p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 hover:bg-sky-950/20 transition flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-sky-300 transition">
                    Vikram Mehta &bull; AML Analyst
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    L1 Alert Triage & Customer Surveillance
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  Sign In
                </span>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickLogin('compliance', 'CompliancePassword@2026')}
                className="w-full text-left p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 hover:bg-purple-950/20 transition flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-purple-300 transition">
                    Priya Sharma &bull; Chief Compliance Officer
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    L2 Case Review, SAR Approvals & Regulatory Filing
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  Sign In
                </span>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickLogin('admin', 'AdminPassword@2026')}
                className="w-full text-left p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/20 transition flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition">
                    Rajesh Kumar &bull; System Administrator
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Full Platform Access, Rule Engine & System Audit
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  Sign In
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center mt-6 text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
          <span>Encrypted Session with JWT & RBAC Access Controls</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
