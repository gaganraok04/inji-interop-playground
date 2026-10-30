import assert from 'node:assert/strict';
import { computeMatrixSummaryMetrics, isRowTested } from '../src/components/console/matrixMetrics.ts';

console.log('Running Matrix Metrics and Conformance Presentation Tests (Node.js)...');

// Test 1: Untested combination
const untestedItem = {
  id: 'mock-1',
  issuer: 'Inji Certify',
  wallet: 'Inji Web',
  verifier: 'Inji Verify',
  format: 'W3C VC',
  status: 'NOT_TESTED',
  display_status: 'NOT TESTED',
  latest_verdict: 'NOT TESTED',
  result: '—',
  execution_count: 0,
  attempt_count: 0,
  completed_count: 0,
  pass_count: 0,
  fail_count: 0,
  error_count: 0,
  running_count: 0,
  incomplete_count: 0,
  executions: [],
  is_demo_entry: false,
};

assert.strictEqual(isRowTested(untestedItem), false, 'Untested item should not be marked tested');

const emptyMetrics = computeMatrixSummaryMetrics([untestedItem]);
assert.strictEqual(emptyMetrics.totalPermutations, 1);
assert.strictEqual(emptyMetrics.testedCount, 0);
assert.strictEqual(emptyMetrics.totalAttempts, 0);
assert.strictEqual(emptyMetrics.totalCompletedRuns, 0);
assert.strictEqual(emptyMetrics.totalPassRuns, 0);
assert.strictEqual(emptyMetrics.totalFailRuns, 0);
assert.strictEqual(emptyMetrics.totalRunning, 0);
assert.strictEqual(emptyMetrics.totalIncomplete, 0);
assert.strictEqual(emptyMetrics.latestOverallVerdict, 'NOT TESTED');
console.log('PASS: Untested combinations correctly reported as 0 tested, NOT TESTED');

// Test 2: The exact 13-session persisted dataset accounting
// (13 attempts, 6 completed, 3 PASS, 3 FAIL, 7 incomplete, 0 running)
const persisted13SessionItem = {
  id: 'inji-certify-inji-web-inji-verify-w3c-vc',
  issuer: 'Inji Certify',
  wallet: 'Inji Web',
  verifier: 'Inji Verify',
  format: 'W3C VC',
  test_id: 'cb6b73ea-98cb-4e94-874e-5a5078505500',
  report_id: 'REP-CB6B73EA',
  status: 'PASS',
  display_status: 'PASS',
  latest_verdict: 'PASS',
  result: 'PASS',
  raw_status: 'COMPLETED',
  attempt_count: 13,
  completed_count: 6,
  pass_count: 3,
  fail_count: 3,
  error_count: 0,
  running_count: 0,
  incomplete_count: 7,
  execution_count: 6,
  is_real_stack: true,
  is_demo_entry: false,
  executions: [
    {
      test_id: 'cb6b73ea-98cb-4e94-874e-5a5078505500',
      report_id: 'REP-CB6B73EA',
      status: 'COMPLETED',
      outcome: 'PASS',
      verdict: 'PASS',
      execution_state: 'COMPLETED',
      is_real_stack: true,
      is_simulation: false,
      duration_ms: 2200,
      updated_at: '2026-10-19T06:58:30Z',
    },
    {
      test_id: '2cf51877-a8fd-468f-aa6a-65377f0c13a0',
      report_id: 'REP-2CF51877',
      status: 'AWAITING_AUTHORIZATION',
      outcome: 'PENDING',
      verdict: 'INCOMPLETE',
      execution_state: 'INCOMPLETE',
      is_real_stack: true,
      is_simulation: false,
      duration_ms: 0,
      updated_at: '2026-10-19T06:40:00Z',
    },
  ],
};

assert.strictEqual(isRowTested(persisted13SessionItem), true, 'Item with attempts should be marked tested');

const matrix13 = [persisted13SessionItem, untestedItem];
const metrics13 = computeMatrixSummaryMetrics(matrix13);

assert.strictEqual(metrics13.totalPermutations, 2);
assert.strictEqual(metrics13.testedCount, 1);
assert.strictEqual(metrics13.totalAttempts, 13, 'Total attempts must be 13');
assert.strictEqual(metrics13.totalCompletedRuns, 6, 'Total completed runs must be 6');
assert.strictEqual(metrics13.totalPassRuns, 3, 'Total PASS runs must be 3');
assert.strictEqual(metrics13.totalFailRuns, 3, 'Total FAIL runs must be 3');
assert.strictEqual(metrics13.totalRunning, 0, 'Total running runs must be 0');
assert.strictEqual(metrics13.totalIncomplete, 7, 'Total incomplete runs must be 7');
assert.strictEqual(metrics13.latestOverallVerdict, 'PASS', 'Latest overall verdict must be PASS');
assert.strictEqual(metrics13.triadsLatestPassCount, 1, 'Latest PASS triad count must be 1');
assert.strictEqual(metrics13.triadsLatestFailCount, 0, 'Latest FAIL triad count must be 0');

console.log('PASS: 13-session dataset preserves exact historical accounting (13 attempts, 6 completed, 3 PASS, 3 FAIL, 7 incomplete, 0 running)');

// Test 3: Distinguish latest verdict from total failed runs
// Even though the latest execution is PASS (0 triads currently failing),
// total historical failed executions is 3.
assert.strictEqual(metrics13.totalFailRuns + metrics13.totalErrorRuns, 3);
assert.notStrictEqual(metrics13.totalFailRuns, metrics13.triadsLatestFailCount,
  'Total failed runs (3) must be distinct from triads with latest verdict FAIL (0)');
console.log('PASS: Latest verdict (PASS) is strictly distinguished from total failed executions (3)');

console.log('ALL MATRIX METRICS TESTS PASSED (EXIT CODE 0).');
