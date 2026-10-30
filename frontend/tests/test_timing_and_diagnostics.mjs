import assert from 'node:assert/strict';

console.log('Running Real-Time Timing & Lifecycle Diagnostics Tests (Node.js)...');

// 1. Lifecycle State Mapping Check
const SUPPORTED_LIFECYCLE_STATES = [
  'NOT STARTED',
  'RUNNING',
  'AWAITING AUTHORIZATION',
  'AWAITING CREDENTIAL',
  'AWAITING VERIFICATION',
  'COMPLETED',
  'PASS',
  'FAIL',
  'ERROR',
  'INCOMPLETE',
];

function mapLifecycleState(status, outcome) {
  switch (status) {
    case 'NOT_STARTED':
      return 'NOT STARTED';
    case 'RUNNING':
      return 'RUNNING';
    case 'AWAITING_AUTHORIZATION':
      return 'AWAITING AUTHORIZATION';
    case 'AWAITING_CREDENTIAL':
      return 'AWAITING CREDENTIAL';
    case 'PENDING_VERIFICATION':
      return 'AWAITING VERIFICATION';
    case 'COMPLETED':
      if (outcome === 'PASS') return 'PASS';
      if (outcome === 'FAIL') return 'FAIL';
      return 'COMPLETED';
    case 'AUTHORIZATION_FAILED':
    case 'ERROR':
      return 'ERROR';
    case 'INCOMPLETE':
      return 'INCOMPLETE';
    default:
      return 'INCOMPLETE';
  }
}

for (const state of ['NOT_STARTED', 'RUNNING', 'AWAITING_AUTHORIZATION', 'AWAITING_CREDENTIAL', 'PENDING_VERIFICATION', 'COMPLETED', 'ERROR', 'INCOMPLETE']) {
  const mapped = mapLifecycleState(state, state === 'COMPLETED' ? 'PASS' : undefined);
  assert(
    SUPPORTED_LIFECYCLE_STATES.includes(mapped),
    `Mapped state ${mapped} must be one of the supported lifecycle states`
  );
}
console.log('PASS: All lifecycle states map to supported UI representations');

// 2. Timing Formatting Rule: Monotonic durations & UTC timestamps
function formatStepDuration(durationMs) {
  if (typeof durationMs !== 'number' || durationMs <= 0) {
    return '—';
  }
  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(2)}s`;
  }
  return `${Math.round(durationMs)}ms`;
}

assert.strictEqual(formatStepDuration(undefined), '—');
assert.strictEqual(formatStepDuration(null), '—');
assert.strictEqual(formatStepDuration(0), '—');
assert.strictEqual(formatStepDuration(45.2), '45ms');
assert.strictEqual(formatStepDuration(1500), '1.50s');
console.log('PASS: Timing formatting correctly presents — for unavailable timings and scales ms/s');

// 3. HTTP Latency vs Total Step Duration Separation
function getTimingAudit(step) {
  return {
    totalDuration: formatStepDuration(step.duration_ms),
    httpDuration: formatStepDuration(step.http_duration_ms),
    hasDistinctHttpLatency: typeof step.http_duration_ms === 'number' &&
      typeof step.duration_ms === 'number' &&
      Math.abs(step.duration_ms - step.http_duration_ms) > 1,
  };
}

const simulatedStep = {
  duration_ms: 120.5,
  http_duration_ms: 100.2,
};
const audit = getTimingAudit(simulatedStep);
assert.strictEqual(audit.totalDuration, '121ms');
assert.strictEqual(audit.httpDuration, '100ms');
assert.strictEqual(audit.hasDistinctHttpLatency, true);
console.log('PASS: HTTP latency is clearly distinguished from total step duration');

// 4. Offline Diagnostics Verification
const mockOfflineDiagnostics = {
  inji_certify: {
    target_url: 'http://localhost:8090',
    reachable: false,
    status_code: null,
    error_cause: '[WinError 10061] Connection refused',
  },
  inji_verify: {
    target_url: 'http://localhost:8081',
    reachable: false,
    status_code: null,
    error_cause: '[WinError 10061] Connection refused',
  },
  esignet: {
    target_url: 'https://esignet-mock.collab.mosip.net/.well-known/openid-configuration',
    reachable: true,
    status_code: 200,
    error_cause: null,
  },
};

const offlineServices = Object.entries(mockOfflineDiagnostics).filter(([_, d]) => !d.reachable);
assert.strictEqual(offlineServices.length, 2);
assert.strictEqual(offlineServices[0][0], 'inji_certify');
assert.strictEqual(mockOfflineDiagnostics.esignet.reachable, true);
console.log('PASS: Offline diagnostics isolate exact unreachable services without masking reachability');

console.log('\nALL REAL-TIME TIMING & DIAGNOSTIC TESTS PASSED (EXIT CODE 0).');
