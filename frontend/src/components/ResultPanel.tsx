import React from 'react';
import { TestResultOutcome, TestSession } from '../types';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Info,
} from 'lucide-react';

interface ResultPanelProps {
  testSession: TestSession | null;
  isRunning: boolean;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  testSession,
  isRunning,
}) => {
  if (isRunning) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-10 h-10 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mb-3" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Running Interoperability Test Simulation...
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            Executing OpenID4VCI credential issuance flow and OpenID4VP presentation verification steps.
          </p>
        </div>
      </div>
    );
  }

  if (!testSession || testSession.status === 'IDLE' || testSession.status === 'RESET') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm text-center">
        <div className="inline-flex p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-2">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Ready for Interoperability Execution
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Configure the Issuer, Wallet, Verifier, and format above, then click <strong>Start Test</strong> to run the interoperability sandbox flow.
        </p>
      </div>
    );
  }

  const outcome = testSession.outcome || 'PASS';

  const getVerdictStyle = (outcomeVal: TestResultOutcome) => {
    switch (outcomeVal) {
      case 'PASS':
      case 'VALID':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200',
          badge: 'bg-emerald-600 text-white',
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-500" />,
          title: outcomeVal === 'PASS' ? 'TEST PASSED' : 'CREDENTIAL VALID',
          desc: 'All protocol steps succeeded conforming to OpenID4VCI & OpenID4VP specifications.',
        };
      case 'FAIL':
      case 'INVALID':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200',
          badge: 'bg-rose-600 text-white',
          icon: <XCircle className="w-6 h-6 text-rose-500" />,
          title: outcomeVal === 'FAIL' ? 'TEST FAILED' : 'CREDENTIAL INVALID',
          desc: 'Interoperability checks detected syntax, cryptographic binding, or schema failure scenario.',
        };
      case 'VALID BUT EXPIRED':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200',
          badge: 'bg-amber-600 text-white',
          icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
          title: 'VALID BUT EXPIRED',
          desc: 'Credential structure and issuer signature verified, but expiration timestamp (exp) has elapsed.',
        };
      default:
        return {
          bg: 'bg-slate-50 dark:bg-slate-800 border-slate-300 text-slate-800',
          badge: 'bg-slate-600 text-white',
          icon: <Clock className="w-6 h-6 text-slate-500" />,
          title: outcomeVal,
          desc: 'Protocol sequence evaluation completed.',
        };
    }
  };

  const style = getVerdictStyle(outcome);

  return (
    <div className={`border rounded-xl p-5 shadow-sm space-y-4 ${style.bg}`}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-3">
        <div className="flex items-center space-x-3">
          {style.icon}
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${style.badge}`}>
                {outcome}
              </span>
              <h3 className="text-sm font-bold tracking-tight">
                {style.title}
              </h3>
            </div>
            <p className="text-xs opacity-90 mt-0.5">
              {style.desc}
            </p>
          </div>
        </div>

        <div className="text-right text-xs opacity-75 font-mono">
          Session ID: <span className="font-semibold">{testSession.test_id.slice(0, 8)}...</span>
        </div>
      </div>

      {/* Triad Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-2.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-black/5 dark:border-white/5">
          <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Issuer</div>
          <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{testSession.issuer}</div>
        </div>

        <div className="p-2.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-black/5 dark:border-white/5">
          <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Wallet</div>
          <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{testSession.wallet}</div>
        </div>

        <div className="p-2.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-black/5 dark:border-white/5">
          <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Verifier</div>
          <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{testSession.verifier}</div>
        </div>

        <div className="p-2.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-black/5 dark:border-white/5">
          <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Credential Format</div>
          <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{testSession.credential_format}</div>
        </div>
      </div>

      {/* Crucial Verification Notice */}
      <div className="flex items-start space-x-2 pt-2 border-t border-black/10 dark:border-white/10 text-[11px] opacity-85">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <strong>Sandbox Notice:</strong> This result is evaluated within the simulated protocol engine. Real cryptographic signature verification will occur when the live Inji Verify endpoint is connected.
        </span>
      </div>
    </div>
  );
};
