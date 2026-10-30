import React from 'react';
import { Terminal, GitCommit, Table, ShieldAlert } from 'lucide-react';

export const FeatureSection: React.FC = () => {
  const features = [
    {
      icon: <Terminal className="w-5 h-5 text-copper-700" />,
      title: 'Full-Stack Protocol Inspector',
      desc: 'Inspect granular HTTP payloads across all 8 lifecycle stages. Examine request bodies, authorization grants, token responses, and cryptographic proof containers with copy and download utilities.',
    },
    {
      icon: <GitCommit className="w-5 h-5 text-copper-700" />,
      title: 'Live Interactive Sequence Engine',
      desc: 'Visualize dynamic message exchange among Inji Certify, Inji Wallet/Web, and Inji Verify. Highlights participating endpoints and animates protocol packets on step selection.',
    },
    {
      icon: <Table className="w-5 h-5 text-copper-700" />,
      title: '24-Permutation Matrix Validation',
      desc: 'Quickly evaluate combinations of MOSIP Inji native services alongside third-party OpenID4VCI and OpenID4VP implementations across W3C VC and SD-JWT formats with single-click test loading.',
    },
    {
      icon: <ShieldAlert className="w-5 h-5 text-copper-700" />,
      title: 'Honest Sandbox Architecture',
      desc: 'Built with strict adherence to architectural integrity. No mock cryptography or fabricated Inji endpoints. Clean service interfaces are primed for direct live Inji API deployment.',
    },
  ];

  return (
    <section id="features" className="py-16 border-b border-parchment-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-copper-700 bg-copper-50 px-3 py-1 rounded-full border border-copper-200">
            Developer Tooling Capabilities
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-parchment-900">
            Designed for Identity Architects & Implementers
          </h2>
          <p className="mt-2 text-sm text-parchment-700">
            Built to debug complex identity credential handshakes, diagnose syntax discrepancies, and confirm
            interoperability before production deployment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="bg-cream border border-parchment-300 rounded-xl p-5 shadow-warm-sm hover:shadow-warm-md hover:border-copper-400 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-lg bg-copper-50 border border-copper-200 flex items-center justify-center mb-4">
                  {feat.icon}
                </div>
                <h3 className="text-sm font-bold text-parchment-900 mb-2">
                  {feat.title}
                </h3>
                <p className="text-xs text-parchment-700 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
