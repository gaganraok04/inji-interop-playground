import React from 'react';
import { ShieldCheck, FileJson, KeyRound, QrCode } from 'lucide-react';

export const StandardsSection: React.FC = () => {
  const standards = [
    {
      id: 'openid4vci',
      code: 'OpenID4VCI',
      draft: 'Draft 13 / ISO 18013-7',
      role: 'Credential Issuance Protocol',
      icon: <QrCode className="w-5 h-5 text-copper-700" />,
      description:
        'Standard protocol allowing Digital Wallets to discover Issuer endpoints, execute OAuth 2.0 PKCE authorization, exchange proofs, and receive signed verifiable credentials.',
      specUrl: 'https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html',
    },
    {
      id: 'openid4vp',
      code: 'OpenID4VP',
      draft: 'Draft 20+ / DIF PE v2',
      role: 'Verifiable Presentation Protocol',
      icon: <KeyRound className="w-5 h-5 text-copper-700" />,
      description:
        'Enables Relying Parties and Verifiers to request targeted identity presentations via standard DCQL / Presentation Definitions, verifying holder authenticity with dynamic nonces.',
      specUrl: 'https://openid.net/specs/openid-4-verifiable-presentations-1_0.html',
    },
    {
      id: 'w3c_vc',
      code: 'W3C VC',
      draft: 'v1.1 / v2.0 Data Model',
      role: 'Canonical Identity Schema',
      icon: <FileJson className="w-5 h-5 text-copper-700" />,
      description:
        'W3C-standard JSON-LD format with cryptographic proof suites (Ed25519Signature2020 / JsonWebSignature2020), ensuring machine-readable, tamper-evident decentralized assertions.',
      specUrl: 'https://www.w3.org/TR/vc-data-model-2.0/',
    },
    {
      id: 'sd_jwt_vc',
      code: 'SD-JWT VC',
      draft: 'IETF Draft / OAuth 2.0 SD-JWT',
      role: 'Selective Disclosure Format',
      icon: <ShieldCheck className="w-5 h-5 text-copper-700" />,
      description:
        'Salted cryptographic disclosures allowing holders to selectively release specific claims (e.g. proof of age without revealing full birthdate or name) with zero claim linkability.',
      specUrl: 'https://datatracker.ietf.org/doc/draft-ietf-oauth-selective-disclosure-jwt/',
    },
  ];

  return (
    <section id="standards" className="py-16 border-b border-parchment-300 bg-sand-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-copper-700 bg-copper-50 px-3 py-1 rounded-full border border-copper-200">
            Open Standards Conformance
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-parchment-900">
            Engineered on Global Digital Identity Specifications
          </h2>
          <p className="mt-2 text-sm text-parchment-700">
            The Inji Interoperability Playground strictly models international open standards to guarantee
            seamless cross-border and cross-vendor identity credential exchange.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {standards.map((std) => (
            <div
              key={std.id}
              className="bg-cream border border-parchment-300 rounded-xl p-6 shadow-warm-sm hover:shadow-warm-md hover:border-copper-400 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-copper-50 border border-copper-200 flex items-center justify-center">
                      {std.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-parchment-900 font-mono">
                        {std.code}
                      </h3>
                      <span className="text-[11px] text-copper-700 font-medium font-mono">
                        {std.draft}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-sand-100 text-parchment-700 border border-parchment-300">
                    {std.role}
                  </span>
                </div>
                <p className="text-xs text-parchment-700 leading-relaxed mt-2">
                  {std.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-parchment-200 flex items-center justify-between text-xs">
                <span className="text-parchment-500 font-mono text-[11px]">
                  Spec Conformance
                </span>
                <a
                  href={std.specUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-copper-700 hover:text-copper-900 font-semibold underline decoration-copper-300 hover:decoration-copper-700 text-xs transition-colors"
                >
                  View Specification ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
