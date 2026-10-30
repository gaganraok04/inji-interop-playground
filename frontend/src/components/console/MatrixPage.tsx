import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  InteropMatrixItem,
  IssuerOption,
  WalletOption,
  VerifierOption,
  CredentialFormat,
  ConsoleView,
  TestReport,
} from '../../types';
import {
  Table2,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  SlidersHorizontal,
  ArrowRight,
  Activity,
  FileText,
  History,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Sparkles,
  GitCommit,
} from 'lucide-react';
import { api, API_BASE } from '../../services/api';
import { ReportModal } from './ReportModal';
import { computeMatrixSummaryMetrics, isRowTested } from './matrixMetrics';

export interface MatrixRowConfig {
  issuer: IssuerOption;
  wallet: WalletOption;
  verifier: VerifierOption;
  format: CredentialFormat;
  test_id?: string;
  targetView?: ConsoleView;
}

interface MatrixPageProps {
  matrix: InteropMatrixItem[];
  activeTestId?: string | null;
  onSelectRow: (config: MatrixRowConfig) => void;
}

export const MatrixPage: React.FC<MatrixPageProps> = ({
  matrix,
  activeTestId,
  onSelectRow,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  // Default to showing ONLY combinations with recorded test executions
  const [scopeFilter, setScopeFilter] = useState<'TESTED_ONLY' | 'ALL_PERMUTATIONS'>('TESTED_ONLY');
  const [formatFilter, setFormatFilter] = useState<string>('ALL');
  const [issuerFilter, setIssuerFilter] = useState<string>('ALL');
  const [walletFilter, setWalletFilter] = useState<string>('ALL');
  const [verifierFilter, setVerifierFilter] = useState<string>('ALL');
  const [matrixData, setMatrixData] = useState<InteropMatrixItem[]>(matrix);
  const [liveTestsCount, setLiveTestsCount] = useState<number>(0);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState<TestReport | null>(null);
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);

  const pollSeqRef = useRef<number>(0);

  // Sync props when parent updates
  useEffect(() => {
    if (matrix && matrix.length > 0) {
      setMatrixData(matrix);
    }
  }, [matrix]);

  const fetchLatestMatrix = useCallback(async () => {
    const seq = ++pollSeqRef.current;
    try {
      const data = await api.getMatrix();
      if (seq === pollSeqRef.current && data?.matrix) {
        setMatrixData(data.matrix);
        setLiveTestsCount(data.live_tests_count || 0);
      }
    } catch (err) {
      // quiet matrix sync
    }
  }, []);

  // Real-time Matrix updates via SSE (/api/stream), BroadcastChannel, focus/visibility/online, and non-overlapping fallback poll
  useEffect(() => {
    let active = true;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const pollLoop = async () => {
      if (!active) return;
      await fetchLatestMatrix();
      if (active) {
        const delay = document.visibilityState === 'visible' ? 2500 : 6000;
        timerId = setTimeout(pollLoop, delay);
      }
    };

    pollLoop();

    const handleFocus = () => fetchLatestMatrix();
    const handleOnline = () => fetchLatestMatrix();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchLatestMatrix();
      }
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('inji_test_channel');
      bc.onmessage = (ev) => {
        if (ev.data?.type === 'TEST_UPDATED') {
          fetchLatestMatrix();
        }
      };
    } catch (e) {
      // BroadcastChannel not supported
    }

    let es: EventSource | null = null;
    try {
      es = new EventSource(`${API_BASE}/api/stream`);
      es.addEventListener('state_update', () => {
        fetchLatestMatrix();
      });
    } catch (e) {
      // Fallback to polling
    }

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('visibilitychange', handleVisibility);
      if (bc) bc.close();
      if (es) es.close();
    };
  }, [fetchLatestMatrix]);

  const handleOpenReport = async (testId: string) => {
    if (!testId) return;
    setLoadingReportId(testId);
    try {
      const report = await api.getTestReport(testId);
      setReportData(report);
      setReportModalOpen(true);
    } catch (err) {
      console.warn('Could not load test report:', err);
    } finally {
      setLoadingReportId(null);
    }
  };

  const filteredMatrix = matrixData.filter((item) => {
    if (scopeFilter === 'TESTED_ONLY' && !isRowTested(item)) {
      return false;
    }

    const matchesSearch =
      item.issuer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.wallet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.verifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.format.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.latest_verdict || item.result || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.test_id && item.test_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.report_id && item.report_id.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFormat = formatFilter === 'ALL' || item.format === formatFilter;
    const matchesIssuer = issuerFilter === 'ALL' || item.issuer === issuerFilter;
    const matchesWallet = walletFilter === 'ALL' || item.wallet === walletFilter;
    const matchesVerifier = verifierFilter === 'ALL' || item.verifier === verifierFilter;

    return matchesSearch && matchesFormat && matchesIssuer && matchesWallet && matchesVerifier;
  });

  const renderVerdictBadge = (verdictStr?: string | null, rawStatus?: string) => {
    const v = (verdictStr || '').toUpperCase();
    if (v === 'PASS') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#EDF7F1] text-[#2D6A4F] border border-[#B7E4C7]">
          <CheckCircle2 className="w-3 h-3 text-[#2D6A4F]" />
          <span>PASS</span>
        </span>
      );
    }
    if (v === 'FAIL') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-50 text-red-700 border border-red-200">
          <XCircle className="w-3 h-3 text-red-600" />
          <span>FAIL</span>
        </span>
      );
    }
    if (v === 'ERROR' || rawStatus === 'AUTHORIZATION_FAILED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-rose-800 border border-rose-300">
          <XCircle className="w-3 h-3 text-rose-600" />
          <span>ERROR</span>
        </span>
      );
    }
    if (v === 'RUNNING' || v === 'PENDING') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
          <Activity className="w-3 h-3 text-amber-600" />
          <span>RUNNING</span>
        </span>
      );
    }
    if (v === 'AWAITING_AUTHORIZATION' || rawStatus === 'AWAITING_AUTHORIZATION') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>AWAITING AUTH</span>
        </span>
      );
    }
    if (v === 'AWAITING_CREDENTIAL' || rawStatus === 'AWAITING_CREDENTIAL') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>AWAITING CRED</span>
        </span>
      );
    }
    if (v === 'INCOMPLETE') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-sand-200 text-parchment-700 border border-parchment-300">
          <Clock className="w-3 h-3 text-parchment-500" />
          <span>INCOMPLETE</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-sand-200/50 text-parchment-600 border border-parchment-300">
        <span className="w-1.5 h-1.5 rounded-full bg-parchment-400" />
        <span>NOT TESTED</span>
      </span>
    );
  };

  const renderModeBadge = (item: InteropMatrixItem) => {
    if (!isRowTested(item)) {
      return (
        <span className="text-[10px] font-mono text-parchment-500">
          —
        </span>
      );
    }
    if (item.is_real_stack || item.mode === 'REAL_INJI_STACK') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
          <ShieldCheck className="w-3 h-3 text-emerald-700" />
          <span>REAL INJI STACK</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sand-200 text-copper-900 border border-parchment-300">
        <Sparkles className="w-3 h-3 text-copper-700" />
        <span>SIMULATION</span>
      </span>
    );
  };

  // Compute live matrix counts using centralized metric helper
  const metrics = computeMatrixSummaryMetrics(matrixData);
  const { totalPermutations, testedCount } = metrics;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title & Summary Strip */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-copper-700 text-white flex items-center justify-center shadow-warm-sm">
              <Table2 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-parchment-900 font-mono">
                INTEROPERABILITY CONFORMANCE MATRIX
              </h1>
              <p className="text-xs text-parchment-600">
                Live persisted conformance ledger derived from actual OpenID4VCI & OpenID4VP test executions.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-mono font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
              Completed: {metrics.totalCompletedRuns} / Attempts: {metrics.totalAttempts || liveTestsCount}
            </span>
          </div>
        </div>

        {/* Real-time Summary Metric Strip */}
        <div className="mt-5 pt-4 border-t border-parchment-200/80 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-center font-mono">
          <div className="bg-sand-100/70 p-2.5 rounded-xl border border-parchment-200">
            <div className="text-[10px] text-parchment-500 uppercase tracking-wider font-semibold">Tested Triads</div>
            <div className="text-base font-extrabold text-copper-800">{metrics.testedCount}</div>
            <div className="text-[9px] text-parchment-500 mt-0.5">of {metrics.totalPermutations} combinations</div>
          </div>
          <div className="bg-sand-100/70 p-2.5 rounded-xl border border-parchment-200">
            <div className="text-[10px] text-parchment-500 uppercase tracking-wider font-semibold">Completed Runs</div>
            <div className="text-base font-extrabold text-parchment-900">{metrics.totalCompletedRuns}</div>
            <div className="text-[9px] text-parchment-500 mt-0.5">({metrics.totalAttempts || liveTestsCount} attempts)</div>
          </div>
          <div className="bg-[#EDF7F1] p-2.5 rounded-xl border border-[#B7E4C7]">
            <div className="text-[10px] text-[#2D6A4F] uppercase tracking-wider font-semibold">PASS Executions</div>
            <div className="text-base font-extrabold text-[#2D6A4F]">{metrics.totalPassRuns}</div>
            <div className="text-[9px] text-[#2D6A4F]/80 mt-0.5">Latest: {metrics.latestOverallVerdict} ({metrics.triadsLatestPassCount} Triad PASS)</div>
          </div>
          <div className="bg-red-50 p-2.5 rounded-xl border border-red-200">
            <div className="text-[10px] text-red-600 uppercase tracking-wider font-semibold">FAIL / ERR Executions</div>
            <div className="text-base font-extrabold text-red-700">{metrics.totalFailRuns + metrics.totalErrorRuns}</div>
            <div className="text-[9px] text-red-600/80 mt-0.5">Latest: {metrics.latestOverallVerdict} ({metrics.triadsLatestFailCount} Triad FAIL)</div>
          </div>
          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 col-span-2 sm:col-span-1">
            <div className="text-[10px] text-amber-700 uppercase tracking-wider font-semibold">Active / Incomplete</div>
            <div className="text-base font-extrabold text-amber-800">
              {metrics.totalRunning > 0 ? `${metrics.totalRunning} Run` : '0 Run'}
              <span className="text-xs font-normal text-parchment-600 ml-1">/ {metrics.totalIncomplete} Incomplete</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel rounded-2xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Left: Tested-Only vs All Permutations Toggle + Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="inline-flex rounded-xl bg-sand-100 p-1 border border-parchment-300 font-mono text-xs shrink-0">
              <button
                type="button"
                onClick={() => setScopeFilter('TESTED_ONLY')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  scopeFilter === 'TESTED_ONLY'
                    ? 'bg-copper-700 text-white shadow-warm-sm'
                    : 'text-parchment-700 hover:text-parchment-900'
                }`}
              >
                Tested Combinations ({testedCount})
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('ALL_PERMUTATIONS')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  scopeFilter === 'ALL_PERMUTATIONS'
                    ? 'bg-copper-700 text-white shadow-warm-sm'
                    : 'text-parchment-700 hover:text-parchment-900'
                }`}
              >
                All Permutations ({totalPermutations})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-parchment-500" />
              <input
                type="text"
                placeholder="Search triad, verdict, or report ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-cream border border-parchment-300 text-parchment-900 placeholder-parchment-400 focus:outline-none focus:ring-2 focus:ring-copper-500"
              />
            </div>
          </div>

          {/* Right: Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 text-xs text-parchment-600">
              <SlidersHorizontal className="w-3.5 h-3.5 text-copper-700" />
              <span>Filters:</span>
            </div>

            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="text-xs bg-cream border border-parchment-300 rounded-lg px-2.5 py-1 text-parchment-800 focus:outline-none focus:ring-1 focus:ring-copper-600 font-mono"
            >
              <option value="ALL">All Formats</option>
              <option value="W3C VC">W3C VC</option>
              <option value="SD-JWT VC">SD-JWT VC</option>
            </select>

            <select
              value={issuerFilter}
              onChange={(e) => setIssuerFilter(e.target.value)}
              className="text-xs bg-cream border border-parchment-300 rounded-lg px-2.5 py-1 text-parchment-800 focus:outline-none focus:ring-1 focus:ring-copper-600"
            >
              <option value="ALL">All Issuers</option>
              <option value="Inji Certify">Inji Certify</option>
              <option value="External OpenID4VCI Issuer">External OpenID4VCI</option>
            </select>

            <select
              value={walletFilter}
              onChange={(e) => setWalletFilter(e.target.value)}
              className="text-xs bg-cream border border-parchment-300 rounded-lg px-2.5 py-1 text-parchment-800 focus:outline-none focus:ring-1 focus:ring-copper-600"
            >
              <option value="ALL">All Wallets</option>
              <option value="Inji Web">Inji Web</option>
              <option value="Inji Wallet">Inji Wallet</option>
              <option value="External Wallet">External Wallet</option>
            </select>

            <select
              value={verifierFilter}
              onChange={(e) => setVerifierFilter(e.target.value)}
              className="text-xs bg-cream border border-parchment-300 rounded-lg px-2.5 py-1 text-parchment-800 focus:outline-none focus:ring-1 focus:ring-copper-600"
            >
              <option value="ALL">All Verifiers</option>
              <option value="Inji Verify">Inji Verify</option>
              <option value="External OpenID4VP Verifier">External OpenID4VP</option>
            </select>
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-warm-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-sand-100/90 border-b border-parchment-300 text-parchment-800 font-mono font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">Issuer / Wallet / Verifier</th>
                <th className="py-3 px-3">Format</th>
                <th className="py-3 px-3">Execution Mode</th>
                <th className="py-3 px-3">Runs (Pass / Fail)</th>
                <th className="py-3 px-3">Latest Execution</th>
                <th className="py-3 px-3">Latest Verdict</th>
                <th className="py-3 px-3 text-right">Actions & History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-parchment-200/80 bg-cream/70">
              {filteredMatrix.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-parchment-600">
                    {scopeFilter === 'TESTED_ONLY' ? (
                      <div className="space-y-2">
                        <p className="font-semibold text-parchment-800">
                          No recorded test executions match the current filter.
                        </p>
                        <p className="text-[11px] text-parchment-600">
                          Start an interoperability test in the Test Console or switch to{' '}
                          <button
                            type="button"
                            onClick={() => setScopeFilter('ALL_PERMUTATIONS')}
                            className="text-copper-700 font-bold underline hover:text-copper-900"
                          >
                            All Permutations ({totalPermutations})
                          </button>{' '}
                          to view untested combinations.
                        </p>
                      </div>
                    ) : (
                      <span>No matching matrix records found. Try adjusting your filters.</span>
                    )}
                  </td>
                </tr>
              ) : (
                filteredMatrix.map((item, idx) => {
                  const tested = isRowTested(item);
                  const completedCount = item.completed_count ?? item.execution_count ?? (item.test_id ? 1 : 0);
                  const attemptCount = item.attempt_count ?? completedCount;
                  const passCount = item.pass_count ?? (item.status === 'PASS' ? 1 : 0);
                  const failCount = item.fail_count ?? (item.status === 'FAIL' || item.status === 'ERROR' ? 1 : 0);
                  const errorCount = item.error_count ?? 0;
                  const runningCount = item.running_count ?? 0;
                  const incompleteCount = item.incomplete_count ?? 0;
                  const latestVerdict = item.latest_verdict || item.display_status || (tested ? item.status : 'NOT TESTED');
                  const isExpanded = expandedRowId === item.id;
                  const historyList = item.executions || [];

                  return (
                    <React.Fragment key={item.id || idx}>
                      <tr
                        className={`hover:bg-sand-50/90 transition-colors ${
                          item.test_id && item.test_id === activeTestId ? 'bg-copper-50/50' : ''
                        }`}
                      >
                        <td className="py-3.5 px-3 font-mono text-parchment-500 font-semibold">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-parchment-900">
                            {item.issuer} <span className="text-copper-600 font-mono">→</span>{' '}
                            <span className="text-sky-900">{item.wallet}</span>{' '}
                            <span className="text-copper-600 font-mono">→</span> {item.verifier}
                          </div>
                          {item.test_id && (
                            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-copper-800 mt-1">
                              <span className="font-bold bg-sand-100 px-1.5 py-0.5 rounded border border-parchment-300">
                                {item.report_id || `REP-${item.test_id.slice(0, 8).toUpperCase()}`}
                              </span>
                              <span className="text-parchment-600">Session: {item.test_id.slice(0, 8)}…</span>
                              {item.latest_attempt_report_id && item.latest_attempt_report_id !== item.report_id && (
                                <span className="text-amber-800 font-semibold">
                                  (Latest attempt: {item.latest_attempt_report_id} {item.latest_attempt_status})
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-mono">
                          <span className="px-2 py-0.5 rounded bg-sand-200 text-copper-900 border border-parchment-300 text-[10px] font-bold">
                            {item.format}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          {renderModeBadge(item)}
                        </td>
                        <td className="py-3.5 px-3 font-mono">
                          {tested ? (
                            <div className="space-y-0.5">
                              <div className="font-bold text-parchment-900 text-xs flex items-center space-x-1">
                                <span>{completedCount} Completed</span>
                                {attemptCount > completedCount && (
                                  <span className="text-[10px] text-parchment-500 font-normal">
                                    ({attemptCount} attempts)
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] flex items-center space-x-1.5 flex-wrap">
                                <span className="text-[#2D6A4F] font-bold">{passCount} Pass</span>
                                <span className="text-parchment-400">•</span>
                                <span className="text-red-700 font-bold">{failCount} Fail</span>
                                {errorCount > 0 && (
                                  <>
                                    <span className="text-parchment-400">•</span>
                                    <span className="text-rose-700 font-bold">{errorCount} Err</span>
                                  </>
                                )}
                                {runningCount > 0 && (
                                  <>
                                    <span className="text-parchment-400">•</span>
                                    <span className="text-sky-700 font-bold">{runningCount} Run</span>
                                  </>
                                )}
                                {incompleteCount > 0 && (
                                  <>
                                    <span className="text-parchment-400">•</span>
                                    <span className="text-parchment-500 font-medium">{incompleteCount} Incomplete</span>
                                  </>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-parchment-500">0 Runs</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px] text-parchment-700">
                          {tested && item.latest_executed_at ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-1 text-parchment-900 font-semibold">
                                <Clock className="w-3 h-3 text-copper-600 shrink-0" />
                                <span>{new Date(item.latest_executed_at).toLocaleTimeString()}</span>
                              </div>
                              <div className="text-[10px] text-parchment-500">
                                {new Date(item.latest_executed_at).toLocaleDateString()}
                                {typeof item.duration_ms === 'number' && item.duration_ms > 0
                                  ? ` • ${
                                      item.duration_ms >= 1000
                                        ? `${(item.duration_ms / 1000).toFixed(2)}s`
                                        : `${Math.round(item.duration_ms)}ms`
                                    }`
                                  : ''}
                              </div>
                            </div>
                          ) : (
                            <span className="text-parchment-500">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="space-y-1">
                            {renderVerdictBadge(latestVerdict, item.raw_status)}
                            {latestVerdict === 'INCOMPLETE' && item.raw_status && (
                              <div className="text-[10px] font-mono text-parchment-600">
                                raw: <span className="text-parchment-800 font-semibold">{item.raw_status}</span>
                              </div>
                            )}
                            {tested && item.credential_validity && (
                              <div className="text-[10px] font-mono text-parchment-600">
                                VC: <strong className="text-parchment-800">{item.credential_validity}</strong>
                                {item.verifier_result ? ` | Verify: ${item.verifier_result}` : ''}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {item.test_id && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenReport(item.test_id!)}
                                  disabled={loadingReportId === item.test_id}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cream text-copper-900 border border-parchment-300 hover:bg-sand-100 transition-colors shadow-warm-sm"
                                  title="View Audit Report"
                                >
                                  <FileText className="w-3 h-3 text-copper-700" />
                                  <span>{loadingReportId === item.test_id ? 'Loading…' : 'Report'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onSelectRow({
                                      issuer: item.issuer as IssuerOption,
                                      wallet: item.wallet as WalletOption,
                                      verifier: item.verifier as VerifierOption,
                                      format: item.format as CredentialFormat,
                                      test_id: item.test_id || undefined,
                                      targetView: 'protocol-flow',
                                    })
                                  }
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-sand-100 text-parchment-900 border border-parchment-300 hover:bg-sand-200 transition-colors shadow-warm-sm"
                                  title="Inspect 8-Stage Protocol Flow"
                                >
                                  <GitCommit className="w-3 h-3 text-copper-700" />
                                  <span>Flow</span>
                                </button>
                              </>
                            )}
                            {historyList.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpandedRowId(isExpanded ? null : item.id)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-sand-100 text-copper-900 border border-parchment-300 hover:bg-sand-200 transition-colors"
                                title="Toggle Execution History"
                              >
                                <History className="w-3 h-3 text-copper-700" />
                                <span>History ({historyList.length})</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                onSelectRow({
                                  issuer: item.issuer as IssuerOption,
                                  wallet: item.wallet as WalletOption,
                                  verifier: item.verifier as VerifierOption,
                                  format: item.format as CredentialFormat,
                                  test_id: item.test_id || undefined,
                                  targetView: 'console',
                                })
                              }
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all shadow-warm-sm ${
                                item.test_id
                                  ? 'bg-copper-700 text-white border-copper-800 hover:bg-copper-800'
                                  : 'bg-sand-100 text-copper-900 border-parchment-300 hover:bg-copper-700 hover:text-white'
                              }`}
                            >
                              <span>{item.test_id ? 'Inspect Console' : 'Configure Test'}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Execution History Drawer */}
                      {isExpanded && historyList.length > 0 && (
                        <tr className="bg-sand-100/70">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="rounded-xl border border-parchment-300 bg-cream p-3.5 space-y-2.5">
                              <div className="flex items-center justify-between border-b border-parchment-200 pb-2">
                                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-parchment-800">
                                  Recorded Execution History ({historyList.length} Runs) — Newest First
                                </span>
                                <span className="text-[10px] font-mono text-parchment-600">
                                  Single Source of Truth: Persisted SQLite Test Store
                                </span>
                              </div>
                              <div className="divide-y divide-parchment-200/70">
                                {historyList.map((exec) => (
                                  <div
                                    key={exec.test_id}
                                    className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
                                  >
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-bold text-copper-900 bg-sand-100 px-2 py-0.5 rounded border border-parchment-300">
                                        {exec.report_id}
                                      </span>
                                      {renderVerdictBadge(exec.verdict || (exec as any).display_status || exec.outcome, exec.status)}
                                      {(exec.execution_state === 'INCOMPLETE' || exec.verdict === 'INCOMPLETE') && exec.status && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sand-200 text-parchment-700 border border-parchment-300" title="Raw session status">
                                          raw: {exec.status}
                                        </span>
                                      )}
                                      {exec.execution_state && exec.execution_state !== 'COMPLETED' && exec.execution_state !== 'INCOMPLETE' && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sand-200 text-parchment-700 border border-parchment-300">
                                          {exec.execution_state}
                                        </span>
                                      )}
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                          exec.is_real_stack
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                            : 'bg-sand-200 text-copper-900 border-parchment-300'
                                        }`}
                                      >
                                        {exec.is_real_stack ? 'REAL INJI STACK' : 'SIMULATION'}
                                      </span>
                                      {exec.expected_outcome && (
                                        <span className="text-[10px] text-parchment-600">
                                          Scenario: <strong>{exec.expected_outcome}</strong>
                                        </span>
                                      )}
                                      {exec.credential_validity && (
                                        <span className="text-[10px] text-parchment-600">
                                          VC: <strong>{exec.credential_validity}</strong>
                                        </span>
                                      )}
                                      {exec.verifier_result && (
                                        <span className="text-[10px] text-parchment-600">
                                          Verifier: <strong>{exec.verifier_result}</strong>
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center space-x-2 shrink-0">
                                      {exec.updated_at && (
                                        <span className="text-[10px] text-parchment-600">
                                          {new Date(exec.updated_at).toLocaleString()}
                                        </span>
                                      )}
                                      {exec.duration_ms > 0 && (
                                        <span className="text-[10px] text-copper-800 font-semibold">
                                          {exec.duration_ms >= 1000
                                            ? `${(exec.duration_ms / 1000).toFixed(2)}s`
                                            : `${Math.round(exec.duration_ms)}ms`}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleOpenReport(exec.test_id)}
                                        className="px-2 py-0.5 rounded bg-sand-100 hover:bg-sand-200 text-copper-900 border border-parchment-300 text-[10px] font-bold"
                                      >
                                        Report
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onSelectRow({
                                            issuer: item.issuer as IssuerOption,
                                            wallet: item.wallet as WalletOption,
                                            verifier: item.verifier as VerifierOption,
                                            format: item.format as CredentialFormat,
                                            test_id: exec.test_id,
                                            targetView: 'console',
                                          })
                                        }
                                        className="px-2 py-0.5 rounded bg-copper-700 hover:bg-copper-800 text-white text-[10px] font-bold"
                                      >
                                        Inspect Run
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Modal for direct inspection from Matrix */}
      <ReportModal
        report={reportData}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </div>
  );
};
