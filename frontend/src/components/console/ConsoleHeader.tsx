import React from 'react';
import { RefreshCw, ShieldCheck, Layers, GitCommit, Table2 } from 'lucide-react';
import { HealthStatus, ConsoleView } from '../../types';

interface ConsoleHeaderProps {
  onNavigateHome: () => void;
  activeView: ConsoleView;
  onSelectView: (view: ConsoleView) => void;
  health: HealthStatus | null;
  healthLoading: boolean;
  healthError?: string | null;
  onRefreshHealth: () => void;
}

export const ConsoleHeader: React.FC<ConsoleHeaderProps> = ({
  onNavigateHome,
  activeView,
  onSelectView,
  health,
  healthLoading,
  healthError,
  onRefreshHealth,
}) => {
  const isConnected = !!health && health.status === 'ok';

  return (
    <header className="sticky top-0 z-40 glass-header">
      {/* Top Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Product Name - Clickable to return to Landing Page */}
          <div
            onClick={onNavigateHome}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onNavigateHome();
              }
            }}
            tabIndex={0}
            role="button"
            aria-label="Return to Landing Page"
            className="flex items-center space-x-3 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper-500 rounded-lg p-1 transition-all"
            title="Return to Landing Page"
          >
            <div className="w-9 h-9 rounded-lg bg-copper-700 group-hover:bg-copper-800 text-white flex items-center justify-center shadow-warm-sm transition-colors">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-parchment-900 group-hover:text-copper-800 transition-colors tracking-tight">
                  Inji Interoperability Playground
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sand-200/80 text-copper-900 border border-parchment-300 font-mono">
                  MOSIP DECODE 2026
                </span>
              </div>
              <p className="text-[11px] text-parchment-600 font-medium">
                Unified Sandbox for Verifiable Credential Interoperability
              </p>
            </div>
          </div>

          {/* Center Main Application Navigation Tabs: [ Test Console ] [ Protocol Flow ] [ Matrix ] */}
          <nav
            aria-label="Console Navigation"
            className="hidden md:flex items-center space-x-1.5 p-1 rounded-xl bg-sand-100/90 border border-parchment-300/80 glass-subtle"
          >
            <button
              type="button"
              onClick={() => onSelectView('console')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                activeView === 'console'
                  ? 'bg-cream text-copper-900 shadow-warm-sm border border-parchment-300'
                  : 'text-parchment-700 hover:text-parchment-900 hover:bg-cream/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-copper-700" />
              <span>Test Console</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectView('protocol-flow')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                activeView === 'protocol-flow'
                  ? 'bg-cream text-copper-900 shadow-warm-sm border border-parchment-300'
                  : 'text-parchment-700 hover:text-parchment-900 hover:bg-cream/50'
              }`}
            >
              <GitCommit className="w-3.5 h-3.5 text-copper-700" />
              <span>Protocol Flow</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectView('matrix')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                activeView === 'matrix'
                  ? 'bg-cream text-copper-900 shadow-warm-sm border border-parchment-300'
                  : 'text-parchment-700 hover:text-parchment-900 hover:bg-cream/50'
              }`}
            >
              <Table2 className="w-3.5 h-3.5 text-copper-700" />
              <span>Matrix</span>
            </button>
          </nav>

          {/* Right API Status Indicator */}
          <div className="flex items-center space-x-3 text-xs">
            <div
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isConnected
                  ? 'bg-cream/90 border-[#B7E4C7] text-[#2D6A4F] shadow-warm-sm'
                  : healthLoading && !health
                  ? 'bg-cream/90 border-[#FDE68A] text-[#B45309] shadow-warm-sm'
                  : 'bg-rose-50/90 border-rose-300 text-rose-800 shadow-warm-sm'
              }`}
              title={
                isConnected
                  ? `Playground API Online (v${health.version})`
                  : healthLoading && !health
                  ? 'Connecting to Playground API...'
                  : healthError || 'Playground API Disconnected'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected
                    ? 'bg-emerald-600'
                    : healthLoading && !health
                    ? 'bg-amber-600 animate-pulse'
                    : 'bg-rose-600'
                }`}
              />
              <span className="font-mono text-[11px] font-semibold">
                {isConnected
                  ? 'API Online'
                  : healthLoading && !health
                  ? 'Connecting API...'
                  : 'API Disconnected'}
              </span>
              <button
                type="button"
                onClick={onRefreshHealth}
                disabled={healthLoading}
                aria-label="Refresh API connection"
                className="ml-1 p-0.5 text-parchment-500 hover:text-copper-700 rounded transition-colors"
                title="Refresh connection"
              >
                <RefreshCw className={`w-3 h-3 ${healthLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-center space-x-1 pb-2 pt-1 border-t border-parchment-200">
          <button
            type="button"
            onClick={() => onSelectView('console')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              activeView === 'console'
                ? 'bg-copper-700 text-white shadow-warm-sm'
                : 'text-parchment-700 hover:bg-sand-100'
            }`}
          >
            Test Console
          </button>
          <button
            type="button"
            onClick={() => onSelectView('protocol-flow')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              activeView === 'protocol-flow'
                ? 'bg-copper-700 text-white shadow-warm-sm'
                : 'text-parchment-700 hover:bg-sand-100'
            }`}
          >
            Protocol Flow
          </button>
          <button
            type="button"
            onClick={() => onSelectView('matrix')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              activeView === 'matrix'
                ? 'bg-copper-700 text-white shadow-warm-sm'
                : 'text-parchment-700 hover:bg-sand-100'
            }`}
          >
            Matrix
          </button>
        </div>
      </div>

      {/* Subheader Banner: TEST • INSPECT • VERIFY + Statistics & Sandbox Pill */}
      <div className="bg-sand-50/70 border-t border-parchment-300/80 px-4 py-2 text-xs text-parchment-700">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Headline and Subtitle */}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold text-copper-800 tracking-wider">
                TEST • INSPECT • VERIFY
              </span>
              <span className="text-parchment-400">•</span>
              <span className="text-[11px] text-parchment-700 font-medium">
                Simulate and test OpenID4VCI and OpenID4VP interoperability across Inji services.
              </span>
            </div>
          </div>

          {/* Compact Statistics Badges & Sandbox Mode Pill */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
            <span className="px-2 py-0.5 rounded bg-cream/80 border border-parchment-300 text-parchment-800">
              8 Protocol Steps
            </span>
            <span className="px-2 py-0.5 rounded bg-cream/80 border border-parchment-300 text-parchment-800">
              3 Inji Services
            </span>
            <span className="px-2 py-0.5 rounded bg-cream/80 border border-parchment-300 text-parchment-800">
              4 Formats
            </span>
            <span className="px-2 py-0.5 rounded bg-cream/80 border border-parchment-300 text-parchment-800">
              24+ Combinations
            </span>
            {healthLoading && !health ? (
              <span
                className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                title="Checking backend runtime status..."
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
                CHECKING RUNTIME...
              </span>
            ) : (!isConnected || healthError) ? (
              <span
                className="px-2.5 py-0.5 rounded-full bg-rose-100 border border-rose-300 text-rose-800 font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                title={healthError || "Cannot connect to backend API"}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                CONNECTION ERROR
              </span>
            ) : (health?.real_stack_connected || health?.runtime_label === 'REAL INJI STACK' || health?.runtime_mode === 'REAL_INJI_STACK_ONLINE') ? (
              <span
                className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-400 text-emerald-900 font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                title="Live MOSIP Inji services (Certify, Verify & Wallet stack) are reachable and operational."
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                REAL INJI STACK
              </span>
            ) : (health?.real_stack_configured || health?.runtime_label === 'REAL INJI STACK (OFFLINE)' || health?.runtime_mode === 'REAL_INJI_STACK_OFFLINE' || (health?.services?.inji_certify?.configured && health?.services?.inji_verify?.configured)) ? (
              <span
                className="px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-400 text-amber-900 font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                title="Real Inji Stack endpoints are configured in runtime environment, but live services are currently offline / unreachable."
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                REAL INJI STACK (OFFLINE)
              </span>
            ) : (
              <span
                className="px-2 py-0.5 rounded bg-copper-100/90 border border-copper-300 text-copper-900 font-bold uppercase tracking-wider"
                title="Running in local sandbox simulation mode."
              >
                SANDBOX MODE
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
