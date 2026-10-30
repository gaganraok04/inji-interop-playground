import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  IssuerOption,
  WalletOption,
  VerifierOption,
  CredentialFormat,
  TestResultOutcome,
  TestSession,
  InteropMatrixItem,
  HealthStatus,
  ProtocolStep,
  StepExecutionStatus,
  PageRoute,
  ConsoleView,
} from './types';
import { api, API_BASE } from './services/api';
import { LandingPage } from './components/landing/LandingPage';
import { TestConsole } from './components/console/TestConsole';
import { computeStepStatus } from './components/console/stepStatusHelper.ts';

export const App: React.FC = () => {
  // Page Routing: 'landing' | 'console'
  const [page, setPage] = useState<PageRoute>(() => {
    const hash = window.location.hash;
    return hash === '#/console' || hash === '#/protocol-flow' || hash === '#/matrix'
      ? 'console'
      : 'landing';
  });

  // Console active tab view: 'console' | 'protocol-flow' | 'matrix'
  const [consoleView, setConsoleView] = useState<ConsoleView>(() => {
    const hash = window.location.hash;
    if (hash === '#/protocol-flow') return 'protocol-flow';
    if (hash === '#/matrix') return 'matrix';
    return 'console';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/console') {
        setPage('console');
        setConsoleView('console');
      } else if (hash === '#/protocol-flow') {
        setPage('console');
        setConsoleView('protocol-flow');
      } else if (hash === '#/matrix') {
        setPage('console');
        setConsoleView('matrix');
      } else {
        setPage('landing');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectConsoleView = (view: ConsoleView) => {
    setConsoleView(view);
    setPage('console');
    window.location.hash = `#/${view}`;
  };

  const handleNavigateToConsole = () => {
    setPage('console');
    setConsoleView('console');
    window.location.hash = '#/console';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToLanding = () => {
    setPage('landing');
    window.location.hash = '#/landing';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Backend state
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Configuration state
  const [issuer, setIssuer] = useState<IssuerOption>('Inji Certify');
  const [wallet, setWallet] = useState<WalletOption>('Inji Web');
  const [verifier, setVerifier] = useState<VerifierOption>('Inji Verify');
  const [format, setFormat] = useState<CredentialFormat>('W3C VC');
  const [scenario, setScenario] = useState<TestResultOutcome>('PASS');
  const [executionMode, setExecutionMode] = useState<'animated' | 'instant'>('animated');
  const [srAnnouncement, setSrAnnouncement] = useState<string>('');

  // Test execution state
  const [testSession, setTestSession] = useState<TestSession | null>(null);
  const [matrix, setMatrix] = useState<InteropMatrixItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);

  // Monotonic sequence counters to prevent stale responses and race conditions
  const syncSeqRef = useRef<number>(0);
  const matrixSeqRef = useRef<number>(0);
  const activeSessionRef = useRef<TestSession | null>(null);
  useEffect(() => {
    activeSessionRef.current = testSession;
  }, [testSession]);

  // Step execution statuses for the 8 vertical steps
  const [stepStatuses, setStepStatuses] = useState<StepExecutionStatus[]>([
    'WAITING',
    'WAITING',
    'WAITING',
    'WAITING',
    'WAITING',
    'WAITING',
    'WAITING',
    'WAITING',
  ]);

  const refreshMatrix = useCallback(async () => {
    const seq = ++matrixSeqRef.current;
    try {
      const data = await api.getMatrix();
      if (seq === matrixSeqRef.current && data?.matrix) {
        setMatrix(data.matrix);
      }
    } catch (err) {
      // quiet matrix sync
    }
  }, []);

  // Load initial backend config, health & live matrix
  const loadInitialData = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const healthData = await api.getHealth();
      setHealth(healthData);
      setHealthError(null);
      try {
        const matrixData = await api.getMatrix();
        if (matrixData?.matrix) {
          setMatrix(matrixData.matrix);
        }
      } catch {
        const configData = await api.getConfig().catch(() => null);
        if (configData?.matrix) {
          setMatrix(configData.matrix);
        }
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to connect to Playground API';
      console.warn('Backend connection notice:', errorMsg);
      setHealthError(errorMsg);
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Unexecuted placeholder steps when no test session is loaded (strictly status: 0 / NOT_EXECUTED — never fake 200 OK)
  const buildDefaultSteps = useCallback((): ProtocolStep[] => {
    const now = '';
    const notExecutedRes = {
      status: 'NOT_EXECUTED',
      message: 'No active test execution loaded. Click "Start Interoperability Test" or select a recorded execution from the Conformance Matrix.',
    };
    return [
      {
        step_id: 'credential_offer',
        name: 'Credential Offer',
        phase: 'Issuance (OpenID4VCI)',
        description: 'Issuer shares a Credential Offer with the Wallet via deep-link or QR code',
        method: 'GET',
        endpoint: '/v1/certify/issuance/.well-known/openid-credential-issuer',
        status: 0,
        timestamp: now,
        sender: 'issuer',
        receiver: 'wallet',
        request: { note: 'Awaiting test execution' },
        response: notExecutedRes,
      },
      {
        step_id: 'authorization',
        name: 'Authorization',
        phase: 'Issuance (OpenID4VCI)',
        description: 'Wallet initiates authorization code flow with PKCE with Issuer Auth Server',
        method: 'GET',
        endpoint: '/authorize',
        status: 0,
        timestamp: now,
        sender: 'wallet',
        receiver: 'issuer',
        request: { note: 'Awaiting test execution' },
        response: notExecutedRes,
      },
      {
        step_id: 'token_exchange',
        name: 'Token Exchange',
        phase: 'Issuance (OpenID4VCI)',
        description: 'Wallet redeems authorization code for an issuance access token',
        method: 'POST',
        endpoint: '/v1/mimoto/get-token/Mosip',
        status: 0,
        timestamp: now,
        sender: 'wallet',
        receiver: 'issuer',
        request: { note: 'Awaiting test execution' },
        response: notExecutedRes,
      },
      {
        step_id: 'credential_request',
        name: 'Credential Request',
        phase: 'Issuance (OpenID4VCI)',
        description: 'Wallet presents key binding proof and requests credential issuance',
        method: 'POST',
        endpoint: '/v1/certify/issuance/credential',
        status: 0,
        timestamp: now,
        sender: 'wallet',
        receiver: 'issuer',
        request: { note: 'Awaiting test execution' },
        response: notExecutedRes,
      },
      {
        step_id: 'credential_response',
        name: 'Credential Response',
        phase: 'Issuance (OpenID4VCI)',
        description: 'Issuer returns the issued credential (W3C JSON-LD or SD-JWT) to the Wallet',
        method: 'POST',
        endpoint: '/v1/certify/issuance/credential',
        status: 0,
        timestamp: now,
        sender: 'issuer',
        receiver: 'wallet',
        request: { note: 'Awaiting test execution' },
        response: notExecutedRes,
      },
      {
        step_id: 'presentation_request',
        name: 'Presentation Request',
        phase: 'Verification (OpenID4VP)',
        description: 'Verifier dispatches OpenID4VP request asking for credential presentation',
        method: 'POST',
        endpoint: '/v1/verify/vp-request',
        status: 0,
        timestamp: now,
        sender: 'verifier',
        receiver: 'wallet',
        request: { note: 'Awaiting test execution' },
        response: notExecutedRes,
      },
      {
        step_id: 'vp_token',
        name: 'VP Token',
        phase: 'Verification (OpenID4VP)',
        description: 'Wallet generates Verifiable Presentation and submits VP Token to Verifier response_uri',
        method: 'POST',
        endpoint: '/v1/verify/vp-submission/direct-post',
        status: 0,
        timestamp: now,
        sender: 'wallet',
        receiver: 'verifier',
        request: { note: 'Awaiting test execution' },
        response: notExecutedRes,
      },
      {
        step_id: 'verification',
        name: 'Verification',
        phase: 'Verification (OpenID4VP)',
        description: 'Verifier checks cryptographic trust, revocation status, schema, and audience/nonce',
        method: 'POST',
        endpoint: '/v1/verify/vc-verification',
        status: 0,
        timestamp: now,
        sender: 'verifier',
        receiver: 'verifier',
        request: { note: 'Awaiting test execution' },
        response: notExecutedRes,
      },
    ];
  }, []);

  const currentSteps = testSession?.steps?.length ? testSession.steps : buildDefaultSteps();
  const autoOpenedSessionsRef = useRef<Set<string>>(new Set());

  const applySessionUpdate = useCallback((session: TestSession, preferredStepIdx?: number) => {
    if (session.test_id && !session.test_id.startsWith('local-')) {
      sessionStorage.setItem('inji_active_test_id', session.test_id);
    }
    setTestSession((prev) => {
      // Prevent stale out-of-order response for the same test_id from overwriting newer state
      if (
        prev &&
        prev.test_id === session.test_id &&
        prev.updated_at &&
        session.updated_at &&
        prev.updated_at > session.updated_at
      ) {
        return prev;
      }
      const wasCompleted = prev?.test_id === session.test_id && prev?.status === 'COMPLETED';
      const isNowCompleted = session.status === 'COMPLETED';
      if (!wasCompleted && isNowCompleted) {
        setSelectedStepIndex(7);
      } else if (typeof preferredStepIdx === 'number') {
        setSelectedStepIndex(preferredStepIdx);
      }
      return prev && prev.test_id === session.test_id ? { ...prev, ...session } : session;
    });
    if (session.steps?.length) {
      setStepStatuses(session.steps.map((s, idx) => computeStepStatus(s, idx, session.steps)));
    }
  }, []);

  // Rehydrate existing test session by ID from backend (for OAuth callbacks, tab restores, and page reloads)
  const loadSessionById = useCallback(async (id: string, selectStepIdx?: number, switchToConsoleView: boolean = false) => {
    const seq = ++syncSeqRef.current;
    try {
      const session = await api.getTest(id);
      if (session && seq === syncSeqRef.current) {
        if (switchToConsoleView) {
          setPage('console');
          setConsoleView('console');
        }
        if (session.issuer) setIssuer(session.issuer);
        if (session.wallet) setWallet(session.wallet);
        if (session.verifier) setVerifier(session.verifier);
        if (session.credential_format) setFormat(session.credential_format);
        if (session.expected_outcome) setScenario(session.expected_outcome);
        const stepIdx = typeof selectStepIdx === 'number'
          ? selectStepIdx
          : session.status === 'COMPLETED'
          ? 7
          : session.status === 'AWAITING_AUTHORIZATION'
          ? 1
          : 2;
        applySessionUpdate(session, stepIdx);
        refreshMatrix();
        return session;
      }
    } catch (err) {
      console.warn(`Could not load test session ${id}:`, err);
    }
    return null;
  }, [applySessionUpdate, refreshMatrix]);

  // Initial rehydration on mount: URL query param -> sessionStorage -> latest persisted backend test session
  useEffect(() => {
    let mounted = true;
    const initSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const queryTestId = params.get('test_id');
      const storedTestId = sessionStorage.getItem('inji_active_test_id');
      const targetId = queryTestId || storedTestId;

      if (targetId) {
        const loaded = await loadSessionById(targetId, undefined, Boolean(queryTestId));
        if (loaded || !mounted) return;
      }

      // Single source of truth fallback: load the most recently updated persisted test session from backend
      try {
        const listRes = await api.listTests();
        if (mounted && listRes?.tests?.length > 0) {
          const latest = listRes.tests[0];
          if (latest?.test_id) {
            await loadSessionById(latest.test_id, undefined, false);
          }
        }
      } catch (err) {
        // Ignore if no persisted sessions yet
      }
    };
    initSession();
    return () => {
      mounted = false;
    };
  }, [loadSessionById]);

  // Real-time synchronization via Server-Sent Events (/api/stream), BroadcastChannel, and focus/visibility/online handlers
  useEffect(() => {
    const syncActiveSession = async (overrideId?: string) => {
      const seq = ++syncSeqRef.current;
      const currentSession = activeSessionRef.current;
      const activeId = overrideId || currentSession?.test_id || sessionStorage.getItem('inji_active_test_id');
      if (activeId && !activeId.startsWith('local-')) {
        try {
          const updated = await api.getTest(activeId);
          if (updated && seq === syncSeqRef.current) {
            if (updated.issuer) setIssuer(updated.issuer);
            if (updated.wallet) setWallet(updated.wallet);
            if (updated.verifier) setVerifier(updated.verifier);
            if (updated.credential_format) setFormat(updated.credential_format);
            if (updated.expected_outcome) setScenario(updated.expected_outcome);
            applySessionUpdate(updated);
            refreshMatrix();
          }
        } catch (err) {
          refreshMatrix();
        }
      } else {
        refreshMatrix();
      }
    };

    const handleFocus = () => syncActiveSession();
    const handleOnline = () => syncActiveSession();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncActiveSession();
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
          syncActiveSession(ev.data.test_id);
        }
      };
    } catch (e) {
      // BroadcastChannel not supported in some environments
    }

    // Connect to backend SSE stream (/api/stream) for instant real-time updates
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${API_BASE}/api/stream`);
      es.addEventListener('state_update', (ev: MessageEvent) => {
        try {
          const parsed = JSON.parse(ev.data);
          const digest = parsed?.digest;
          refreshMatrix();
          if (digest?.latest_test_id) {
            const current = activeSessionRef.current;
            // Sync if it's the active test OR a newly created/updated test on the backend
            if (
              !current ||
              current.test_id === digest.latest_test_id ||
              !current.updated_at ||
              (digest.latest_updated_at && digest.latest_updated_at > current.updated_at)
            ) {
              syncActiveSession(digest.latest_test_id);
            }
          }
        } catch (parseErr) {
          refreshMatrix();
        }
      });
    } catch (sseErr) {
      // Fallback to polling if EventSource cannot initialize
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (bc) bc.close();
      if (es) es.close();
    };
  }, [applySessionUpdate, refreshMatrix]);

  // Non-overlapping polling fallback for active test session while non-terminal
  useEffect(() => {
    if (!testSession?.test_id || testSession.test_id.startsWith('local-')) return;
    const isTerminal =
      testSession.status === 'COMPLETED' ||
      testSession.status === 'AUTHORIZATION_FAILED' ||
      testSession.status === 'ERROR' ||
      testSession.status === 'RESET' ||
      testSession.outcome === 'PASS' ||
      testSession.outcome === 'FAIL';
    if (isTerminal) return;

    const pendingStatuses = ['AWAITING_AUTHORIZATION', 'AWAITING_CREDENTIAL', 'PENDING_VERIFICATION', 'RUNNING'];
    if (!pendingStatuses.includes(testSession.status)) return;

    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const pollOnce = async () => {
      if (cancelled) return;
      const seq = ++syncSeqRef.current;
      try {
        const updated = await api.getTest(testSession.test_id);
        if (cancelled || !updated || seq !== syncSeqRef.current) return;

        if (
          updated.updated_at !== testSession.updated_at ||
          updated.status !== testSession.status ||
          updated.outcome !== testSession.outcome ||
          updated.current_step_index !== testSession.current_step_index
        ) {
          applySessionUpdate(updated);
          refreshMatrix();
        }

        const nowTerminal =
          updated.status === 'COMPLETED' ||
          updated.status === 'AUTHORIZATION_FAILED' ||
          updated.status === 'ERROR' ||
          updated.status === 'RESET' ||
          updated.outcome === 'PASS' ||
          updated.outcome === 'FAIL';
        if (nowTerminal) {
          return;
        }
      } catch (err) {
        console.warn('Polling test status failed:', err);
      }

      if (!cancelled) {
        const nextDelay = document.visibilityState === 'visible' ? 1500 : 4000;
        timerId = setTimeout(pollOnce, nextDelay);
      }
    };

    timerId = setTimeout(pollOnce, 1500);

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [testSession?.test_id, testSession?.status, testSession?.outcome, testSession?.updated_at, testSession?.current_step_index, applySessionUpdate, refreshMatrix]);

  // START INTEROPERABILITY TEST: Creates one session, updates steps & Matrix, and opens eSignet automatically
  const handleStartTest = async () => {
    if (isLoading) return;
    setIsLoading(true);
    const startTime = Date.now();
    setSrAnnouncement(`Starting interoperability test for ${issuer}, ${wallet}, and ${verifier}.`);

    try {
      const session = await api.startTest({
        issuer,
        wallet,
        verifier,
        credential_format: format,
        expected_outcome: scenario,
      });

      const durationMs = session.duration_ms ?? (Date.now() - startTime);
      const hydratedSession: TestSession = {
        ...session,
        duration_ms: durationMs,
      };

      const targetStepIndex =
        hydratedSession.status === 'AWAITING_AUTHORIZATION'
          ? 1
          : hydratedSession.status === 'COMPLETED'
          ? 7
          : 0;

      applySessionUpdate(hydratedSession, targetStepIndex);
      refreshMatrix();

      // Broadcast to other open tabs immediately
      try {
        const bc = new BroadcastChannel('inji_test_channel');
        bc.postMessage({ type: 'TEST_UPDATED', test_id: hydratedSession.test_id });
        bc.close();
      } catch (e) {
        // ignore
      }

      // Automatically open eSignet authorization page once for the newly created session
      if (
        hydratedSession.status === 'AWAITING_AUTHORIZATION' &&
        hydratedSession.authorization_url &&
        !autoOpenedSessionsRef.current.has(hydratedSession.test_id)
      ) {
        autoOpenedSessionsRef.current.add(hydratedSession.test_id);
        setSrAnnouncement('Opening MOSIP eSignet authorization page.');
        const authWindow = window.open(hydratedSession.authorization_url, '_blank');
        if (!authWindow) {
          window.location.assign(hydratedSession.authorization_url);
        }
      } else {
        setSrAnnouncement(`Interoperability test status: ${hydratedSession.status}.`);
      }
    } catch (err: any) {
      console.error('Backend API start error:', err);
      const durationMs = Date.now() - startTime;
      const errorSession: TestSession = {
        test_id: `local-error-${Date.now()}`,
        created_at: new Date(startTime).toISOString(),
        updated_at: new Date().toISOString(),
        status: 'ERROR',
        issuer,
        wallet,
        verifier,
        credential_format: format,
        expected_outcome: scenario,
        current_step_index: 0,
        total_steps: 8,
        steps: buildDefaultSteps(),
        outcome: 'FAIL',
        credential_validity: 'ERROR',
        verifier_result: 'ERROR',
        error: err?.message || 'Failed to reach backend API to start test session.',
        is_simulation: false,
        note: 'Test execution failed due to backend connection error.',
        duration_ms: durationMs,
      };
      applySessionUpdate(errorSession, 0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetTest = async () => {
    sessionStorage.removeItem('inji_active_test_id');
    if (window.history.replaceState) {
      const cleanUrl = window.location.pathname + '#/console';
      window.history.replaceState({}, document.title, cleanUrl);
    }
    if (testSession?.test_id && !testSession.test_id.startsWith('local-')) {
      try {
        await api.resetTest(testSession.test_id);
      } catch (err) {
        console.warn('Backend reset call notice:', err);
      }
    }
    setTestSession(null);
    setStepStatuses([
      'WAITING', 'WAITING', 'WAITING', 'WAITING',
      'WAITING', 'WAITING', 'WAITING', 'WAITING',
    ]);
    setSelectedStepIndex(0);
    refreshMatrix();
    setSrAnnouncement('Test reset. Ready to start new test.');
  };

  const handleSelectMatrixRow = (config: {
    issuer: IssuerOption;
    wallet: WalletOption;
    verifier: VerifierOption;
    format: CredentialFormat;
    test_id?: string;
    targetView?: ConsoleView;
  }) => {
    setIssuer(config.issuer);
    setWallet(config.wallet);
    setVerifier(config.verifier);
    setFormat(config.format);
    if (config.test_id) {
      loadSessionById(config.test_id, undefined, false);
    }
    const nextView = config.targetView || 'console';
    setConsoleView(nextView);
    window.location.hash = `#/${nextView}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Screen Reader Live Region for Test Progression & Announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {srAnnouncement}
      </div>

      {page === 'landing' ? (
        <LandingPage
          onNavigateToConsole={handleNavigateToConsole}
          health={health}
          healthError={healthError}
        />
      ) : (
        <TestConsole
          onBackToLanding={handleNavigateToLanding}
          activeView={consoleView}
          onSelectView={handleSelectConsoleView}
          health={health}
          healthLoading={healthLoading}
          healthError={healthError}
          onRefreshHealth={loadInitialData}
          issuer={issuer}
          setIssuer={setIssuer}
          wallet={wallet}
          setWallet={setWallet}
          verifier={verifier}
          setVerifier={setVerifier}
          format={format}
          setFormat={setFormat}
          scenario={scenario}
          setScenario={setScenario}
          executionMode={executionMode}
          setExecutionMode={setExecutionMode}
          onStartTest={handleStartTest}
          onResetTest={handleResetTest}
          isLoading={isLoading}
          testSession={testSession}
          steps={currentSteps}
          selectedStepIndex={selectedStepIndex}
          onSelectStep={(idx) => setSelectedStepIndex(idx)}
          stepStatuses={stepStatuses}
          matrix={matrix}
          onSelectMatrixRow={handleSelectMatrixRow}
        />
      )}
    </>
  );
};

export default App;
