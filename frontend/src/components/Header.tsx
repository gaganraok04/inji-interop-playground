import React from 'react';
import { Sun, Moon, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { HealthStatus } from '../types';

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  health: HealthStatus | null;
  healthLoading: boolean;
  healthError?: string | null;
  onRefreshHealth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDark,
  onToggleTheme,
  health,
  healthLoading,
  healthError,
  onRefreshHealth,
}) => {
  const isConnected = !!health && health.status === 'ok';

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-40 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Project Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Inji Interoperability Playground
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300/50 dark:border-sky-800">
                  MOSIP Decode 2026
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Problem Statement 2: Unified Sandbox for Verifiable Credential Interoperability Testing
              </p>
            </div>
          </div>

          {/* Right Action Controls: Backend Status & Theme Toggle */}
          <div className="flex items-center space-x-4">
            {/* Backend Connection Status Badge */}
            <div className="flex items-center space-x-2 text-xs">
              <div
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md border font-medium transition-all ${
                  isConnected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                    : healthLoading && !health
                    ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
                    : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                }`}
                title={
                  isConnected
                    ? `Connected to Inji Playground Backend (v${health.version})`
                    : healthLoading && !health
                    ? 'Connecting to Backend API...'
                    : healthError || 'Backend API Disconnected'
                }
              >
                {isConnected ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Backend: Online</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-1 font-mono">
                      {health?.real_stack_connected || health?.runtime_label === 'REAL INJI STACK'
                        ? '(Real Inji Stack)'
                        : (health?.real_stack_configured || health?.runtime_label === 'REAL INJI STACK (OFFLINE)' || (health?.services?.inji_certify?.configured && health?.services?.inji_verify?.configured))
                        ? '(Real Inji - Offline)'
                        : '(Sandbox)'}
                    </span>
                  </>
                ) : healthLoading && !health ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-spin" />
                    <span>Connecting API...</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    <span>Backend: Disconnected</span>
                  </>
                )}
              </div>

              <button
                onClick={onRefreshHealth}
                disabled={healthLoading}
                aria-label="Refresh status"
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
                title="Refresh connection status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Dark / Light Mode Switcher */}
            <button
              onClick={onToggleTheme}
              aria-label="Toggle dark mode"
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Sandbox & Compliance Disclaimer Banner */}
      <div className="bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/80 px-4 py-1.5 text-[11px] text-slate-600 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            <span>
              {health?.real_stack_connected ? (
                <>
                  <strong>Real MOSIP Inji Stack:</strong> Live OpenID4VCI and OpenID4VP services operational.
                </>
              ) : (health?.real_stack_configured || (health?.services?.inji_certify?.configured && health?.services?.inji_verify?.configured)) ? (
                <>
                  <strong>Real MOSIP Inji Stack Configured:</strong> Endpoints configured in environment; awaiting live service connection.
                </>
              ) : (
                <>
                  <strong>Sandbox Protocol Testing:</strong> Real MOSIP Inji services (Certify, Wallet, Verify) will be linked via service endpoints. No fake cryptographic assertions.
                </>
              )}
            </span>
          </div>
          <div className="hidden sm:flex items-center space-x-3 text-slate-500">
            <span>OID4VCI Draft 13</span>
            <span>•</span>
            <span>OID4VP Draft 20</span>
            <span>•</span>
            <span>W3C VC & SD-JWT</span>
          </div>
        </div>
      </div>
    </header>
  );
};
