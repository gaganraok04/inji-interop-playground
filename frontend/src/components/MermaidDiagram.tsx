import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { GitCommit, Sparkles } from 'lucide-react';
import { IssuerOption, WalletOption, VerifierOption, CredentialFormat } from '../types';

interface MermaidDiagramProps {
  issuer: IssuerOption;
  wallet: WalletOption;
  verifier: VerifierOption;
  format: CredentialFormat;
  isDark: boolean;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({
  issuer,
  wallet,
  verifier,
  format,
  isDark,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'Inter, system-ui, sans-serif',
      sequence: {
        diagramMarginX: 10,
        diagramMarginY: 10,
        actorMargin: 50,
        width: 150,
        height: 40,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        messageMargin: 25,
      },
    });

    const definition = `
sequenceDiagram
    autonumber
    participant ISS as ${issuer}
    participant WAL as ${wallet}
    participant VER as ${verifier}

    rect rgb(${isDark ? '15, 23, 42' : '238, 248, 255'})
    note over ISS,WAL: Phase 1: OpenID4VCI Issuance (${format})
    ISS->>WAL: 1. Credential Offer (.well-known/openid-credential-issuer)
    WAL->>ISS: 2. Authorization Request (/oauth2/authorize PKCE)
    WAL->>ISS: 3. Token Exchange (/oauth2/token)
    WAL->>ISS: 4. Credential Request (/credential + Key Proof)
    ISS-->>WAL: 5. Credential Response (${format} Issued)
    end

    rect rgb(${isDark ? '30, 27, 75' : '245, 243, 255'})
    note over WAL,VER: Phase 2: OpenID4VP Verification
    VER->>WAL: 6. Presentation Request (auth-request / DCQL)
    WAL-->>VER: 7. VP Token (Verifiable Presentation Submission)
    VER->>VER: 8. Verification (Trust Registry / Sig & Revocation)
    end
`;

    const renderId = `mermaid-${Date.now()}`;
    mermaid
      .render(renderId, definition)
      .then(({ svg }) => {
        setSvgContent(svg);
      })
      .catch((err) => {
        console.error('Mermaid render error:', err);
      });
  }, [issuer, wallet, verifier, format, isDark]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <GitCommit className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-700 dark:text-slate-300">
            Interactive Protocol Sequence Flow
          </h2>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-slate-400 dark:text-slate-500 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Mermaid.js Flow Engine</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full overflow-x-auto flex justify-center py-2 bg-slate-50/50 dark:bg-slate-950/40 rounded-lg p-2"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
};
