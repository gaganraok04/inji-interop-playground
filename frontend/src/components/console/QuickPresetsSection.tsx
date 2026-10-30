import React from 'react';
import { IssuerOption, WalletOption, VerifierOption, CredentialFormat } from '../../types';
import { Sparkles, ArrowRight, Table2 } from 'lucide-react';

interface QuickPresetsSectionProps {
  onApplyPreset: (config: {
    issuer: IssuerOption;
    wallet: WalletOption;
    verifier: VerifierOption;
    format: CredentialFormat;
  }) => void;
  onOpenFullMatrix: () => void;
}

export const QuickPresetsSection: React.FC<QuickPresetsSectionProps> = ({
  onApplyPreset,
  onOpenFullMatrix,
}) => {
  const presets = [
    {
      id: 'full-inji',
      title: 'Full Inji Native Stack',
      tag: 'MOSIP Reference',
      issuer: 'Inji Certify' as IssuerOption,
      wallet: 'Inji Web' as WalletOption,
      verifier: 'Inji Verify' as VerifierOption,
      format: 'W3C VC' as CredentialFormat,
      desc: 'Standard MOSIP reference implementation validating end-to-end native W3C VC issuance and verification.',
    },
    {
      id: 'mobile-sdjwt',
      title: 'Mobile Selective Disclosure',
      tag: 'Edge SD-JWT',
      issuer: 'Inji Certify' as IssuerOption,
      wallet: 'Inji Wallet' as WalletOption,
      verifier: 'Inji Verify' as VerifierOption,
      format: 'SD-JWT VC' as CredentialFormat,
      desc: 'Privacy-preserving selective disclosure issuance and verification on mobile device identity storage.',
    },
    {
      id: 'external-interop',
      title: 'External Wallet Interop',
      tag: 'Cross-Ecosystem',
      issuer: 'Inji Certify' as IssuerOption,
      wallet: 'External Wallet' as WalletOption,
      verifier: 'Inji Verify' as VerifierOption,
      format: 'W3C VC' as CredentialFormat,
      desc: 'Validates OpenID4VCI & OpenID4VP boundary protocols with third-party digital identity wallets.',
    },
  ];

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-warm-sm space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-parchment-200/80 pb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-copper-700" />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-parchment-900 font-mono">
              QUICK TEST PRESETS
            </h2>
            <p className="text-[11px] text-parchment-700">
              One-click standard interoperability configurations across Inji and external partners.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenFullMatrix}
          className="text-xs font-semibold text-copper-800 hover:text-copper-900 flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-parchment-300 bg-cream hover:bg-sand-100 transition-colors shadow-warm-sm self-start sm:self-auto"
        >
          <Table2 className="w-3.5 h-3.5 text-copper-700" />
          <span>Open Full Matrix</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Preset cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {presets.map((p) => (
          <div
            key={p.id}
            className="p-3.5 rounded-xl border border-parchment-200/90 bg-cream/70 hover:bg-cream hover:border-copper-400 transition-all shadow-warm-sm flex flex-col justify-between space-y-3 group"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-parchment-900 group-hover:text-copper-800 transition-colors">
                  {p.title}
                </span>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-sand-200/80 text-parchment-800 border border-parchment-300">
                  {p.tag}
                </span>
              </div>
              <p className="text-[11px] text-parchment-700 leading-snug">
                {p.desc}
              </p>
              <div className="pt-1 flex items-center space-x-1.5 font-mono text-[11px] text-parchment-800 flex-wrap">
                <span className="font-semibold text-copper-900">{p.issuer}</span>
                <span className="text-copper-600">→</span>
                <span className="font-semibold text-sky-900">{p.wallet}</span>
                <span className="text-copper-600">→</span>
                <span className="font-semibold text-copper-900">{p.verifier}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-parchment-200/80">
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-sand-100 border border-parchment-300 text-copper-800">
                {p.format}
              </span>
              <button
                type="button"
                onClick={() =>
                  onApplyPreset({
                    issuer: p.issuer,
                    wallet: p.wallet,
                    verifier: p.verifier,
                    format: p.format,
                  })
                }
                className="text-[11px] font-semibold text-copper-800 hover:text-white hover:bg-copper-700 border border-parchment-300 px-2.5 py-1 rounded-lg transition-colors bg-sand-100 shadow-warm-sm"
              >
                Load Preset
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
