import React, { useState } from 'react';
import {
  ProtocolStep,
  IssuerOption,
  WalletOption,
  VerifierOption,
  TestSession,
  StepExecutionStatus,
} from '../../types';
import {
  GitCommit,
  QrCode,
  KeyRound,
  ArrowRightLeft,
  Send,
  FileCheck,
  FileText,
  Shield,
  CheckCircle,
  Copy,
  Check,
  Info,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
} from 'lucide-react';

interface ProtocolFlowPageProps {
  steps: ProtocolStep[];
  issuer: IssuerOption;
  wallet: WalletOption;
  verifier: VerifierOption;
  testSession?: TestSession | null;
  stepStatuses?: StepExecutionStatus[];
  selectedStepIndex?: number;
  onSelectStep?: (idx: number) => void;
}

export const ProtocolFlowPage: React.FC<ProtocolFlowPageProps> = ({
  steps,
  issuer,
  wallet,
  verifier,
  testSession,
  stepStatuses,
  selectedStepIndex,
  onSelectStep,
}) => {
  const [localSelectedIdx, setLocalSelectedIdx] = useState<number>(0);
  const [copiedReq, setCopiedReq] = useState<boolean>(false);
  const [copiedRes, setCopiedRes] = useState<boolean>(false);

  const selectedIdx = typeof selectedStepIndex === 'number' ? selectedStepIndex : localSelectedIdx;
  const handleSelectIdx = (idx: number) => {
    setLocalSelectedIdx(idx);
    if (onSelectStep) {
      onSelectStep(idx);
    }
  };

  const stepDetails = [
    {
      idx: 0,
      icon: <QrCode className="w-5 h-5 text-copper-700" />,
      title: 'Credential Offer',
      actor: `${issuer} (Issuer) → ${wallet} (Wallet)`,
      protocol: 'OpenID4VCI (Draft 13)',
      purpose:
        'The Issuer initiates or advertises a credential issuance session by sharing a Credential Offer containing metadata endpoints and required scopes via QR code, universal link, or push notification.',
    },
    {
      idx: 1,
      icon: <KeyRound className="w-5 h-5 text-copper-700" />,
      title: 'Authorization Request',
      actor: `${wallet} (Wallet) → ${issuer} (Issuer Auth Server)`,
      protocol: 'OAuth 2.0 with PKCE (RFC 7636)',
      purpose:
        'The Wallet requests an authorization grant from the Issuer Authorization Server using Proof Key for Code Exchange (PKCE) to prevent code interception attacks on public identity clients.',
    },
    {
      idx: 2,
      icon: <ArrowRightLeft className="w-5 h-5 text-copper-700" />,
      title: 'Token Exchange',
      actor: `${wallet} (Wallet) → ${issuer} (Issuer Token Endpoint)`,
      protocol: 'OAuth 2.0 Token Endpoint',
      purpose:
        'The Wallet redeems the authorization code along with code_verifier for an issuance access token and an issuance nonce (c_nonce) required for subsequent credential binding proof.',
    },
    {
      idx: 3,
      icon: <Send className="w-5 h-5 text-copper-700" />,
      title: 'Credential Request',
      actor: `${wallet} (Wallet) → ${issuer} (Issuer Credential Endpoint)`,
      protocol: 'OpenID4VCI Credential Endpoint',
      purpose:
        'The Wallet provides key binding proof (JWT or CWT proof signed by holder private key) proving possession of the private key associated with the holder subject DID.',
    },
    {
      idx: 4,
      icon: <FileCheck className="w-5 h-5 text-copper-700" />,
      title: 'Credential Response',
      actor: `${issuer} (Issuer) → ${wallet} (Wallet)`,
      protocol: 'OpenID4VCI Credential Delivery',
      purpose:
        'The Issuer cryptographically signs the verifiable credential (W3C JSON-LD or SD-JWT) using its issuer key and securely dispatches it to the wallet storage.',
    },
    {
      idx: 5,
      icon: <FileText className="w-5 h-5 text-copper-700" />,
      title: 'Presentation Request',
      actor: `${verifier} (Verifier) → ${wallet} (Wallet)`,
      protocol: 'OpenID4VP (Draft 20)',
      purpose:
        'The Verifier issues an OpenID4VP request including Presentation Definition with input descriptors, requested claims, client_id, and dynamic nonce.',
    },
    {
      idx: 6,
      icon: <Shield className="w-5 h-5 text-copper-700" />,
      title: 'VP Token Submission',
      actor: `${wallet} (Wallet) → ${verifier} (Verifier Response URI)`,
      protocol: 'OpenID4VP Direct Post',
      purpose:
        'The Wallet creates a Verifiable Presentation containing the requested credential and holder signature, sending it to the Verifier response URI.',
    },
    {
      idx: 7,
      icon: <CheckCircle className="w-5 h-5 text-copper-700" />,
      title: 'Verification & Conformance',
      actor: `${verifier} (Verifier) → Internal Engine`,
      protocol: 'W3C VC & SD-JWT Verification Engine',
      purpose:
        'The Verifier verifies issuer digital signature against trusted trust registry, validates holder binding, checks revocation status, schema validity, and expiration.',
    },
  ];

  const activeStep = steps[selectedIdx] || steps[0];
  const activeDetail = stepDetails[selectedIdx] || stepDetails[0];
  const activeExecStatus = stepStatuses?.[selectedIdx] || 'WAITING';

  const getStepVerdictBadge = (stepObj: ProtocolStep | undefined, execSt: StepExecutionStatus) => {
    if (!stepObj || !stepObj.status || stepObj.status <= 0) {
      return (
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sand-200/90 text-parchment-700 border border-parchment-300">
          NOT TESTED
        </span>
      );
    }
    if (execSt === 'COMPLETED') {
      return (
        <span className="inline-flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#EDF7F1] text-[#2D6A4F] border border-[#B7E4C7]">
          <CheckCircle2 className="w-3 h-3" />
          <span>PASS ({stepObj.status})</span>
        </span>
      );
    }
    if (execSt === 'FAILED') {
      return (
        <span className="inline-flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FFE4E6] text-[#9F1239] border border-[#FECDD3]">
          <AlertTriangle className="w-3 h-3" />
          <span>FAIL ({stepObj.status})</span>
        </span>
      );
    }
    if (execSt === 'AWAITING_CREDENTIAL') {
      return (
        <span className="inline-flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300" title="Awaiting issued credential from Step 5">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>AWAITING CRED ({stepObj.status})</span>
        </span>
      );
    }
    if (execSt === 'PENDING_VERIFICATION') {
      return (
        <span className="inline-flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300" title="Awaiting VP Token submission from Step 7">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>AWAITING VP ({stepObj.status})</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>RUNNING ({stepObj.status})</span>
      </span>
    );
  };

  const handleCopyReq = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedReq(true);
    setTimeout(() => setCopiedReq(false), 2000);
  };

  const handleCopyRes = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRes(true);
    setTimeout(() => setCopiedRes(false), 2000);
  };

  const sessionVerdict = testSession
    ? testSession.outcome === 'PASS'
      ? 'PASS'
      : testSession.outcome === 'FAIL' || testSession.status === 'AUTHORIZATION_FAILED' || testSession.status === 'ERROR'
      ? 'FAIL'
      : 'RUNNING'
    : 'NOT TESTED';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title & Active Session Synchronized Summary */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-copper-700 text-white flex items-center justify-center shadow-warm-sm">
              <GitCommit className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-parchment-900 font-mono">
                PROTOCOL FLOW ARCHITECTURE & LIVE TRACE
              </h1>
              <p className="text-xs text-parchment-600">
                Synchronized 8-stage OpenID4VCI and OpenID4VP execution trace from persisted backend session state.
              </p>
            </div>
          </div>

          {testSession ? (
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-cream border border-parchment-300 text-parchment-900 font-bold">
                REP-{testSession.test_id.slice(0, 8).toUpperCase()}
              </span>
              <span
                className={`px-2.5 py-1 rounded-lg font-bold border ${
                  sessionVerdict === 'PASS'
                    ? 'bg-[#EDF7F1] text-[#2D6A4F] border-[#B7E4C7]'
                    : sessionVerdict === 'FAIL'
                    ? 'bg-[#FFE4E6] text-[#9F1239] border-[#FECDD3]'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              >
                Verdict: {sessionVerdict}
              </span>
              {testSession.credential_validity && (
                <span className="px-2.5 py-1 rounded-lg bg-sand-100 border border-parchment-300 text-parchment-800 font-semibold">
                  Validity: {testSession.credential_validity}
                </span>
              )}
              {typeof testSession.duration_ms === 'number' && testSession.duration_ms > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-sand-100 border border-parchment-300 text-copper-800 font-semibold">
                  {testSession.duration_ms >= 1000
                    ? `${(testSession.duration_ms / 1000).toFixed(2)}s`
                    : `${Math.round(testSession.duration_ms)}ms`}
                </span>
              )}
              <span
                className={`px-2.5 py-1 rounded-lg font-bold border ${
                  testSession.is_real_stack || !testSession.is_simulation
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-sand-200 text-copper-900 border-parchment-300'
                }`}
              >
                {testSession.is_real_stack || !testSession.is_simulation ? 'REAL INJI STACK' : 'SIMULATION'}
              </span>
            </div>
          ) : (
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-sand-200 text-parchment-700 border border-parchment-300">
              STATUS: NOT TESTED
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Left Vertical Steps, Right Interactive Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 8 Steps (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-parchment-800 font-mono flex items-center justify-between px-1">
            <span>Protocol Stages (8)</span>
            <span className="text-[11px] text-copper-700">Click any step to inspect</span>
          </div>

          <div className="space-y-2">
            {stepDetails.map((item) => {
              const isSelected = selectedIdx === item.idx;
              const stepObj = steps[item.idx];
              const execStatus = stepStatuses?.[item.idx] || 'WAITING';

              return (
                <div
                  key={item.idx}
                  onClick={() => handleSelectIdx(item.idx)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-copper-600 bg-cream shadow-warm-md ring-1 ring-copper-500/50'
                      : 'border-parchment-300/80 bg-cream/70 hover:bg-cream hover:border-parchment-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-sand-100 flex items-center justify-center shrink-0 border border-parchment-300">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-copper-800">
                            #{item.idx + 1}
                          </span>
                          <span className="text-xs font-bold text-parchment-900 truncate">
                            {item.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-parchment-600 font-mono mt-0.5 truncate">
                          {stepObj?.endpoint || item.protocol}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-1 shrink-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sand-200/90 text-parchment-800 border border-parchment-300 font-semibold">
                          {stepObj?.method || 'HTTP'}
                        </span>
                        {getStepVerdictBadge(stepObj, execStatus)}
                      </div>
                      {typeof stepObj?.duration_ms === 'number' && stepObj.duration_ms > 0 && (
                        <span className="text-[10px] font-mono text-parchment-600">
                          {stepObj.duration_ms >= 1000
                            ? `${(stepObj.duration_ms / 1000).toFixed(2)}s`
                            : `${Math.round(stepObj.duration_ms)}ms`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Step Inspection Details (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-5">
          {/* Header */}
          <div className="border-b border-parchment-200/80 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-lg bg-copper-700 text-white font-mono text-xs font-bold shadow-warm-sm">
                  Stage #{selectedIdx + 1}
                </span>
                <span className="text-xs font-mono font-semibold px-2 py-1 rounded bg-sand-200/90 text-copper-900 border border-parchment-300">
                  {activeDetail.protocol}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {activeStep?.timestamp && (
                  <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-parchment-700 bg-cream px-2 py-1 rounded border border-parchment-300">
                    <Clock className="w-3 h-3 text-copper-600" />
                    <span>{new Date(activeStep.timestamp).toLocaleTimeString()}</span>
                  </span>
                )}
                {typeof activeStep?.duration_ms === 'number' && activeStep.duration_ms > 0 && (
                  <span className="text-[11px] font-mono font-semibold text-copper-800 bg-sand-100 px-2 py-1 rounded border border-parchment-300">
                    {activeStep.duration_ms >= 1000
                      ? `${(activeStep.duration_ms / 1000).toFixed(2)}s`
                      : `${Math.round(activeStep.duration_ms)}ms`}
                  </span>
                )}
                {getStepVerdictBadge(activeStep, activeExecStatus)}
              </div>
            </div>

            <h2 className="text-base font-bold text-parchment-900 mt-3 font-mono">
              {activeDetail.title}
            </h2>
            <p className="text-xs text-parchment-700 mt-1 leading-relaxed">
              {activeDetail.purpose}
            </p>
          </div>

          {/* Actor & Direction */}
          <div className="bg-sand-100/90 rounded-xl p-3.5 border border-parchment-300/80 space-y-1">
            <span className="text-[10px] uppercase font-mono font-bold text-parchment-500">
              Interaction Flow
            </span>
            <div className="text-xs font-mono font-bold text-parchment-900">
              {activeDetail.actor}
            </div>
          </div>

          {/* Endpoint */}
          <div className="space-y-1.5">
            <span className="text-[11px] uppercase font-mono font-bold text-parchment-500">
              Endpoint ({activeStep?.method || 'HTTP'})
            </span>
            <div className="bg-cream px-3 py-2 rounded-xl border border-parchment-300 font-mono text-xs text-copper-800 break-all font-semibold">
              {activeStep?.full_url || activeStep?.endpoint}
            </div>
          </div>

          {/* Dependency Explanation Callout if Step 7 or Step 8 is pending */}
          {selectedIdx === 6 && (activeExecStatus === 'AWAITING_CREDENTIAL' || activeStep?.status === 428) && (
            <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200 text-xs font-mono text-amber-900 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Stage Dependency:</strong> VP Token Submission (Stage #7) depends directly on Credential Delivery (Stage #5).
                The wallet cannot construct and submit an OpenID4VP Verifiable Presentation without a valid issued Verifiable Credential.
              </div>
            </div>
          )}
          {selectedIdx === 7 && (activeExecStatus === 'PENDING_VERIFICATION' || activeStep?.status === 428) && (
            <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200 text-xs font-mono text-amber-900 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Stage Dependency:</strong> Verification & Conformance (Stage #8) depends on VP Token Submission (Stage #7).
                The verifier cannot execute cryptographic trust, schema, or revocation validation without receiving a Verifiable Presentation.
              </div>
            </div>
          )}

          {/* Payloads: Request & Response Tabs / Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Request Payload */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-parchment-800 font-mono">
                <span>Request Payload</span>
                <button
                  type="button"
                  onClick={() => handleCopyReq(JSON.stringify(activeStep?.request || {}, null, 2))}
                  className="text-[10px] text-copper-700 hover:text-copper-900 flex items-center space-x-1"
                >
                  {copiedReq ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedReq ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-3 bg-[#231A12] text-[#E8DCC8] rounded-xl font-mono text-[11px] max-h-56 overflow-y-auto">
                <pre>{JSON.stringify(activeStep?.request || {}, null, 2)}</pre>
              </div>
            </div>

            {/* Response Payload */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-parchment-800 font-mono">
                <span>Response Payload</span>
                <button
                  type="button"
                  onClick={() => handleCopyRes(JSON.stringify(activeStep?.response || {}, null, 2))}
                  className="text-[10px] text-copper-700 hover:text-copper-900 flex items-center space-x-1"
                >
                  {copiedRes ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedRes ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-3 bg-[#231A12] text-[#E8DCC8] rounded-xl font-mono text-[11px] max-h-56 overflow-y-auto">
                <pre>{JSON.stringify(activeStep?.response || {}, null, 2)}</pre>
              </div>
            </div>
          </div>

          {/* Truthful Execution Provenance Notice */}
          <div className="flex items-center space-x-2 pt-3 border-t border-parchment-200/80 text-[11px] text-parchment-700">
            {activeStep?.is_real ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Real MOSIP Inji Stack Trace:</strong> Live protocol payload captured from persisted session{' '}
                  <code className="font-mono font-bold">{testSession?.test_id}</code>.
                </span>
              </>
            ) : activeStep?.status && activeStep.status > 0 ? (
              <>
                <Info className="w-4 h-4 text-copper-700 shrink-0" />
                <span>
                  <strong>Sandbox Simulation Trace:</strong> Simulated OpenID4VCI / OpenID4VP payload from session{' '}
                  <code className="font-mono font-bold">{testSession?.test_id}</code>.
                </span>
              </>
            ) : (
              <>
                <Info className="w-4 h-4 text-parchment-500 shrink-0" />
                <span>
                  No recorded execution loaded for this stage yet. Start an interoperability test to capture live protocol payloads.
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
