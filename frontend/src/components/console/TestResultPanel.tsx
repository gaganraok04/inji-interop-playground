import React, { useState, useEffect } from 'react';
import { TestSession, TestReport } from '../../types';
import { ReportModal } from './ReportModal';
import { api } from '../../services/api';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RotateCcw,
  FileText,
  Download,
  ShieldAlert,
  Loader2,
  KeyRound,
  ExternalLink,
} from 'lucide-react';

interface TestResultPanelProps {
  testSession: TestSession | null;
  isRunning: boolean;
  onRunAgain: () => void;
  issuer: string;
  wallet: string;
  verifier: string;
  format: string;
}

export const TestResultPanel: React.FC<TestResultPanelProps> = ({
  testSession,
  isRunning,
  onRunAgain,
  issuer,
  wallet,
  verifier,
  format,
}) => {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState<TestReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  // Live timer for currently running or active waiting tests
  useEffect(() => {
    const isActivelyProgressing =
      isRunning ||
      testSession?.status === 'RUNNING' ||
      testSession?.status === 'AWAITING_AUTHORIZATION' ||
      testSession?.status === 'AWAITING_CREDENTIAL' ||
      testSession?.status === 'PENDING_VERIFICATION';

    if (!isActivelyProgressing) return;

    const startTs = testSession?.started_at
      ? new Date(testSession.started_at).getTime()
      : testSession?.created_at
      ? new Date(testSession.created_at).getTime()
      : Date.now();

    const interval = setInterval(() => {
      setElapsedMs(Math.max(0, Date.now() - startTs));
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, testSession?.status, testSession?.started_at, testSession?.created_at]);

  const handleViewReport = async () => {
    if (!testSession?.test_id) return;
    setLoadingReport(true);
    try {
      if (!testSession.test_id.startsWith('local-')) {
        const report = await api.getTestReport(testSession.test_id);
        setReportData(report);
      } else {
        // Fallback local report
        const fallbackReport: TestReport = {
          report_id: `REP-${testSession.test_id.slice(-6).toUpperCase()}`,
          test_id: testSession.test_id,
          generated_at: new Date().toISOString(),
          summary: {
            issuer: testSession.issuer,
            wallet: testSession.wallet,
            verifier: testSession.verifier,
            credential_format: testSession.credential_format,
            final_verdict: testSession.outcome || 'PASS',
            total_protocol_steps: 8,
            steps_completed: 8,
            is_sandbox_simulation: !testSession.is_real_stack,
          },
          standards_compliance: [
            {
              standard: 'OpenID4VCI (Draft 13)',
              status: testSession.is_real_stack ? 'COMPLIANT_VERIFIED' : 'COMPLIANT_SIMULATED',
              covered_steps: ['Credential Offer', 'Authorization', 'Token Exchange', 'Credential Request', 'Credential Response'],
            },
            {
              standard: 'OpenID4VP (Draft 20)',
              status: testSession.is_real_stack ? 'COMPLIANT_VERIFIED' : 'COMPLIANT_SIMULATED',
              covered_steps: ['Presentation Request', 'VP Token', 'Verification'],
            },
          ],
          step_audit: testSession.steps.map((s) => ({
            step_name: s.name,
            endpoint: s.endpoint,
            method: s.method,
            http_status: s.status,
            result: s.status < 400 ? 'PASS' : 'FAIL',
          })),
          disclaimer: testSession.is_real_stack
            ? 'REAL MOSIP INJI STACK AUDIT: Live interaction verified across Inji Certify (port 8090/8091), Inji Web (port 3004), and Inji Verify (port 8081).'
            : 'DEMO SANDBOX REPORT: Simulated protocol interaction audit for Inji Interoperability Playground.',
        };
        setReportData(fallbackReport);
      }
      setReportModalOpen(true);
    } catch (err) {
      console.warn('Could not load report:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleExport = () => {
    const exportData = {
      test_session: testSession,
      exported_at: new Date().toISOString(),
      disclaimer: testSession?.is_real_stack
        ? 'Inji Interoperability Playground Real MOSIP Stack Audit Export'
        : 'Inji Interoperability Playground Simulated Test Export',
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interop-test-${testSession?.test_id || 'session'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // State 1: TEST NOT STARTED
  if (!testSession && !isRunning) {
    return (
      <div className="glass-panel rounded-2xl p-6 text-center">
        <div className="w-10 h-10 rounded-full bg-sand-100 border border-parchment-300 flex items-center justify-center mx-auto mb-3 text-parchment-600">
          <Clock className="w-5 h-5 text-copper-700" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-parchment-700 font-mono">
          TEST NOT STARTED
        </h3>
        <p className="mt-1 text-xs text-parchment-600 max-w-md mx-auto">
          Configure the Issuer, Wallet, and Verifier triad above and click <strong>START INTEROPERABILITY TEST</strong> to begin the 8-stage verification protocol.
        </p>
      </div>
    );
  }

  // State 2: TEST IN PROGRESS
  if (isRunning) {
    return (
      <div className="glass-panel rounded-2xl p-6 text-center border-copper-400 pulse-active">
        <div className="w-10 h-10 rounded-full bg-copper-100 border border-copper-300 flex items-center justify-center mx-auto mb-3 text-copper-800">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-copper-100/90 border border-copper-300 text-copper-900 font-mono text-xs font-bold mb-2">
          <span className="w-2 h-2 rounded-full bg-copper-600 animate-ping" />
          <span>TEST IN PROGRESS</span>
        </div>
        <h3 className="text-sm font-bold text-parchment-900">
          Evaluating Protocol Lifecycle
        </h3>
        <p className="mt-1 text-xs text-parchment-700 max-w-md mx-auto">
          Executing sequential OpenID4VCI credential issuance followed by OpenID4VP presentation verification...
        </p>
      </div>
    );
  }

  // State 3: TEST RESULT
  const outcome = testSession?.outcome || 'PENDING';
  const expectedScenario = testSession?.expected_outcome || 'PASS';
  const step8Res = testSession?.steps?.[7]?.response || {};
  const credentialValidity =
    testSession?.credential_validity ||
    step8Res.credential_validity ||
    step8Res.validity_state ||
    (outcome === 'PASS' ? 'VALID' : outcome === 'PENDING' ? 'PENDING' : 'INVALID');

  const formatTimestamp = (ts?: string | null) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleTimeString();
    } catch {
      return '—';
    }
  };

  const startedAtDisplay = formatTimestamp(testSession?.started_at || testSession?.created_at);
  const completedAtDisplay = formatTimestamp(testSession?.completed_at);
  const lastUpdatedAtDisplay = formatTimestamp(testSession?.updated_at);

  const isTerminal =
    testSession?.status === 'COMPLETED' ||
    testSession?.status === 'AUTHORIZATION_FAILED' ||
    testSession?.status === 'ERROR' ||
    testSession?.status === 'RESET' ||
    outcome === 'PASS' ||
    outcome === 'FAIL';

  const durationDisplay = isTerminal
    ? (typeof testSession?.duration_ms === 'number' && testSession.duration_ms > 0
        ? `${(testSession.duration_ms / 1000).toFixed(2)}s`
        : '—')
    : elapsedMs > 0
    ? `${(elapsedMs / 1000).toFixed(1)}s (running)`
    : '—';

  const completedStepsCount =
    typeof testSession?.completed_steps_count === 'number'
      ? testSession.completed_steps_count
      : (testSession?.steps?.filter((s) => s.status > 0 && s.status < 400).length ?? 0);
  const pendingStepsCount =
    typeof testSession?.pending_steps_count === 'number'
      ? testSession.pending_steps_count
      : Math.max(0, 8 - completedStepsCount);

  const getOutcomeDetails = () => {
    const isNegativeScenario = ['FAIL', 'INVALID', 'VALID BUT EXPIRED'].includes(expectedScenario);
    switch (outcome) {
      case 'PASS':
      case 'VALID':
        return {
          badge: 'bg-[#EDF7F1] text-[#2D6A4F] border-[#B7E4C7]',
          icon: <CheckCircle2 className="w-5 h-5 text-[#2D6A4F]" />,
          title: isNegativeScenario
            ? `TEST PASSED • EXPECTED REJECTION VERIFIED (${credentialValidity})`
            : expectedScenario === 'VALID'
            ? 'TEST PASSED • CREDENTIAL VALID'
            : 'TEST PASSED',
          desc:
            step8Res.condition_summary ||
            (isNegativeScenario
              ? `Negative test passed: Verifier genuinely rejected the ${credentialValidity} presentation as expected.`
              : 'All 8 protocol stages completed in full compliance with OpenID4VCI & OpenID4VP.'),
        };
      case 'FAIL':
      case 'INVALID':
        return {
          badge: 'bg-[#FFE4E6] text-[#9F1239] border-[#FECDD3]',
          icon: <XCircle className="w-5 h-5 text-[#9F1239]" />,
          title: outcome === 'FAIL' ? `TEST FAILED (${credentialValidity})` : 'CREDENTIAL INVALID',
          desc:
            step8Res.condition_summary ||
            'Verification failed: untrusted signature, missing credential, or presentation policy rejection.',
        };
      case 'VALID BUT EXPIRED':
        return {
          badge: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
          icon: <AlertTriangle className="w-5 h-5 text-[#B45309]" />,
          title: 'VALID BUT EXPIRED',
          desc: 'Signature and structure verified, but credential expiration date has passed.',
        };
      case 'PENDING':
      default:
        return {
          badge: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
          icon: <Clock className="w-5 h-5 text-[#92400E]" />,
          title: testSession?.status === 'RUNNING'
            ? 'TEST IN PROGRESS'
            : testSession?.status === 'AWAITING_AUTHORIZATION'
            ? 'AWAITING CITIZEN AUTHORIZATION'
            : testSession?.status === 'AWAITING_CREDENTIAL'
            ? 'AWAITING ISSUED CREDENTIAL'
            : testSession?.status === 'PENDING_VERIFICATION'
            ? 'PENDING PRESENTATION VERIFICATION'
            : testSession?.status === 'ERROR'
            ? 'EXECUTION ERROR'
            : 'PROTOCOL EVALUATION PENDING',
          desc: testSession?.note || 'Steps evaluated sequentially. Protocol execution in progress.',
        };
    }
  };

  const outcomeInfo = getOutcomeDetails();
  const isPendingAuth = testSession?.status === 'AWAITING_AUTHORIZATION';

  return (
    <>
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-parchment-200/80 pb-3">
          <div className="flex items-center space-x-3">
            {outcomeInfo.icon}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-parchment-600">
                  {testSession?.status === 'COMPLETED'
                    ? 'TEST COMPLETED'
                    : isPendingAuth
                    ? 'ACTION REQUIRED'
                    : 'TEST STATUS'}
                </span>
                <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${outcomeInfo.badge}`}>
                  {outcome}
                </span>
                {testSession?.status === 'COMPLETED' && credentialValidity && (
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      credentialValidity === 'VALID'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : credentialValidity === 'VALID BUT EXPIRED'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    Validity: {credentialValidity}
                  </span>
                )}
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-sand-100 text-parchment-700 border border-parchment-300">
                  Scenario: {expectedScenario}
                </span>
              </div>
              <h3 className="text-sm font-bold text-parchment-900 mt-0.5">
                {outcomeInfo.title}
              </h3>
            </div>
          </div>

          {/* REAL STACK vs SIMULATED SANDBOX Badge */}
          <div className="flex items-center space-x-2">
            {testSession?.is_real_stack ? (
              testSession?.status === 'COMPLETED' && outcome === 'PASS' ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-100/90 border border-emerald-300 text-emerald-900 text-xs font-bold uppercase font-mono shadow-warm-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>REAL MOSIP INJI STACK VERIFIED</span>
                </span>
              ) : testSession?.status === 'COMPLETED' && (outcome === 'FAIL' || outcome === 'INVALID') ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-rose-100/90 border border-rose-300 text-rose-900 text-xs font-bold uppercase font-mono shadow-warm-sm">
                  <XCircle className="w-3.5 h-3.5 text-rose-700" />
                  <span>REAL MOSIP INJI STACK • VERIFICATION FAILED</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-amber-100/90 border border-amber-300 text-amber-900 text-xs font-bold uppercase font-mono shadow-warm-sm">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>REAL MOSIP INJI STACK • {isPendingAuth ? 'AWAITING CITIZEN AUTH' : 'PENDING'}</span>
                </span>
              )
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-sand-200/90 border border-parchment-300 text-copper-900 text-xs font-bold uppercase font-mono shadow-warm-sm">
                <ShieldAlert className="w-3.5 h-3.5 text-copper-700" />
                <span>SANDBOX RESULT • SIMULATED VERIFICATION</span>
              </span>
            )}
          </div>
        </div>

        {/* Citizen Action Banner if Awaiting Authorization */}
        {isPendingAuth && testSession?.authorization_url && (
          <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-900 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-warm-sm">
            <div className="flex items-center space-x-3">
              <KeyRound className="w-5 h-5 text-amber-700 shrink-0" />
              <div>
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-amber-900">
                  Citizen Authorization Required (Step 2 OpenID4VCI)
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Complete authentication with MOSIP eSignet in your browser. The authorization code will proxy back automatically to advance the protocol.
                </p>
              </div>
            </div>
            <a
              href={testSession.authorization_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-mono text-xs font-bold transition shadow-warm-sm shrink-0"
            >
              <span>Authenticate with eSignet</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Structured Metadata & Real-Time Timing Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
          <div className="p-2.5 rounded-xl bg-sand-50/80 border border-parchment-200/80">
            <span className="text-[11px] text-parchment-700 uppercase font-mono font-semibold">Issuer</span>
            <div className="font-bold text-parchment-900 mt-0.5 truncate">{issuer}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-sand-50/80 border border-parchment-200/80">
            <span className="text-[11px] text-parchment-700 uppercase font-mono font-semibold">Wallet</span>
            <div className="font-bold text-parchment-900 mt-0.5 truncate text-sky-900">{wallet}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-sand-50/80 border border-parchment-200/80">
            <span className="text-[11px] text-parchment-700 uppercase font-mono font-semibold">Verifier</span>
            <div className="font-bold text-parchment-900 mt-0.5 truncate">{verifier}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-sand-50/80 border border-parchment-200/80">
            <span className="text-[11px] text-parchment-700 uppercase font-mono font-semibold">Session ID</span>
            <div className="font-bold text-copper-800 mt-0.5 font-mono text-[11px] truncate">
              {testSession?.test_id ? `${testSession.test_id.slice(0, 8)}...` : '—'}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-sand-50/80 border border-parchment-200/80">
            <span className="text-[11px] text-parchment-700 uppercase font-mono font-semibold">Started</span>
            <div className="font-bold text-parchment-900 mt-0.5 font-mono text-[11px]">{startedAtDisplay}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-sand-50/80 border border-parchment-200/80">
            <span className="text-[11px] text-parchment-700 uppercase font-mono font-semibold">Completed</span>
            <div className="font-bold text-parchment-900 mt-0.5 font-mono text-[11px]">{completedAtDisplay}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-sand-50/80 border border-parchment-200/80">
            <span className="text-[11px] text-parchment-700 uppercase font-mono font-semibold">Elapsed / Duration</span>
            <div className="font-bold text-copper-900 mt-0.5 font-mono text-[11px]">{durationDisplay}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-sand-50/80 border border-parchment-200/80">
            <span className="text-[11px] text-parchment-700 uppercase font-mono font-semibold">Step Progress</span>
            <div className="font-bold text-parchment-900 mt-0.5 font-mono text-[11px]">
              <span className="text-emerald-700 font-bold">{completedStepsCount} done</span>
              {pendingStepsCount > 0 && <span className="text-parchment-500 font-normal"> / {pendingStepsCount} pend</span>}
            </div>
          </div>
        </div>

        {/* Updated At Banner */}
        {testSession?.updated_at && (
          <div className="flex items-center justify-between text-[11px] font-mono text-parchment-600 px-1">
            <span>Last updated at: <strong>{lastUpdatedAtDisplay}</strong></span>
            <span>Protocol: <strong>OID4VCI & OID4VP</strong> ({format})</span>
          </div>
        )}

        {/* Action Buttons: VIEW FULL REPORT, RUN AGAIN, EXPORT */}
        <div className="pt-2 border-t border-parchment-200/80 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-parchment-600">
            {outcomeInfo.desc}
          </p>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleViewReport}
              disabled={loadingReport}
              className="px-3.5 py-1.5 rounded-xl border border-parchment-300 bg-sand-100 hover:bg-sand-200 text-parchment-900 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              {loadingReport ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-copper-700" />
              )}
              <span>VIEW FULL REPORT</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="px-3.5 py-1.5 rounded-xl border border-parchment-300 bg-sand-100 hover:bg-sand-200 text-parchment-900 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-copper-700" />
              <span>EXPORT</span>
            </button>

            <button
              type="button"
              onClick={onRunAgain}
              className="px-4 py-1.5 rounded-xl bg-copper-700 hover:bg-copper-800 text-white text-xs font-semibold shadow-warm-sm flex items-center space-x-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RUN AGAIN</span>
            </button>
          </div>
        </div>
      </div>

      {/* Full Audit Report Modal */}
      <ReportModal
        report={reportData}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </>
  );
};
