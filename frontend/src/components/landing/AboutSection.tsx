import { Globe, Smartphone, CheckSquare } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-16 border-b border-parchment-300 bg-sand-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-copper-700 bg-copper-50 px-3 py-1 rounded-full border border-copper-200">
            About MOSIP & Inji
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-parchment-900">
            Open Digital Public Infrastructure for Identity
          </h2>
          <p className="mt-2 text-sm text-parchment-700 leading-relaxed">
            MOSIP (Modular Open Source Identity Platform) is a digital public good enabling nations and
            organizations to build inclusive, privacy-respecting foundational and functional identity systems.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-cream border border-parchment-300 rounded-xl p-6 shadow-warm-sm">
            <div className="w-9 h-9 rounded-lg bg-copper-50 border border-copper-200 flex items-center justify-center mb-3">
              <Globe className="w-5 h-5 text-copper-700" />
            </div>
            <h3 className="text-sm font-bold text-parchment-900">Global DPI Foundation</h3>
            <p className="text-xs text-parchment-700 mt-2 leading-relaxed">
              Adopted by multiple sovereign nations to empower citizens with portable, verifiable identity credentials without proprietary platform lock-in.
            </p>
          </div>

          <div className="bg-cream border border-parchment-300 rounded-xl p-6 shadow-warm-sm">
            <div className="w-9 h-9 rounded-lg bg-copper-50 border border-copper-200 flex items-center justify-center mb-3">
              <Smartphone className="w-5 h-5 text-copper-700" />
            </div>
            <h3 className="text-sm font-bold text-parchment-900">The Inji Ecosystem</h3>
            <p className="text-xs text-parchment-700 mt-2 leading-relaxed">
              Comprises Inji Certify (Issuance), Inji Wallet (Mobile App), Inji Web (Browser Wallet), and Inji Verify (Verifier Portal) — all communicating via open W3C and OpenID protocols.
            </p>
          </div>

          <div className="bg-cream border border-parchment-300 rounded-xl p-6 shadow-warm-sm">
            <div className="w-9 h-9 rounded-lg bg-copper-50 border border-copper-200 flex items-center justify-center mb-3">
              <CheckSquare className="w-5 h-5 text-copper-700" />
            </div>
            <h3 className="text-sm font-bold text-parchment-900">Decode 2026 Challenge</h3>
            <p className="text-xs text-parchment-700 mt-2 leading-relaxed">
              Problem Statement 2 focuses on accelerating interoperability through sandbox testing, ensuring seamless communication between Inji components and external identity providers.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
