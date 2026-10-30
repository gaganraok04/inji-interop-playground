import React from 'react';
import {
  ProtocolStep,
  IssuerOption,
  WalletOption,
  VerifierOption,
  StepExecutionStatus,
} from '../../types';
import {
  GitCommit,
  Sparkles,
  Building2,
  Wallet,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

interface SequenceFlowProps {
  issuer: IssuerOption;
  wallet: WalletOption;
  verifier: VerifierOption;
  steps: ProtocolStep[];
  stepStatuses?: StepExecutionStatus[];
  selectedStepIndex: number;
  onSelectStep: (index: number) => void;
  isRunning: boolean;
}

interface MessageFlow {
  stepIndex: number;
  label: string;
  senderName: string;
  receiverName: string;
  senderRole: 'issuer' | 'wallet' | 'verifier';
  receiverRole: 'issuer' | 'wallet' | 'verifier';
  method: string;
  endpoint: string;
  direction: 'right' | 'left' | 'self';
}

export const SequenceFlow: React.FC<SequenceFlowProps> = ({
  issuer,
  wallet,
  verifier,
  steps,
  stepStatuses,
  selectedStepIndex,
  onSelectStep,
  isRunning,
}) => {
  const messageFlows: MessageFlow[] = [
    {
      stepIndex: 0,
      label: 'Credential Offer',
      senderName: issuer,
      receiverName: wallet,
      senderRole: 'issuer',
      receiverRole: 'wallet',
      method: 'GET',
      endpoint: '/.well-known/openid-credential-issuer',
      direction: 'right',
    },
    {
      stepIndex: 1,
      label: 'Authorization',
      senderName: wallet,
      receiverName: issuer,
      senderRole: 'wallet',
      receiverRole: 'issuer',
      method: 'GET',
      endpoint: '/authorize (PKCE)',
      direction: 'left',
    },
    {
      stepIndex: 2,
      label: 'Token Exchange',
      senderName: wallet,
      receiverName: issuer,
      senderRole: 'wallet',
      receiverRole: 'issuer',
      method: 'POST',
      endpoint: '/v1/mimoto/get-token',
      direction: 'left',
    },
    {
      stepIndex: 3,
      label: 'Credential Request',
      senderName: wallet,
      receiverName: issuer,
      senderRole: 'wallet',
      receiverRole: 'issuer',
      method: 'POST',
      endpoint: '/credential (+ Key Proof)',
      direction: 'left',
    },
    {
      stepIndex: 4,
      label: 'Credential Response',
      senderName: issuer,
      receiverName: wallet,
      senderRole: 'issuer',
      receiverRole: 'wallet',
      method: 'POST',
      endpoint: '/credential',
      direction: 'right',
    },
    {
      stepIndex: 5,
      label: 'Presentation Request',
      senderName: verifier,
      receiverName: wallet,
      senderRole: 'verifier',
      receiverRole: 'wallet',
      method: 'POST',
      endpoint: '/v1/verify/vp-request',
      direction: 'left',
    },
    {
      stepIndex: 6,
      label: 'VP Token',
      senderName: wallet,
      receiverName: verifier,
      senderRole: 'wallet',
      receiverRole: 'verifier',
      method: 'POST',
      endpoint: '/v1/verify/vp-submission/direct-post',
      direction: 'right',
    },
    {
      stepIndex: 7,
      label: 'Verification',
      senderName: verifier,
      receiverName: verifier,
      senderRole: 'verifier',
      receiverRole: 'verifier',
      method: 'POST',
      endpoint: '/v1/verify/vc-verification',
      direction: 'self',
    },
  ];

  const formatStepStatusLabel = (stepObj: ProtocolStep | undefined, execSt: StepExecutionStatus | undefined) => {
    if (!stepObj || !stepObj.status || stepObj.status <= 0) {
      return 'NOT TESTED';
    }
    if (execSt === 'COMPLETED') {
      return `${stepObj.status} PASS`;
    }
    if (execSt === 'FAILED') {
      return `${stepObj.status} FAIL`;
    }
    if (execSt === 'AWAITING_CREDENTIAL') {
      return `${stepObj.status} AWAITING CRED`;
    }
    if (execSt === 'PENDING_VERIFICATION') {
      return `${stepObj.status} AWAITING VP`;
    }
    if (stepObj.status === 428) {
      return '428 AWAITING';
    }
    return `${stepObj.status} ${execSt || 'PENDING'}`;
  };

  const activeFlow = messageFlows[selectedStepIndex] || messageFlows[0];
  const activeStep = steps[selectedStepIndex];
  const activeStatus = stepStatuses?.[selectedStepIndex];

  const isIssuerActive = activeFlow.senderRole === 'issuer' || activeFlow.receiverRole === 'issuer';
  const isWalletActive = activeFlow.senderRole === 'wallet' || activeFlow.receiverRole === 'wallet';
  const isVerifierActive = activeFlow.senderRole === 'verifier' || activeFlow.receiverRole === 'verifier';

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-parchment-200/80 pb-3 shrink-0">
        <div className="flex items-center space-x-2">
          <GitCommit className="w-4 h-4 text-copper-700" />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-parchment-900 font-mono">
              LIVE INTERACTION FLOW
            </h2>
            <p className="text-[11px] text-parchment-600">
              Real-time message flow between actors
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 text-[11px] font-mono text-copper-800 bg-sand-100/90 px-2.5 py-1 rounded-md border border-parchment-300">
          <Sparkles className="w-3 h-3 text-copper-600" />
          <span>Synchronized</span>
        </div>
      </div>

      {/* 3 Actors Columns */}
      <div className="grid grid-cols-3 gap-2 text-center shrink-0">
        {/* Actor 1: Inji Certify (Issuer) */}
        <div
          className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
            isIssuerActive
              ? 'border-copper-600 bg-copper-50/90 shadow-warm-sm ring-1 ring-copper-500/40 text-copper-950 font-bold'
              : 'border-parchment-200/80 bg-cream/60 text-parchment-700'
          }`}
        >
          <div className="flex items-center justify-center space-x-1.5">
            <Building2 className={`w-3.5 h-3.5 ${isIssuerActive ? 'text-copper-700' : 'text-parchment-400'}`} />
            <span className="text-[10px] text-copper-800 font-mono font-bold uppercase tracking-wider">Issuer</span>
          </div>
          <div className="font-bold text-parchment-900 truncate text-xs leading-tight mt-0.5">{issuer}</div>
        </div>

        {/* Actor 2: Inji Web (Wallet) */}
        <div
          className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
            isWalletActive
              ? 'border-sky-600 bg-sky-50/90 shadow-warm-sm ring-1 ring-sky-500/40 text-sky-950 font-bold'
              : 'border-parchment-200/80 bg-cream/60 text-parchment-700'
          }`}
        >
          <div className="flex items-center justify-center space-x-1.5">
            <Wallet className={`w-3.5 h-3.5 ${isWalletActive ? 'text-sky-700' : 'text-parchment-400'}`} />
            <span className="text-[10px] text-sky-800 font-mono font-bold uppercase tracking-wider">Wallet</span>
          </div>
          <div className="font-bold text-parchment-900 truncate text-xs leading-tight mt-0.5">{wallet}</div>
        </div>

        {/* Actor 3: Inji Verify (Verifier) */}
        <div
          className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
            isVerifierActive
              ? 'border-copper-600 bg-copper-50/90 shadow-warm-sm ring-1 ring-copper-500/40 text-copper-950 font-bold'
              : 'border-parchment-200/80 bg-cream/60 text-parchment-700'
          }`}
        >
          <div className="flex items-center justify-center space-x-1.5">
            <CheckCircle2 className={`w-3.5 h-3.5 ${isVerifierActive ? 'text-copper-700' : 'text-parchment-400'}`} />
            <span className="text-[10px] text-copper-800 font-mono font-bold uppercase tracking-wider">Verifier</span>
          </div>
          <div className="font-bold text-parchment-900 truncate text-xs leading-tight mt-0.5">{verifier}</div>
        </div>
      </div>

      {/* Active Message Highlight Callout Banner */}
      <div className="py-2 px-3 rounded-xl bg-sand-100/90 border border-parchment-300 flex items-center justify-between gap-2 shadow-warm-sm shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="w-5 h-5 rounded-md bg-copper-700 text-white font-mono font-bold flex items-center justify-center text-[11px] shrink-0">
            {selectedStepIndex + 1}
          </span>
          <span className="font-bold text-parchment-900 text-xs truncate">{activeFlow.label}</span>
          <span className="text-parchment-400 text-xs">•</span>
          <span className="font-mono text-copper-800 text-[11px] font-semibold truncate">
            {activeStep?.method || activeFlow.method} {activeStep?.endpoint || activeFlow.endpoint}
          </span>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded-full border font-mono font-bold text-[10px] shrink-0 ${
            activeStatus === 'COMPLETED'
              ? 'bg-[#EDF7F1] border-[#B7E4C7] text-[#2D6A4F]'
              : activeStatus === 'FAILED'
              ? 'bg-[#FFE4E6] border-[#FECDD3] text-[#9F1239]'
              : 'bg-cream border-parchment-300 text-parchment-800'
          }`}
        >
          {formatStepStatusLabel(activeStep, activeStatus)}
        </span>
      </div>

      {/* Interactive Sequence Message Steps - Evenly Distributed */}
      <div
        className="flex-1 flex flex-col justify-between gap-2 min-h-0 overflow-y-auto pr-0.5"
        role="list"
        aria-label="Sequence Messages"
      >
        {messageFlows.map((flow) => {
          const isSelected = selectedStepIndex === flow.stepIndex;
          const stepObj = steps[flow.stepIndex];
          const execSt = stepStatuses?.[flow.stepIndex];
          const statusLabel = formatStepStatusLabel(stepObj, execSt);

          return (
            <div
              key={flow.stepIndex}
              onClick={() => onSelectStep(flow.stepIndex)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectStep(flow.stepIndex);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Select Step ${flow.stepIndex + 1}: ${flow.label} from ${flow.senderName} to ${flow.receiverName}`}
              className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl border cursor-pointer transition-all flex items-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-copper-500 ${
                isSelected
                  ? 'border-copper-600 bg-copper-50/90 shadow-warm-sm ring-1 ring-copper-500/40'
                  : 'border-parchment-200/90 bg-cream/70 hover:bg-cream hover:border-parchment-300'
              }`}
            >
              <div className="w-full grid grid-cols-12 items-center gap-2">
                {/* Step badge & label */}
                <div className="col-span-4 font-semibold text-parchment-900 flex items-center space-x-2 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-md text-[10px] font-mono flex items-center justify-center font-bold shrink-0 ${
                      isSelected
                        ? 'bg-copper-700 text-white'
                        : execSt === 'COMPLETED'
                        ? 'bg-[#EDF7F1] text-[#2D6A4F] border border-[#B7E4C7]'
                        : execSt === 'FAILED'
                        ? 'bg-[#FFE4E6] text-[#9F1239] border border-[#FECDD3]'
                        : 'bg-sand-200 text-parchment-800 border border-parchment-300'
                    }`}
                  >
                    {flow.stepIndex + 1}
                  </span>
                  <span className="truncate text-xs font-semibold">{flow.label}</span>
                </div>

                {/* Animated Directional Message Vector */}
                <div className="col-span-5 relative flex items-center justify-center px-2" aria-hidden="true">
                  {flow.direction === 'right' && (
                    <div className="w-full flex items-center justify-between text-copper-700 font-mono text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-copper-600 shrink-0" />
                      <div className="flex-1 h-0.5 bg-copper-300/80 mx-2 relative overflow-hidden rounded-full">
                        {isSelected && (
                          <div
                            className={`absolute inset-0 bg-copper-700 ${
                              isRunning ? 'animate-pulse' : ''
                            }`}
                          />
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 shrink-0 font-bold" />
                    </div>
                  )}

                  {flow.direction === 'left' && (
                    <div className="w-full flex items-center justify-between text-copper-700 font-mono text-[11px]">
                      <ArrowLeft className="w-4 h-4 shrink-0 font-bold" />
                      <div className="flex-1 h-0.5 bg-copper-300/80 mx-2 relative overflow-hidden rounded-full">
                        {isSelected && (
                          <div
                            className={`absolute inset-0 bg-copper-700 ${
                              isRunning ? 'animate-pulse' : ''
                            }`}
                          />
                        )}
                      </div>
                      <span className="w-2 h-2 rounded-full bg-copper-600 shrink-0" />
                    </div>
                  )}

                  {flow.direction === 'self' && (
                    <div className="w-full flex items-center justify-center text-copper-700 font-mono text-[10px]">
                      <span className="px-2.5 py-0.5 rounded-md bg-sand-100 border border-parchment-300 flex items-center space-x-1.5 font-semibold">
                        <RefreshCw className="w-3 h-3 text-copper-600" />
                        <span>Self Verify</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* HTTP Method & real status */}
                <div className="col-span-3 text-right font-mono text-[10.5px] text-parchment-800 truncate">
                  <span className="font-bold text-copper-800 mr-1.5">{stepObj?.method || flow.method}</span>
                  <span
                    className={
                      execSt === 'COMPLETED'
                        ? 'text-[#2D6A4F] font-bold'
                        : execSt === 'FAILED'
                        ? 'text-[#9F1239] font-bold'
                        : 'text-parchment-600'
                    }
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
