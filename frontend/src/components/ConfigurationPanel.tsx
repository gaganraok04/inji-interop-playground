import React from 'react';
import {
  IssuerOption,
  WalletOption,
  VerifierOption,
  CredentialFormat,
} from '../types';
import { Building2, Wallet, CheckCircle2, FileCode, Layers } from 'lucide-react';

interface ConfigurationPanelProps {
  issuer: IssuerOption;
  setIssuer: (val: IssuerOption) => void;
  wallet: WalletOption;
  setWallet: (val: WalletOption) => void;
  verifier: VerifierOption;
  setVerifier: (val: VerifierOption) => void;
  format: CredentialFormat;
  setFormat: (val: CredentialFormat) => void;
  disabled?: boolean;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  issuer,
  setIssuer,
  wallet,
  setWallet,
  verifier,
  setVerifier,
  format,
  setFormat,
  disabled = false,
}) => {
  const issuers: Array<{ id: IssuerOption; label: string; badge: string; desc: string }> = [
    {
      id: 'Inji Certify',
      label: 'Inji Certify',
      badge: 'MOSIP Native',
      desc: 'MOSIP credential issuance engine supporting OID4VCI',
    },
    {
      id: 'External OpenID4VCI Issuer',
      label: 'External OpenID4VCI Issuer',
      badge: 'Standard OID4VCI',
      desc: 'Third-party OID4VCI compliant identity provider',
    },
  ];

  const wallets: Array<{ id: WalletOption; label: string; badge: string; desc: string }> = [
    {
      id: 'Inji Web',
      label: 'Inji Web',
      badge: 'Web App',
      desc: 'Browser-based decentralized identity wallet',
    },
    {
      id: 'Inji Wallet',
      label: 'Inji Wallet',
      badge: 'Mobile App',
      desc: 'Native mobile wallet backed by Mimoto identity bridge',
    },
    {
      id: 'External Wallet',
      label: 'External Wallet',
      badge: 'Open Wallet',
      desc: 'OID4VCI & OID4VP standard compliant third-party wallet',
    },
  ];

  const verifiers: Array<{ id: VerifierOption; label: string; badge: string; desc: string }> = [
    {
      id: 'Inji Verify',
      label: 'Inji Verify',
      badge: 'MOSIP Native',
      desc: 'High-assurance verification engine and portal',
    },
    {
      id: 'External OpenID4VP Verifier',
      label: 'External OpenID4VP Verifier',
      badge: 'Standard OID4VP',
      desc: 'Relying party implementing OpenID4VP / ISO 18013-7',
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-700 dark:text-slate-300">
            Interoperability Test Matrix Configuration
          </h2>
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
          RFC / Spec Driven Triad
        </span>
      </div>

      {/* 3-Column Grid for ISSUER, WALLET, VERIFIER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Column 1: ISSUER */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
            <Building2 className="w-4 h-4 text-sky-500" />
            <span>1. Issuer (OID4VCI)</span>
          </div>

          <div className="space-y-2.5">
            {issuers.map((item) => {
              const isSelected = issuer === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setIssuer(item.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all text-xs ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/40 ring-1 ring-sky-500/50 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                  } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {item.label}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        isSelected
                          ? 'bg-sky-200/70 text-sky-800 dark:bg-sky-900 dark:text-sky-200'
                          : 'bg-slate-200/60 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {item.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 2: WALLET */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
            <Wallet className="w-4 h-4 text-emerald-500" />
            <span>2. Wallet (Holder)</span>
          </div>

          <div className="space-y-2.5">
            {wallets.map((item) => {
              const isSelected = wallet === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setWallet(item.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all text-xs ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-1 ring-emerald-500/50 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                  } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {item.label}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        isSelected
                          ? 'bg-emerald-200/70 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                          : 'bg-slate-200/60 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {item.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 3: VERIFIER */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-purple-500" />
            <span>3. Verifier (OID4VP)</span>
          </div>

          <div className="space-y-2.5">
            {verifiers.map((item) => {
              const isSelected = verifier === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setVerifier(item.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all text-xs ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 ring-1 ring-purple-500/50 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                  } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {item.label}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        isSelected
                          ? 'bg-purple-200/70 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : 'bg-slate-200/60 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {item.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Credential Format Selector */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <FileCode className="w-4 h-4 text-sky-500" />
            <span>Target Credential Format:</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:w-auto">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setFormat('W3C VC')}
              className={`px-4 py-2 rounded-lg text-xs font-medium border flex items-center justify-center space-x-2 transition-all ${
                format === 'W3C VC'
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700/80'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span>W3C VC</span>
              <span className="text-[10px] opacity-80">(JSON-LD)</span>
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={() => setFormat('SD-JWT VC')}
              className={`px-4 py-2 rounded-lg text-xs font-medium border flex items-center justify-center space-x-2 transition-all ${
                format === 'SD-JWT VC'
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700/80'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span>SD-JWT VC</span>
              <span className="text-[10px] opacity-80">(Selective Disclosure)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
