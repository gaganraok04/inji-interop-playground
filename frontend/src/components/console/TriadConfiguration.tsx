import React from 'react';
import {
  IssuerOption,
  WalletOption,
  VerifierOption,
  CredentialFormat,
  TestResultOutcome,
} from '../../types';
import {
  Building2,
  Wallet,
  CheckCircle2,
  ArrowRight,
  Play,
  RotateCcw,
  SlidersHorizontal,
  FileCode,
  Zap,
} from 'lucide-react';

interface TriadConfigurationProps {
  issuer: IssuerOption;
  setIssuer: (val: IssuerOption) => void;
  wallet: WalletOption;
  setWallet: (val: WalletOption) => void;
  verifier: VerifierOption;
  setVerifier: (val: VerifierOption) => void;
  format: CredentialFormat;
  setFormat: (val: CredentialFormat) => void;
  scenario: TestResultOutcome;
  setScenario: (val: TestResultOutcome) => void;
  executionMode: 'animated' | 'instant';
  setExecutionMode: (val: 'animated' | 'instant') => void;
  onStartTest: () => void;
  onResetTest: () => void;
  isLoading: boolean;
  hasActiveTest: boolean;
}

export const TriadConfiguration: React.FC<TriadConfigurationProps> = ({
  issuer,
  setIssuer,
  wallet,
  setWallet,
  verifier,
  setVerifier,
  format,
  setFormat,
  scenario,
  setScenario,
  executionMode,
  setExecutionMode,
  onStartTest,
  onResetTest,
  isLoading,
  hasActiveTest,
}) => {
  const issuers: Array<{ id: IssuerOption; label: string; badge: string }> = [
    { id: 'Inji Certify', label: 'Inji Certify', badge: 'MOSIP Native' },
    { id: 'External OpenID4VCI Issuer', label: 'External OpenID4VCI Issuer', badge: 'Standard OID4VCI' },
  ];

  const wallets: Array<{ id: WalletOption; label: string; badge: string }> = [
    { id: 'Inji Web', label: 'Inji Web', badge: 'Browser Web' },
    { id: 'Inji Wallet', label: 'Inji Wallet', badge: 'Mobile App' },
    { id: 'External Wallet', label: 'External Wallet', badge: 'Standard OID4VCI/VP' },
  ];

  const verifiers: Array<{ id: VerifierOption; label: string; badge: string }> = [
    { id: 'Inji Verify', label: 'Inji Verify', badge: 'MOSIP Native' },
    { id: 'External OpenID4VP Verifier', label: 'External OpenID4VP Verifier', badge: 'Standard OID4VP' },
  ];

  const scenarios: TestResultOutcome[] = [
    'PASS',
    'FAIL',
    'VALID',
    'INVALID',
    'VALID BUT EXPIRED',
  ];

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-6">
      {/* Title & Visual Triad Breadcrumb Flow */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-parchment-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-copper-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-parchment-900 font-mono">
              QUICK CONFIGURATION
            </h2>
          </div>
          <p className="text-xs text-parchment-600 mt-0.5">
            Select issuer, wallet and verifier to start interoperability testing.
          </p>
        </div>

        {/* Visually communicate: Inji Certify → Inji Web → Inji Verify */}
        <div className="flex items-center space-x-2 text-xs font-semibold text-copper-900 bg-sand-100/90 px-3.5 py-1.5 rounded-xl border border-parchment-300 font-mono shadow-warm-sm">
          <span className="truncate max-w-[130px] font-bold">{issuer}</span>
          <ArrowRight className="w-3.5 h-3.5 text-copper-600 shrink-0" />
          <span className="truncate max-w-[130px] font-bold text-sky-900">{wallet}</span>
          <ArrowRight className="w-3.5 h-3.5 text-copper-600 shrink-0" />
          <span className="truncate max-w-[130px] font-bold">{verifier}</span>
        </div>
      </div>

      {/* 3 Connected Configuration Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Section 1: CREDENTIAL ISSUER */}
        <div className="space-y-2.5">
          <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-copper-800">
            <Building2 className="w-3.5 h-3.5 text-copper-700" />
            <span>1. Credential Issuer</span>
          </div>

          <div className="space-y-2">
            {issuers.map((item) => {
              const isSelected = issuer === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setIssuer(item.id)}
                  className={`w-full text-left px-3.5 py-3 rounded-xl border text-xs transition-all ${
                    isSelected
                      ? 'border-copper-600 bg-copper-50/90 shadow-warm-sm ring-1 ring-copper-500/40 text-parchment-900 font-semibold'
                      : 'border-parchment-200/90 hover:border-parchment-300 bg-cream/60 hover:bg-cream/90 text-parchment-700'
                  } ${isLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{item.label}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-sand-200/90 text-parchment-800 border border-parchment-300 font-mono font-medium">
                      {item.badge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: IDENTITY WALLET */}
        <div className="space-y-2.5">
          <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-sky-800">
            <Wallet className="w-3.5 h-3.5 text-sky-700" />
            <span>2. Identity Wallet</span>
          </div>

          <div className="space-y-2">
            {wallets.map((item) => {
              const isSelected = wallet === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setWallet(item.id)}
                  className={`w-full text-left px-3.5 py-3 rounded-xl border text-xs transition-all ${
                    isSelected
                      ? 'border-sky-600 bg-sky-50/80 shadow-warm-sm ring-1 ring-sky-500/40 text-parchment-900 font-semibold'
                      : 'border-parchment-200/90 hover:border-parchment-300 bg-cream/60 hover:bg-cream/90 text-parchment-700'
                  } ${isLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{item.label}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-sand-200/90 text-parchment-800 border border-parchment-300 font-mono font-medium">
                      {item.badge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: RELYING PARTY VERIFIER */}
        <div className="space-y-2.5">
          <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-copper-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-copper-700" />
            <span>3. Relying Party Verifier</span>
          </div>

          <div className="space-y-2">
            {verifiers.map((item) => {
              const isSelected = verifier === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setVerifier(item.id)}
                  className={`w-full text-left px-3.5 py-3 rounded-xl border text-xs transition-all ${
                    isSelected
                      ? 'border-copper-600 bg-copper-50/90 shadow-warm-sm ring-1 ring-copper-500/40 text-parchment-900 font-semibold'
                      : 'border-parchment-200/90 hover:border-parchment-300 bg-cream/60 hover:bg-cream/90 text-parchment-700'
                  } ${isLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{item.label}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-sand-200/90 text-parchment-800 border border-parchment-300 font-mono font-medium">
                      {item.badge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Format Selector & Scenario Selection Bar */}
      <div className="pt-4 border-t border-parchment-200/80 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        {/* Left side: Format and Scenario */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
          {/* Credential Format */}
          <div className="flex items-center space-x-2.5">
            <span className="text-xs font-bold text-parchment-800 flex items-center space-x-1.5 shrink-0">
              <FileCode className="w-3.5 h-3.5 text-copper-700" />
              <span>Format:</span>
            </span>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setFormat('W3C VC')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border text-center transition-all ${
                  format === 'W3C VC'
                    ? 'bg-copper-700 text-white border-copper-800 shadow-warm-sm'
                    : 'bg-cream/80 hover:bg-cream text-parchment-800 border-parchment-300'
                }`}
              >
                W3C VC
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => setFormat('SD-JWT VC')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border text-center transition-all ${
                  format === 'SD-JWT VC'
                    ? 'bg-copper-700 text-white border-copper-800 shadow-warm-sm'
                    : 'bg-cream/80 hover:bg-cream text-parchment-800 border-parchment-300'
                }`}
              >
                SD-JWT VC
              </button>
            </div>
          </div>

          {/* Scenario Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-parchment-800 flex items-center space-x-1.5 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-copper-700" />
              <span>Scenario:</span>
            </span>

            <div className="flex flex-wrap gap-1.5">
              {scenarios.map((sc) => (
                <button
                  key={sc}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setScenario(sc)}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-mono transition-all ${
                    scenario === sc
                      ? 'bg-copper-100/90 text-copper-900 border border-copper-400 font-bold shadow-warm-sm ring-1 ring-copper-400/40'
                      : 'bg-sand-100 hover:bg-sand-200 text-parchment-700 border border-parchment-300 font-medium'
                  }`}
                >
                  {sc}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right side: Execution Mode Toggle + Reset + START TEST */}
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          {/* Execution Mode Selector: [ ▶ Animated ] [ ⚡ Instant ] */}
          <div className="flex items-center rounded-xl bg-sand-100 p-0.5 border border-parchment-300 text-[11px] font-mono shadow-warm-sm shrink-0">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setExecutionMode('animated')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1 font-semibold transition-all ${
                executionMode === 'animated'
                  ? 'bg-cream text-copper-900 shadow-warm-sm border border-parchment-300'
                  : 'text-parchment-700 hover:text-parchment-900'
              }`}
              title="Run step-by-step with synchronized visual animation"
            >
              <Play className="w-3 h-3 fill-current text-copper-700" />
              <span>Animated</span>
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setExecutionMode('instant')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1 font-semibold transition-all ${
                executionMode === 'instant'
                  ? 'bg-cream text-copper-900 shadow-warm-sm border border-parchment-300'
                  : 'text-parchment-700 hover:text-parchment-900'
              }`}
              title="Execute test immediately without sequential delays"
            >
              <Zap className="w-3 h-3 text-copper-700" />
              <span>Instant</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onResetTest}
            disabled={isLoading || !hasActiveTest}
            className="px-3 py-2 rounded-xl border border-parchment-300 bg-sand-100 hover:bg-sand-200 text-parchment-800 text-xs font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-warm-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-copper-700" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={onStartTest}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-copper-700 hover:bg-copper-800 active:bg-copper-900 text-white text-xs font-semibold shadow-warm-md flex items-center space-x-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>START INTEROPERABILITY TEST</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
