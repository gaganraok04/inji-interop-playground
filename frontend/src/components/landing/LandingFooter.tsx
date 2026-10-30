import React from 'react';
import { ShieldCheck, Terminal, ExternalLink } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="border-t border-parchment-300 bg-cream py-10 text-xs text-parchment-700">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-copper-600 flex items-center justify-center text-white shadow-warm-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-parchment-900">
                Inji Interoperability Playground
              </div>
              <div className="text-[11px] text-copper-700">
                MOSIP DECODE 2026 • Problem Statement 2
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-[11px]">
            <a
              href="https://mosip.io"
              target="_blank"
              rel="noreferrer"
              className="hover:text-copper-700 flex items-center space-x-1 transition-colors"
            >
              <span>MOSIP Project</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <a
              href="https://inji.io"
              target="_blank"
              rel="noreferrer"
              className="hover:text-copper-700 flex items-center space-x-1 transition-colors"
            >
              <span>Inji Docs</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <a
              href="https://openid.net/foundation/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-copper-700 flex items-center space-x-1 transition-colors"
            >
              <span>OpenID Foundation</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>

          <div className="flex items-center space-x-2 font-mono text-[11px] text-parchment-600">
            <Terminal className="w-3.5 h-3.5 text-copper-600" />
            <span>v1.0.0 • Sandbox Edition</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
