import React from 'react';
import { HeroSection } from './HeroSection';
import { StandardsSection } from './StandardsSection';
import { FeatureSection } from './FeatureSection';
import { AboutSection } from './AboutSection';
import { LandingFooter } from './LandingFooter';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { HealthStatus } from '../../types';

interface LandingPageProps {
  onNavigateToConsole: () => void;
  health: HealthStatus | null;
  healthError?: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToConsole,
  health,
  healthError,
}) => {
  const isConnected = !!health && health.status === 'ok';

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-parchment-100 text-parchment-900 flex flex-col font-sans selection:bg-copper-100 selection:text-copper-900">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-parchment-300 shadow-warm-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo and title */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-copper-600 flex items-center justify-center text-white shadow-warm-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-parchment-900">
                Inji Interoperability Playground
              </div>
              <div className="text-[10px] text-copper-700 font-semibold tracking-wider uppercase">
                MOSIP Decode 2026
              </div>
            </div>
          </div>

          {/* Navigation Links & Launch Button */}
          <div className="flex items-center space-x-5">
            <nav className="hidden md:flex items-center space-x-5 text-xs font-medium text-parchment-700">
              <button
                type="button"
                onClick={() => scrollToSection('standards')}
                className="hover:text-copper-700 transition-colors"
              >
                Standards
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('features')}
                className="hover:text-copper-700 transition-colors"
              >
                Features
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('about')}
                className="hover:text-copper-700 transition-colors"
              >
                About Inji
              </button>
            </nav>

            {/* Connection badge */}
            <div
              className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-all ${
                isConnected
                  ? 'bg-sand-100 border-[#B7E4C7] text-parchment-800'
                  : healthError
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : 'bg-sand-100 border-parchment-300 text-parchment-800'
              }`}
              title={
                isConnected
                  ? 'Playground API Online'
                  : healthError || 'Connecting to Playground API...'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected
                    ? 'bg-emerald-600'
                    : healthError
                    ? 'bg-rose-600'
                    : 'bg-copper-500 animate-pulse'
                }`}
              />
              <span className="font-mono text-[10px]">
                {isConnected
                  ? 'API Online'
                  : healthError
                  ? 'API Offline'
                  : 'Connecting...'}
              </span>
            </div>

            {/* Primary Launch Action */}
            <button
              type="button"
              onClick={onNavigateToConsole}
              className="px-4 py-2 rounded-lg bg-copper-600 hover:bg-copper-700 text-white font-semibold text-xs shadow-warm-sm flex items-center space-x-1.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>Launch Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Sections */}
      <main className="flex-1">
        <HeroSection
          onNavigateToConsole={onNavigateToConsole}
          onLearnMore={() => scrollToSection('standards')}
        />
        <StandardsSection />
        <FeatureSection />
        <AboutSection />
      </main>

      <LandingFooter />
    </div>
  );
};
