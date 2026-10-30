import React from 'react';
import { ProtocolStep, StepExecutionStatus } from '../../types';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  QrCode,
  KeyRound,
  ArrowRightLeft,
  Send,
  FileCheck,
  FileText,
  Shield,
  CheckCircle,
} from 'lucide-react';

interface ProtocolStepCardProps {
  step: ProtocolStep;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  status: StepExecutionStatus;
}

export const ProtocolStepCard: React.FC<ProtocolStepCardProps> = ({
  step,
  index,
  isSelected,
  onSelect,
  status,
}) => {
  const getStepIcon = (idx: number) => {
    switch (idx) {
      case 0:
        return <QrCode className="w-3.5 h-3.5" />;
      case 1:
        return <KeyRound className="w-3.5 h-3.5" />;
      case 2:
        return <ArrowRightLeft className="w-3.5 h-3.5" />;
      case 3:
        return <Send className="w-3.5 h-3.5" />;
      case 4:
        return <FileCheck className="w-3.5 h-3.5" />;
      case 5:
        return <FileText className="w-3.5 h-3.5" />;
      case 6:
        return <Shield className="w-3.5 h-3.5" />;
      case 7:
        return <CheckCircle className="w-3.5 h-3.5" />;
      default:
        return <Clock className="w-3.5 h-3.5" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'RUNNING':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-copper-100 text-copper-900 border border-copper-300 shadow-warm-sm">
            <Loader2 className="w-3 h-3 animate-spin text-copper-700" />
            <span>RUNNING</span>
          </span>
        );
      case 'AWAITING_AUTHORIZATION':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-warm-sm" title="Awaiting user authentication via eSignet / Auth Server">
            <Clock className="w-3 h-3 text-amber-700" />
            <span>AWAITING AUTH</span>
          </span>
        );
      case 'PENDING_TOKEN':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-warm-sm" title="Awaiting OAuth token exchange">
            <Clock className="w-3 h-3 text-amber-700" />
            <span>AWAITING TOKEN</span>
          </span>
        );
      case 'PENDING_CREDENTIAL':
      case 'AWAITING_CREDENTIAL':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-warm-sm" title="Awaiting credential delivery from Inji Certify">
            <Clock className="w-3 h-3 text-amber-700" />
            <span>{index === 6 ? 'AWAITING CRED (STEP 5)' : 'AWAITING CRED'}</span>
          </span>
        );
      case 'PENDING_VERIFICATION':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-warm-sm" title="Awaiting VP Token submission before verification">
            <Clock className="w-3 h-3 text-amber-700" />
            <span>AWAITING VP (STEP 7)</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#EDF7F1] text-[#2D6A4F] border border-[#B7E4C7]">
            <CheckCircle2 className="w-3 h-3 text-[#2D6A4F]" />
            <span>PASS</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#FFE4E6] text-[#9F1239] border border-[#FECDD3]">
            <AlertTriangle className="w-3 h-3 text-[#9F1239]" />
            <span>FAIL</span>
          </span>
        );
      case 'PENDING':
      case 'WAITING':
      default:
        return (
          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-sand-100/90 text-parchment-700 border border-parchment-300">
            {step.status > 0 ? 'PENDING' : 'NOT TESTED'}
          </span>
        );
    }
  };

  const isRunning =
    status === 'RUNNING' ||
    status === 'AWAITING_AUTHORIZATION' ||
    status === 'PENDING_TOKEN' ||
    status === 'PENDING_CREDENTIAL' ||
    status === 'AWAITING_CREDENTIAL' ||
    status === 'PENDING_VERIFICATION';
  const isCompleted = status === 'COMPLETED';
  const isFailed = status === 'FAILED';

  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Step ${index + 1}: ${step.name}, status ${status}`}
      className={`relative p-3 rounded-xl border text-left cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper-500 ${
        isSelected
          ? 'border-copper-600 bg-cream shadow-warm-md ring-1 ring-copper-500/50'
          : isRunning
          ? 'pulse-active border-copper-500 bg-copper-50/70 shadow-warm-sm'
          : isCompleted
          ? 'border-parchment-300/80 bg-cream/70 hover:bg-cream hover:border-parchment-400'
          : 'border-parchment-200/90 bg-cream/50 hover:bg-cream/80'
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        {/* Step Index Circle & Title */}
        <div className="flex items-start space-x-2.5 min-w-0">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors ${
              isRunning
                ? 'bg-copper-700 text-white'
                : isSelected
                ? 'bg-copper-800 text-white'
                : isCompleted
                ? 'bg-[#EDF7F1] text-[#2D6A4F] border border-[#B7E4C7]'
                : isFailed
                ? 'bg-[#FFE4E6] text-[#9F1239] border border-[#FECDD3]'
                : 'bg-sand-100 text-parchment-700 border border-parchment-300'
            }`}
          >
            {index + 1}
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 flex-wrap">
              <span className="text-copper-700 shrink-0">
                {getStepIcon(index)}
              </span>
              <span className="text-xs font-bold text-parchment-900 truncate">
                {step.name}
              </span>
              <span className="text-[11px] text-parchment-700 font-mono font-medium">
                • {index < 5 ? 'OID4VCI' : 'OID4VP'}
              </span>
            </div>

            {/* HTTP Method, Status and Endpoint */}
            <div className="mt-1 flex items-center space-x-1.5 text-[11px] font-mono">
              <span className="px-1.5 py-0.2 rounded bg-sand-200/90 border border-parchment-300 text-copper-900 font-bold shrink-0">
                {step.method}
              </span>
              {step.status > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded border text-[10px] font-bold shrink-0 ${
                    step.status < 400
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : step.status === 428
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {step.status}
                </span>
              )}
              <span className="text-parchment-800 font-medium truncate max-w-[130px] sm:max-w-[165px]">
                {step.endpoint}
              </span>
            </div>

            <p className="mt-1 text-[11px] text-parchment-700 line-clamp-1">
              {step.description}
            </p>

            {/* Dependency note if Step 7 or Step 8 is pending */}
            {index === 6 && (status === 'AWAITING_CREDENTIAL' || step.status === 428) && (
              <div className="mt-1.5 text-[10px] font-mono bg-amber-50/90 text-amber-800 px-2 py-1 rounded border border-amber-200 flex items-start space-x-1">
                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                <span>Dependency: Awaiting issued credential from Step 5 before Verifiable Presentation can be generated.</span>
              </div>
            )}
            {index === 7 && (status === 'PENDING_VERIFICATION' || step.status === 428) && (
              <div className="mt-1.5 text-[10px] font-mono bg-amber-50/90 text-amber-800 px-2 py-1 rounded border border-amber-200 flex items-start space-x-1">
                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                <span>Dependency: Awaiting VP Token submission from Step 7 before cryptographic verification can proceed.</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Badge & Step Timing */}
        <div className="flex flex-col items-end space-y-1 shrink-0">
          {getStatusBadge()}
          {typeof step.duration_ms === 'number' && step.duration_ms > 0 ? (
            <div className="flex flex-col items-end text-[10px] font-mono text-parchment-600">
              <span>
                {step.duration_ms >= 1000
                  ? `${(step.duration_ms / 1000).toFixed(2)}s`
                  : `${Math.round(step.duration_ms)}ms`}
              </span>
              {typeof step.http_duration_ms === 'number' && step.http_duration_ms > 0 && Math.abs(step.http_duration_ms - step.duration_ms) > 1 && (
                <span className="text-[9px] text-parchment-500">
                  HTTP: {Math.round(step.http_duration_ms)}ms
                </span>
              )}
            </div>
          ) : (
            <span className="text-[10px] font-mono text-parchment-400">
              {isRunning ? 'Measuring...' : '—'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
