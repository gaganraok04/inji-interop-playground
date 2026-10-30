import React from 'react';
import { ProtocolStep } from '../types';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  Shield,
  Send,
  KeyRound,
  FileCheck,
  QrCode,
  FileText,
} from 'lucide-react';

interface ProtocolTimelineProps {
  steps: ProtocolStep[];
  selectedStepIndex: number;
  onSelectStep: (index: number) => void;
  isRunning: boolean;
  activeStepIndex: number;
}

export const ProtocolTimeline: React.FC<ProtocolTimelineProps> = ({
  steps,
  selectedStepIndex,
  onSelectStep,
  isRunning,
  activeStepIndex,
}) => {
  // Step icons mapping
  const getStepIcon = (index: number) => {
    switch (index) {
      case 0:
        return <QrCode className="w-3.5 h-3.5" />;
      case 1:
        return <KeyRound className="w-3.5 h-3.5" />;
      case 2:
        return <ArrowRight className="w-3.5 h-3.5" />;
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

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-700 dark:text-slate-300">
            Live Protocol Execution Timeline
          </h2>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <span className="flex items-center space-x-1 text-sky-600 dark:text-sky-400">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            <span>Steps 1–5: OID4VCI</span>
          </span>
          <span className="flex items-center space-x-1 text-purple-600 dark:text-purple-400">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span>Steps 6–8: OID4VP</span>
          </span>
        </div>
      </div>

      {/* Horizontal / Grid Timeline of all 8 steps */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {steps.map((step, idx) => {
          const isSelected = selectedStepIndex === idx;
          const isCurrentlyActive = isRunning && activeStepIndex === idx;
          const isPassed = !isRunning && step.status < 400;
          const isFailed = !isRunning && step.status >= 400;

          return (
            <button
              key={step.step_id || idx}
              type="button"
              onClick={() => onSelectStep(idx)}
              className={`relative p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all group ${
                isSelected
                  ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 ring-2 ring-sky-500/50 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Top Row: Index & Status */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    idx < 5
                      ? 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200'
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                  }`}
                >
                  #{idx + 1}
                </span>

                <div className="flex items-center">
                  {isCurrentlyActive ? (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  ) : isFailed ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  ) : isPassed ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                  )}
                </div>
              </div>

              {/* Step Title & Icon */}
              <div className="space-y-1">
                <div className="flex items-center space-x-1 text-slate-500 dark:text-slate-400">
                  {getStepIcon(idx)}
                  <span className="text-[10px] uppercase font-mono font-medium">
                    {step.method}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">
                  {step.name}
                </div>
              </div>

              {/* Bottom HTTP Status Code */}
              <div className="mt-2 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                {step.status ? `HTTP ${step.status}` : 'Pending'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
