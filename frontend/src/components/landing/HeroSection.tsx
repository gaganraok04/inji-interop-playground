import React from 'react';
import { ArrowRight, BookOpen, Layers, CheckCircle2 } from 'lucide-react';

interface HeroSectionProps {
  onNavigateToConsole: () => void;
  onLearnMore: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onNavigateToConsole,
  onLearnMore,
}) => {
  return (
    <section className="relative pt-12 pb-16 md:pt-16 md:pb-24 border-b border-parchment-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Top Hackathon & Problem Statement Pill */}
        <div className="inline-flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-sand-100 border border-parchment-400 text-copper-800 text-xs font-semibold mb-6 shadow-warm-sm">
          <span className="w-2 h-2 rounded-full bg-copper-600 animate-pulse" />
          <span>MOSIP DECODE 2026</span>
          <span className="text-parchment-500">•</span>
          <span className="text-parchment-800">Problem Statement 2</span>
        </div>

        {/* Title & Tagline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-parchment-900 tracking-tight max-w-4xl mx-auto leading-tight">
          Inji Interoperability Playground
        </h1>

        <p className="mt-4 text-lg sm:text-xl font-medium text-copper-700 italic max-w-3xl mx-auto">
          &ldquo;A Unified Sandbox for Verifiable Credential Interoperability Testing&rdquo;
        </p>

        <p className="mt-4 text-sm sm:text-base text-parchment-700 max-w-2xl mx-auto leading-relaxed">
          Test, debug, and inspect end-to-end verifiable credential exchange protocols across
          diverse Issuers, Identity Wallets, and Relying Party Verifiers in an automated,
          standards-compliant testing laboratory.
        </p>

        {/* Primary and Secondary CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={onNavigateToConsole}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-copper-600 hover:bg-copper-700 text-white font-semibold text-sm shadow-warm-md flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>START INTEROPERABILITY TEST</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onLearnMore}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-cream border border-parchment-300 hover:bg-sand-100 text-parchment-800 font-medium text-sm shadow-warm-sm flex items-center justify-center space-x-2 transition-colors"
          >
            <BookOpen className="w-4 h-4 text-copper-600" />
            <span>LEARN MORE</span>
          </button>
        </div>

        {/* Visual Credential Flow Diagram: Inji Certify -> Inji Wallet / Inji Web -> Inji Verify */}
        <div className="mt-14 pt-8 border-t border-parchment-200/80 max-w-4xl mx-auto">
          <div className="text-xs font-bold tracking-wider uppercase text-parchment-600 mb-6 flex items-center justify-center space-x-2">
            <Layers className="w-4 h-4 text-copper-600" />
            <span>The Interoperability Trust Triad</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Step 1: Issuer */}
            <div className="bg-cream border border-parchment-300 rounded-xl p-5 shadow-warm-sm text-left relative group hover:border-copper-400 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-copper-700 bg-copper-50 px-2 py-0.5 rounded border border-copper-200">
                  Step 1 • Issuer
                </span>
                <span className="text-xs text-parchment-500 font-mono">OID4VCI</span>
              </div>
              <h3 className="text-base font-bold text-parchment-900">Inji Certify</h3>
              <p className="text-xs text-parchment-700 mt-1">
                Generates Credential Offers, issues W3C VCs and SD-JWT VCs with proof-of-possession.
              </p>
            </div>

            {/* Down/Right Arrow for Mobile/Desktop */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-sand-200 border border-parchment-300 flex items-center justify-center text-copper-700 font-bold shadow-warm-sm">
                ↓
              </div>
              <span className="text-[11px] font-mono text-copper-700 mt-1 font-semibold">
                Issuance
              </span>
            </div>

            {/* Step 2: Wallet */}
            <div className="bg-cream border border-parchment-300 rounded-xl p-5 shadow-warm-sm text-left relative group hover:border-copper-400 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-copper-700 bg-copper-50 px-2 py-0.5 rounded border border-copper-200">
                  Step 2 • Wallet
                </span>
                <span className="text-xs text-parchment-500 font-mono">Holder</span>
              </div>
              <h3 className="text-base font-bold text-parchment-900">Inji Wallet / Web</h3>
              <p className="text-xs text-parchment-700 mt-1">
                Secures cryptographic keys, evaluates consent, and produces selective disclosures.
              </p>
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-sand-200 border border-parchment-300 flex items-center justify-center text-copper-700 font-bold shadow-warm-sm">
                ↓
              </div>
              <span className="text-[11px] font-mono text-copper-700 mt-1 font-semibold">
                Presentation & Verification
              </span>
            </div>
          </div>

          <div className="mt-4 max-w-sm mx-auto">
            {/* Step 3: Verifier */}
            <div className="bg-cream border border-parchment-300 rounded-xl p-5 shadow-warm-sm text-left relative group hover:border-copper-400 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-copper-700 bg-copper-50 px-2 py-0.5 rounded border border-copper-200">
                  Step 3 • Verifier
                </span>
                <span className="text-xs text-parchment-500 font-mono">OID4VP</span>
              </div>
              <h3 className="text-base font-bold text-parchment-900">Inji Verify</h3>
              <p className="text-xs text-parchment-700 mt-1">
                Validates VP tokens, cryptographic signatures, schema integrity, and revocation status.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Highlights Badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-parchment-700 font-medium">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-copper-600" />
            <span>OpenID4VCI & OpenID4VP Conformance</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-copper-600" />
            <span>Interactive 8-Stage Inspection</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-copper-600" />
            <span>Zero Synthetic / Invented Cryptography</span>
          </div>
        </div>
      </div>
    </section>
  );
};
